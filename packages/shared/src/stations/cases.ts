import type { CaseDefinition } from '../types';

/**
 * PACES Case Library — structured cases for AI Examiner mode.
 * Each case contains findings organised by examination technique so the
 * AI can respond correctly when a candidate describes a specific step.
 */

// ─── Cardio: Mitral Regurgitation ─────────────────────────────────

export const cardioCase1: CaseDefinition = {
  id: 'cardio-mitral-regurg',
  system: 'cardio',
  title: 'Mitral Regurgitation',
  difficulty: 'advanced',
  brief: `A 68-year-old retired teacher presents with a 6-month history of progressive shortness of breath on exertion and palpitations. She has a history of hypertension and was told she had a "heart murmur" 5 years ago. She is a non-smoker.`,
  clinicalData: {
    history: 'SOB on exertion (NYHA II-III), orthopnoea, paroxysmal nocturnal dyspnoea, palpitations. No chest pain. No ankle swelling.',
    examFindings: [
      'General inspection: breathless at rest, using 2 pillows (orthopnoea), no cyanosis',
      'Around the bed: inhalers, GTN spray, no oxygen',
      'Hands: no clubbing, no splinter haemorrhages, no tar staining',
      'Radial pulse: irregularly irregular (atrial fibrillation), rate ~100bpm',
      'Blood pressure: 130/70 (no significant difference between arms)',
      'Face: malar flush, no pallor, conjunctivae normal',
      'JVP: elevated at 8cm with prominent v waves (tricuspid regurgitation from RV volume overload)',
      'Trachea: central',
      'Inspect chest: no scars, no deformities, normal AP diameter',
      'Palpate chest: apex beat displaced laterally to 6th intercostal space, anterior axillary line — hyperdynamic and volume-loaded',
      'Palpate right ventricular heave: none',
      'Percuss chest: resonant, no dullness',
      'Auscultate lung bases: bibasal fine inspiratory crackles (pulmonary oedema)',
      'Auscultate apex with bell: pan-systolic murmur loudest at apex, radiating to axilla',
      'Auscultate left sternal edge: soft S1, wide-splitting S2, no added sounds',
      'Auscultate aortic area: no murmur',
      'Auscultate pulmonary area: no murmur',
      'Auscultate carotids: no bruit',
      'Abdomen: soft, non-tender, no organomegaly, no ascites',
      'Legs: no peripheral oedema, no calf tenderness, normal capillary refill',
      'Sacral oedema: none',
      'Ankle jerks: present and equal bilaterally',
      'Plantar responses: down-going bilaterally',
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

// ─── Cardio: Aortic Stenosis ──────────────────────────────────────

export const cardioCase2: CaseDefinition = {
  id: 'cardio-aortic-stenosis',
  system: 'cardio',
  title: 'Aortic Stenosis',
  difficulty: 'intermediate',
  brief: `A 74-year-old man presents with exertional chest pain and dizziness over the past 3 months. He has also noticed worsening shortness of breath. He has a history of hypertension and hypercholesterolaemia.`,
  clinicalData: {
    history: 'Exertional angina (central chest tightness when walking uphill), pre-syncope on standing, progressive SOB (NYHA II-III). No palpitations. No syncope.',
    examFindings: [
      'General inspection: comfortable at rest, no distress, no cyanosis',
      'Around the bed: no inhalers, no GTN, no oxygen',
      'Hands: no clubbing, warm peripheries, no splinter haemorrhages',
      'Radial pulse: slow-rising, low volume — pulsus parvus et tardus (classic AS sign)',
      'Blood pressure: narrow pulse pressure — 110/85 (normal systolic, elevated diastolic)',
      'Face: no malar flush, conjunctivae normal, no pallor',
      'JVP: normal at 3cm, no elevation',
      'Trachea: central',
      'Inspect chest: no scars, no deformities',
      'Palpate chest: heaving, non-displaced apex beat in 5th intercostal space, midclavicular line — pressure-loaded LV',
      'Palpate for thrill: systolic thrill palpable at right upper sternal edge',
      'Percuss chest: resonant, normal',
      'Auscultate lung bases: clear, no crackles (if decompensated, crackles present)',
      'Auscultate aortic area: ejection systolic murmur, loudest at right upper sternal edge, radiating to carotids',
      'Auscultate apex: murmur heard at apex but softer than at aortic area',
      'Auscultate left sternal edge: S4 gallop (atrial kick against stiff LV)',
      'Auscultate S2: soft or reversed splitting of S2',
      'Auscultate carotids: radiation of murmur heard, no bruit',
      'Abdomen: soft, non-tender, no organomegaly',
      'Legs: no peripheral oedema, no calf tenderness',
      'Sacral oedema: none',
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

// ─── Resp: COPD Exacerbation ──────────────────────────────────────

export const respCase1: CaseDefinition = {
  id: 'resp-copd-exacerbation',
  system: 'resp',
  title: 'COPD Exacerbation',
  difficulty: 'basic',
  brief: `A 65-year-old man with a 40-pack-year smoking history presents with worsening shortness of breath, cough, and purulent sputum over the past 5 days. He has a known diagnosis of COPD and uses inhalers.`,
  clinicalData: {
    history: 'Increasing SOB at rest and on minimal exertion, productive cough with yellow-green sputum, wheeze. No fevers. No haemoptysis. Reduced exercise tolerance compared to baseline.',
    examFindings: [
      'General inspection: tachypnoeic at rest (RR 24), using accessory muscles, pursed-lip breathing',
      'Around the bed: blue inhalers (salbutamol), brown inhaler (beclometasone), sputum pot with purulent sputum, no oxygen at home',
      'Hands: no clubbing (important negative — COPD alone does not cause clubbing), no cyanosis',
      'Hands tar staining: yellow/brown staining on index and middle fingers (smoking)',
      'Radial pulse: bounding, full volume (may indicate CO₂ retention)',
      'Asterixis (flapping tremor): positive — ask patient to hold arms extended with wrists extended — flapping tremor suggests CO₂ retention and type 2 respiratory failure',
      'Blood pressure: normal range',
      'Face: plethoric (ruddy complexion from secondary polycythaemia), conjunctival suffusion',
      'JVP: may be elevated if cor pulmonale has developed — check at 45 degrees',
      'Trachea: central (deviated only if pneumothorax or fibrosis)',
      'Inspect chest: barrel-shaped, hyperinflated, reduced crico-sternal distance (<3 fingerbreadths), using accessory muscles (SCM, intercostals)',
      'Measure chest expansion: reduced bilaterally — <2cm expansion',
      'Palpate chest: no tenderness, no masses',
      'Palpate apex beat: difficult to palpate (hyperinflation pushes heart medially)',
      'Percuss chest: hyper-resonant throughout — classic sign of hyperinflation',
      'Percuss liver span: liver dullness may be displaced downward (hyperinflation pushes diaphragm down)',
      'Auscultate breath sounds: distant/quiet breath sounds bilaterally (hyperinflation)',
      'Auscultate lung bases: fine crackles may be present if secretions',
      'Auscultate wheeze: widespread expiratory wheeze, prolonged expiratory phase (>4 seconds)',
      'Auscultate heart sounds: distant heart sounds due to hyperinflation',
      'Abdomen: soft, non-tender — check for liver descent (pushed down by hyperinflation)',
      'Legs: check for pitting ankle oedema — present if cor pulmonale has developed',
      'Cough: ask patient to cough — productive of yellow-green purulent sputum',
    ],
    audioClips: [
      { label: 'Expiratory wheeze (COPD)', url: '/audio/expiratory-wheeze.mp3' },
      { label: 'Prolonged expiration', url: '/audio/prolonged-expiration.mp3' },
    ],
    investigations: [
      'CXR: Hyperinflation, flattened hemidiaphragms, bullae, no consolidation',
      'ABG: Type 1 or Type 2 respiratory failure depending on severity',
      'Sputum culture: H. influenzae or S. pneumoniae',
      'FBC: Raised WCC (infection), raised Hb (polycythaemia from chronic hypoxia)',
    ],
  },
  expectedDifferentials: [
    'Acute exacerbation of COPD (infective or non-infective)',
    'Community-acquired pneumonia',
    'Heart failure (may coexist)',
  ],
  examinerNotes: 'Key signs: hyperinflation, wheeze, pursed-lip breathing, reduced expansion, asterixis (CO₂ retention). Candidate should check oxygen saturation, arrange CXR, ABG. Must differentiate from asthma and heart failure. Check for cor pulmonale signs (JVP, ankle oedema, loud P2).',
};

// ─── Neuro: Upper Limb Lesion ─────────────────────────────────────

export const neuroCase1: CaseDefinition = {
  id: 'neuro-upper-limb-lesion',
  system: 'neuro',
  title: 'Upper Limb Neurological Lesion',
  difficulty: 'intermediate',
  brief: `A 52-year-old right-handed woman presents with a 3-week history of progressive weakness in her left arm and leg. She has also noticed numbness in her left hand and occasional clumsiness when walking.`,
  clinicalData: {
    history: 'Progressive left-sided weakness over 3 weeks, left hand paraesthesia, dragging left leg when walking. No headache. No visual symptoms. No sphincter disturbance. Previously well, no significant PMH.',
    examFindings: [
      'General inspection: patient alert and orientated, speaking normally',
      'Around the bed: walking stick, no other aids',
      'Hands: no wasting, no fasciculations (upper motor neuron lesion does not cause wasting)',
      'Tone in left arm: increased (spasticity) — clasp-knife rigidity on rapid movement',
      'Tone in right arm: normal',
      'Tone in left leg: increased (spasticity)',
      'Tone in right leg: normal',
      'Power in left arm: 4/5 (MRC scale) — reduced throughout left arm',
      'Power in right arm: 5/5 — normal',
      'Power in left leg: 4/5 — reduced',
      'Power in right leg: 5/5 — normal',
      'Reflexes left biceps: hyperreflexic (+++)',
      'Reflexes right biceps: normal (++)',
      'Reflexes left triceps: hyperreflexic (+++)',
      'Reflexes right triceps: normal (++)',
      'Reflexes left supinator: hyperreflexic (+++)',
      'Reflexes right supinator: normal (++)',
      'Reflexes left knee: hyperreflexic (+++)',
      'Reflexes right knee: normal (++)',
      'Reflexes left ankle: hyperreflexic (+++)',
      'Reflexes right ankle: normal (++)',
      'Plantar response left: extensor (upgoing toe — UMN sign)',
      'Plantar response right: flexor (normal downgoing)',
      'Sensation light touch left: reduced on entire left side',
      'Sensation light touch right: normal',
      'Sensation pinprick left: reduced on entire left side',
      'Sensation pinprick right: normal',
      'Sensation proprioception left: intact',
      'Sensation vibration left: intact',
      'Cranial nerves I-XII: all normal — including visual fields, fundoscopy, eye movements, facial sensation and movement, hearing, palate, tongue',
      'Coordination left arm: normal (no cerebellar signs) — past pointing absent',
      'Coordination right arm: normal',
      'Gait: left-sided circumduction (hemiparetic gait), reduced left arm swing',
      'Romberg test: negative (stands steady with eyes closed)',
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

// ─── Abdo: Hepatomegaly with Ascites ──────────────────────────────

export const abdoCase1: CaseDefinition = {
  id: 'abdo-hepatomegaly',
  system: 'abdo',
  title: 'Hepatomegaly with Ascites',
  difficulty: 'advanced',
  brief: `A 58-year-old man presents with a 2-month history of increasing abdominal distension, dull right upper quadrant pain, and weight loss. He drinks 30 units of alcohol per week and has a history of hepatitis C.`,
  clinicalData: {
    history: 'Progressive abdominal swelling, early satiety, dull ache in RUQ, unintentional weight loss of 8 kg over 3 months. Mild ankle swelling. No haematemesis. No melaena.',
    examFindings: [
      'General inspection: thin, jaundiced (yellow sclera), appears chronically unwell',
      'Around the bed: no alcohol bottles visible',
      'Hands: palmar erythema (thenar and hypothenar eminences), Dupuytren contracture possible',
      'Nails: leukonychia (white nails — hypoalbuminaemia), clubbing absent',
      'Radial pulse: normal rate and volume',
      'Asterixis (flapping tremor): positive in decompensated liver disease (hepatic encephalopathy)',
      'Face: jaundiced sclera, spider naevi on face and chest (>5 suggests significant liver disease)',
      'Mouth: foetor hepaticus (sweet, musty breath — portosystemic shunting)',
      'JVP: normal at 3cm (liver is enlarged due to cirrhosis, not right heart failure)',
      'Trachea: central',
      'Inspect chest: gynaecomastia (loss of male hair pattern, breast tissue), spider naevi on chest',
      'Palpate chest: no tenderness, normal expansion',
      'Auscultate chest: clear lung fields',
      'Inspect abdomen: distended — tense, shiny skin with dilated abdominal wall veins (caput medusae — blood flows away from umbilicus), umbilical hernia possible',
      'Auscultate abdomen: bowel sounds present, normal',
      'Palpate abdomen superficially: firm, non-tender, no guarding',
      'Palpate liver: firm, nodular, non-tender liver edge 4cm below costal margin in midclavicular line',
      'Palpate spleen: not palpable (no splenomegaly on examination)',
      'Palpate kidneys: not ballotable',
      'Percuss liver span: increased — 16cm in midclavicular line',
      'Percuss shifting dullness: positive — confirms ascites (dullness shifts with position)',
      'Percuss fluid thrill: present in tense ascites',
      'Inguinal hernia: possible due to increased intra-abdominal pressure',
      'External genitalia: testicular atrophy (loss of androgens)',
      'Legs: pitting ankle oedema bilaterally (hypoalbuminaemia / portal hypertension)',
      'Sacral oedema: present if fluid overload',
      'Neurological: assessment for hepatic encephalopathy (confusion, asterixis, disorientation)',
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

// ─── All Cases ────────────────────────────────────────────────────

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