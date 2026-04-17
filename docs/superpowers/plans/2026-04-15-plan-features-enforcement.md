# Plan Features Enforcement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce plan-based feature promises: remove "sans pub" from PLUS, add progressive search boost per plan, add smart feed sorting for all + PRO-exclusive "Top Active" section.

**Architecture:** 3 independent changes — (1) seed data update, (2) search ranking refactor in `search.service.ts` using a new `PLAN_SEARCH_BOOST` config, (3) smart feed in `users.service.ts` + new `GET /users/top-active` endpoint with Redis cache + frontend component in `candidate-stream.tsx`.

**Tech Stack:** NestJS 11, Prisma, Redis (ioredis), Next.js 16 / React 19, Tailwind CSS

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `api/prisma/seed.sql` | Modify | Remove "sans contenu sponsorisé" from PLUS features |
| `seed-prod.sql` | Modify | Same |
| `api/src/common/config/plan-limits.config.ts` | Modify | Add `PLAN_SEARCH_BOOST` constant |
| `api/src/search/search.service.ts` | Modify | Replace ELITE-only boost with progressive per-plan boost |
| `api/src/users/users.service.ts` | Modify | Smart feed sort + `getTopActiveCandidates()` |
| `api/src/users/users.controller.ts` | Modify | New `GET /users/top-active` endpoint |
| `api/src/users/users.module.ts` | Modify | Inject `REDIS_CLIENT` |
| `web/src/components/feed/top-active-candidates.tsx` | Create | PRO+ exclusive section component |
| `web/src/components/feed/candidate-stream.tsx` | Modify | Integrate TopActiveCandidates |

---

### Task 1: Remove "sans contenu sponsorisé" from PLUS plan seed data

**Files:**
- Modify: `api/prisma/seed.sql:731`
- Modify: `seed-prod.sql:13`

- [ ] **Step 1: Update seed.sql**

In `api/prisma/seed.sql`, line 731, replace the PLUS features array:

```sql
-- OLD:
ARRAY['Tout le plan Gratuit', 'Voir qui a consulté votre profil', 'Filtres avancés pour trouver des profils plus pertinents', 'Retour arrière sur le dernier swipe', 'Plus de visibilité dans les résultats', 'Expérience sans contenu sponsorisé'],

-- NEW:
ARRAY['Tout le plan Gratuit', 'Voir qui a consulté votre profil', 'Filtres avancés pour trouver des profils plus pertinents', 'Retour arrière sur le dernier swipe', 'Plus de visibilité dans les résultats'],
```

- [ ] **Step 2: Update seed-prod.sql**

In `seed-prod.sql`, line 13, replace the PLUS features array — same change: remove `'Expérience sans contenu sponsorisé'` from the ARRAY.

```sql
-- OLD (single line):
ARRAY['Tout le plan Gratuit','Voir qui a consulté votre profil','Filtres avancés pour trouver des profils plus pertinents','Retour arrière sur le dernier swipe','Plus de visibilité dans les résultats','Expérience sans contenu sponsorisé']

-- NEW:
ARRAY['Tout le plan Gratuit','Voir qui a consulté votre profil','Filtres avancés pour trouver des profils plus pertinents','Retour arrière sur le dernier swipe','Plus de visibilité dans les résultats']
```

- [ ] **Step 3: Update the live database**

Run an UPDATE to remove the feature from the existing PLUS plan in the database:

```bash
docker compose exec api npx prisma db execute --stdin <<'SQL'
UPDATE pricing_plans
SET features = array_remove(features, 'Expérience sans contenu sponsorisé')
WHERE id = 'plan_plus';
SQL
```

- [ ] **Step 4: Commit**

```bash
git add api/prisma/seed.sql seed-prod.sql
git commit -m "fix(seed): remove 'sans contenu sponsorisé' from PLUS plan — ads shown to all plans by design"
```

---

### Task 2: Add PLAN_SEARCH_BOOST config

