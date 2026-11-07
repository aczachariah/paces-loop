import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';

process.env.ENGY_API_KEY = 'test-key';
process.env.SAYGM_API_KEY = '';
process.env.EXAM_SESSION_SECRET = 'test-only-secret-with-at-least-32-characters';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
const require = createRequire(import.meta.url);
const { POST } = require('./route') as typeof import('./route');
const caseId = 'cardio-mitral-regurg';

async function post(body: Record<string, unknown>) {
  const request = new NextRequest('http://localhost/api/examine', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const response = await POST(request);
  return { status: response.status, body: await response.json() };
}

function mockInference(t: any, selector: unknown, feedback?: unknown) {
  const calls: any[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (_input: any, init?: any) => {
    const payload = JSON.parse(init.body);
    calls.push(payload);
    const selecting = payload.messages[0].content.includes('AVAILABLE STEPS');
    const content = JSON.stringify(selecting ? selector : feedback);
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = original; });
  return calls;
}

const validFeedback = {
  presentation: 'Structured and accurate.', differentials: 'The primary differential is supported.',
  viva: 'Answers show sound reasoning.', improvements: ['Complete the systematic examination.'],
  presentationScore: 2, vivaScore: 3, differentialsRecognised: ['Chronic mitral regurgitation'],
};

test('complete flow uses signed evidence and rejects a sixth answer', async t => {
  const calls = mockInference(t, { finding_id: 'hands', correction: null }, validFeedback);
  const examined = await post({ caseId, phase: 'examine', userInput: 'Inspect the hands', conversationHistory: [] });
  assert.equal(examined.status, 200);
  assert.equal(examined.body.finding.findingId, 'hands');
  assert.equal(examined.body.finding.bodySystem, 'hands');
  assert.ok(examined.body.sessionToken);

  const presented = await post({ caseId, phase: 'present', userInput: 'Chronic mitral regurgitation.', sessionToken: examined.body.sessionToken });
  assert.equal(presented.status, 200);
  assert.ok(presented.body.vivaQuestion.id);
  assert.equal(presented.body.questionCount, 1);

  let token = presented.body.sessionToken;
  let final: any;
  for (let answer = 1; answer <= 5; answer++) {
    final = await post({ caseId, phase: 'viva', userInput: `Clinical answer ${answer}`, sessionToken: token });
    assert.equal(final.status, 200);
    token = final.body.sessionToken;
    if (answer < 5) {
      assert.equal(final.body.complete, false);
      assert.equal(final.body.questionCount, answer + 1);
    }
  }
  assert.equal(final.body.complete, true);
  assert.equal(final.body.feedback.assessmentKind, 'formative');
  assert.equal(final.body.feedback.passed, null);
  assert.equal(final.body.feedback.examinationCoverage, 0);
  assert.equal(calls.length, 2, 'only examine and final feedback need inference');
  const feedbackEvidence = calls[1].messages[1].content;
  assert.ok(feedbackEvidence.includes('Clinical answer 5'));
  assert.ok(feedbackEvidence.includes('No clubbing, splinter haemorrhages or tar staining.'));
  assert.ok(!feedbackEvidence.includes('undefined'));

  const sixth = await post({ caseId, phase: 'viva', userInput: 'Extra answer', sessionToken: token });
  assert.equal(sixth.status, 409);
  assert.equal(calls.length, 2);
});

test('clarification establishes a session for zero-finding presentation', async t => {
  mockInference(t, { finding_id: null, correction: 'Name a specific examination technique.' }, validFeedback);
  const clarified = await post({ caseId, phase: 'examine', userInput: 'Examine patient', conversationHistory: [] });
  assert.equal(clarified.status, 200);
  const presented = await post({ caseId, phase: 'present', userInput: 'Presentation without findings', sessionToken: clarified.body.sessionToken });
  assert.equal(presented.status, 200);
  assert.equal(presented.body.questionCount, 1);
  const completed = await post({ caseId, phase: 'feedback', userInput: '', sessionToken: await completeViva(presented.body.sessionToken) });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.feedback.assessmentKind, 'formative');
});

test('direct presentation starts an empty examination session', async t => {
  mockInference(t, { finding_id: 'hands', correction: null }, validFeedback);
  const presented = await post({ caseId, phase: 'present', userInput: 'No examination was performed.', sessionToken: null });
  assert.equal(presented.status, 200);
  assert.equal(presented.body.questionCount, 1);
  const premature = await post({ caseId, phase: 'feedback', userInput: '', sessionToken: presented.body.sessionToken });
  assert.equal(premature.status, 409);
  assert.equal(premature.body.feedback, undefined);
  const completed = await post({ caseId, phase: 'feedback', userInput: '', sessionToken: await completeViva(presented.body.sessionToken) });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.feedback.examinationCoverage, 0);
});

