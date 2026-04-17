# Post-Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all P0 and P1 issues identified by the 4-binôme architecture audit post-migration "Flexible Roles", plus critical P2 items.

**Architecture:** Sequential fixes ordered by severity and dependency. Backend fixes first (API contracts), then frontend alignment, then UX flows. Each task is self-contained and independently testable.

**Tech Stack:** NestJS (services, DTOs, controllers), Next.js (pages, components, routing), Prisma

**Spec:** Audit report from 2026-04-14 (4 binômes: Auth, Data, UX, API)

---

## File Map

### Backend — Modify
- `api/src/auth/auth.service.ts` — Add select to syncUser (P0-4)
- `api/src/users/users.service.ts` — Add select to findOne/updateProfile (P1-9/11)
- `api/src/users/dto/update-user.dto.ts` — Allow empty strings on URL fields (P1-14)
- `api/src/projects/projects.service.ts` — Fix scoreExplicit skills read (P1-8), remove email/phone from public select (P1-12)
- `api/src/interactions/interactions.controller.ts` — Add ownership check on getLikers (P1-10)
- `api/src/projects/dto/create-project-from-document.dto.ts` — New DTO for from-document (P1-16)

### Frontend — Modify
- `web/src/app/onboarding/candidate/steps/pitch.tsx` — Split POST into PATCH User + POST candidate-profile (P0-1)
- `web/src/app/onboarding/role/page.tsx` — Route by intention PUBLISH/SEARCH (P0-6)
- `web/src/app/login/page.tsx` — Handle Google signup isNewUser (P0-2)
- `web/src/app/page.tsx` — Add onboarding guard (P0-3)
- `web/src/app/(dashboard)/layout.tsx` — Fix guard logic for migrated users (P0-5)
- `web/src/components/profile/profile-form.tsx` — Make email readOnly (P1-13)
- `web/src/app/admin/page.tsx` — Update KPI labels (P1-15)

---

## Task 1: Fix candidate onboarding wizard — 400 systematic error

**Priority:** P0-1 (BLOQUANT — aucun onboarding candidat ne fonctionne)

**Files:**
- Modify: `web/src/app/onboarding/candidate/steps/pitch.tsx`

The frontend sends `title`, `mainCompetence`, `yearsExp`, `achievements` to `POST /users/candidate-profile`, but these fields are NOT in `CreateCandidateProfileDto`. With `forbidNonWhitelisted: true`, this causes a 400 error every time.

Fix: Save User-level fields via `PATCH /users/profile` first, then POST only candidate-specific fields.

- [ ] **Step 1: Update handleSubmit to split the API calls**

In `web/src/app/onboarding/candidate/steps/pitch.tsx`, replace lines 16-38 with:

```typescript
    const handleSubmit = async () => {
        await submitForm(async (formData) => {
            // 1. Save User-level fields (title, skills, yearsOfExperience)
            const userPatch: Record<string, any> = {};
            if (formData.title) userPatch.title = formData.title;
            if (formData.main_competence) userPatch.skills = [formData.main_competence];
            if (formData.years_exp) {
                // Convert range string to number: "0-2" → 1, "3-5" → 4, "6-10" → 8, "10+" → 12
                const expMap: Record<string, number> = { '0-2': 1, '3-5': 4, '6-10': 8, '10+': 12 };
                userPatch.yearsOfExperience = expMap[formData.years_exp] || null;
            }
            if (formData.achievements) userPatch.bio = formData.achievements;

            if (Object.keys(userPatch).length > 0) {
                await AXIOS_INSTANCE.patch('/users/profile', userPatch);
            }

            // 2. Create candidate profile with candidate-specific fields only
            await AXIOS_INSTANCE.post('/users/candidate-profile', {
                shortPitch: formData.short_pitch,
                longPitch: formData.long_pitch,
                vision: formData.vision,
                locationPref: formData.location_pref,
                availability: formData.time_availability,
                collabPref: formData.collab_pref,
                projectPref: formData.project_pref || [],
                roleType: formData.role_type,
                commitmentType: formData.commitment_type,
                hasCofounded: formData.has_cofounded,
            });

            showToast('Profil créé ! Vérification en cours...', 'success');
            router.push('/');
        });
    };
```

