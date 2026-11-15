import type { SignClip } from './types';

/**
 * Very small Leitner-style spaced repetition, stored in the browser (localStorage).
 * box 0 = missed (due in the very next drill); box n = due again 2^n drills later.
 */
export interface ClipReview { box: number; dueDrill: number; seen: number; missed: number }
export interface ReviewState { version: 1; drill: number; clips: Record<string, ClipReview> }

export const REVIEW_STORAGE_KEY = 'paces.signs.review.v1';
export const MAX_BOX = 5;

export function emptyReviewState(): ReviewState { return { version: 1, drill: 0, clips: {} }; }

export function parseReviewState(raw: string | null | undefined): ReviewState {
  if (!raw) return emptyReviewState();
  try {
    const v = JSON.parse(raw);
    if (v && v.version === 1 && typeof v.drill === 'number' && v.clips && typeof v.clips === 'object') return v as ReviewState;
  } catch { /* fall through */ }
  return emptyReviewState();
}

export function recordResult(state: ReviewState, clipId: string, allCorrect: boolean): ReviewState {
  const prev = state.clips[clipId] ?? { box: 0, dueDrill: 0, seen: 0, missed: 0 };
  const box = allCorrect ? Math.min(prev.box + 1, MAX_BOX) : 0;
  const next: ClipReview = {
    box, seen: prev.seen + 1, missed: prev.missed + (allCorrect ? 0 : 1),
    dueDrill: state.drill + (box === 0 ? 1 : 2 ** box),
  };
  return { ...state, clips: { ...state.clips, [clipId]: next } };
}

/** Mark the end of a drill so due dates advance. */
export function finishDrill(state: ReviewState): ReviewState { return { ...state, drill: state.drill + 1 }; }

/** Mulberry32: tiny seeded PRNG so drills are reproducible in tests. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick clips for a drill: due/missed clips first (lowest box first), then unseen clips,
 * then the rest, each group shuffled.
 */
export function pickDrill(clips: readonly SignClip[], state: ReviewState, size: number, random: () => number): SignClip[] {
  const due: SignClip[] = [], unseen: SignClip[] = [], later: SignClip[] = [];
  for (const c of clips) {
    const r = state.clips[c.id];
    if (!r) unseen.push(c);
    else if (r.dueDrill <= state.drill) due.push(c);
    else later.push(c);
  }
  const dueSorted = shuffle(due, random).sort((a, b) => state.clips[a.id].box - state.clips[b.id].box);
  return [...dueSorted, ...shuffle(unseen, random), ...shuffle(later, random)].slice(0, Math.max(0, size));
}
