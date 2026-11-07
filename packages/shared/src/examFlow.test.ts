import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getExamTimerTick, getExamTimerDeadline, isExplicitExamCompletion } from './examFlow';

test('deadline remains fixed across countdown ticks', () => {
  assert.equal(getExamTimerDeadline(null, 1_000, 540), 541_000);
  assert.equal(getExamTimerDeadline(541_000, 2_000, 540), 541_000);
  assert.equal(getExamTimerDeadline(541_000, 541_000, 540), 541_000);
});

test('timer expiry requests the same presentation transition as manual completion', () => {
  assert.deepEqual(getExamTimerTick(10_000, 9_501), { remainingSeconds: 1, shouldPresent: false });
  assert.deepEqual(getExamTimerTick(10_000, 10_000), { remainingSeconds: 0, shouldPresent: true });
  assert.deepEqual(getExamTimerTick(10_000, 11_000), { remainingSeconds: 0, shouldPresent: true });
});

test('completion declaration matcher handles voice punctuation without broad substrings', () => {
  assert.equal(isExplicitExamCompletion("I've finished my examination."), true);
  assert.equal(isExplicitExamCompletion('I have not finished'), false);
  assert.equal(isExplicitExamCompletion('I would like to complete a full cardiovascular exam'), false);
});