- [ ] **Step 2: Verify the fix compiles**

Run:

```bash
cd web && npx next build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/onboarding/candidate/steps/pitch.tsx
git commit -m "fix(onboarding): split candidate wizard into PATCH user + POST candidate-profile

Fixes P0-1: the wizard was sending title/mainCompetence/yearsExp/achievements
to CreateCandidateProfileDto which rejects unknown fields (forbidNonWhitelisted).
Now saves User-level fields via PATCH /users/profile first."
```

---

## Task 2: Fix onboarding/role — SEARCH always redirects to /founder

**Priority:** P0-6 (BLOQUANT — intention SEARCH sends user to project creation)

**Files:**
- Modify: `web/src/app/onboarding/role/page.tsx`

- [ ] **Step 1: Conditionally navigate based on selected intention**

In `web/src/app/onboarding/role/page.tsx`, replace line 40:

```typescript
            router.push('/onboarding/founder');
```

With:

```typescript
            router.push(selected === 'PUBLISH' ? '/onboarding/founder' : '/onboarding/candidate');
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/onboarding/role/page.tsx
git commit -m "fix(onboarding): route SEARCH intention to /onboarding/candidate

Fixes P0-6: both intentions were routing to /onboarding/founder."
```

---

## Task 3: Fix Google signup — skips onboarding entirely

**Priority:** P0-2 (BLOQUANT — nouveaux users Google sans onboarding)

**Files:**
- Modify: `web/src/app/login/page.tsx`

Google signup uses `signInWithPopup` which triggers `onAuthStateChanged`. The `useEffect` at line 76 detects `user` and redirects to `/` because `justSignedUp.current` is never set to `true` for Google signups.

- [ ] **Step 1: Update signInWithGoogle in auth-context to detect new users**

In `web/src/context/auth-context.tsx`, find the `signInWithGoogle` method. It currently calls `signInWithPopup`. We need to detect if it's a new user and expose that info.

Read the file first to find the exact implementation, then modify `signInWithGoogle` to return whether the user is new:

In `web/src/context/auth-context.tsx`, find the `signInWithGoogle` function and add `getAdditionalUserInfo` import and new user detection:

Add to imports at line 5:

```typescript
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    getAdditionalUserInfo
} from 'firebase/auth';
```

Then update the `signInWithGoogle` function to store isNewUser flag:

```typescript
    const signInWithGoogle = async () => {
        const result = await signInWithPopup(auth, googleProvider);
        const additionalInfo = getAdditionalUserInfo(result);
        if (additionalInfo?.isNewUser) {
            sessionStorage.setItem('google_new_user', 'true');
        }
    };
```

- [ ] **Step 2: Update login page to check google_new_user flag**

In `web/src/app/login/page.tsx`, replace lines 75-79:

```typescript
    useEffect(() => {
        if (!loading && user && !justSignedUp.current) {
            router.push('/');
        }
    }, [user, loading, router]);
```

With:

```typescript
    useEffect(() => {
        if (!loading && user && !justSignedUp.current) {
            // Check if this is a new Google signup
            const isNewGoogleUser = sessionStorage.getItem('google_new_user');
            if (isNewGoogleUser) {
                sessionStorage.removeItem('google_new_user');
                justSignedUp.current = true;
                setStep('role');
                return;
            }
            router.push('/');
        }
    }, [user, loading, router]);
```

- [ ] **Step 3: Commit**

```bash
git add web/src/context/auth-context.tsx web/src/app/login/page.tsx
git commit -m "fix(auth): detect Google new signup and show onboarding

Fixes P0-2: Google signup was bypassing the intention/onboarding step.
Now uses getAdditionalUserInfo to detect isNewUser and redirect to role step."
```

