'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SIGN_DECKS, SIGN_MANIFEST, clipsForDeck, finishDrill, optionLabel, parseReviewState, pickDrill, questionsForClip,
  recordResult, REVIEW_STORAGE_KEY, scoreClip, seededRandom, summariseSession,
  type ClipScore, type FindingDefinition, type ReviewState, type SignAnswers, type SignClip, type SignDeck,
} from '@paces/shared';

type Phase = 'setup' | 'listening' | 'feedback' | 'summary';
const TIME_OPTIONS = [{ value: 60, label: '60 s' }, { value: 90, label: '90 s' }, { value: 0, label: 'Untimed' }];
const SIZE_OPTIONS = [5, 8, 12];

function loadReview(): ReviewState {
  try { return parseReviewState(globalThis.localStorage?.getItem ? globalThis.localStorage.getItem(REVIEW_STORAGE_KEY) : null); } catch { return parseReviewState(null); }
}
function saveReview(state: ReviewState) {
  try { globalThis.localStorage?.setItem(REVIEW_STORAGE_KEY, JSON.stringify(state)); } catch { /* private mode: ignore */ }
}
function seedFromUrl(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('seed');
  return raw && /^\d+$/.test(raw) ? Number(raw) : null;
}
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Questions shown right now: labelled for this clip, and relevant given the candidate's own answers. */
export function visibleQuestions(clip: SignClip, answers: SignAnswers): FindingDefinition[] {
  return questionsForClip(clip.labels).filter(q => !q.dependsOn || answers[q.dependsOn.key] === q.dependsOn.value);
}

function contextLine(clip: SignClip): string {
  if (clip.context.population === 'adult') return 'Adult patient · auscultation site not recorded by the dataset';
  const age = clip.context.ageGroup ? `${clip.context.ageGroup[0].toUpperCase()}${clip.context.ageGroup.slice(1)}` : 'Paediatric patient';
  return `${age} · stethoscope at the ${clip.context.siteName?.toLowerCase() ?? 'recorded site'}`;
}

function Provenance({ clip }: { clip: SignClip }) {
  return <p className="muted small sign-provenance">
    {clip.status}. Source: <a href={clip.sourceUrl} target="_blank" rel="noreferrer">{clip.sourceName}</a>, record {clip.recordId} ({clip.originalFile}), licence ODC-By 1.0.
  </p>;
}