**Files:**
- Modify: `api/src/common/config/plan-limits.config.ts`

- [ ] **Step 1: Add the PLAN_SEARCH_BOOST constant**

Add after the existing `PLAN_LIMITS` constant (after line 21):

```typescript
/**
 * Boost de similarité dans les résultats de recherche par plan.
 * Les profils/projets d'utilisateurs payants remontent plus haut.
 */
export const PLAN_SEARCH_BOOST: Record<UserPlan, number> = {
  FREE: 0,
  PLUS: 0.03,
  PRO: 0.06,
  ELITE: 0.10,
};
```

- [ ] **Step 2: Commit**

```bash
git add api/src/common/config/plan-limits.config.ts
git commit -m "feat(config): add PLAN_SEARCH_BOOST — progressive search ranking by plan tier"
```

---

### Task 3: Replace ELITE-only search boost with progressive per-plan boost

**Files:**
- Modify: `api/src/search/search.service.ts:1` (import)
- Modify: `api/src/search/search.service.ts:183-219` (searchUniversal method)
- Modify: `api/src/search/search.service.ts:445-480` (search method)

- [ ] **Step 1: Add import for PLAN_SEARCH_BOOST**

At the top of `api/src/search/search.service.ts`, add the import (line 6, after the BoostService import):

```typescript
import { PLAN_SEARCH_BOOST } from '../common/config/plan-limits.config';
```

- [ ] **Step 2: Replace the ELITE boost block in searchUniversal (lines 183-219)**

Replace the entire block from `// ELITE plan priority: boost projects owned by ELITE users in search results` to the closing `}` of the try/catch (lines 183-219) with:

```typescript
        // Plan-based priority: boost results owned by paid users (progressive by tier)
        try {
            const projectIds = mergedProjects.map((p: any) => p.id);
            const peopleIds = mergedPeople.map((p: any) => p.id);

            if (projectIds.length > 0) {
                const projectPlans = await this.prisma.project.findMany({
                    where: { id: { in: projectIds } },
                    select: { id: true, founder: { select: { plan: true } } },
                });
                const planMap = new Map(projectPlans.map(p => [p.id, p.founder.plan]));
                for (const result of mergedProjects) {
                    const boost = PLAN_SEARCH_BOOST[planMap.get(result.id) ?? 'FREE'] ?? 0;
                    if (boost > 0) {
                        result.similarity = Math.min(1, (result.similarity || 0) + boost);
                    }
                }
            }

            if (peopleIds.length > 0) {
                const candidatePlans = await this.prisma.candidateProfile.findMany({
                    where: { id: { in: peopleIds } },
                    select: { id: true, user: { select: { plan: true } } },
                });
                const planMap = new Map(candidatePlans.map(c => [c.id, c.user.plan]));
                for (const result of mergedPeople) {
                    const boost = PLAN_SEARCH_BOOST[planMap.get(result.id) ?? 'FREE'] ?? 0;
                    if (boost > 0) {
                        result.similarity = Math.min(1, (result.similarity || 0) + boost);
                    }
                }
            }

            // Final re-sort after plan priority adjustments
            mergedProjects.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
            mergedPeople.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
        } catch (e) {
            // Plan priority is non-critical
        }
```

- [ ] **Step 3: Replace the ELITE boost block in search method (lines 445-480)**

Replace the entire block from `// ELITE plan priority: boost projects & candidates owned by ELITE users` to the closing `}` of the try/catch (lines 445-480) with:

```typescript
        // Plan-based priority: boost results owned by paid users (progressive by tier)
        try {
            const projectIds = projects.map((p: any) => p.id);
            const candidateIds = candidates.map((c: any) => c.id);

            if (projectIds.length > 0) {
                const projectPlans = await this.prisma.project.findMany({
                    where: { id: { in: projectIds } },
                    select: { id: true, founder: { select: { plan: true } } },
                });
                const planMap = new Map(projectPlans.map(p => [p.id, p.founder.plan]));
                for (const p of projects) {
                    const boost = PLAN_SEARCH_BOOST[planMap.get(p.id) ?? 'FREE'] ?? 0;
                    if (boost > 0) {
                        p.similarity = Math.min(1, (p.similarity || 0) + boost);
                    }
                }
            }

            if (candidateIds.length > 0) {
                const candidatePlans = await this.prisma.candidateProfile.findMany({
                    where: { id: { in: candidateIds } },
                    select: { id: true, user: { select: { plan: true } } },
                });
                const planMap = new Map(candidatePlans.map(c => [c.id, c.user.plan]));
                for (const c of candidates) {
                    const boost = PLAN_SEARCH_BOOST[planMap.get(c.id) ?? 'FREE'] ?? 0;
                    if (boost > 0) {
                        c.similarity = Math.min(1, (c.similarity || 0) + boost);
                    }
                }
            }

            projects.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
            candidates.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
        } catch (e) {
            // Plan priority is non-critical
        }
```