---

## Task 4: Fix root page bypassing onboarding guard

**Priority:** P0-3 (page `/` hors du groupe dashboard, pas de guard)

**Files:**
- Modify: `web/src/app/page.tsx`

The root page `/` uses `DashboardShell` directly but is NOT inside the `(dashboard)` layout group, so the onboarding guard doesn't apply.

- [ ] **Step 1: Add onboarding guard to root page**

In `web/src/app/page.tsx`, replace lines 1-36 with:

```typescript
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { FeedStream } from '@/components/feed/feed-stream';
import { LandingPage } from '@/components/landing/landing-page';

export default function Home() {
  const { user, dbUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && dbUser && !dbUser.title && !dbUser.bio && !(dbUser.projects?.length > 0)) {
      router.replace('/onboarding/start');
    }
  }, [loading, user, dbUser, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kezak-primary" />
      </div>
    );
  }

  if (!user) return <LandingPage />;

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-8 pt-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Découvrez les projets
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Des fondateurs passionnés cherchent leur binôme.
          </p>
        </header>
        <FeedStream />
      </div>
    </DashboardShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "fix(web): add onboarding guard to root page

Fixes P0-3: root page was outside (dashboard) group and had no guard.
New users with incomplete profiles were seeing the feed directly."
```

---

## Task 5: Fix auth/sync leaking secrets to frontend

**Priority:** P0-4 (DATA_LEAK — firebaseUid, stripeCustomerId exposés)

**Files:**
- Modify: `api/src/auth/auth.service.ts`

- [ ] **Step 1: Add select to all Prisma operations in syncUser**

In `api/src/auth/auth.service.ts`, define a return select constant and apply it to all user operations. Replace lines 14-98 with:

```typescript
    async syncUser(firebaseUser: any) {
        const { uid, email, name, picture } = firebaseUser;

        if (!email) {
            throw new Error('Email is required from Firebase Provider');
        }

        // Fields safe to return to frontend
        const safeSelect = {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            image: true,
            role: true,
            plan: true,
            title: true,
            bio: true,
            country: true,
            city: true,
            skills: true,
            languages: true,
        };

        const userSelect = { id: true, firebaseUid: true, image: true, firstName: true, lastName: true, email: true };

        // Look up by firebaseUid first, then by email
        const existingByUid = await this.prisma.user.findUnique({
            where: { firebaseUid: uid },
            select: userSelect,
        });

        const existing = existingByUid || await this.prisma.user.findUnique({
            where: { email },
            select: userSelect,
        });

        const hasCustomAvatar = existing?.image?.includes('/avatars/');

        if (existing) {
            // Sécurité: empêcher l'écrasement du firebaseUid si déjà lié à un autre provider
            if (existingByUid === null && existing.firebaseUid && existing.firebaseUid !== uid) {
                this.logger.warn(
                    `Blocked account takeover: email=${email}, existingUid=${existing.firebaseUid}, newUid=${uid}`,
                );
                throw new Error('Ce compte est déjà lié à un autre fournisseur d\'authentification');
            }

            this.logger.log(`User synced: id=${existing.id}`);

            const user = await this.prisma.user.update({
                where: { id: existing.id },
                data: {
                    firebaseUid: uid,
                    ...(existing.email !== email ? { email } : {}),
                    ...(name && !existing.firstName ? { firstName: name.split(' ')[0] } : {}),
                    ...(name && !existing.lastName ? { lastName: name.split(' ').slice(1).join(' ') || undefined } : {}),
                    ...(name && !existing.firstName ? { name } : {}),
                    ...(hasCustomAvatar ? {} : { image: picture }),
                },
                select: safeSelect,
            });
            return user;
        }

        // Create new user
        try {
            const user = await this.prisma.user.create({
                data: {
                    email,
                    firebaseUid: uid,
                    firstName: name ? name.split(' ')[0] : undefined,
                    lastName: name ? name.split(' ').slice(1).join(' ') : undefined,
                    name: name || undefined,
                    image: picture,
                    role: 'USER',
                },
                select: safeSelect,
            });

            this.logger.log(`New user created: id=${user.id}, email=${email}`);

            this.emailService.sendWelcome(user.id).catch((e) =>
                this.logger.warn('Welcome email failed', e),
            );

            return user;
        } catch (error: any) {
            if (error?.code === 'P2002') {
                this.logger.warn(`Race condition on syncUser for email=${email}, retrying lookup`);
                const retryUser = await this.prisma.user.findUnique({
                    where: { firebaseUid: uid },
                    select: safeSelect,
                })
                    || await this.prisma.user.findUnique({
                        where: { email },
                        select: safeSelect,
                    });
                if (retryUser) return retryUser;
            }
            throw error;
        }
    }
```