export function SignDrill() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [deck, setDeck] = useState<SignDeck>('all');
  const [size, setSize] = useState(8);
  const [seconds, setSeconds] = useState(60);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [queue, setQueue] = useState<SignClip[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<SignAnswers>({});
  const [impression, setImpression] = useState('');
  const [scores, setScores] = useState<ClipScore[]>([]);
  const [impressions, setImpressions] = useState<Record<string, string>>({});
  const [timedOut, setTimedOut] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const deadline = useRef<number | null>(null);

  useEffect(() => { setReview(loadReview()); }, []);

  const clip = queue[index];
  const current = scores.find(s => s.clipId === clip?.id);
  const summary = useMemo(() => summariseSession(scores), [scores]);
  const dueCount = useMemo(() => {
    if (!review) return 0;
    return clipsForDeck(deck).filter(c => review.clips[c.id] && review.clips[c.id].dueDrill <= review.drill).length;
  }, [review, deck]);

  const start = useCallback((clips: SignClip[]) => {
    setQueue(clips); setIndex(0); setScores([]); setImpressions({}); setAnswers({}); setImpression(''); setTimedOut(false);
    setPhase('listening');
  }, []);

  const startNew = () => {
    const state = review ?? loadReview();
    const seed = seedFromUrl() ?? Date.now();
    start(pickDrill(clipsForDeck(deck), state, size, seededRandom(seed)));
  };
  const retryMissed = () => start(queue.filter(c => summary.missedClipIds.includes(c.id)));

  const commit = useCallback((auto = false) => {
    if (!clip || phase !== 'listening') return;
    const shown = new Set(visibleQuestions(clip, answers).map(q => q.key));
    const committed: SignAnswers = Object.fromEntries(Object.entries(answers).filter(([k]) => shown.has(k as keyof SignAnswers)));
    const score = scoreClip(clip, committed);
    setScores(prev => [...prev, score]);
    setImpressions(prev => ({ ...prev, [clip.id]: impression.trim() }));
    setReview(prev => {
      const next = recordResult(prev ?? loadReview(), clip.id, score.allCorrect);
      saveReview(next);
      return next;
    });
    setTimedOut(auto);
    deadline.current = null;
    setPhase('feedback');
  }, [clip, phase, answers, impression]);

  const commitRef = useRef(commit);
  useEffect(() => { commitRef.current = commit; }, [commit]);

  // Per-clip countdown; on expiry the candidate's current answers are committed as they stand.
  useEffect(() => {
    if (phase !== 'listening' || !seconds) { deadline.current = null; return; }
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    const timer = globalThis.setInterval(() => {
      if (deadline.current === null) return;
      const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) { globalThis.clearInterval(timer); commitRef.current(true); }
    }, 250);
    return () => globalThis.clearInterval(timer);
  }, [phase, index, seconds]);

  const next = () => {
    if (index + 1 >= queue.length) {
      setReview(prev => { const s = finishDrill(prev ?? loadReview()); saveReview(s); return s; });
      setPhase('summary');
      return;
    }
    setIndex(i => i + 1); setAnswers({}); setImpression(''); setTimedOut(false); setPhase('listening');
  };

  const choose = (key: keyof SignAnswers, value: string | number) => setAnswers(prev => ({ ...prev, [key]: value }));

  if (phase === 'setup') return <section className="sign-setup" data-testid="sign-setup">
    <div>
      <p className="eyebrow">Sign recognition · heart sounds</p>
      <h1 className="phase-heading">What do you hear?</h1>
      <p className="muted">Listen to a real recording with no interpretation shown, commit your findings, then see the dataset&apos;s answer. Use headphones.</p>
      <div className="notice">Every clip is a <strong>real recording from an open dataset</strong>. Answers are the dataset&apos;s own labels and are <strong>pending clinician review</strong>; this is formative practice, not an assessment.</div>
    </div>
    <div className="card">
      <h2 className="sign-subheading">Deck</h2>
      <div className="sign-options" role="radiogroup" aria-label="Deck">
        {SIGN_DECKS.map(d => <button key={d.id} type="button" role="radio" aria-checked={deck === d.id}
          className={`mode-card${deck === d.id ? ' selected' : ''}`} onClick={() => setDeck(d.id)}>
          <h3>{d.title} <span className="muted small">({clipsForDeck(d.id).length} clips)</span></h3><p>{d.description}</p>
        </button>)}
      </div>
      <div className="sign-row">
        <label>Clips <select value={size} onChange={e => setSize(Number(e.target.value))}>{SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        <label>Time per clip <select value={seconds} onChange={e => setSeconds(Number(e.target.value))}>{TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
      </div>
      {review && dueCount > 0 && <p className="small muted" data-testid="due-count">{dueCount} clip{dueCount === 1 ? '' : 's'} you missed or are due for review will come first.</p>}
      <button type="button" className="button button-primary" onClick={startNew} data-testid="start-drill">Start drill</button>
    </div>
  </section>;

  if (phase === 'summary') return <section data-testid="sign-summary">
    <p className="eyebrow">Drill complete</p>
    <h1 className="phase-heading">{summary.correct} of {summary.total} findings correct ({pct(summary.accuracy)})</h1>
    <p className="muted">{summary.clips} clip{summary.clips === 1 ? '' : 's'} · {summary.clips - summary.missedClipIds.length} fully correct</p>
    <div className="card">
      <h2 className="sign-subheading">Accuracy by finding</h2>
      <table className="sign-table">
        <thead><tr><th>Finding</th><th>Correct</th><th>Accuracy</th></tr></thead>
        <tbody>{summary.byFinding.map(f => <tr key={f.key}>
          <td>{f.label}</td><td>{f.correct} / {f.total}</td>
          <td><span className="sign-bar"><span style={{ width: pct(f.accuracy) }} /></span> {pct(f.accuracy)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {summary.missedClipIds.length > 0 && <div className="card sign-missed">
      <h2 className="sign-subheading">Clips to revisit</h2>
      <ul>{scores.filter(s => !s.allCorrect).map(s => {
        const c = queue.find(q => q.id === s.clipId)!;
        return <li key={s.clipId}><strong>{c.id}</strong> · {contextLine(c)} · missed {s.items.filter(i => !i.correct).map(i => optionLabelFor(i.key)).join(', ')}</li>;
      })}</ul>
      <p className="small muted">Missed clips are saved in this browser and come back first next time.</p>
    </div>}
    <p className="notice small">Next step (not built yet): send your committed findings and impression to the AI examiner for a follow-up question on your differential. Scoring above never depends on AI.</p>
    <div className="sign-actions">
      {summary.missedClipIds.length > 0 && <button type="button" className="button button-primary" onClick={retryMissed} data-testid="retry-missed">Retry missed ({summary.missedClipIds.length})</button>}
      <button type="button" className="button button-secondary" onClick={() => setPhase('setup')}>New drill</button>
    </div>
  </section>;

  if (!clip) return null;
  const questions = visibleQuestions(clip, answers);
  return <section data-testid="sign-drill">
    <div className="phase-topline">
      <div>
        <p className="eyebrow">Clip {index + 1} of {queue.length}</p>
        <h1 className="phase-heading">What do you hear?</h1>
        <p className="muted small">{contextLine(clip)}</p>
      </div>
      {phase === 'listening' && seconds > 0 && <div className={`sign-timer${remaining <= 10 ? ' urgent' : ''}`} aria-live="polite" data-testid="timer">{remaining}s</div>}
    </div>
    <div className="card">
      <audio key={clip.id} controls loop preload="auto" src={clip.audio} className="sign-audio" data-testid="clip-audio">
        Your browser cannot play this recording.
      </audio>
      <p className="small muted">Real recording, {clip.durationSec.toFixed(0)} s, looped. Replay as often as you like within the time.</p>
    </div>

    {phase === 'listening' && <div className="card sign-questions">
      {questions.map(q => <fieldset key={q.key} className="sign-question">
        <legend>{q.question}</legend>
        <div className="sign-chips">
          {q.options.map(o => <button key={String(o.value)} type="button" aria-pressed={answers[q.key] === o.value}
            className={`sign-chip${answers[q.key] === o.value ? ' selected' : ''}`} onClick={() => choose(q.key, o.value)}
            data-testid={`answer-${q.key}-${o.value}`}>{o.label}</button>)}
        </div>
      </fieldset>)}
      <label className="sign-impression">Impression / differential (optional, not scored)
        <textarea rows={2} value={impression} onChange={e => setImpression(e.target.value)} maxLength={500}
          placeholder="e.g. ejection systolic murmur, likely aortic stenosis; differential aortic sclerosis" />
      </label>
      <button type="button" className="button button-primary" onClick={() => commit(false)} data-testid="commit">Commit findings</button>
    </div>}

    {phase === 'feedback' && current && <div className="card" data-testid="sign-feedback">
      <h2 className="sign-subheading">{current.correct} of {current.total} correct{timedOut ? ' · time ran out, answers committed as they stood' : ''}</h2>
      <table className="sign-table">
        <thead><tr><th>Finding</th><th>You said</th><th>Dataset label</th><th /></tr></thead>
        <tbody>{current.items.map(i => <tr key={i.key} className={i.correct ? 'ok' : 'miss'}>
          <td>{optionLabelFor(i.key)}</td><td>{optionLabel(i.key, i.given)}</td><td><strong>{optionLabel(i.key, i.expected)}</strong></td>
          <td>{i.correct ? '✓' : '✗'}</td>
        </tr>)}</tbody>
      </table>
      {impressions[clip.id] && <p className="small"><strong>Your impression:</strong> {impressions[clip.id]}</p>}
      <Provenance clip={clip} />
      <button type="button" className="button button-primary" onClick={next} data-testid="next">{index + 1 >= queue.length ? 'See summary' : 'Next clip'}</button>
    </div>}
  </section>;
}

function optionLabelFor(key: keyof SignAnswers): string {
  const labels: Record<string, string> = {
    heartSounds: 'Normal vs abnormal', diagnosis: 'Diagnosis group', murmur: 'Murmur', systolicMurmur: 'Systolic murmur',
    systolicTiming: 'Systolic timing', systolicShape: 'Systolic shape', systolicGrade: 'Systolic grade', diastolicMurmur: 'Diastolic murmur',
  };
  return labels[key] ?? key;
}

export function SignAttribution() {
  return <footer className="sign-attribution" data-testid="sign-attribution">
    <h2 className="sign-subheading">Recordings and licences</h2>
    <p className="small muted">All clips are real recordings from open PhysioNet datasets, used under the Open Data Commons Attribution License v1.0. Clips were trimmed, filtered and loudness-normalised. Labels are copied from each dataset and are pending clinician review.</p>
    <ul className="small">{Object.values(SIGN_MANIFEST.sources).map(s => <li key={s.url}>
      <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>. {s.attribution}
    </li>)}</ul>
  </footer>;
}
