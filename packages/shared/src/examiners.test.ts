import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardioCase1, allCases } from './stations/cases';
import { resolvePublicCase } from './caseLookup';
import { publicCases } from './publicCases';
import { buildFormativeFeedback, getNextVivaQuestion, isExplicitExamCompletion, selectExamFinding } from './examiners';

test('examine returns canonical finding and never accepts a foreign ID', () => {
  const id = cardioCase1.clinicalData.examFindings[0].id;
  const result = selectExamFinding(cardioCase1, { finding_id: id, correction: null });
  assert.equal(result.findingId, id);
  assert.equal(result.finding, cardioCase1.clinicalData.examFindings[0].finding);
  assert.throws(() => selectExamFinding(cardioCase1, { finding_id: 'invented', correction: null }));
});

test('normal findings retain canonical text', () => {
  const normal = cardioCase1.clinicalData.examFindings.find(finding => finding.normal);
  assert.ok(normal);
  assert.ok(selectExamFinding(cardioCase1, { finding_id: normal.id, correction: null }).finding.length > 0);
});

test('viva asks the first question immediately and completes after five answers', () => {
  const asked: string[] = [];
  for (let i = 0; i < 5; i++) {
    const question = getNextVivaQuestion(cardioCase1, asked);
    assert.ok(question);
    asked.push(question.id);
  }
  assert.equal(getNextVivaQuestion(cardioCase1, asked), null);
});

test('only explicit examination declarations end the exam', () => {
  assert.equal(isExplicitExamCompletion('I have finished my examination.'), true);
  assert.equal(isExplicitExamCompletion('That concludes my examination'), true);
  assert.equal(isExplicitExamCompletion('I have not finished'), false);
  assert.equal(isExplicitExamCompletion('I would like to complete a full cardiovascular exam'), false);
});

test('public metadata hides diagnoses and confidential findings', () => {
  assert.equal(publicCases.length, allCases.length);
  for (const item of publicCases) {
    assert.equal('title' in item, false);
    assert.equal('clinicalData' in item, false);
    assert.equal(item.label.includes('Mitral'), false);
    assert.match(item.id, /^[a-z]+-[a-z0-9]+$/);
    assert.equal(/mitral|regurg|aortic|stenosis|copd|hepat|lesion/i.test(item.id), false);
  }
  assert.equal(resolvePublicCase('cardio-01')?.id, cardioCase1.id);
  assert.equal(resolvePublicCase(cardioCase1.id), undefined);
});

test('case definitions have unique finding IDs and case-specific viva guidance', () => {
  for (const item of allCases) {
    assert.equal(new Set(item.clinicalData.examFindings.map(finding => finding.id)).size, item.clinicalData.examFindings.length);
    assert.equal(item.vivaQuestions.length, 5);
    assert.ok(item.clinicalData.examFindings.some(finding => finding.required));
    assert.equal(item.clinicalReviewStatus, 'draft-needs-clinician-review');
  }
});

test('feedback uses rubric assessment rather than presentation length or unanswered questions', () => {
  const shortExcellent = buildFormativeFeedback(cardioCase1, [], {
    presentation: 'Concise and accurate.', differentials: 'Correct.', viva: 'Not answered.', improvements: ['Answer the question.'],
    presentationScore: 2, vivaScore: 0, differentialsRecognised: ['Chronic mitral regurgitation'],
  });
  const longEmpty = buildFormativeFeedback(cardioCase1, [], {
    presentation: 'Repetitive.', differentials: 'No diagnosis.', viva: 'No answers.', improvements: ['Structure the presentation.'],
    presentationScore: 0, vivaScore: 0, differentialsRecognised: [],
  });
  assert.equal(shortExcellent.score, 2);
  assert.equal(longEmpty.score, 0);
  assert.deepEqual(shortExcellent.differentialsCorrect, ['Chronic mitral regurgitation']);
  assert.equal(shortExcellent.examinationCoverage, 0);
});

test('feedback includes examination coverage and is formative', () => {
  const finding = cardioCase1.clinicalData.examFindings.find(item => item.required)!;
  const record = selectExamFinding(cardioCase1, { finding_id: finding.id, correction: null });
  const feedback = buildFormativeFeedback(cardioCase1, [record], {
    presentation: 'Clear presentation.', differentials: 'Correct differential.', viva: 'No viva answers.', improvements: ['Complete the examination.'],
    presentationScore: 2, vivaScore: 0, differentialsRecognised: ['Chronic mitral regurgitation'],
  });
  assert.equal(feedback.passed, null);
  assert.equal(feedback.assessmentKind, 'formative');
  assert.ok(feedback.keySignsIdentified.includes(finding.finding));
  assert.ok(feedback.keySignsMissed.length > 0);
  assert.ok(feedback.examinationCoverage < 100);
});
