export interface RequestGeneration {
  current: () => number;
  begin: () => number;
  invalidate: () => void;
  isCurrent: (generation: number) => boolean;
}

export function createRequestGeneration(): RequestGeneration {
  let generation = 0;
  return {
    current: () => generation,
    begin: () => ++generation,
    invalidate: () => { generation++; },
    isCurrent: value => value === generation,
  };
}

export function shouldApplyExaminationResponse(generation: RequestGeneration, requestGeneration: number, examining: boolean): boolean {
  return examining && generation.isCurrent(requestGeneration);
}

export function buildVivaRecoveryRequest(answersRecorded: number, totalQuestions: number, answer: string | null, token: string): { phase: 'viva' | 'feedback'; userInput: string; sessionToken: string } {
  const recoveringFinalAnswer = answersRecorded === totalQuestions - 1 && answer !== null;
  return {
    phase: recoveringFinalAnswer ? 'viva' : 'feedback',
    userInput: recoveringFinalAnswer ? answer : '',
    sessionToken: token,
  };
}
