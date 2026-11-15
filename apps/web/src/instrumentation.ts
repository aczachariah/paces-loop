/**
 * Runs once when a Next.js server instance starts (not during `next build`).
 * Fails fast if EXAM_SESSION_SECRET is missing, too short or a published example value
 * in any environment other than development/test. Next 14 only logs errors thrown from
 * register() and keeps serving, so the process is exited explicitly. The examine route
 * also re-checks on every request and fails closed (500) as a second line of defence.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const { assertExamSessionSecretConfigured } = await import('./lib/secret');
  try {
    assertExamSessionSecretConfigured();
  } catch (error) {
    console.error(`[paces] Refusing to start: ${error instanceof Error ? error.message : String(error)}`);
    const nodeProcess = globalThis.process as unknown as { exit: (code: number) => never };
    nodeProcess.exit(1);
  }
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test' && !process.env.PACES_ACCESS_CODE?.trim()) {
    console.warn('[paces] PACES_ACCESS_CODE is not set: AI routes will refuse all requests (503) until it is configured.');
  }
}