- [ ] **Step 2: Verify compilation**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add api/src/auth/auth.service.ts
git commit -m "fix(auth): add select to syncUser — stop leaking firebaseUid/stripeCustomerId

Fixes P0-4: syncUser was returning the full User object including
internal secrets (firebaseUid, stripeCustomerId, stripeSubscriptionId)."
```

---

## Task 6: Fix onboarding redirect loop for migrated users

**Priority:** P0-5 (users pré-migration bloqués en boucle)

**Files:**
- Modify: `web/src/app/(dashboard)/layout.tsx`

Users migrated from the old system may have `title=null` and `bio=null` (their data was in the deleted `founderProfile` JSON) but already have published projects. The current guard redirects them to onboarding in a loop.

- [ ] **Step 1: Update guard to check for existing projects/candidateProfile**

In `web/src/app/(dashboard)/layout.tsx`, replace lines 20-28:

```typescript
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
        // Rediriger les utilisateurs sans profil complété vers l'onboarding
        if (!loading && user && dbUser && !dbUser.title && !dbUser.bio) {
            router.replace('/onboarding/start');
        }
    }, [loading, user, dbUser, router]);
```

With:

```typescript
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
        // Rediriger vers l'onboarding seulement si :
        // - pas de title ET pas de bio
        // - ET pas de projets existants (user migré)
        // - ET pas de candidateProfile existant
        if (!loading && user && dbUser
            && !dbUser.title && !dbUser.bio
            && !(dbUser.projects?.length > 0)
            && !dbUser.candidateProfile
        ) {
            router.replace('/onboarding/start');
        }
    }, [loading, user, dbUser, router]);
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/\(dashboard\)/layout.tsx
git commit -m "fix(layout): skip onboarding redirect for users with existing projects/candidateProfile

Fixes P0-5: migrated users with projects but no title/bio were stuck
in a redirect loop. Now only redirects truly new users."
```

---

## Task 7: Fix scoreExplicit reading skills from CandidateProfile

**Priority:** P1-8 (scoring skills match toujours à 0)

**Files:**
- Modify: `api/src/projects/projects.service.ts`

`scoreExplicit` reads `profile.skills` but CandidateProfile no longer has `skills` (moved to User). The skills match score is always 0.

- [ ] **Step 1: Update user query to include skills from User**

In `api/src/projects/projects.service.ts`, find the user query around line 69-73:

```typescript
            user = await this.prisma.user.findUnique({
                where: { firebaseUid },
                include: { candidateProfile: true }
            });
            candidateProfile = user?.candidateProfile;
```

Replace with:

```typescript
            user = await this.prisma.user.findUnique({
                where: { firebaseUid },
                include: { candidateProfile: true }
            });
            candidateProfile = user?.candidateProfile
                ? { ...user.candidateProfile, skills: user.skills, city: user.city, country: user.country }
                : null;
