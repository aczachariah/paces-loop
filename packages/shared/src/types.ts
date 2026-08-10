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

// ─── AI Examiner Types ────────────────────────────────────────────

export interface AudioClip {
  label: string;
  url: string;
}

export interface CaseData {
  history: string;
  examFindings: string[];
  audioClips: AudioClip[];
  investigations: string[];
}

export interface CaseDefinition {
  id: string;
  system: 'cardio' | 'resp' | 'abdo' | 'neuro';
  title: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  brief: string;
  clinicalData: CaseData;
  expectedDifferentials: string[];
  examinerNotes: string;
}

export type ExaminerPhase = 'present' | 'viva' | 'feedback';

export interface ExaminerMessage {
  role: 'examiner' | 'candidate';
  content: string;
}

export interface ExaminerFeedback {
  score: number;
  maxScore: number;
  presentationFeedback: string;
  vivaFeedback: string;
  keySignsIdentified: string[];
  keySignsMissed: string[];
  differentialsCorrect: string[];
  differentialsMissed: string[];
  overallFeedback: string;
  passed: boolean;
}