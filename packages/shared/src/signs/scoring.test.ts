import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyReviewState, finishDrill, parseReviewState, pickDrill, recordResult, seededRandom, shuffle } from './review';
import { scoreClip, summariseSession } from './scoring';
import type { SignClip } from './types';

function clip(id: string, labels: SignClip['labels'], source: SignClip['source'] = 'circor-2022'): SignClip {
  return {
    id, audio: `/signs/audio/${id}.mp3`, durationSec: 12, source, sourceName: 's', sourceUrl: 'u', recordId: id, subjectId: id, sourceSha256: '0'.repeat(64),
    originalFile: `${id}.wav`, licence: 'ODC-By-1.0', attribution: 'a', status: 's',
    context: { population: 'paediatric', site: 'MV' }, labels,
  };
}

const murmurClip = clip('m', { murmur: 'present', systolicMurmur: 'present', systolicTiming: 'holosystolic', systolicShape: 'plateau', systolicGrade: 3, diastolicMurmur: 'absent' });
const quietClip = clip('q', { murmur: 'absent' });
const adultClip = clip('a', { heartSounds: 'abnormal', diagnosis: 'aortic-stenosis' }, 'physionet-2016');

test('a fully correct answer scores every labelled finding', () => {
  const s = scoreClip(murmurClip, { murmur: 'present', systolicMurmur: 'present', systolicTiming: 'holosystolic', systolicShape: 'plateau', systolicGrade: 3, diastolicMurmur: 'absent' });
  assert.equal(s.total, 6); assert.equal(s.correct, 6); assert.ok(s.allCorrect);
});

test('missing a murmur loses the murmur mark and every characterisation mark', () => {
  const s = scoreClip(murmurClip, { murmur: 'absent' });
  assert.equal(s.correct, 0); assert.equal(s.total, 6);
  assert.ok(s.items.filter(i => i.key !== 'murmur').every(i => i.given === undefined && !i.correct));
});

test('unlabelled findings are never scored, even if the candidate answers them', () => {
  const s = scoreClip(quietClip, { murmur: 'absent', systolicTiming: 'holosystolic', heartSounds: 'normal' });
  assert.deepEqual(s.items.map(i => i.key), ['murmur']);
  assert.equal(s.correct, 1); assert.ok(s.allCorrect);
});

test('grade is compared exactly, numbers not strings', () => {
  assert.equal(scoreClip(murmurClip, { systolicGrade: 2 }).items.find(i => i.key === 'systolicGrade')!.correct, false);
  assert.equal(scoreClip(murmurClip, { systolicGrade: '3' }).items.find(i => i.key === 'systolicGrade')!.correct, false);
});

test('adult clips score normal/abnormal and diagnosis group separately', () => {
  const s = scoreClip(adultClip, { heartSounds: 'abnormal', diagnosis: 'mitral-regurgitation' });
  assert.deepEqual(s.items.map(i => [i.key, i.correct]), [['heartSounds', true], ['diagnosis', false]]);
});

test('session summary tallies accuracy by finding type and lists missed clips', () => {
  const scores = [
    scoreClip(murmurClip, { murmur: 'present', systolicMurmur: 'present', systolicTiming: 'early-systolic', systolicShape: 'plateau', systolicGrade: 3, diastolicMurmur: 'absent' }),
    scoreClip(quietClip, { murmur: 'absent' }),
    scoreClip(adultClip, { heartSounds: 'abnormal', diagnosis: 'aortic-stenosis' }),
  ];
  const sum = summariseSession(scores);
  assert.equal(sum.clips, 3); assert.equal(sum.total, 9); assert.equal(sum.correct, 8);
  assert.deepEqual(sum.missedClipIds, ['m']);
  const murmur = sum.byFinding.find(f => f.key === 'murmur')!;
  assert.deepEqual([murmur.correct, murmur.total], [2, 2]);
  const timing = sum.byFinding.find(f => f.key === 'systolicTiming')!;
  assert.deepEqual([timing.correct, timing.total, timing.accuracy], [0, 1, 0]);
  assert.equal(sum.byFinding[0].key, 'heartSounds', 'summary is in clinical order');
  assert.equal(summariseSession([]).accuracy, 0);
});

test('spaced repetition: misses reset to box 0 and come back next drill; hits space out', () => {
  let st = emptyReviewState();
  st = recordResult(st, 'm', false);
  st = recordResult(st, 'q', true);
  assert.deepEqual([st.clips.m.box, st.clips.m.dueDrill], [0, 1]);
  assert.deepEqual([st.clips.q.box, st.clips.q.dueDrill], [1, 2]);
  st = finishDrill(st);
  st = recordResult(st, 'q', true);
  assert.deepEqual([st.clips.q.box, st.clips.q.dueDrill, st.clips.q.seen], [2, 5, 2]);
  for (let i = 0; i < 10; i++) st = recordResult(st, 'q', true);
  assert.equal(st.clips.q.box, 5);
});

test('pickDrill puts due/missed clips first, then unseen, and is deterministic for a seed', () => {
  const clips = ['a', 'b', 'c', 'd', 'e'].map(id => clip(id, { murmur: 'absent' }));
  let st = emptyReviewState();
  st = recordResult(st, 'c', false);  // due next drill
  st = recordResult(st, 'a', true); st = recordResult(st, 'a', true); // box 2, due later
  st = finishDrill(st);
  const picked = pickDrill(clips, st, 4, seededRandom(7)).map(c => c.id);
  assert.equal(picked[0], 'c');
  assert.equal(picked.length, 4);
  assert.ok(!picked.includes('a'), 'not-yet-due clip comes last');
  assert.deepEqual(pickDrill(clips, st, 4, seededRandom(7)).map(c => c.id), picked);
  assert.equal(pickDrill(clips, st, -1, seededRandom(1)).length, 0);
});

test('shuffle is a permutation and parseReviewState rejects junk', () => {
  const xs = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(shuffle(xs, seededRandom(3)).sort(), xs);
  assert.deepEqual(parseReviewState('not json'), emptyReviewState());
  assert.deepEqual(parseReviewState('{"version":2}'), emptyReviewState());
  assert.deepEqual(parseReviewState(null), emptyReviewState());
  const ok = recordResult(emptyReviewState(), 'x', true);
  assert.deepEqual(parseReviewState(JSON.stringify(ok)), ok);
});
