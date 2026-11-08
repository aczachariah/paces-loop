import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import { AIExaminer } from './AIExaminer';
import ExaminingPhase from './ExaminingPhase';

let pending: Array<{ body: any; resolve: (value: any) => void; reject: (reason?: unknown) => void; signal: AbortSignal }> = [];
let requests: any[] = [];
const originalFetch = globalThis.fetch;

function jsonResponse(body: any, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const feedback = {
  score: 0, maxScore: 10, presentationFeedback: 'Practice feedback.', vivaFeedback: 'Practice feedback.',
  actionsRehearsed: [], actionsMissed: [], nextPracticeGoal: 'Structure the next presentation.',
  overallFeedback: 'Practice feedback.', differentialsCorrect: [], differentialsMissed: [], passed: null, assessmentKind: 'formative', examinationCoverage: 0,
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
  await act(async () => { await button(renderer.root, 'Start mock').props.onClick(); });
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
  await act(async () => { button(renderer.root, 'Retry full case with this goal').props.onClick(); });
  assert.ok(button(renderer.root, 'Start guided practice'));
  assert.match(JSON.stringify(renderer.toJSON()), /Structure the next presentation/);
  assert.equal(requests.length, 7, 'Retry must not submit against the completed session');
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
    caseData: { id: 'cardio-01', brief: 'Brief' }, timeRemaining: 540, findings: [], mode: 'mock' as const,
    sessionToken: null, onFinding: () => { throw new Error('Late finding leaked'); },
    onSessionToken: () => { throw new Error('Late token leaked'); }, onComplete: () => {},
  })); });
  t.after(() => act(() => renderer.unmount()));
  const textarea = renderer.root.findByType('textarea');
  await act(async () => { textarea.props.onChange({ target: { value: 'Inspect hands' } }); });
  await act(async () => { button(renderer.root, 'Examine').props.onClick(); });
  assert.equal(pending.length, 1);
  const presentButton = button(renderer.root, 'Present →');
  assert.equal(presentButton.props.disabled, undefined, 'Present must not be disabled during validation');
  await act(async () => { await presentButton.props.onClick(); });
  assert.equal(pending[0].signal.aborted, true);
  await act(async () => { pending.shift()!.resolve(jsonResponse({ finding: { findingId: 'hands' }, sessionToken: 'stale-token' })); });
  await flush();
});

test('failed viva answer remains editable for an identical retry', async t => {
  pending = []; requests = [];
  globalThis.fetch = ((input: any, init: any) => {
    const body = JSON.parse(init.body); requests.push(body);
    return new Promise((resolve, reject) => pending.push({ body, resolve, reject, signal: init.signal }));
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(AIExaminer)); });
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { button(renderer.root, 'Cardiovascular Case 01advanced').props.onClick(); });
  await act(async () => { button(renderer.root, 'Start mock').props.onClick(); });
  await act(async () => { renderer.root.findByType((await import('./CaseBrief')).CaseBrief).props.onComplete(); });
  await act(async () => { button(renderer.root, 'Present →').props.onClick(); });
  await act(async () => { renderer.root.findByType((await import('./PresentationInput')).PresentationInput).props.onSubmit('Presentation'); });
  pending.shift()!.resolve(jsonResponse({ examinerResponse: 'Question one', vivaQuestion: { id: 'q1', question: 'Question one' }, sessionToken: 'token-0' }));
  await flush();
  await act(async () => { renderer.root.findByType((await import('./VivaChat')).VivaChat).props.onSendMessage('Retain this answer'); });
  await act(async () => { pending.shift()!.reject(new Error('Network interrupted')); });
  await flush();
  assert.equal(renderer.root.findByType('textarea').props.value, 'Retain this answer');
  assert.equal(renderer.root.findByType('textarea').props.disabled, false);
  await act(async () => { renderer.root.findByProps({ 'aria-label': 'Submit answer' }).props.onClick(); });
  assert.equal(pending[0].body.userInput, 'Retain this answer');
  assert.equal(requests.filter(body => body.userInput === 'Retain this answer').length, 2);
});

test('two consecutive feedback failures keep the encounter recoverable', async t => {
  pending = []; requests = [];
  globalThis.fetch = ((input: any, init: any) => {
    const body = JSON.parse(init.body); requests.push(body);
    return new Promise((resolve, reject) => pending.push({ body, resolve, reject, signal: init.signal }));
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(AIExaminer)); });
  t.after(() => act(() => renderer.unmount()));
  await act(async () => { button(renderer.root, 'Cardiovascular Case 01advanced').props.onClick(); });
  await act(async () => { button(renderer.root, 'Start mock').props.onClick(); });
  await act(async () => { renderer.root.findByType((await import('./CaseBrief')).CaseBrief).props.onComplete(); });
  await act(async () => { button(renderer.root, 'Present →').props.onClick(); });
  await act(async () => { renderer.root.findByType((await import('./PresentationInput')).PresentationInput).props.onSubmit('Presentation'); });
  pending.shift()!.resolve(jsonResponse({ examinerResponse: 'Question one', vivaQuestion: { id: 'q1', question: 'Question one' }, sessionToken: 'token-0' }));
  await flush();

  for (let answer = 1; answer <= 4; answer++) {
    await act(async () => { renderer.root.findByType((await import('./VivaChat')).VivaChat).props.onSendMessage(`Answer ${answer}`); });
    pending.shift()!.resolve(jsonResponse({ examinerResponse: `Question ${answer + 1}`, vivaQuestion: { id: `q${answer + 1}`, question: `Question ${answer + 1}` }, sessionToken: `token-${answer}` }));
    await flush();
  }
  await act(async () => { renderer.root.findByType((await import('./VivaChat')).VivaChat).props.onSendMessage('Answer five'); });
  await act(async () => { pending.shift()!.reject(new Error('First failure')); });
  await flush();
  assert.ok(button(renderer.root, 'Generate feedback'), 'Generate feedback must be visible after first failure');

  await act(async () => { button(renderer.root, 'Generate feedback').props.onClick(); });
  assert.equal(pending.length, 1);
  assert.equal(pending[0].body.phase, 'viva');
  await act(async () => { pending.shift()!.resolve(jsonResponse({ error: 'Feedback unavailable', sessionToken: 'five-answer-token', feedbackReady: true }, 502)); });
  await flush();
  assert.ok(button(renderer.root, 'Generate feedback'), 'Generate feedback must remain visible after second failure');

  await act(async () => { button(renderer.root, 'Generate feedback').props.onClick(); });
  assert.equal(pending.length, 1);
  assert.equal(pending[0].body.phase, 'feedback');
  assert.equal(pending[0].body.userInput, '');
  assert.equal(pending[0].body.sessionToken, 'five-answer-token');
  pending.shift()!.resolve(jsonResponse({ examinerResponse: 'Feedback ready', feedback, sessionToken: 'token-5', complete: true }));
  await flush();
  assert.ok(renderer.root.findByType((await import('./AIScoreFeedback')).AIScoreFeedback));
});
