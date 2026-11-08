import type { CaseDefinition, ExamRecord } from './types';

export type PracticeMode = 'guided' | 'mock';

export interface RetryPlan {
  caseId: string;
  mode: 'guided';
  goal: string;
}

export function buildRetryPlan(caseData: Pick<CaseDefinition, 'id'>, improvements: string[]): RetryPlan {
  const goal = improvements.find(item => item.trim())?.trim() || 'Repeat the examination, then give a structured synthesis of your findings.';
  return { caseId: caseData.id, mode: 'guided', goal };
}

export function summarizeActionCoverage(caseData: CaseDefinition, examination: ExamRecord[]) {
  const required = caseData.clinicalData.examFindings.filter(finding => finding.required);
  const rehearsedIds = new Set(examination.map(record => record.findingId));
  const rehearsed = required.filter(finding => rehearsedIds.has(finding.id));
  return {
    rehearsed,
    missed: required.filter(finding => !rehearsedIds.has(finding.id)),
    percentage: required.length ? Math.round(rehearsed.length / required.length * 100) : 100,
    assessmentNote: 'Action coverage only. Requested findings do not demonstrate physical examination technique or independent sign recognition.',
  };
}