- [ ] **Step 4: Verify the API compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add api/src/search/search.service.ts
git commit -m "feat(search): progressive plan-based ranking boost — PLUS +0.03, PRO +0.06, ELITE +0.10"
```

---

### Task 4: Smart feed sorting in getCandidatesFeed

**Files:**
- Modify: `api/src/users/users.service.ts:387-455`

- [ ] **Step 1: Replace getCandidatesFeed with smart sorting**

Replace the entire `getCandidatesFeed` method (lines 387-455) with:

```typescript
    async getCandidatesFeed(
        firebaseUid: string | null,
        cursor: string | null,
        limit: number = 7,
        filters?: { city?: string; skills?: string[]; sector?: string },
    ) {
        const take = Math.min(limit, 20);

        // Build user filter as single object to avoid spread overwrite
        const userFilter: Record<string, any> = {};
        if (filters?.city) {
            userFilter.city = { contains: filters.city, mode: 'insensitive' as Prisma.QueryMode };
        }
        if (filters?.skills && filters.skills.length > 0) {
            userFilter.skills = { hasSome: filters.skills };
        }

        const where: Prisma.CandidateProfileWhereInput = {
            status: 'PUBLISHED',
            ...(Object.keys(userFilter).length > 0 ? { user: userFilter } : {}),
            ...(filters?.sector ? {
                desiredSectors: { has: filters.sector }
            } : {}),
        };

        // Fetch a larger pool for smart ranking (3x requested to allow good sorting)
        const poolSize = Math.min(take * 3, 60);
        const candidates = await this.prisma.candidateProfile.findMany({
            where,
            take: poolSize + 1,
            cursor: cursor ? { id: cursor } : undefined,
            skip: cursor ? 1 : 0,
            select: {
                id: true,
                availability: true,
                shortPitch: true,
                roleType: true,
                commitmentType: true,
                collabPref: true,
                locationPref: true,
                desiredSectors: true,
                remoteOnly: true,
                qualityScore: true,
                profileCompleteness: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        name: true,
                        image: true,
                        title: true,
                        bio: true,
                        skills: true,
                        city: true,
                        yearsOfExperience: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        if (candidates.length === 0) {
            return { candidates: [], nextCursor: null };
        }

        // Smart ranking: qualityScore * 0.6 + activityScore * 0.4
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const candidateIds = candidates.map(c => c.id);
        const candidateUserIds = candidates.map(c => c.user.id);

        const [applicationCounts, viewCounts] = await Promise.all([
            this.prisma.application.groupBy({
                by: ['candidateId'],
                where: { candidateId: { in: candidateIds }, createdAt: { gte: thirtyDaysAgo } },
                _count: true,
            }),
            this.prisma.userProjectInteraction.groupBy({
                by: ['userId'],
                where: { userId: { in: candidateUserIds }, action: 'VIEW', createdAt: { gte: thirtyDaysAgo } },
                _count: true,
            }),
        ]);

        const appMap = new Map(applicationCounts.map(a => [a.candidateId, a._count]));
        const viewMap = new Map(viewCounts.map(v => [v.userId, v._count]));

        const scored = candidates.map(c => {
            const apps = appMap.get(c.id) ?? 0;
            const views = viewMap.get(c.user.id) ?? 0;
            const activityScore = Math.min(apps / 5, 1) * 60 + Math.min(views / 20, 1) * 40;
            const feedScore = (c.qualityScore ?? 50) * 0.6 + activityScore * 0.4;
            return { ...c, _feedScore: feedScore };
        });

        scored.sort((a, b) => b._feedScore - a._feedScore);

        // Paginate from sorted results
        const page = scored.slice(0, take);
        const nextCursor = scored.length > take ? scored[take].id : null;

        // Strip internal _feedScore before returning
        const result = page.map(({ _feedScore, ...rest }) => rest);

        return { candidates: result, nextCursor };
    }
```

- [ ] **Step 2: Verify the API compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add api/src/users/users.service.ts
git commit -m "feat(feed): smart candidate feed sorting — composite score (quality 60% + activity 30d 40%)"
```

---

### Task 5: Add getTopActiveCandidates to UsersService

**Files:**
- Modify: `api/src/users/users.service.ts` (add import + inject Redis + new method)
- Modify: `api/src/users/users.module.ts` (register REDIS_CLIENT)

- [ ] **Step 1: Update UsersModule to make REDIS_CLIENT available**

In `api/src/users/users.module.ts`, no change needed — `RedisModule` is `@Global()`, so `REDIS_CLIENT` is already injectable everywhere.

- [ ] **Step 2: Inject Redis into UsersService**

In `api/src/users/users.service.ts`, add imports at the top:

```typescript
import { Injectable, Inject, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
```

Update the constructor to inject Redis:

```typescript
    constructor(
        private prisma: PrismaService,
        private uploadService: UploadService,
        private aiService: AiService,
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
    ) { }
```

- [ ] **Step 3: Add getTopActiveCandidates method**

Add this method at the end of `UsersService`, before the closing `}` of the class (before line 562):

```typescript
    /**
     * Top 10 candidats les plus actifs de la semaine.
     * Cached Redis 1h. Gated PRO+ côté controller.
     */
    async getTopActiveCandidates(limit = 10) {
        const take = Math.min(limit, 10);
        const cacheKey = 'top_active_candidates';

        const cached = await this.redis.get(cacheKey);
        if (cached) {
            this.logger.debug('Top active candidates served from cache');
            return JSON.parse(cached);
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Candidats avec le plus de candidatures cette semaine
        const applicationCounts = await this.prisma.application.groupBy({
            by: ['candidateId'],
            where: { createdAt: { gte: sevenDaysAgo } },
            _count: true,
            orderBy: { _count: { candidateId: 'desc' } },
            take: 50,
        });

        if (applicationCounts.length === 0) return [];

        const activeCandidateIds = applicationCounts.map(a => a.candidateId);

        const candidates = await this.prisma.candidateProfile.findMany({
            where: {
                status: 'PUBLISHED',
                id: { in: activeCandidateIds },
            },
            select: {
                id: true,
                shortPitch: true,
                roleType: true,
                qualityScore: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        name: true,
                        image: true,
                        title: true,
                        skills: true,
                        city: true,
                    },
                },
            },
        });

        const appMap = new Map(applicationCounts.map(a => [a.candidateId, a._count]));
        const scored = candidates.map(c => ({
            ...c,
            weeklyActivity: (appMap.get(c.id) ?? 0) * 3,
        }));
        scored.sort((a, b) => b.weeklyActivity - a.weeklyActivity);

        const result = scored.slice(0, take);

        await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
        this.logger.log(`Top active candidates cached (${result.length} results)`);

        return result;
    }
```

- [ ] **Step 4: Verify the API compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add api/src/users/users.service.ts
git commit -m "feat(users): add getTopActiveCandidates — weekly top 10 with Redis cache 1h"
```

---

### Task 6: Add GET /users/top-active endpoint

**Files:**
- Modify: `api/src/users/users.controller.ts`

- [ ] **Step 1: Add the endpoint**

In `api/src/users/users.controller.ts`, add this endpoint after the `getStats` endpoint (after line ~200, in the plan-gated section):

```typescript
    // ─── Top Active Candidates (PRO+) ────────────────────
    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard, PlanGuard)
    @RequiresPlan(UserPlan.PRO)
    @Get('top-active')
    @ApiOperation({ summary: 'Get top 10 most active candidates this week (PRO+ only)' })
    @ApiResponse({ status: 200, description: 'Top active candidates returned.' })
    @ApiResponse({ status: 403, description: 'Plan insuffisant.' })
    async getTopActiveCandidates() {
        return this.usersService.getTopActiveCandidates();
    }
```

**Important:** This route MUST be placed BEFORE any `:id` parameterized route (like `@Get(':id/public')`) to avoid NestJS route matching conflicts. Place it in the plan-gated section alongside `profile-views`, `stats`, and `invisible`.

- [ ] **Step 2: Verify the API compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add api/src/users/users.controller.ts
git commit -m "feat(users): add GET /users/top-active — PRO+ gated endpoint for weekly active candidates"
```

---

### Task 7: Create TopActiveCandidates frontend component

**Files:**
- Create: `web/src/components/feed/top-active-candidates.tsx`

- [ ] **Step 1: Create the component**

Create `web/src/components/feed/top-active-candidates.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useAuth } from '@/context/auth-context';
import { Flame } from 'lucide-react';
import Link from 'next/link';

interface TopActiveCandidate {
    id: string;
    shortPitch: string | null;
    roleType: string | null;
    qualityScore: number | null;
    weeklyActivity: number;
    user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        name: string | null;
        image: string | null;
        title: string | null;
        skills: string[];
        city: string | null;
    };
}

export function TopActiveCandidates() {
    const { dbUser } = useAuth();
    const [candidates, setCandidates] = useState<TopActiveCandidate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isPro = dbUser?.plan === 'PRO' || dbUser?.plan === 'ELITE';

    useEffect(() => {
        if (!isPro) {
            setIsLoading(false);
            return;
        }

        AXIOS_INSTANCE.get<TopActiveCandidate[]>('/users/top-active')
            .then(({ data }) => setCandidates(data))
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, [isPro]);

    if (!isPro || isLoading || candidates.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Flame className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Profils les plus actifs</h3>
                    <p className="text-xs text-gray-500">Cette semaine</p>
                </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {candidates.map((candidate) => {
                    const displayName = candidate.user.name
                        || `${candidate.user.firstName ?? ''} ${candidate.user.lastName ?? ''}`.trim()
                        || 'Anonyme';

                    return (
                        <Link
                            key={candidate.id}
                            href={`/founders/${candidate.user.id}`}
                            className="flex-shrink-0 w-32 group"
                        >
                            <div className="flex flex-col items-center text-center p-3 rounded-xl border border-gray-100 hover:border-kezak-primary/30 hover:bg-kezak-light/30 transition-all">
                                <div className="relative mb-2">
                                    {candidate.user.image ? (
                                        <img
                                            src={candidate.user.image}
                                            alt={displayName}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-kezak-light flex items-center justify-center text-kezak-primary font-bold text-sm">
                                            {displayName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                        <Flame className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-gray-900 truncate w-full">
                                    {displayName}
                                </span>
                                <span className="text-[10px] text-gray-500 truncate w-full">
                                    {candidate.user.title ?? candidate.roleType ?? ''}
                                </span>
                                {candidate.user.skills?.length > 0 && (
                                    <span className="text-[10px] text-kezak-primary mt-1 truncate w-full">
                                        {candidate.user.skills.slice(0, 2).join(', ')}
                                    </span>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/feed/top-active-candidates.tsx
git commit -m "feat(feed): add TopActiveCandidates component — PRO+ exclusive weekly active section"
```

---

### Task 8: Integrate TopActiveCandidates into CandidateStream

**Files:**
- Modify: `web/src/components/feed/candidate-stream.tsx`

- [ ] **Step 1: Add import**

At the top of `web/src/components/feed/candidate-stream.tsx`, after the existing imports (after line 7):

```typescript
import { TopActiveCandidates } from './top-active-candidates';
```

- [ ] **Step 2: Add the component in the render**

In the return statement of the main render (line 126), add `<TopActiveCandidates />` right after `<FeedFilters>`:

```tsx
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <FeedFilters onFilterChange={handleFilterChange} />
            <TopActiveCandidates />
            {candidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
```

Also add it in the loading state (line 98), after `<FeedFilters>`:

```tsx
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <FeedFilters onFilterChange={handleFilterChange} />
                <TopActiveCandidates />
                {Array.from({ length: 3 }).map((_, i) => (
```

And in the empty state (line 109), after `<FeedFilters>`:

```tsx
            <div className="max-w-2xl mx-auto">
                <FeedFilters onFilterChange={handleFilterChange} />
                <TopActiveCandidates />
                <div className="text-center py-20">
```

- [ ] **Step 3: Verify frontend compiles**

Run: `cd web && npx next build --no-lint`
Expected: Build succeeds (or run `npx tsc --noEmit` for type check only)

- [ ] **Step 4: Commit**

```bash
git add web/src/components/feed/candidate-stream.tsx
git commit -m "feat(feed): integrate TopActiveCandidates into candidate feed — shown for PRO+ users"
```

---

### Task 9: Update design docs

**Files:**
- Modify: `docs/superpowers/specs/2026-03-13-pricing-plans-admin-design.md`
- Modify: `docs/superpowers/specs/2026-03-28-stripe-subscriptions-design.md`

- [ ] **Step 1: Remove "sans contenu sponsorisé" from pricing-plans-admin design spec**

In `docs/superpowers/specs/2026-03-13-pricing-plans-admin-design.md`, find and remove the line:
```
- Expérience sans contenu sponsorisé
```

- [ ] **Step 2: Remove "Sans contenu sponsorisé" from stripe-subscriptions design spec**

In `docs/superpowers/specs/2026-03-28-stripe-subscriptions-design.md`, find the features table row:
```
| Sans contenu sponsorisé | - | x | x | x |
```
Remove this entire row.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-03-13-pricing-plans-admin-design.md docs/superpowers/specs/2026-03-28-stripe-subscriptions-design.md
git commit -m "docs: remove 'sans contenu sponsorisé' from design specs — ads shown to all plans"
```

---

### Task 10: Manual verification

- [ ] **Step 1: Start the dev environment**

```bash
docker compose up -d && cd web && npm run dev
```

- [ ] **Step 2: Verify search boost**

1. Open browser → search for a term
2. Check API logs: no errors in search service
3. Verify results load correctly

- [ ] **Step 3: Verify candidate feed smart sort**

1. Navigate to `/feed/candidates`
2. Verify candidates load (no errors in console)
3. Verify the order is no longer purely chronological (higher quality profiles should appear first)

- [ ] **Step 4: Verify TopActiveCandidates (PRO+ only)**

1. Log in as a FREE user → navigate to `/feed/candidates` → verify "Profils les plus actifs" section does NOT appear
2. Log in as a PRO user → navigate to `/feed/candidates` → verify the section appears with active candidates (or is hidden if no active candidates exist)

- [ ] **Step 5: Verify pricing page**

1. Navigate to `/#pricing`
2. Verify PLUS plan no longer shows "Expérience sans contenu sponsorisé"
