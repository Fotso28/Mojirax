import { SetMetadata } from '@nestjs/common';
import { UserPlan } from '@prisma/client';

export const REQUIRED_PLAN_KEY = 'requiredPlan';

export const RequiresPlan = (plan: UserPlan) => SetMetadata(REQUIRED_PLAN_KEY, plan);
