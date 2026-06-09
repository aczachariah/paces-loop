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