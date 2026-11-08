import 'server-only';
import type { CaseDefinition, ExamRecord, ExaminerFeedback, VivaQuestion } from './types';

export interface FindingSelection { finding_id: string; correction: string | null; }
export interface FeedbackAssessment {
  presentation: string;
  differentials: string;
  viva: string;
  improvements: string[];
  presentationScore: number;
  vivaScore: number;
  differentialsRecognised: string[];
}

export function selectExamFinding(caseData: CaseDefinition, selection: FindingSelection): ExamRecord {
  const finding = caseData.clinicalData.examFindings.find(item => item.id === selection.finding_id);
  if (!finding) throw new Error(`Unknown finding ID: ${selection.finding_id}`);
  return {
    findingId: finding.id, bodyPart: finding.bodyPart, bodySystem: finding.bodySystem,
    technique: finding.technique, normal: finding.normal, finding: finding.finding,
    correction: selection.correction ?? null,
  };
}

export function getNextVivaQuestion(caseData: CaseDefinition, askedQuestionIds: string[]): VivaQuestion | null {
  const asked = new Set(askedQuestionIds);
  return caseData.vivaQuestions.find(question => !asked.has(question.id)) ?? null;
}

export { isExplicitExamCompletion } from './examFlow';

export function buildFormativeFeedback(caseData: CaseDefinition, examination: ExamRecord[], assessment: FeedbackAssessment): ExaminerFeedback {
  const required = caseData.clinicalData.examFindings.filter(finding => finding.required);
  const discovered = new Set(examination.map(record => record.findingId));
  const identified = required.filter(finding => discovered.has(finding.id));
  const missed = required.filter(finding => !discovered.has(finding.id));
  const coverage = required.length ? identified.length / required.length : 1;
  const recognised = assessment.differentialsRecognised.filter(item => caseData.expectedDifferentials.includes(item));
  return {
    score: Math.min(10, Math.round(coverage * 5) + assessment.presentationScore + assessment.vivaScore),
    maxScore: 10,
    presentationFeedback: assessment.presentation,
    vivaFeedback: assessment.viva,
    actionsRehearsed: identified.map(finding => finding.finding),
    actionsMissed: missed.map(finding => finding.finding),
    nextPracticeGoal: assessment.improvements[0]?.trim() || 'Repeat the encounter and give a structured synthesis of your findings.',
    differentialsCorrect: recognised,
    differentialsMissed: recognised.includes(caseData.expectedDifferentials[0]) ? [] : [caseData.expectedDifferentials[0]],
    overallFeedback: `${assessment.differentials}\n\nNext steps:\n${assessment.improvements.map(item => `- ${item}`).join('\n')}`,
    passed: null,
    assessmentKind: 'formative',
    examinationCoverage: Math.round(coverage * 100),
  };
}