```

- [ ] **Step 2: Verify compilation**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add api/src/projects/projects.service.ts
git commit -m "fix(feed): merge User.skills into candidateProfile for scoreExplicit

Fixes P1-8: skills match was always 0 because CandidateProfile
no longer has skills (moved to User in flexible roles migration)."
```

---

## Task 8: Add select to findOne and updateProfile in UsersService

**Priority:** P1-9/11 (DATA_LEAK — firebaseUid/stripeCustomerId au frontend)

**Files:**
- Modify: `api/src/users/users.service.ts`

- [ ] **Step 1: Add select to findOne**

In `api/src/users/users.service.ts`, replace lines 19-47 (the `findOne` method) with:

```typescript
    async findOne(firebaseUid: string) {
        return this.prisma.user.findUnique({
            where: { firebaseUid },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                name: true,
                phone: true,
                address: true,
                image: true,
                role: true,
                plan: true,
                title: true,
                bio: true,
                country: true,
                city: true,
                linkedinUrl: true,
                websiteUrl: true,
                githubUrl: true,
                portfolioUrl: true,
                skills: true,
                languages: true,
                certifications: true,
                yearsOfExperience: true,
                experience: true,
                education: true,
                isInvisible: true,
                createdAt: true,
                projects: {
                    select: {
                        id: true,
                        slug: true,
                        name: true,
                        pitch: true,
                        logoUrl: true,
                        sector: true,
                        stage: true,
                        status: true,
                        location: true,
                        createdAt: true,
                    },
                },
                candidateProfile: {
                    select: {
                        id: true,
                        shortPitch: true,
                        longPitch: true,
                        vision: true,
                        roleType: true,
                        commitmentType: true,
                        collabPref: true,
                        locationPref: true,
                        desiredSectors: true,
                        remoteOnly: true,
                        resumeUrl: true,
                        hasCofounded: true,
                        availability: true,
                        qualityScore: true,
                        profileCompleteness: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
        });
    }
```

- [ ] **Step 2: Add select to updateProfile**

Replace lines 134-139 (the `updateProfile` method) with:

```typescript
    async updateProfile(firebaseUid: string, dto: UpdateUserProfileDto) {
        return this.prisma.user.update({
            where: { firebaseUid },
            data: { ...dto },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                name: true,
                image: true,
                role: true,
                plan: true,
                title: true,
                bio: true,
                country: true,
                city: true,
                skills: true,
                languages: true,
                yearsOfExperience: true,
            },
        });
    }
```

- [ ] **Step 3: Verify compilation**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add api/src/users/users.service.ts
git commit -m "fix(users): add explicit select to findOne/updateProfile — prevent data leak

Fixes P1-9/11: these methods returned full User (including firebaseUid,
stripeCustomerId) to the frontend. Now only safe fields are returned."
```

---

## Task 9: Add ownership check to getLikers

**Priority:** P1-10 (SECURITY — tout user PRO+ voit les likers de tout projet)

**Files:**
- Modify: `api/src/interactions/interactions.controller.ts`

- [ ] **Step 1: Add Request decorator and ownership check**

In `api/src/interactions/interactions.controller.ts`, update the `getLikers` method (lines 44-59). Add `@Request() req` parameter and verify ownership:

```typescript
    @UseGuards(FirebaseAuthGuard, PlanGuard)
    @RequiresPlan(UserPlan.PRO)
    @Get('likes/:projectId')
    @ApiOperation({ summary: 'Get users who liked a project (PRO+)' })
    @ApiResponse({ status: 200, description: 'List of likers with user info.' })
    async getLikers(
        @Request() req,
        @Param('projectId') projectId: string,
        @Query('take') take?: string,
        @Query('skip') skip?: string,
    ) {
        // Verify the current user owns this project
        const project = await this.interactionsService.getProjectOwner(projectId);
        if (!project || project.founderId !== req.user.dbUser.id) {
            throw new ForbiddenException('Vous ne pouvez voir les likers que de vos propres projets');
        }
        return this.interactionsService.getLikers(
            projectId,
            take ? parseInt(take, 10) : 20,
            skip ? parseInt(skip, 10) : 0,
        );
    }
