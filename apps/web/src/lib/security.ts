import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { isRelaxedEnvironment } from './secret';

type Env = Record<string, string | undefined>;

export const ACCESS_CODE_HEADER = 'x-paces-access-code';

/* ------------------------------------------------------------------ */
/* Access code                                                         */
/* ------------------------------------------------------------------ */

export type AccessResult = { ok: true } | { ok: false; status: 401 | 503; code: 'access_code_required' | 'access_not_configured'; error: string };

function digest(value: string): Buffer { return createHash('sha256').update(value, 'utf8').digest(); }

/**
 * PACES_ACCESS_CODE gates every AI-backed route.
 * - Set: the request must send the same value in the x-paces-access-code header.
 * - Unset in development/test: open, so local work needs no setup.
 * - Unset anywhere else: fail closed (503) rather than expose paid inference publicly.
 */
export function checkAccessCode(supplied: string | null | undefined, env: Env = process.env): AccessResult {
  const expected = env.PACES_ACCESS_CODE?.trim();
  if (!expected) {
    if (isRelaxedEnvironment(env)) return { ok: true };
    return { ok: false, status: 503, code: 'access_not_configured', error: 'Pilot access is not configured on this server.' };
  }
  // Hash both sides so the comparison is constant-time regardless of length.
  if (typeof supplied === 'string' && timingSafeEqual(digest(supplied.trim()), digest(expected))) return { ok: true };
  return { ok: false, status: 401, code: 'access_code_required', error: 'A valid pilot access code is required.' };
}

/* ------------------------------------------------------------------ */
/* Rate limiting (in-memory, per server instance)                      */
/* ------------------------------------------------------------------ */

export interface RateLimitRule { limit: number; windowMs: number; }

/**
 * Pilot limits. One full encounter is roughly 20-35 requests (examination steps,
 * presentation, five viva answers, feedback), so these allow normal use with headroom.
 */
export const RATE_LIMITS = {
  ip: { limit: 120, windowMs: 10 * 60 * 1000 } satisfies RateLimitRule,
  session: { limit: 60, windowMs: 2 * 60 * 60 * 1000 } satisfies RateLimitRule,
};

interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export type RateLimitResult = { ok: true; remaining: number } | { ok: false; retryAfterSeconds: number };

/**
 * Fixed-window counter. LIMITATION: state lives in this process only. On serverless
 * platforms each instance has its own counters and cold starts reset them, so this
 * bounds abuse per instance rather than globally. Use a shared store (e.g. Redis/KV)
 * before any public launch.
 */
export function consumeRateLimit(key: string, rule: RateLimitRule, now = Date.now()): RateLimitResult {
  if (buckets.size > MAX_BUCKETS) {
    for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + rule.windowMs };
    buckets.set(key, bucket);
  }
  if (bucket.count >= rule.limit) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  bucket.count++;
  return { ok: true, remaining: rule.limit - bucket.count };
}

/**
 * Best-effort client IP. On Vercel `request.ip`/x-forwarded-for are set by the platform.
 * When self-hosting without a trusted proxy, x-forwarded-for can be spoofed by clients.
 */
export function clientIp(request: { ip?: string; headers: Headers }): string {
  if (request.ip) return request.ip;
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || 'unknown';
}

/* ------------------------------------------------------------------ */
/* One feedback generation per exam session                            */
/* ------------------------------------------------------------------ */

/**
 * Signed tokens are stateless, so a client can always replay an older valid token
 * (e.g. the one from just before feedback). A "feedbackUsed" marker inside the token
 * cannot stop that on its own; the server must remember which sessions have consumed
 * feedback. This ledger does that in memory, keyed by the session id embedded in the
 * signed token, for the token lifetime.
 *
 * LIMITATION: like the rate limiter, it is per-process. A different serverless instance
 * or a restart forgets it. A durable store keyed by sessionId is the proper fix.
 */
type LedgerState = 'pending' | 'done';
const feedbackLedger = new Map<string, { state: LedgerState; expiresAt: number }>();

export function claimFeedback(sessionId: string, ttlMs: number, now = Date.now()): boolean {
  for (const [id, entry] of feedbackLedger) if (entry.expiresAt <= now) feedbackLedger.delete(id);
  if (feedbackLedger.has(sessionId)) return false;
  feedbackLedger.set(sessionId, { state: 'pending', expiresAt: now + ttlMs });
  return true;
}

/** Generation failed: allow an explicit retry. */
export function releaseFeedback(sessionId: string): void {
  if (feedbackLedger.get(sessionId)?.state === 'pending') feedbackLedger.delete(sessionId);
}

export function completeFeedback(sessionId: string): void {
  const entry = feedbackLedger.get(sessionId);
  if (entry) entry.state = 'done';
}

/* ------------------------------------------------------------------ */
/* Prompt-injection guard                                              */
/* ------------------------------------------------------------------ */

const INJECTION_PATTERNS: RegExp[] = [
  /\b(?:ignore|disregard|forget|override)\b[^.\n]{0,40}\b(?:previous|prior|above|earlier|all|system|these|the)\b[^.\n]{0,20}\b(?:instructions?|prompts?|rules?|messages?)\b/i,
  /\b(?:system|developer)\s*(?:prompt|message|instructions?)\b/i,
  /\b(?:presentationScore|vivaScore|differentialsRecognised|finding_id)\b/,
  /<\/?\s*(?:candidate_evidence|candidate_utterance|system|assistant|instructions?)\b/i,
  /\byou are (?:now )?(?:a|an|the) (?:new|different|helpful)\b/i,
  /\b(?:give|award|assign|set)\b[^.\n]{0,30}\b(?:full|maximum|max|top|perfect)\s+(?:marks?|scores?)\b/i,
];

/** Narrow, deterministic check for text addressed to the grader rather than the examiner. */
export function looksLikePromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Serialises untrusted candidate content as JSON with angle brackets escaped, so it
 * cannot close the delimiter tags that wrap it in the prompt.
 */
export function serialiseUntrusted(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

/** Test helper: clears in-memory limiter and feedback ledger. */
export function __resetSecurityStateForTests(): void {
  buckets.clear();
  feedbackLedger.clear();
}
