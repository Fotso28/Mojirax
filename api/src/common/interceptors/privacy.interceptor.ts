import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { UserPlan } from '@prisma/client';

// Champs sensibles à masquer par type d'objet
const USER_SENSITIVE_FIELDS = ['email', 'phone'];
const FOUNDER_PROFILE_SENSITIVE_FIELDS = ['linkedinUrl', 'websiteUrl'];
const CANDIDATE_SENSITIVE_FIELDS = ['linkedinUrl', 'resumeUrl', 'githubUrl', 'portfolioUrl'];

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
        let currentUser: PlanInfo | null = null;
        if (firebaseUid) {
            const user = await this.prisma.user.findUnique({
                where: { firebaseUid },
                select: { id: true, plan: true, planExpiresAt: true },
            });
            currentUser = user || null;
        }

        return this.processResponse(data, currentUser);
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
                    result.email = null;
                    result.phone = null;
                    result.candidateProfile = this.stripCandidateFields(result.candidateProfile);
                    result._isLocked = true;
                } else {
                    result._isLocked = false;
                }
            } else {
                result._isLocked = false;
            }
        }

        // Cas 4: Objet user direct avec founderProfile (GET /users/:id/public pour fondateur)
        if (result.founderProfile && typeof result.founderProfile === 'object' && result.id && !result.founder) {
            const isOwner = currentUser?.id === result.id;

            if (!isOwner) {
                const hasAccess = this.hasPaidAccess(currentUser);

                if (!hasAccess) {
                    result.email = null;
                    result.phone = null;
                    result.founderProfile = this.stripFounderProfileFields(result.founderProfile);
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
            // Masquer les champs sensibles du User
            for (const field of USER_SENSITIVE_FIELDS) {
                if (field in founderCopy) {
                    founderCopy[field] = null;
                }
            }
            // Masquer les champs du founderProfile
            if (founderCopy.founderProfile && typeof founderCopy.founderProfile === 'object') {
                founderCopy.founderProfile = this.stripFounderProfileFields(founderCopy.founderProfile);
            }
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
                for (const field of USER_SENSITIVE_FIELDS) {
                    if (field in candidateCopy.user) {
                        candidateCopy.user[field] = null;
                    }
                }
            }
            candidateCopy._isLocked = true;
        } else {
            candidateCopy._isLocked = false;
        }

        return candidateCopy;
    }

    private stripFounderProfileFields(profile: any): any {
        if (!profile || typeof profile !== 'object') return profile;
        const copy = { ...profile };
        for (const field of FOUNDER_PROFILE_SENSITIVE_FIELDS) {
            if (field in copy) {
                copy[field] = null;
            }
        }
        return copy;
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