```

Make sure `ForbiddenException` and `Request` are imported from `@nestjs/common`.

- [ ] **Step 2: Add getProjectOwner to InteractionsService if not exists**

In the `InteractionsService`, add a helper method if it doesn't already exist:

```typescript
    async getProjectOwner(projectId: string) {
        return this.prisma.project.findUnique({
            where: { id: projectId },
            select: { founderId: true },
        });
    }
```

- [ ] **Step 3: Verify compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add api/src/interactions/
git commit -m "fix(interactions): add ownership check to getLikers endpoint

Fixes P1-10: any PRO+ user could see who liked any project.
Now only the project owner can see their likers."
```

---

## Task 10: Allow clearing URL fields (empty string → null)

**Priority:** P1-14 (users cannot clear their LinkedIn/website once set)

**Files:**
- Modify: `api/src/users/dto/update-user.dto.ts`

`@IsUrl()` rejects empty strings, so users can't clear their URLs. Fix: add `@ValidateIf` to skip URL validation when value is empty.

- [ ] **Step 1: Update URL validators in UpdateUserProfileDto**

In `api/src/users/dto/update-user.dto.ts`, add `ValidateIf` to the import:

```typescript
import {
    IsArray, IsInt, IsObject, IsOptional, IsString,
    MaxLength, Min, Max, Matches, ArrayMaxSize, IsUrl, ValidateIf,
} from 'class-validator';
```

Then replace each URL field block. For `linkedinUrl`:

```typescript
    @ApiPropertyOptional({ description: 'LinkedIn URL' })
    @IsOptional()
    @ValidateIf(o => o.linkedinUrl !== '')
    @IsUrl({}, { message: 'URL LinkedIn invalide' })
    @MaxLength(500)
    linkedinUrl?: string;
```

Apply the same `@ValidateIf(o => o.FIELDNAME !== '')` pattern to `websiteUrl`, `githubUrl`, and `portfolioUrl`.

- [ ] **Step 2: Handle empty string → null in updateProfile service**

In `api/src/users/users.service.ts`, in the `updateProfile` method, transform empty strings to null before saving:

```typescript
    async updateProfile(firebaseUid: string, dto: UpdateUserProfileDto) {
        // Convert empty strings to null for URL fields
        const urlFields = ['linkedinUrl', 'websiteUrl', 'githubUrl', 'portfolioUrl'] as const;
        const data: Record<string, any> = { ...dto };
        for (const field of urlFields) {
            if (data[field] === '') data[field] = null;
        }

        return this.prisma.user.update({
            where: { firebaseUid },
            data,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                name: true,
                image: true,
                role: true,
                plan: true,
                title: true,
                bio: true,
                country: true,
                city: true,
                skills: true,
                languages: true,
                yearsOfExperience: true,
            },
        });
    }
```

- [ ] **Step 3: Verify compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add api/src/users/dto/update-user.dto.ts api/src/users/users.service.ts
git commit -m "fix(dto): allow clearing URL fields by sending empty string

Fixes P1-14: @IsUrl rejected empty strings, preventing users from
removing their LinkedIn/website URLs once set."
```

---

## Task 11: Make email field readOnly in ProfileForm

**Priority:** P1-13 (email appears editable but changes are never saved)

**Files:**
- Modify: `web/src/components/profile/profile-form.tsx`

- [ ] **Step 1: Remove email state and make input readOnly**

In `web/src/components/profile/profile-form.tsx`, replace line 42:

```typescript
    const [email, setEmail] = useState(user.email || '');
```

With:

```typescript
    const email = user.email || '';
