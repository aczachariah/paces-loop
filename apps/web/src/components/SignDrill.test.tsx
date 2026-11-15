import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { SIGN_CLIPS } from '@paces/shared';
import { SignAttribution, SignDrill, visibleQuestions } from './SignDrill';

function text(node: any): string {
  if (typeof node === 'string') return node;
  return (node.children || []).map(text).join('');
}
const byTestId = (root: TestRenderer.ReactTestInstance, id: string) => root.find(n => n.props['data-testid'] === id);

test('follow-up murmur questions only appear after the candidate says there is a murmur', () => {
  const clip = SIGN_CLIPS.find(c => c.labels.systolicTiming)!;
  assert.deepEqual(visibleQuestions(clip, {}).map(q => q.key), ['murmur']);
  assert.ok(visibleQuestions(clip, { murmur: 'present', systolicMurmur: 'present' }).map(q => q.key).includes('systolicTiming'));
  assert.deepEqual(visibleQuestions(clip, { murmur: 'absent' }).map(q => q.key), ['murmur']);
});

test('drill plays a clip without revealing its label, scores on commit and reaches the summary', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => { r = TestRenderer.create(<SignDrill />); });
  act(() => { byTestId(r.root, 'start-drill').props.onClick(); });
  const audio = byTestId(r.root, 'clip-audio');
  assert.match(audio.props.src, /^\/signs\/audio\/hs-\d+\.mp3$/);
  const clip = SIGN_CLIPS.find(c => c.audio === audio.props.src)!;
  const drillText = text(byTestId(r.root, 'sign-drill').children[0] as any);
  assert.doesNotMatch(JSON.stringify(r.toJSON()), /aortic-stenosis.*selected|Dataset label/);
  assert.ok(drillText.length > 0);
  for (let i = 0; i < 8; i++) {
    act(() => { byTestId(r.root, 'commit').props.onClick(); });
    const fb = text(byTestId(r.root, 'sign-feedback') as any);
    assert.match(fb, /correct/);
    if (i === 0) assert.match(fb, new RegExp(clip.recordId));
    act(() => { byTestId(r.root, 'next').props.onClick(); });
  }
  const summary = text(byTestId(r.root, 'sign-summary') as any);
  assert.match(summary, /findings correct/);
  assert.match(summary, /Accuracy by finding/);
  act(() => { byTestId(r.root, 'retry-missed').props.onClick(); });
  assert.ok(byTestId(r.root, 'clip-audio'));
  act(() => r.unmount());
});

test('attribution names both datasets and the licence', () => {
  const t = text(TestRenderer.create(<SignAttribution />).toJSON() as any);
  assert.match(t, /PhysioNet\/Computing in Cardiology Challenge 2016/);
  assert.match(t, /CirCor DigiScope/);
  assert.match(t, /Open Data Commons Attribution License v1\.0/);
});
