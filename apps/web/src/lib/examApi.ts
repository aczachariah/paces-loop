/** Browser-side helpers for calling the examiner API with the pilot access code. */
export const ACCESS_CODE_STORAGE_KEY = 'paces.accessCode';
const ACCESS_CODE_HEADER = 'x-paces-access-code';

function storage(): Storage | null {
  try { return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null; } catch { return null; }
}

export function getAccessCode(): string {
  return storage()?.getItem(ACCESS_CODE_STORAGE_KEY) || '';
}

export function setAccessCode(code: string): void {
  const store = storage();
  if (!store) return;
  if (code.trim()) store.setItem(ACCESS_CODE_STORAGE_KEY, code.trim());
  else store.removeItem(ACCESS_CODE_STORAGE_KEY);
}

export function examineHeaders(): Record<string, string> {
  const code = getAccessCode();
  return code ? { 'Content-Type': 'application/json', [ACCESS_CODE_HEADER]: code } : { 'Content-Type': 'application/json' };
}

/** Friendlier wording for API errors the candidate can act on. */
export function examineErrorMessage(data: { error?: string; code?: string } | null | undefined, fallback: string): string {
  if (data?.code === 'access_code_required') return 'A valid pilot access code is required. Return to the pilot overview and enter it.';
  return data?.error || fallback;
}
