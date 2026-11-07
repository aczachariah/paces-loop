import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createExamSessionToken, readExamSessionToken, rehydrateExamination, type ExamSession } from './examSession';
import { cardioCase1 } from '@paces/shared/server';

const secret = 'test-only-secret-with-at-least-32-characters';
const session: ExamSession = {
  version: 1, caseId: cardioCase1.id, caseVersion: cardioCase1.version,
  startedAt: 1_000, updatedAt: 1_000, findings: [], answers: [],
};

test('signed session round trips and rejects tampering', () => {
  const token = createExamSessionToken(session, secret);
  assert.deepEqual(readExamSessionToken(token, secret, cardioCase1, 2_000), session);
  assert.throws(() => readExamSessionToken(`${token.slice(0, -1)}x`, secret, cardioCase1, 2_000));
  assert.throws(() => readExamSessionToken(token, 'wrong-secret-with-at-least-32-characters', cardioCase1, 2_000));
});

test('session expires and cannot change case versions', () => {
  const token = createExamSessionToken(session, secret);
  assert.throws(() => readExamSessionToken(token, secret, cardioCase1, 1_000 + 2 * 60 * 60 * 1000 + 1));
  assert.throws(() => readExamSessionToken(token, secret, { ...cardioCase1, version: 99 }, 2_000));
});

test('feedback evidence comes from server case definitions, not client finding prose', () => {
  const signed = { ...session, findings: [{ findingId: 'hands', said: 'Inspect hands', correction: null }] };
  const result = rehydrateExamination(signed, cardioCase1);
  assert.equal(result[0].finding, cardioCase1.clinicalData.examFindings.find(item => item.id === 'hands')!.finding);
  assert.equal(result[0].bodySystem, 'hands');
  assert.throws(() => rehydrateExamination({ ...signed, findings: [{ findingId: 'invented', said: 'fake', correction: null }] }, cardioCase1));
});
