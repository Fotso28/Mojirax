import { UserPlan } from '@prisma/client';
import { PLAN_HIERARCHY } from './plan-limits.config';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  minPlan: UserPlan;
  enabled: boolean;
}

// Add new feature flags here as features are developed
export const FEATURE_FLAGS: FeatureFlag[] = [
  // Example: uncomment when a beta feature is ready
  // { key: 'ai_matching_v2', name: 'Matching IA v2', description: 'Algorithme de matching amélioré avec deep learning', minPlan: UserPlan.ELITE, enabled: false },
  // { key: 'video_pitch', name: 'Pitch Vidéo', description: 'Ajoutez une vidéo de pitch à votre projet', minPlan: UserPlan.ELITE, enabled: false },
];

export function getAvailableFlags(plan: UserPlan): FeatureFlag[] {
  return FEATURE_FLAGS.filter(
    (flag) => flag.enabled && PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[flag.minPlan],
  );
}

export function hasFeature(plan: UserPlan, featureKey: string): boolean {
  const flag = FEATURE_FLAGS.find((f) => f.key === featureKey);
  if (!flag || !flag.enabled) return false;
  return PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[flag.minPlan];
}