```

Then find the email input in the JSX (around line 126-127) and replace:

```typescript
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} disabled />
```

With:

```typescript
                        <input type="email" value={email} readOnly className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`} />
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/profile/profile-form.tsx
git commit -m "fix(profile): make email field readOnly — it's managed by Firebase

Fixes P1-13: email appeared editable but changes were silently discarded."
```

---

## Task 12: Update admin KPIs for flexible roles

**Priority:** P1-15 (KPIs "Fondateurs"/"Candidats" always show 0)

**Files:**
- Modify: `web/src/app/admin/page.tsx`

- [ ] **Step 1: Update labels and remove SumCheck**

In `web/src/app/admin/page.tsx`, replace lines 204-213:

```typescript
      <div>
        <SectionTitle>Utilisateurs ({kpis.users.total})</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total" value={kpis.users.total} icon={Users} color="text-blue-600" bg="bg-blue-50" />
          <StatCard label="Fondateurs" value={kpis.users.founders} icon={Briefcase} color="text-indigo-600" bg="bg-indigo-50" />
          <StatCard label="Candidats" value={kpis.users.candidates} icon={UserPlus} color="text-purple-600" bg="bg-purple-50" />
          <StatCard label="Admins" value={kpis.users.admins} icon={ShieldCheck} color="text-red-600" bg="bg-red-50" />
          <StatCard label="Non assignés" value={kpis.users.unassigned} icon={UserCog} color="text-gray-500" bg="bg-gray-50" />
          <StatCard label="Nouveaux (7j)" value={kpis.users.newThisWeek} icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
          <StatCard label="Bannis" value={kpis.users.banned} icon={Shield} color="text-red-600" bg="bg-red-50" />
          <SumCheck total={kpis.users.total} parts={[kpis.users.founders, kpis.users.candidates, kpis.users.admins, kpis.users.unassigned]} />
        </div>
      </div>
```

With:

```typescript
      <div>
        <SectionTitle>Utilisateurs ({kpis.users.total})</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total" value={kpis.users.total} icon={Users} color="text-blue-600" bg="bg-blue-50" />
          <StatCard label="Avec projets" value={kpis.users.founders} icon={Briefcase} color="text-indigo-600" bg="bg-indigo-50" />
          <StatCard label="Candidats actifs" value={kpis.users.candidates} icon={UserPlus} color="text-purple-600" bg="bg-purple-50" />
          <StatCard label="Admins" value={kpis.users.admins} icon={ShieldCheck} color="text-red-600" bg="bg-red-50" />
          <StatCard label="Nouveaux (7j)" value={kpis.users.newThisWeek} icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
          <StatCard label="Bannis" value={kpis.users.banned} icon={Shield} color="text-red-600" bg="bg-red-50" />
        </div>
      </div>
```

Note: Remove the `SumCheck` row and the "Non assignés" card since the role-based decomposition no longer makes sense. The backend already counts "founders" as users with projects and "candidates" as users with candidateProfile.

- [ ] **Step 2: Commit**

```bash
git add web/src/app/admin/page.tsx
git commit -m "fix(admin): update KPI labels for flexible roles model

Fixes P1-15: 'Fondateurs'/'Candidats' were counting by role (always 0).
Now labels reflect the new meaning: 'Avec projets'/'Candidats actifs'."
```

---

## Task 13: Create DTO for POST /projects/from-document

**Priority:** P1-16 (inline body type bypasses ValidationPipe)

**Files:**
- Create: `api/src/projects/dto/create-project-from-document.dto.ts`
- Modify: `api/src/projects/projects.controller.ts`

- [ ] **Step 1: Create the DTO**

Create `api/src/projects/dto/create-project-from-document.dto.ts`:

```typescript
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectFromDocumentDto {
    @ApiProperty({ description: 'Project name' })
    @IsString()
    @MaxLength(200)
    name: string;

    @ApiProperty({ description: 'Short pitch' })
    @IsString()
    @MaxLength(500)
    pitch: string;

    @ApiPropertyOptional({ description: 'Country' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    country?: string;

    @ApiPropertyOptional({ description: 'City' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @ApiPropertyOptional({ description: 'Location' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    location?: string;

    @ApiPropertyOptional({ description: 'Base64 logo image' })
    @IsOptional()
    @IsString()
    logoBase64?: string;
}
```

