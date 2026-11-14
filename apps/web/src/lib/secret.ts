/**
 * Exam-session signing secret resolution.
 *
 * Deliberately free of `server-only` so it can also run from `instrumentation.ts`
 * at server start-up. It contains no secret values, only the policy. It uses Web Crypto
 * rather than node:crypto because Next also compiles instrumentation for the edge runtime.
 */

export const MIN_SECRET_LENGTH = 32;

/** Placeholder/legacy values that must never sign real transcripts. */
export const REJECTED_SECRETS: ReadonlySet<string> = new Set([
  'local-development-only-secret-change-me',
  'replace-with-output-of-openssl-rand-hex-32',
]);

export class ExamSecretConfigurationError extends Error {}

type Env = Record<string, string | undefined>;

/** Development and test are the only environments allowed to run without a configured secret. */
export function isRelaxedEnvironment(env: Env = process.env): boolean {
  return env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
}

export function validateSecretValue(secret: string | undefined): string | null {
  if (!secret) return 'EXAM_SESSION_SECRET is not set.';
  if (secret.length < MIN_SECRET_LENGTH) return `EXAM_SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`;
  if (REJECTED_SECRETS.has(secret.trim())) return 'EXAM_SESSION_SECRET is a published example value. Generate a new one with `openssl rand -hex 32`.';
  return null;
}

const globalKey = Symbol.for('paces.devExamSessionSecret');

/**
 * Returns the signing secret, or throws ExamSecretConfigurationError.
 *
 * - Valid EXAM_SESSION_SECRET: used everywhere.
 * - Missing/weak/example value in development or test: a random per-process secret is
 *   generated (tokens do not survive a dev-server restart, which is acceptable locally).
 * - Missing/weak/example value anywhere else (production, staging, unset NODE_ENV): throws.
 */
export function resolveExamSessionSecret(env: Env = process.env): string {
  const secret = env.EXAM_SESSION_SECRET;
  const problem = validateSecretValue(secret);
  if (!problem) return secret as string;
  if (!isRelaxedEnvironment(env)) throw new ExamSecretConfigurationError(problem);
  const store = globalThis as unknown as Record<symbol, string | undefined>;
  if (!store[globalKey]) {
    store[globalKey] = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
    if (env.NODE_ENV === 'development') console.warn(`[paces] ${problem} Using a random development-only secret for this process.`);
  }
  return store[globalKey] as string;
}

/** Called once at server start-up; fails fast outside development/test. */
export function assertExamSessionSecretConfigured(env: Env = process.env): void {
  resolveExamSessionSecret(env);
}
