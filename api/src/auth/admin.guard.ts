import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const firebaseUid = request.user?.uid;

    if (!firebaseUid) {
      this.logger.warn(`Admin access denied: no firebaseUid on request`);
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: { id: true, role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      this.logger.warn(`Admin access denied for firebaseUid=${firebaseUid} (role=${user?.role || 'unknown'})`);
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    // Attach internal user id + role without overwriting Firebase uid
    request.user.dbId = user.id;
    request.user.role = user.role;

    return true;
  }
}
