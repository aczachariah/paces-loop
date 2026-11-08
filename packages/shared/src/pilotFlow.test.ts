import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardioCase1 } from './stations/cases';
import { selectExamFinding } from './examiners';
import { buildRetryPlan, summarizeActionCoverage } from './pilotFlow';

test('targeted retry is a fresh guided attempt of the same case with a concrete goal', () => {
  assert.deepEqual(buildRetryPlan(cardioCase1, ['  Rehearse a structured synthesis.  ', 'Second suggestion']), {
    caseId: cardioCase1.id,
    mode: 'guided',
    goal: 'Rehearse a structured synthesis.',
  });
  assert.equal(buildRetryPlan(cardioCase1, []).goal.length > 0, true);
});

test('action coverage distinguishes rehearsed actions from clinical sign recognition', () => {
  const required = cardioCase1.clinicalData.examFindings.find(finding => finding.required)!;
  const record = selectExamFinding(cardioCase1, { finding_id: required.id, correction: null });
  const summary = summarizeActionCoverage(cardioCase1, [record]);
  assert.ok(summary.rehearsed.some(finding => finding.id === required.id));
  assert.ok(summary.missed.every(finding => finding.id !== required.id));
  assert.ok(summary.percentage > 0 && summary.percentage < 100);
  assert.match(summary.assessmentNote, /Action coverage only/);
  assert.match(summary.assessmentNote, /do not demonstrate/);
  assert.equal(summarizeActionCoverage(cardioCase1, []).percentage, 0);
});
