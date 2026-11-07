import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildVivaRecoveryRequest, createRequestGeneration, shouldApplyExaminationResponse } from './examRequest';

test('late examination response cannot overwrite a newer phase', () => {
  const generation = createRequestGeneration();
  const request = generation.begin();
  assert.equal(shouldApplyExaminationResponse(generation, request, true), true);
  generation.invalidate();
  assert.equal(shouldApplyExaminationResponse(generation, request, false), false);
});

test('final answer retry uses the same answer only when it is not yet recorded', () => {
  assert.deepEqual(buildVivaRecoveryRequest(4, 5, 'Answer five', 'signed'), { phase: 'viva', userInput: 'Answer five', sessionToken: 'signed' });
  assert.deepEqual(buildVivaRecoveryRequest(5, 5, 'Answer five', 'signed'), { phase: 'feedback', userInput: '', sessionToken: 'signed' });
  assert.equal(buildVivaRecoveryRequest(3, 5, 'Answer four', 'signed').phase, 'feedback');
});
