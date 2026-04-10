import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { hasFeature } from '../config/feature-flags';

export const REQUIRED_FEATURE_KEY = 'requiredFeature';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(REQUIRED_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) return true;

    const request = context.switchToHttp().getRequest();
    const firebaseUid = request.user?.uid;
    if (!firebaseUid) throw new ForbiddenException('Authentification requise');

    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: { plan: true },
    });
    if (!user) throw new ForbiddenException('Utilisateur introuvable');

    if (!hasFeature(user.plan, requiredFeature)) {
      throw new ForbiddenException(`Cette fonctionnalité n'est pas disponible pour votre plan.`);
    }

    return true;
  }
}
