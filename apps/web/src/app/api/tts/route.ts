import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_CODE_HEADER, checkAccessCode, clientIp, consumeRateLimit, RATE_LIMITS } from '../../../lib/security';

// The previous local edge-tts command accepted shell input and cannot run on
// Vercel. Keep speech explicitly unavailable until a hosted provider is configured.
// Access and rate checks are already in place so a future paid TTS provider is not exposed.
export async function POST(request: NextRequest) {
  const ipLimit = consumeRateLimit(`ip:${clientIp(request)}`, RATE_LIMITS.ip);
  if (!ipLimit.ok) return NextResponse.json({ error: 'Too many requests.', code: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } });
  const access = checkAccessCode(request.headers.get(ACCESS_CODE_HEADER));
  if (!access.ok) return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
  return NextResponse.json({ error: 'Examiner speech is not configured. You can continue with text.' }, { status: 503 });
}
