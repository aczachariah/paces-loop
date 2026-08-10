import type { CaseDefinition } from '../types';

/**
 * PACES Case Library — structured cases for AI Examiner mode.
 * Each case contains the brief (what the candidate reads), clinical data
 * (history, findings, audio, investigations), expected differentials,
 * and examiner notes for the AI to reference.
 */

export const cardioCase1: CaseDefinition = {
  id: 'cardio-mitral-regurg',
  system: 'cardio',
  title: 'Mitral Regurgitation',
  difficulty: 'advanced',
  brief: `A 68-year-old retired teacher presents with a 6-month history of progressive shortness of breath on exertion and palpitations. She has a history of hypertension and was told she had a "heart murmur" 5 years ago. She is a non-smoker.`,
  clinicalData: {
    history: 'SOB on exertion (NYHA II-III), orthopnoea, paroxysmal nocturnal dyspnoea, palpitations. No chest pain. No ankle swelling.',
    examFindings: [
      'Atrial fibrillation (irregularly irregular pulse)',
      'Elevated JVP with prominent v waves',
      'Displaced, hyperdynamic apex beat (lateral to midclavicular line, 6th intercostal space)',
      'Pan-systolic murmur loudest at apex, radiating to axilla',
      'Soft S1, wide-splitting S2',
      'Bibasal fine inspiratory crackles',
    ],
    audioClips: [
      { label: 'Pan-systolic murmur (mitral regurgitation)', url: '/audio/pan-systolic-murmur.mp3' },
      { label: 'Atrial fibrillation — irregularly irregular pulse', url: '/audio/afib-rhythm.mp3' },
    ],
    investigations: [
      'ECG: Atrial fibrillation, left ventricular hypertrophy, left atrial enlargement',
      'CXR: Cardiomegaly, upper lobe blood diversion, Kerley B lines',
      'Echo: Severe mitral regurgitation, LV dilated, LVEF 45%, left atrial dilation',
    ],
  },
  expectedDifferentials: [
    'Chronic mitral regurgitation (most likely rheumatic / degenerative)',
    'Left ventricular failure secondary to volume overload',
    'Atrial fibrillation with rapid ventricular response',
  ],
  examinerNotes: 'Key signs: pan-systolic murmur at apex radiating to axilla, displaced apex, AF, elevated JVP with v waves. Candidate should suggest echo as key investigation, comment on medical vs surgical management (valve repair vs replacement), and recognise signs of heart failure.',
};

export const cardioCase2: CaseDefinition = {
  id: 'cardio-aortic-stenosis',
  system: 'cardio',
  title: 'Aortic Stenosis',
  difficulty: 'intermediate',
  brief: `A 74-year-old man presents with exertional chest pain and dizziness over the past 3 months. He has also noticed worsening shortness of breath. He has a history of hypertension and hypercholesterolaemia.`,
  clinicalData: {
    history: 'Exertional angina (central chest tightness when walking uphill), pre-syncope on standing, progressive SOB (NYHA II-III). No palpitations. No syncope.',
    examFindings: [
      'Slow-rising, low-volume carotid pulse (pulsus parvus et tardus)',
      'Heaving, non-displaced apex beat',
      'Ejection systolic murmur loudest at right upper sternal edge, radiating to carotids',
      'S4 gallop (atrial kick against stiff LV)',
      'Soft or reversed splitting of S2',
      'Signs of heart failure if decompensated',
    ],
    audioClips: [
      { label: 'Ejection systolic murmur (aortic stenosis)', url: '/audio/aortic-stenosis-murmur.mp3' },
      { label: 'Slow-rising carotid pulse description', url: '/audio/slow-rising-pulse.mp3' },
    ],
    investigations: [
      'ECG: Left ventricular hypertrophy with strain pattern, left atrial enlargement',
      'CXR: Prominent ascending aorta, calcified aortic valve, pulmonary congestion',
      'Echo: Severe AS (aortic valve area <1.0 cm²), LVH, LVEF 55%',
    ],
  },
  expectedDifferentials: [
    'Severe aortic stenosis (degenerative calcific)',
    'Hypertrophic cardiomyopathy (excluded by echo)',
    'Coronary artery disease (may coexist)',
  ],
  examinerNotes: 'Key signs: slow-rising pulse, ejection systolic murmur radiating to carotids, heaving apex. Candidate should mention echo for severity grading, discuss symptoms (angina, syncope, SOB = poor prognosis), and know that severe symptomatic AS requires surgical valve replacement.',
};

export const respCase1: CaseDefinition = {
  id: 'resp-copd-exacerbation',
  system: 'resp',
  title: 'COPD Exacerbation',
  difficulty: 'basic',
  brief: `A 65-year-old man with a 40-pack-year smoking history presents with worsening shortness of breath, cough, and purulent sputum over the past 5 days. He has a known diagnosis of COPD and uses inhalers.`,
  clinicalData: {
    history: 'Increasing SOB at rest and on minimal exertion, productive cough with yellow-green sputum, wheeze. No fevers. No haemoptysis. Reduced exercise tolerance compared to baseline.',
    examFindings: [
      'Tachypnoeic (RR 24), using accessory muscles',
      'Pursed-lip breathing',
      'Hyperinflation (barrel chest, reduced crico-sternal distance)',
      'Reduced chest expansion bilaterally',
      'Hyper-resonant percussion note',
      'Widespread expiratory wheeze',
      'Prolonged expiratory phase',
      'Distant heart sounds due to hyperinflation',
    ],
    audioClips: [
      { label: 'Expiratory wheeze (COPD)', url: '/audio/expiratory-wheeze.mp3' },
      { label: 'Prolonged expiration', url: '/audio/prolonged-expiration.mp3' },
    ],
    investigations: [
      'CXR: Hyperinflation, flattened hemidiaphragms, bullae, no consolidation',
      'ABG: Type 1 or Type 2 respiratory failure depending on severity',
      'Sputum culture: H. influenzae or S. pneumoniae',
      'FBC: Raised WCC (infection)',
    ],
  },
  expectedDifferentials: [
    'Acute exacerbation of COPD (infective or non-infective)',
    'Community-acquired pneumonia',
    'Heart failure (may coexist)',
  ],
  examinerNotes: 'Key signs: hyperinflation, wheeze, pursed-lip breathing, reduced expansion. Candidate should check oxygen saturation, arrange CXR, ABG, and escalate to NIV if hypercapnic. Must differentiate from asthma and heart failure.',
};

