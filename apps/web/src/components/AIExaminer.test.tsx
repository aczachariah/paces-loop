import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import { AIExaminer } from './AIExaminer';
import ExaminingPhase from './ExaminingPhase';

let pending: Array<{ body: any; resolve: (value: any) => void; reject: (reason?: unknown) => void; signal: AbortSignal }> = [];
let requests: any[] = [];
const originalFetch = globalThis.fetch;
const originalScrollIntoView = (globalThis as any).HTMLElement?.prototype.scrollIntoView;

function jsonResponse(body: any, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const feedback = {
  score: 0, maxScore: 10, presentationFeedback: 'Practice feedback.', vivaFeedback: 'Practice feedback.',
  keySignsIdentified: [], keySignsMissed: [], differentialsCorrect: [], differentialsMissed: [],
  overallFeedback: 'Practice feedback.', passed: null, assessmentKind: 'formative', examinationCoverage: 0,
};

function button(root: TestRenderer.ReactTestInstance, label: string): TestRenderer.ReactTestInstance {
  const match = root.findAllByType('button').find(item => {
    const text = (function flatten(node: any): string {
      if (typeof node === 'string' || typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(flatten).join('');
      return node?.props ? flatten(node.props.children) : '';
    })(item);
    return text.includes(label);
  });
  assert.ok(match, `Missing button: ${label}`);
  return match!;
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

test('lost answer-five response retries the original answer and never submits a sixth', async t => {
  pending = []; requests = [];
  globalThis.fetch = ((input: any, init: any) => {
    if (input === '/api/tts') return Promise.resolve(jsonResponse({ error: 'Speech disabled for mocked UI tests' }, 503));
    const body = JSON.parse(init.body);
    requests.push(body);
    return new Promise((resolve, reject) => pending.push({ body, resolve, reject, signal: init.signal }));
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(AIExaminer)); });
  t.after(() => act(() => renderer.unmount()));

  await act(async () => { await button(renderer.root, 'Cardiovascular Case 01advanced').props.onClick(); });
  await act(async () => { await renderer.root.findByType((await import('./CaseBrief')).CaseBrief).props.onComplete(); });
  await act(async () => { await button(renderer.root, 'Present →').props.onClick(); });
  await act(async () => { renderer.root.findByType((await import('./PresentationInput')).PresentationInput).props.onSubmit('My presentation'); });
  pending.shift()!.resolve(jsonResponse({ examinerResponse: 'Question one', vivaQuestion: { id: 'q1', question: 'Question one' }, sessionToken: 'token-0' }));
  await flush();

  for (let answer = 1; answer <= 4; answer++) {
    await act(async () => { renderer.root.findByType((await import('./VivaChat')).VivaChat).props.onSendMessage(`Answer ${answer}`); });
    pending.shift()!.resolve(jsonResponse({ examinerResponse: `Question ${answer + 1}`, vivaQuestion: { id: `q${answer + 1}`, question: `Question ${answer + 1}` }, sessionToken: `token-${answer}` }));
    await flush();
  }
  await act(async () => { renderer.root.findByType((await import('./VivaChat')).VivaChat).props.onSendMessage('Answer five'); });
  assert.equal(pending[0].body.userInput, 'Answer five');
  await act(async () => { pending.shift()!.reject(new Error('Response lost')); });
  await flush();

  const feedbackButton = button(renderer.root, 'Generate feedback');
  await act(async () => { feedbackButton.props.onClick(); });
  assert.equal(pending.length, 1);
  assert.equal(pending[0].body.phase, 'viva');
  assert.equal(pending[0].body.userInput, 'Answer five');
  pending.shift()!.resolve(jsonResponse({ examinerResponse: 'Feedback ready', feedback, sessionToken: 'token-5', complete: true }));
  await flush();
  assert.ok(renderer.root.findByType((await import('./AIScoreFeedback')).AIScoreFeedback));
  assert.equal(requests.filter(body => body.userInput === 'Answer five').length, 2, 'Only the original attempt and its identical retry are allowed');
  assert.equal(requests.some(body => body.userInput === 'Sixth answer'), false);
});

test('Present during examination aborts and ignores a late response', async t => {
  pending = []; requests = [];
  globalThis.fetch = ((input: any, init: any) => {
    if (input === '/api/tts') return Promise.resolve(jsonResponse({ error: 'Speech disabled for mocked UI tests' }, 503));
    const body = JSON.parse(init.body); requests.push(body);
    return new Promise((resolve, reject) => pending.push({ body, resolve, reject, signal: init.signal }));
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(ExaminingPhase, {
    caseData: { id: 'cardio-01', brief: 'Brief' }, timeRemaining: 540, findings: [],
    sessionToken: null, onFinding: () => { throw new Error('Late finding leaked'); },
    onSessionToken: () => { throw new Error('Late token leaked'); }, onComplete: () => {},
  })); });
  t.after(() => act(() => renderer.unmount()));
  const textarea = renderer.root.findByType('textarea');
  await act(async () => { textarea.props.onChange({ target: { value: 'Inspect hands' } }); });
  await act(async () => { button(renderer.root, 'Examine').props.onClick(); });
  assert.equal(pending.length, 1);
  await act(async () => { await button(renderer.root, 'Present →').props.onClick(); });
  assert.equal(pending[0].signal.aborted, true);
  await act(async () => { pending.shift()!.resolve(jsonResponse({ finding: { findingId: 'hands' }, sessionToken: 'stale-token' })); });
  await flush();
});
