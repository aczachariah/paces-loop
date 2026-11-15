/** Heart-sound sign-recognition drill: types shared by the library, scoring and UI. */

export type SignSourceId = 'physionet-2016' | 'circor-2022';

/** Every finding the drill can ask about. A clip is only ever asked about the keys its dataset labelled. */
export interface SignLabels {
  /** PhysioNet 2016 reference class (-1 normal / 1 abnormal). */
  heartSounds?: 'normal' | 'abnormal';
  /** PhysioNet 2016 training-c patient diagnosis group. */
  diagnosis?: 'normal' | 'aortic-stenosis' | 'mitral-regurgitation';
  /** CirCor patient-level murmur annotation (Present / Absent). */
  murmur?: 'present' | 'absent';
  systolicMurmur?: 'present' | 'absent';
  systolicTiming?: 'early-systolic' | 'mid-systolic' | 'late-systolic' | 'holosystolic';
  systolicShape?: 'crescendo' | 'decrescendo' | 'diamond' | 'plateau';
  /** Levine grade out of VI; CirCor only uses I-III. */
  systolicGrade?: 1 | 2 | 3;
  diastolicMurmur?: 'present' | 'absent';
}

export type FindingKey = keyof SignLabels;
export type FindingValue = NonNullable<SignLabels[FindingKey]>;
/** What the candidate committed. Undefined means not answered. */
export type SignAnswers = Partial<Record<FindingKey, string | number>>;

export interface SignClipContext {
  population: 'adult' | 'paediatric';
  ageGroup?: string;
  /** Auscultation site, when the dataset records it (CirCor only). */
  site: 'AV' | 'PV' | 'TV' | 'MV' | 'Phc' | null;
  siteName?: string;
}

export interface SignClip {
  id: string;
  audio: string;
  durationSec: number;
  source: SignSourceId;
  sourceName: string;
  sourceUrl: string;
  recordId: string;
  originalFile: string;
  licence: 'ODC-By-1.0';
  attribution: string;
  status: string;
  context: SignClipContext;
  labels: SignLabels;
}

export interface SignSource { name: string; url: string; licence: string; attribution: string }

export interface SignManifest {
  version: number;
  generatedBy: string;
  sources: Record<SignSourceId, SignSource>;
  clips: SignClip[];
}
