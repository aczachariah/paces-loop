import type { CaseSummary } from './types';

export const publicCases: CaseSummary[] = [
  { id: 'cardio-mitral-regurg', system: 'cardio', difficulty: 'advanced', label: 'Cardiovascular Case 01', brief: 'A 68-year-old retired teacher presents with a 6-month history of progressive shortness of breath on exertion and palpitations. She has hypertension and was told she had a heart murmur 5 years ago. She is a non-smoker.' },
  { id: 'cardio-aortic-stenosis', system: 'cardio', difficulty: 'intermediate', label: 'Cardiovascular Case 02', brief: 'A 74-year-old man presents with exertional chest pain and dizziness over three months, with worsening exertional breathlessness. He has hypertension and hypercholesterolaemia.' },
  { id: 'resp-copd-exacerbation', system: 'resp', difficulty: 'basic', label: 'Respiratory Case 01', brief: 'A 65-year-old man with a 40-pack-year smoking history presents with five days of worsening breathlessness, cough and purulent sputum. He has known COPD and uses inhalers.' },
  { id: 'neuro-upper-limb-lesion', system: 'neuro', difficulty: 'intermediate', label: 'Neurological Case 01', brief: 'A 52-year-old right-handed woman presents with three weeks of progressive weakness in her left arm and leg, left-hand numbness and clumsiness when walking.' },
  { id: 'abdo-hepatomegaly', system: 'abdo', difficulty: 'advanced', label: 'Gastrointestinal Case 01', brief: 'A 58-year-old man presents with two months of abdominal distension, dull right-upper-quadrant pain and weight loss. He drinks 30 units of alcohol weekly and has hepatitis C.' },
];
