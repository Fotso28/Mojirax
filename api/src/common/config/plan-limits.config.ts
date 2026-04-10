import { UserPlan } from '@prisma/client';

export const PLAN_HIERARCHY: Record<UserPlan, number> = {
  FREE: 0,
  PLUS: 1,
  PRO: 2,
  ELITE: 3,
};

export interface PlanLimits {
  messagesPerDay: number;
  savesMax: number;
  boostsPerMonth: number;
}

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  FREE: { messagesPerDay: 10, savesMax: 10, boostsPerMonth: 0 },
  PLUS: { messagesPerDay: 50, savesMax: Infinity, boostsPerMonth: 0 },
  PRO: { messagesPerDay: Infinity, savesMax: Infinity, boostsPerMonth: 5 },
  ELITE: { messagesPerDay: Infinity, savesMax: Infinity, boostsPerMonth: 15 },
};

export function getPlanLimits(plan: UserPlan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
}

/**
 * Retourne true si le plan est payant (PLUS, PRO, ou ELITE).
 */
export function hasPaidPlan(plan: UserPlan): boolean {
  return plan !== UserPlan.FREE;
}
