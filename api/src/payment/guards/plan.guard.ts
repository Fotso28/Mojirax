import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserPlan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRED_PLAN_KEY } from '../decorators/requires-plan.decorator';

const PLAN_HIERARCHY: Record<UserPlan, number> = {
  FREE: 0,
  PLUS: 1,
  PRO: 2,
  ELITE: 3,
};

@Injectable()
export class PlanGuard implements CanActivate {
  private readonly logger = new Logger(PlanGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<UserPlan>(REQUIRED_PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlan) return true;

    const request = context.switchToHttp().getRequest();
    const firebaseUid = request.user?.uid;

    if (!firebaseUid) {
      throw new ForbiddenException('Authentification requise');
    }

    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: { id: true, plan: true, planExpiresAt: true },
    });

    if (!user) {
      throw new ForbiddenException('Utilisateur introuvable');
    }

    // Lazy cleanup: si le plan a expiré, repasser en FREE
    if (
      user.plan !== UserPlan.FREE &&
      user.planExpiresAt &&
      user.planExpiresAt < new Date()
    ) {
      await this.prisma.user.update({
        where: { firebaseUid },
        data: { plan: UserPlan.FREE, stripeSubscriptionId: null },
      });
      this.logger.log(`Plan expiré pour user ${user.id}, repassé en FREE`);
      user.plan = UserPlan.FREE;
    }

    if (PLAN_HIERARCHY[user.plan] < PLAN_HIERARCHY[requiredPlan]) {
      throw new ForbiddenException(
        `Cette fonctionnalité nécessite le plan ${requiredPlan}. Votre plan actuel : ${user.plan}`,
      );
    }

    return true;
  }
}
