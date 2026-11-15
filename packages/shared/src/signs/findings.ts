import type { FindingKey, SignLabels } from './types';

export interface FindingOption { value: string | number; label: string }
export interface FindingDefinition {
  key: FindingKey;
  question: string;
  /** Short name used in the session summary. */
  summaryLabel: string;
  options: FindingOption[];
  /** Only shown when the candidate's own earlier answer makes the question relevant. */
  dependsOn?: { key: FindingKey; value: string };
}

/** Display order is clinical order: overall, murmur present, characterise, then diagnosis. */
export const FINDINGS: FindingDefinition[] = [
  { key: 'heartSounds', question: 'Overall, are these heart sounds normal or abnormal?', summaryLabel: 'Normal vs abnormal',
    options: [{ value: 'normal', label: 'Normal' }, { value: 'abnormal', label: 'Abnormal' }] },
  { key: 'murmur', question: 'Is there a murmur?', summaryLabel: 'Murmur present?',
    options: [{ value: 'present', label: 'Murmur present' }, { value: 'absent', label: 'No murmur' }] },
  { key: 'systolicMurmur', question: 'Is there a systolic murmur?', summaryLabel: 'Systolic component',
    options: [{ value: 'present', label: 'Yes' }, { value: 'absent', label: 'No' }], dependsOn: { key: 'murmur', value: 'present' } },
  { key: 'systolicTiming', question: 'Timing of the systolic murmur', summaryLabel: 'Systolic timing',
    options: [
      { value: 'early-systolic', label: 'Early systolic' }, { value: 'mid-systolic', label: 'Mid systolic' },
      { value: 'late-systolic', label: 'Late systolic' }, { value: 'holosystolic', label: 'Holosystolic (pansystolic)' },
    ], dependsOn: { key: 'systolicMurmur', value: 'present' } },
  { key: 'systolicShape', question: 'Shape of the systolic murmur', summaryLabel: 'Systolic shape',
    options: [
      { value: 'crescendo', label: 'Crescendo' }, { value: 'decrescendo', label: 'Decrescendo' },
      { value: 'diamond', label: 'Crescendo-decrescendo (diamond)' }, { value: 'plateau', label: 'Plateau' },
    ], dependsOn: { key: 'systolicMurmur', value: 'present' } },
  { key: 'systolicGrade', question: 'Grade of the systolic murmur', summaryLabel: 'Systolic grade',
    options: [{ value: 1, label: 'I/VI' }, { value: 2, label: 'II/VI' }, { value: 3, label: 'III/VI' }],
    dependsOn: { key: 'systolicMurmur', value: 'present' } },
  { key: 'diastolicMurmur', question: 'Is there a diastolic murmur?', summaryLabel: 'Diastolic component',
    options: [{ value: 'present', label: 'Yes' }, { value: 'absent', label: 'No' }], dependsOn: { key: 'murmur', value: 'present' } },
  { key: 'diagnosis', question: 'Which diagnosis group fits best?', summaryLabel: 'Diagnosis group',
    options: [
      { value: 'normal', label: 'Normal' }, { value: 'aortic-stenosis', label: 'Aortic stenosis' },
      { value: 'mitral-regurgitation', label: 'Mitral regurgitation' },
    ] },
];

export const FINDINGS_BY_KEY: Record<FindingKey, FindingDefinition> =
  Object.fromEntries(FINDINGS.map(f => [f.key, f])) as Record<FindingKey, FindingDefinition>;

/** The questions asked for a clip: exactly the findings its dataset labelled, in clinical order. */
export function questionsForClip(labels: SignLabels): FindingDefinition[] {
  return FINDINGS.filter(f => labels[f.key] !== undefined);
}

export function optionLabel(key: FindingKey, value: unknown): string {
  if (value === undefined || value === null || value === '') return 'Not answered';
  return FINDINGS_BY_KEY[key].options.find(o => o.value === value)?.label ?? String(value);
}
