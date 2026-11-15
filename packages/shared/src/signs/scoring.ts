import { FINDINGS_BY_KEY, questionsForClip } from './findings';
import type { FindingKey, SignAnswers, SignClip } from './types';

export interface ScoredItem { key: FindingKey; expected: string | number; given: string | number | undefined; correct: boolean }
export interface ClipScore { clipId: string; items: ScoredItem[]; correct: number; total: number; allCorrect: boolean }
export interface FindingTally { key: FindingKey; label: string; correct: number; total: number; accuracy: number }
export interface SessionSummary {
  clips: number; correct: number; total: number; accuracy: number;
  byFinding: FindingTally[];
  missedClipIds: string[];
}

/**
 * Deterministic scoring. Every labelled finding on the clip is one mark. A finding the
 * candidate did not answer (including follow-ups they skipped by saying "no murmur") is wrong.
 * Findings the dataset did not label are never scored, whatever the candidate says.
 */
export function scoreClip(clip: SignClip, answers: SignAnswers): ClipScore {
  const items = questionsForClip(clip.labels).map(def => {
    const expected = clip.labels[def.key] as string | number;
    const given = answers[def.key];
    return { key: def.key, expected, given, correct: given !== undefined && given === expected };
  });
  const correct = items.filter(i => i.correct).length;
  return { clipId: clip.id, items, correct, total: items.length, allCorrect: correct === items.length };
}

export function summariseSession(scores: ClipScore[]): SessionSummary {
  const tallies = new Map<FindingKey, { correct: number; total: number }>();
  for (const s of scores) for (const i of s.items) {
    const t = tallies.get(i.key) ?? { correct: 0, total: 0 };
    t.total++; if (i.correct) t.correct++;
    tallies.set(i.key, t);
  }
  const order = Object.keys(FINDINGS_BY_KEY) as FindingKey[];
  const byFinding = order.filter(k => tallies.has(k)).map(k => {
    const t = tallies.get(k)!;
    return { key: k, label: FINDINGS_BY_KEY[k].summaryLabel, correct: t.correct, total: t.total, accuracy: t.correct / t.total };
  });
  const correct = scores.reduce((n, s) => n + s.correct, 0);
  const total = scores.reduce((n, s) => n + s.total, 0);
  return {
    clips: scores.length, correct, total, accuracy: total ? correct / total : 0, byFinding,
    missedClipIds: scores.filter(s => !s.allCorrect).map(s => s.clipId),
  };
}
