import { Inject, Injectable, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-firebase-jwt';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FirebaseStrategy extends PassportStrategy(Strategy, 'firebase-jwt') {
    private readonly logger = new Logger(FirebaseStrategy.name);

    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        });
    }

    async validate(token: string): Promise<admin.auth.DecodedIdToken> {
        try {
            const firebaseUser = await admin.auth().verifyIdToken(token);
            if (!firebaseUser) {
                throw new UnauthorizedException();
            }

            // Check if user is banned
            const user = await this.prisma.user.findUnique({
                where: { firebaseUid: firebaseUser.uid },
                select: { status: true },
            });

            if (user?.status === 'BANNED') {
                this.logger.warn(`Banned user attempted access: firebaseUid=${firebaseUser.uid}`);
                throw new ForbiddenException({
                    statusCode: 403,
                    code: 'ACCOUNT_BANNED',
                    message: 'Votre compte a été désactivé, contactez le support',
                });
            }

            return firebaseUser;
        } catch (error) {
            if (error instanceof ForbiddenException) throw error;
            this.logger.warn(`Firebase token validation failed: ${(error as Error).message}`);
            throw new UnauthorizedException('Invalid Firebase Token');
        }
    }
}
