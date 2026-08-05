import type { Station } from '../types';

export interface AssessmentCriterion {
  id: string;
  category: string;
  description: string;
  points: number;
}

export interface StationConfig {
  station: Station;
  scenario: {
    candidateInstructions: string;
    patientBrief: string;
    examinerBrief: string;
  };
  assessmentCriteria: AssessmentCriterion[];
  mockFeedback: {
    performance: 'excellent' | 'satisfactory' | 'needs-improvement';
    score: number;
    feedback: string;
  }[];
}

export const cardiovascularStation: StationConfig = {
  station: {
    id: 'cardiovascular-examination',
    title: 'Cardiovascular Examination',
    description: 'Perform a full cardiovascular examination on the patient and present your findings.',
    type: 'examination',
    durationMinutes: 10,
  },
  scenario: {
    candidateInstructions: 'You have 10 minutes to perform a cardiovascular examination on this 55-year-old patient who presented with shortness of breath. Please present your findings and a brief differential diagnosis to the examiner.',
    patientBrief: 'You are a 55-year-old patient named John/Jane Doe. You have been experiencing mild shortness of breath on exertion for the past 3 months. You do not have chest pain. If asked, you have a history of hypertension.',
    examinerBrief: 'Observe the candidate\'s examination technique. Ensure they perform hand hygiene, position the patient correctly (45 degrees), and systematically examine the hands, face, neck, and precordium. Ask them for their findings and differential diagnosis at the end.',
  },
  assessmentCriteria: [
    { id: 'intro', category: 'Preparation', description: 'Introduces self, confirms patient identity, explains procedure, and obtains consent.', points: 1 },
    { id: 'hygiene', category: 'Preparation', description: 'Performs hand hygiene before touching the patient.', points: 1 },
    { id: 'position', category: 'Preparation', description: 'Positions the patient appropriately at 45 degrees with adequate exposure.', points: 1 },
    { id: 'general', category: 'Inspection', description: 'Performs general inspection (hands, face, eyes, mouth) for signs of cardiovascular disease.', points: 2 },
    { id: 'pulse', category: 'Palpation', description: 'Correctly assesses radial pulse (rate, rhythm) and checks for radio-femoral delay.', points: 2 },
    { id: 'jvp', category: 'Inspection', description: 'Accurately measures and interprets the Jugular Venous Pressure (JVP).', points: 2 },
    { id: 'precordium_palpation', category: 'Palpation', description: 'Palpates the precordium (apex beat, heaves, thrills).', points: 2 },
    { id: 'auscultation', category: 'Auscultation', description: 'Auscultates the four valve areas with both bell and diaphragm, and checks for radiation (carotids, axilla).', points: 3 },
    { id: 'presentation', category: 'Communication', description: 'Presents findings clearly and proposes an accurate differential diagnosis.', points: 3 },
  ],
  mockFeedback: [
    {
      performance: 'excellent',
      score: 15,
      feedback: 'Excellent systematic approach. Hand hygiene and patient positioning were perfect. Accurately identified the apex beat and auscultated all valve areas correctly. Presentation of findings was fluent and differential diagnosis was highly accurate.',
    },
    {
      performance: 'satisfactory',
      score: 11,
      feedback: 'Good overall examination. Followed the correct sequence. Missed checking for radio-femoral delay but auscultated all areas. Presentation was clear, though differential diagnosis could be more structured.',
    },
    {
      performance: 'needs-improvement',
      score: 6,
      feedback: 'The examination lacked structure. Forgot hand hygiene and did not position the patient at 45 degrees. Auscultation was rushed and missed key valve areas. Presentation of findings was disorganized.',
    },
  ],
};