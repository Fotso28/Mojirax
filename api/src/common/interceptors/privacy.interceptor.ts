import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
    Inject,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { UserPlan } from '@prisma/client';

// Champs sensibles à masquer par type d'objet
const USER_SENSITIVE_FIELDS = ['email', 'phone', 'linkedinUrl', 'websiteUrl', 'githubUrl', 'portfolioUrl'];
const CANDIDATE_SENSITIVE_FIELDS = ['resumeUrl'];

const PLAN_CACHE_TTL_SECONDS = 60;
const PLAN_CACHE_PREFIX = 'privacy:plan:';

interface PlanInfo {
    id: string;
    plan: UserPlan;
    planExpiresAt: Date | null;
}

@Injectable()
export class PrivacyInterceptor implements NestInterceptor {
    private readonly logger = new Logger(PrivacyInterceptor.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const firebaseUid = request.user?.uid || null;

        return next.handle().pipe(
            switchMap((data) => {
                if (!data || typeof data !== 'object') return from(Promise.resolve(data));

                return from(this.applyPrivacy(data, firebaseUid));
            }),
        );
    }

    private async applyPrivacy(data: any, firebaseUid: string | null): Promise<any> {
        const currentUser = firebaseUid ? await this.resolvePlanInfo(firebaseUid) : null;
        return this.processResponse(data, currentUser);
    }

    /**
     * Resolve the caller's plan info with a 60s Redis cache to avoid
     * hitting Postgres on every request.
     * Cache miss: read DB and SETEX the result (null for unknown users
     * is cached as the literal 'none' string to avoid thundering herd
     * on invalid tokens).
     */
    private async resolvePlanInfo(firebaseUid: string): Promise<PlanInfo | null> {
        const key = PLAN_CACHE_PREFIX + firebaseUid;
        try {
            const cached = await this.redis.get(key);
            if (cached === 'none') return null;
            if (cached) {
                const parsed = JSON.parse(cached) as { id: string; plan: UserPlan; planExpiresAt: string | null };
                return {
                    id: parsed.id,
                    plan: parsed.plan,
                    planExpiresAt: parsed.planExpiresAt ? new Date(parsed.planExpiresAt) : null,
                };
            }
        } catch (err: any) {
            this.logger.warn(`Redis plan cache read failed: ${err.message}`);
        }

        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true, plan: true, planExpiresAt: true },
        });

        try {
            if (user) {
                await this.redis.setex(
                    key,
                    PLAN_CACHE_TTL_SECONDS,
                    JSON.stringify({
                        id: user.id,
                        plan: user.plan,
                        planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
                    }),
                );
            } else {
                await this.redis.setex(key, PLAN_CACHE_TTL_SECONDS, 'none');
            }
        } catch (err: any) {
            this.logger.warn(`Redis plan cache write failed: ${err.message}`);
        }

        return user ?? null;
    }

    private hasPaidAccess(user: { plan: UserPlan; planExpiresAt: Date | null } | null): boolean {
        if (!user) return false;
        if (user.plan === UserPlan.FREE) return false;
        if (user.planExpiresAt && user.planExpiresAt < new Date()) return false;
        return true;
    }

    private processResponse(data: any, currentUser: PlanInfo | null): any {
        if (Array.isArray(data)) {
            return data.map((item) => this.processResponse(item, currentUser));
        }

        if (!data || typeof data !== 'object') return data;

        // Clone pour ne pas muter l'original
        const result = { ...data };

        // Cas 1: Réponse projet avec founder (GET /projects/:idOrSlug)
        if (result.founder && typeof result.founder === 'object') {
            result.founder = this.processFounder(result.founder, currentUser);
        }

        // Cas 2: Réponse candidat avec user (matching, applications)
        if (result.candidate && typeof result.candidate === 'object') {
            result.candidate = this.processCandidate(result.candidate, currentUser);
        }

        // Cas 3: Objet user direct avec candidateProfile (GET /users/:id/public)
        if (result.candidateProfile && typeof result.candidateProfile === 'object' && result.id) {
            const isOwner = currentUser?.id === result.id;

            if (!isOwner) {
                const hasAccess = this.hasPaidAccess(currentUser);

                if (!hasAccess) {
                    this.stripUserSensitiveFields(result);
                    result.candidateProfile = this.stripCandidateFields(result.candidateProfile);
                    result._isLocked = true;
                } else {
                    result._isLocked = false;
                }
            } else {
                result._isLocked = false;
            }
        }

        // Cas 4: Objet user direct sans candidateProfile (GET /users/:id/public pour fondateur)
        // On utilise `role` comme signature d'un User direct plutôt qu'`email`
        // pour éviter un faux-négatif si la query Prisma omet l'email
        // (le masquage doit toujours poser `_isLocked` pour que le frontend sache).
        if (!result.candidateProfile && result.id && result.role && !result.founder && !result.candidate) {
            const isOwner = currentUser?.id === result.id;

            if (!isOwner) {
                const hasAccess = this.hasPaidAccess(currentUser);

                if (!hasAccess) {
                    this.stripUserSensitiveFields(result);
                    result._isLocked = true;
                } else {
                    result._isLocked = false;
                }
            } else {
                result._isLocked = false;
            }
        }

        return result;
    }

    private processFounder(
        founder: any,
        currentUser: PlanInfo | null,
    ): any {
        const founderCopy = { ...founder };
        const isOwner = currentUser?.id === founderCopy.id;

        if (isOwner) {
            founderCopy._isLocked = false;
            return founderCopy;
        }

        const hasAccess = this.hasPaidAccess(currentUser);

        if (!hasAccess) {
            // Masquer les champs sensibles du User (linkedinUrl, websiteUrl, etc. sont maintenant sur User)
            this.stripUserSensitiveFields(founderCopy);
            founderCopy._isLocked = true;
        } else {
            founderCopy._isLocked = false;
        }

        return founderCopy;
    }

    private processCandidate(
        candidate: any,
        currentUser: PlanInfo | null,
    ): any {
        const candidateCopy = { ...candidate };
        const candidateUserId = candidateCopy.userId || candidateCopy.user?.id;
        const isOwner = currentUser?.id === candidateUserId;

        if (isOwner) {
            candidateCopy._isLocked = false;
            return candidateCopy;
        }

        const hasAccess = this.hasPaidAccess(currentUser);

        if (!hasAccess) {
            // Masquer les champs du CandidateProfile
            for (const field of CANDIDATE_SENSITIVE_FIELDS) {
                if (field in candidateCopy) {
                    candidateCopy[field] = null;
                }
            }
            // Masquer les champs du User nested
            if (candidateCopy.user && typeof candidateCopy.user === 'object') {
                candidateCopy.user = { ...candidateCopy.user };
                this.stripUserSensitiveFields(candidateCopy.user);
            }
            candidateCopy._isLocked = true;
        } else {
            candidateCopy._isLocked = false;
        }

        return candidateCopy;
    }

    private stripUserSensitiveFields(obj: any): void {
        for (const field of USER_SENSITIVE_FIELDS) {
            if (field in obj) {
                obj[field] = null;
            }
        }
    }

    private stripCandidateFields(profile: any): any {
        if (!profile || typeof profile !== 'object') return profile;
        const copy = { ...profile };
        for (const field of CANDIDATE_SENSITIVE_FIELDS) {
            if (field in copy) {
                copy[field] = null;
            }
        }
        return copy;
    }
}