export const neuroCase1: CaseDefinition = {
  id: 'neuro-upper-limb-lesion',
  system: 'neuro',
  title: 'Upper Limb Neurological Lesion',
  difficulty: 'intermediate',
  brief: `A 52-year-old right-handed woman presents with a 3-week history of progressive weakness in her left arm and leg. She has also noticed numbness in her left hand and occasional clumsiness when walking.`,
  clinicalData: {
    history: 'Progressive left-sided weakness over 3 weeks, left hand paraesthesia, dragging left leg when walking. No headache. No visual symptoms. No sphincter disturbance. Previously well, no significant PMH.',
    examFindings: [
      'Left-sided hemiparesis (power 4/5 in left arm and leg)',
      'Increased tone in left arm and leg (spasticity)',
      'Hyperreflexia in left biceps, triceps, knee, and ankle reflexes',
      'Left extensor plantar response (upgoing toe)',
      'Reduced sensation to pinprick and light touch on left side',
      'Normal cranial nerves including visual fields',
      'Normal cerebellar function',
    ],
    audioClips: [],
    investigations: [
      'CT head: Rule out haemorrhage first',
      'MRI brain with contrast: Identify lesion location and nature',
      'If contrast-enhancing lesion: Consider primary tumour, metastasis, or demyelination',
    ],
  },
  expectedDifferentials: [
    'Right-sided brain lesion (upper motor neuron) — stroke, tumour, or demyelination',
    'Cerebral space-occupying lesion (primary or secondary)',
    'Multiple sclerosis (demyelinating plaque)',
  ],
  examinerNotes: 'Key feature: UMN signs on left = right brain lesion. Candidate must localise the lesion first (UMN vs LMN, then which side of brain/spinal cord). Important to differentiate stroke (acute) vs tumour (subacute/progressive). Imaging strategy is critical: CT first if stroke suspected, MRI for tumour/demyelination.',
};

export const abdoCase1: CaseDefinition = {
  id: 'abdo-hepatomegaly',
  system: 'abdo',
  title: 'Hepatomegaly with Ascites',
  difficulty: 'advanced',
  brief: `A 58-year-old man presents with a 2-month history of increasing abdominal distension, dull right upper quadrant pain, and weight loss. He drinks 30 units of alcohol per week and has a history of hepatitis C.`,
  clinicalData: {
    history: 'Progressive abdominal swelling, early satiety, dull ache in RUQ, unintentional weight loss of 8 kg over 3 months. Mild ankle swelling. No haematemesis. No melaena.',
    examFindings: [
      'Distended abdomen with flank dullness and shifting dullness (ascites)',
      'Palpable, firm, nodular liver 4 cm below costal margin',
      'Caput medusae (dilated abdominal wall veins)',
      'Palmar erythema and spider naevi on chest',
      'Mild pitting ankle oedema',
      'No splenomegaly',
    ],
    audioClips: [],
    investigations: [
      'Liver ultrasound with Doppler: Cirrhotic liver, nodularity, ascites, portal vein patency',
      'LFTs: Elevated ALT, AST, ALP, low albumin, elevated bilirubin',
      'Ascitic tap: Serum-ascites albumin gradient (SAAG) >1.1 g/dL suggests portal hypertension',
      'Alpha-fetoprotein (AFP): Screen for hepatocellular carcinoma',
      'CT abdomen: Further characterise liver lesions',
    ],
  },
  expectedDifferentials: [
    'Decompensated chronic liver disease (alcoholic + hepatitis C cirrhosis)',
    'Hepatocellular carcinoma (HCC) in cirrhotic liver',
    'Portal hypertension with ascites',
    'Consider portal vein thrombosis',
  ],
  examinerNotes: 'Key signs: ascites, firm nodular liver, stigmata of chronic liver disease (spider naevi, palmar erythema, caput medusae). Candidate must differentiate transudative vs exudative ascites, check for HCC with AFP and imaging, and discuss management of ascites (salt restriction, diuretics, paracentesis), and alcohol cessation.',
};

/** All cases grouped by system for easy selection */
export const caseLibrary: Record<string, CaseDefinition[]> = {
  cardio: [cardioCase1, cardioCase2],
  resp: [respCase1],
  neuro: [neuroCase1],
  abdo: [abdoCase1],
};

/** Flat array of all cases */
export const allCases: CaseDefinition[] = [
  cardioCase1, cardioCase2, respCase1, neuroCase1, abdoCase1,
];

/** Get a case by ID */
export function getCaseById(id: string): CaseDefinition | undefined {
  return allCases.find(c => c.id === id);
}

/** Get cases by system */
export function getCasesBySystem(system: CaseDefinition['system']): CaseDefinition[] {
  return caseLibrary[system] || [];
}