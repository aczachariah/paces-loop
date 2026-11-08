export interface User {
  id: string;
  name: string;
  email: string;
  role: 'candidate' | 'examiner' | 'patient' | 'admin';
}

export interface Station {
  id: string;
  title: string;
  description: string;
  type: 'communication' | 'history' | 'examination' | 'clinical-reasoning';
  durationMinutes: number;
}

export interface Assessment {
  id: string;
  stationId: string;
  candidateId: string;
  examinerId: string;
  score: number;
  feedback: string;
  createdAt: Date;
}

export interface AudioClip { label: string; url: string; }
export type FindingTechnique = 'inspection' | 'palpation' | 'percussion' | 'auscultation' | 'general';
export type BodySystem = 'hands' | 'face' | 'chest' | 'abdo' | 'legs' | 'neuro';

export interface CaseFinding {
  id: string;
  label: string;
  bodyPart: string;
  bodySystem: BodySystem;
  technique: FindingTechnique;
  normal: boolean;
  finding: string;
  required: boolean;
}

export interface CaseData {
  history: string;
  examFindings: CaseFinding[];
  audioClips: AudioClip[];
  investigations: string[];
}

export interface VivaQuestion { id: string; question: string; guidance: string; }

export interface CaseDefinition {
  id: string;
  version: number;
  clinicalReviewStatus: 'draft-needs-clinician-review';
  system: 'cardio' | 'resp' | 'abdo' | 'neuro';
  title: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  brief: string;
  clinicalData: CaseData;
  expectedDifferentials: string[];
  examinerNotes: string;
  vivaQuestions: VivaQuestion[];
}

export interface CaseSummary {
  id: string;
  system: CaseDefinition['system'];
  label: string;
  difficulty: CaseDefinition['difficulty'];
  brief: string;
}

export interface ExamRecord {
  findingId: string;
  said?: string;
  finding: string;
  bodyPart: string;
  bodySystem: BodySystem;
  technique: FindingTechnique;
  normal: boolean;
  correction: string | null;
}

export type ExaminerPhase = 'present' | 'viva' | 'feedback';
export interface ExaminerMessage { role: 'examiner' | 'candidate'; content: string; questionId?: string; }

export interface ExaminerFeedback {
  score: number;
  maxScore: number;
  presentationFeedback: string;
  vivaFeedback: string;
  actionsRehearsed: string[];
  actionsMissed: string[];
  nextPracticeGoal: string;
  differentialsCorrect: string[];
  differentialsMissed: string[];
  overallFeedback: string;
  passed: null;
  assessmentKind: 'formative';
  examinationCoverage: number;
}