test('provider errors and unknown finding IDs never become clinical findings', async t => {
  mockInference(t, { finding_id: 'invented', correction: null });
  const response = await post({ caseId, phase: 'examine', userInput: 'Inspect hands', conversationHistory: [] });
  assert.equal(response.status, 502);
  assert.equal(response.body.finding, undefined);
  assert.ok(response.body.error);
});

test('unmatched utterance returns clarification without an abnormal finding', async t => {
  mockInference(t, { finding_id: null, correction: 'Name a specific examination technique.' });
  const response = await post({ caseId, phase: 'examine', userInput: 'Examine patient', conversationHistory: [] });
  assert.equal(response.status, 200);
  assert.equal(response.body.finding, null);
  assert.match(response.body.clarification, /specific examination/);
});

test('tampered session is rejected before viva progression or inference', async t => {
  const calls = mockInference(t, { finding_id: 'hands', correction: null }, validFeedback);
  const response = await post({ caseId, phase: 'viva', userInput: 'answer', sessionToken: 'forged.token' });
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});

test('fifth-answer provider failure preserves progress for an explicit feedback retry', async t => {
  const original = globalThis.fetch;
  let feedbackCalls = 0;
  globalThis.fetch = async (input: any, init?: any) => {
    if (String(input).includes('/chat/completions')) {
      if (JSON.parse(init?.body).messages[0].content.includes('VIVA GUIDANCE')) {
        feedbackCalls++;
        if (feedbackCalls === 1) throw new Error('simulated provider failure');
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(validFeedback) } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ finding_id: 'hands', correction: null }) } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = original; });
  const examined = await post({ caseId, phase: 'examine', userInput: 'Inspect hands', sessionToken: createEmptyToken() });
  const presented = await post({ caseId, phase: 'present', userInput: 'Presentation', sessionToken: examined.body.sessionToken });
  let token = presented.body.sessionToken;
  for (let answer = 1; answer <= 4; answer++) {
    const response = await post({ caseId, phase: 'viva', userInput: `Answer ${answer}`, sessionToken: token });
    token = response.body.sessionToken;
  }
  const failed = await post({ caseId, phase: 'viva', userInput: 'Final answer', sessionToken: token });
  assert.equal(failed.status, 502);
  assert.ok(failed.body.sessionToken);
  assert.equal(failed.body.feedbackReady, true);
  assert.equal(feedbackCalls, 1);
  const extra = await post({ caseId, phase: 'viva', userInput: 'Should not be accepted', sessionToken: failed.body.sessionToken });
  assert.equal(extra.status, 409);
  assert.equal(feedbackCalls, 1);
  const retried = await post({ caseId, phase: 'feedback', userInput: '', sessionToken: failed.body.sessionToken });
  assert.equal(retried.status, 200);
  assert.equal(retried.body.complete, true);
  assert.equal(retried.body.feedback.assessmentKind, 'formative');
  assert.equal(feedbackCalls, 2);
});

async function completeViva(initialToken: string): Promise<string> {
  let token = initialToken;
  for (let answer = 1; answer <= 5; answer++) {
    const response = await post({ caseId, phase: 'viva', userInput: `Answer ${answer}`, sessionToken: token });
    assert.equal(response.status, 200);
    token = response.body.sessionToken;
  }
  return token;
}

function createEmptyToken(): string {
  const payload = Buffer.from(JSON.stringify({ version: 1, caseId, caseVersion: 2, startedAt: Date.now(), updatedAt: Date.now(), findings: [], answers: [] })).toString('base64url');
  const signature = createHmac('sha256', process.env.EXAM_SESSION_SECRET!).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

test('malformed rubric scores fail safely instead of producing a score', async t => {
  const calls = mockInference(t, { finding_id: 'hands', correction: null }, { ...validFeedback, presentationScore: 99 });
  const examined = await post({ caseId, phase: 'examine', userInput: 'Inspect hands', conversationHistory: [] });
  const presented = await post({ caseId, phase: 'present', userInput: 'Presentation', sessionToken: examined.body.sessionToken });
  let token = presented.body.sessionToken;
  let response: any;
  for (let answer = 1; answer <= 5; answer++) {
    response = await post({ caseId, phase: 'viva', userInput: `Answer ${answer}`, sessionToken: token });
    token = response.body.sessionToken || token;
  }
  assert.equal(response.status, 502);
  assert.equal(response.body.feedback, undefined);
  assert.equal(calls.length, 2);
});
