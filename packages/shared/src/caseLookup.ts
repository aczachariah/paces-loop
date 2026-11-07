import 'server-only';
import { allCases } from './stations/cases';

const privateCaseIdsByPublicId: Record<string, string> = {
  'cardio-01': 'cardio-mitral-regurg',
  'cardio-02': 'cardio-aortic-stenosis',
  'resp-01': 'resp-copd-exacerbation',
  'neuro-01': 'neuro-upper-limb-lesion',
  'abdo-01': 'abdo-hepatomegaly',
};

export function resolvePublicCase(publicId: string) {
  const privateId = privateCaseIdsByPublicId[publicId];
  return privateId ? allCases.find(item => item.id === privateId) : undefined;
}