- [ ] **Step 2: Update controller to use the DTO**

In `api/src/projects/projects.controller.ts`, find the `from-document` endpoint and replace the inline `@Body()` type:

```typescript
import { CreateProjectFromDocumentDto } from './dto/create-project-from-document.dto';
```

Then change:

```typescript
@Body() body: { name: string; pitch: string; country?: string; city?: string; location?: string; logoBase64?: string },
```

To:

```typescript
@Body() body: CreateProjectFromDocumentDto,
```

- [ ] **Step 3: Verify compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add api/src/projects/dto/create-project-from-document.dto.ts api/src/projects/projects.controller.ts
git commit -m "fix(projects): create typed DTO for POST /projects/from-document

Fixes P1-16: inline body type bypassed class-validator validation.
Now uses CreateProjectFromDocumentDto with proper decorators."
```

---

## Task 14: Fix P1-12 — Remove email/phone from public project endpoint select

**Priority:** P1-12 (defense in depth — don't rely solely on interceptor)

**Files:**
- Modify: `api/src/projects/projects.service.ts`

- [ ] **Step 1: Remove email and phone from founder select in findOne**

In `api/src/projects/projects.service.ts`, find the `findOne` method (around line 556). In the `founder: { select: { ... } }` block, remove:

```typescript
                        email: true,
                        phone: true,
```

These fields should only be returned via a dedicated premium endpoint, not embedded in public project data.

- [ ] **Step 2: Verify compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add api/src/projects/projects.service.ts
git commit -m "fix(projects): remove email/phone from public project founder select

Fixes P1-12: defense in depth — sensitive fields should not be included
in public selects even when PrivacyInterceptor masks them."
```

---

## Task 15: Fix P2-17 — getTrendingCandidates ID mismatch

**Priority:** P2-17 (trending candidates mal classés — compare User.id vs CandidateProfile.id)

**Files:**
- Modify: `api/src/users/users.service.ts`

- [ ] **Step 1: Fix the ID mismatch in getTrendingCandidates**

In `api/src/users/users.service.ts`, find the `getTrendingCandidates` method. Find these lines:

```typescript
        const userIds = candidates.map((c) => c.user.id);

        const applicationCounts = await this.prisma.application.groupBy({
            by: ['candidateId'],
            where: { candidateId: { in: userIds } },
```

Replace with:

```typescript
        const candidateProfileIds = candidates.map((c) => c.id);

        const applicationCounts = await this.prisma.application.groupBy({
            by: ['candidateId'],
            where: { candidateId: { in: candidateProfileIds } },
```

Also update the `appMap` lookup. Find:

```typescript
            const popularityNorm = (appMap.get(c.user.id) || 0) / maxApps;
```

Replace with:

```typescript
            const popularityNorm = (appMap.get(c.id) || 0) / maxApps;
```

- [ ] **Step 2: Verify compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add api/src/users/users.service.ts
git commit -m "fix(users): use CandidateProfile.id for application count in trending

Fixes P2-17: was comparing User.id with Application.candidateId
(which references CandidateProfile.id), so counts were always 0."
```

---

## Task 16: Final verification — build both projects

**Files:**
- All modified files

- [ ] **Step 1: Run backend compilation**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Run frontend build**

```bash
cd web && npx next build
```

Expected: Build succeeds, all pages generated.

- [ ] **Step 3: Search for remaining issues**

```bash
cd api && grep -r "founderProfile" src/ --include="*.ts" -l
cd web && grep -r "founderProfile" src/ --include="*.tsx" --include="*.ts" -l
```

Expected: No results.

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: final cleanup after audit fixes"
```
