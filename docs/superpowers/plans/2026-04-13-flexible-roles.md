# Flexible Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove fixed FOUNDER/CANDIDATE roles — any user can publish projects AND apply to others. Personal/professional fields promoted from `founderProfile` JSON to typed User columns, CandidateProfile slimmed to candidate-specific fields only.

**Architecture:** Prisma migration adds typed columns to `users`, migrates data from `founder_profile` JSON and `candidate_profiles` duplicate fields, then drops the originals. Backend services/DTOs updated to read/write new columns. Frontend forms unified, routing simplified — no more role-gated redirects.

**Tech Stack:** Prisma (migration), NestJS (services, DTOs, controllers), Next.js (pages, components, routing)

**Spec:** `docs/superpowers/specs/2026-04-13-flexible-roles-design.md`

---

## File Map

### Backend — Create
- `api/prisma/migrations/<timestamp>_flexible_roles/migration.sql` — Prisma generates this

### Backend — Modify
- `api/prisma/schema.prisma` — User model (add columns, remove founderProfile), CandidateProfile (remove duplicates), UserRole enum (remove FOUNDER/CANDIDATE)
- `api/src/users/dto/update-user.dto.ts` — Replace founderProfile JSON + role with typed fields
- `api/src/users/dto/create-candidate-profile.dto.ts` — Remove fields migrated to User
- `api/src/users/users.service.ts` — Update all queries to use new User columns
- `api/src/users/users.controller.ts` — No structural change, just DTO types flow through
- `api/src/applications/applications.service.ts` — Read from User instead of founderProfile
- `api/src/projects/projects.service.ts` — Select User columns instead of founderProfile
- `api/src/admin/admin.service.ts` — Stats: replace role counts with project/candidateProfile counts
- `api/src/admin/dto/admin.dto.ts` — ChangeRoleDto: only ADMIN/USER
- `api/src/ads/ads.service.ts` — Read skills/city from User instead of candidateProfile
- `api/src/auth/auth.service.ts` — No change (already creates with role: 'USER')

### Frontend — Modify
- `web/src/types/shared.ts` — Update UserDTO type
- `web/src/app/(dashboard)/layout.tsx` — Replace role check with onboarding check
- `web/src/app/(dashboard)/profile/page.tsx` — Unified profile page with dynamic sections
- `web/src/components/profile/profile-form.tsx` — Read from user.* instead of user.founderProfile.*
- `web/src/components/profile/candidate-profile-form.tsx` — Remove personal/pro fields (only candidate-specific)
- `web/src/components/layout/sidebar-left.tsx` — Remove role-based condition
- `web/src/app/onboarding/role/page.tsx` — Replace with intention selector (not role)
- `web/src/components/project-deck/founder-sidebar.tsx` — Read from founder.* instead of founder.founderProfile.*
- `web/src/components/project-deck/project-deck.tsx` — Read from dbUser.* instead of dbUser.founderProfile.*
- `web/src/app/(dashboard)/founders/[id]/page.tsx` — Read from user.* instead of user.founderProfile

---

## Task 1: Prisma Schema — Add User columns & slim CandidateProfile

**Files:**
- Modify: `api/prisma/schema.prisma`

- [ ] **Step 1: Update UserRole enum — remove FOUNDER and CANDIDATE**

In `api/prisma/schema.prisma`, replace:

```prisma
enum UserRole {
  ADMIN
  FOUNDER
  CANDIDATE
  USER
}
```

With:

```prisma
enum UserRole {
  ADMIN
  USER
}
```

- [ ] **Step 2: Add professional columns to User model**

In `api/prisma/schema.prisma`, in the User model, after the `image` line and before the `role` line, add:

```prisma
  // Professional Profile (promoted from founderProfile JSON)
  title             String?
  bio               String?   @db.Text
  country           String?
  city              String?
  linkedinUrl       String?   @map("linkedin_url")
  websiteUrl        String?   @map("website_url")
  githubUrl         String?   @map("github_url")
  portfolioUrl      String?   @map("portfolio_url")
  skills            String[]  @default([])
  languages         String[]  @default([])
  certifications    String[]  @default([])
  yearsOfExperience Int?      @map("years_of_experience")
  experience        Json?     @db.JsonB
  education         Json?     @db.JsonB
```

- [ ] **Step 3: Remove founderProfile from User model**

Delete this line from the User model:

```prisma
  // Founder Profile (JSON: { title, bio, skills[], experience[], education[], linkedinUrl, city, languages[] })
  founderProfile Json? @map("founder_profile") @db.JsonB
```

- [ ] **Step 4: Remove duplicate columns from CandidateProfile**

In the CandidateProfile model, remove the following fields (they now live on User):

```prisma
  // Remove these:
  title       String
  bio         String  @db.Text
  location    String?
  linkedinUrl String? @map("linkedin_url")
  skills String[]
  experience Json? @db.JsonB
  education  Json? @db.JsonB
  yearsOfExperience Int?     @map("years_of_experience")
  languages         String[] @default([])
  certifications    String[] @default([])
  portfolioUrl      String?  @map("portfolio_url")
  githubUrl         String?  @map("github_url")
```

Also remove the indexes that reference removed columns:

```prisma
  @@index([skills])     // remove — skills now on User
  @@index([location])   // remove — location now on User
```

- [ ] **Step 5: Create the migration (WITHOUT applying)**

Run:

```bash
cd api && npx prisma migrate dev --name flexible_roles --create-only
```

Expected: A new migration file created in `api/prisma/migrations/` but NOT applied yet.

- [ ] **Step 6: Edit the generated migration SQL to add data migration**

Open the generated `migration.sql` and add data migration steps **BEFORE** the DROP statements. The migration should:

1. Add new columns to `users`
2. Migrate data from `founder_profile` JSON → new columns
3. Migrate data from `candidate_profiles` → new User columns (for pure candidates)
4. Drop duplicate columns from `candidate_profiles`
5. Drop `founder_profile` from `users`
6. Convert FOUNDER/CANDIDATE roles to USER

Insert this data migration block after the `ALTER TABLE users ADD COLUMN ...` statements and before any `DROP COLUMN` statements:

```sql
-- Migrate data from founder_profile JSON to new typed columns
UPDATE "users" SET
  "title" = "founder_profile"->>'title',
  "bio" = "founder_profile"->>'bio',
  "country" = "founder_profile"->>'country',
  "city" = "founder_profile"->>'city',
  "linkedin_url" = "founder_profile"->>'linkedinUrl',
  "website_url" = "founder_profile"->>'websiteUrl',
  "years_of_experience" = ("founder_profile"->>'yearsOfExperience')::int,
  "experience" = "founder_profile"->'experience',
  "education" = "founder_profile"->'education',
  "skills" = COALESCE(
    (SELECT array_agg(elem::text) FROM jsonb_array_elements_text("founder_profile"->'skills') AS elem),
    '{}'
  ),
  "languages" = COALESCE(
    (SELECT array_agg(elem::text) FROM jsonb_array_elements_text("founder_profile"->'languages') AS elem),
    '{}'
  )
WHERE "founder_profile" IS NOT NULL;

-- Migrate data from candidate_profiles for users who had no founder_profile
UPDATE "users" SET
  "title" = COALESCE("users"."title", cp."title"),
  "bio" = COALESCE("users"."bio", cp."bio"),
  "linkedin_url" = COALESCE("users"."linkedin_url", cp."linkedin_url"),
  "github_url" = COALESCE("users"."github_url", cp."github_url"),
  "portfolio_url" = COALESCE("users"."portfolio_url", cp."portfolio_url"),
  "years_of_experience" = COALESCE("users"."years_of_experience", cp."years_of_experience"),
  "experience" = COALESCE("users"."experience", cp."experience"),
  "education" = COALESCE("users"."education", cp."education"),
  "country" = COALESCE("users"."country", cp."location"),
  "skills" = CASE WHEN "users"."skills" = '{}' THEN cp."skills" ELSE "users"."skills" END,
  "languages" = CASE WHEN "users"."languages" = '{}' THEN cp."languages" ELSE "users"."languages" END,
  "certifications" = CASE WHEN "users"."certifications" = '{}' THEN cp."certifications" ELSE "users"."certifications" END
FROM "candidate_profiles" cp
WHERE cp."user_id" = "users"."id";

-- Convert FOUNDER and CANDIDATE roles to USER
UPDATE "users" SET "role" = 'USER' WHERE "role" IN ('FOUNDER', 'CANDIDATE');
```

- [ ] **Step 7: Apply the migration**

Run:

```bash
cd api && npx prisma migrate dev
```

Expected: Migration applied successfully, no errors.

- [ ] **Step 8: Regenerate Prisma client**

Run:

```bash
cd api && npx prisma generate
```

Expected: Prisma Client generated successfully.

- [ ] **Step 9: Commit**

```bash
git add api/prisma/
git commit -m "feat(db): migrate to flexible roles — promote User fields, slim CandidateProfile"
```

---

## Task 2: Backend DTOs — Update UpdateUserProfileDto and CreateCandidateProfileDto

**Files:**
- Modify: `api/src/users/dto/update-user.dto.ts`
- Modify: `api/src/users/dto/create-candidate-profile.dto.ts`
- Modify: `api/src/admin/dto/admin.dto.ts`

- [ ] **Step 1: Rewrite UpdateUserProfileDto**

Replace the entire content of `api/src/users/dto/update-user.dto.ts` with:

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray, IsInt, IsObject, IsOptional, IsString,
    MaxLength, Min, Max, Matches, ArrayMaxSize, IsUrl,
} from 'class-validator';

export class UpdateUserProfileDto {
    @ApiPropertyOptional({ description: 'First name' })
    @IsString()
    @MaxLength(100)
    @IsOptional()
    firstName?: string;

    @ApiPropertyOptional({ description: 'Last name' })
    @IsString()
    @MaxLength(100)
    @IsOptional()
    lastName?: string;

    @ApiPropertyOptional({ description: 'Phone number' })
    @IsString()
    @MaxLength(25)
    @Matches(/^\+?[\d\s\-()]{6,25}$/, { message: 'Numéro de téléphone invalide' })
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({ description: 'Address' })
    @IsString()
    @MaxLength(255)
    @IsOptional()
    address?: string;

    // ── Professional profile fields ──

    @ApiPropertyOptional({ description: 'Professional title' })
    @IsString()
    @MaxLength(120)
    @IsOptional()
    title?: string;

    @ApiPropertyOptional({ description: 'Bio' })
    @IsString()
    @MaxLength(2000)
    @IsOptional()
    bio?: string;

    @ApiPropertyOptional({ description: 'Country' })
    @IsString()
    @MaxLength(100)
    @IsOptional()
    country?: string;

    @ApiPropertyOptional({ description: 'City' })
    @IsString()
    @MaxLength(100)
    @IsOptional()
    city?: string;

    @ApiPropertyOptional({ description: 'LinkedIn URL' })
    @IsOptional()
    @IsUrl({}, { message: 'URL LinkedIn invalide' })
    @MaxLength(500)
    linkedinUrl?: string;

    @ApiPropertyOptional({ description: 'Website URL' })
    @IsOptional()
    @IsUrl({}, { message: 'URL site web invalide' })
    @MaxLength(500)
    websiteUrl?: string;

    @ApiPropertyOptional({ description: 'GitHub URL' })
    @IsOptional()
    @IsUrl({}, { message: 'URL GitHub invalide' })
    @MaxLength(500)
    githubUrl?: string;

    @ApiPropertyOptional({ description: 'Portfolio URL' })
    @IsOptional()
    @IsUrl({}, { message: 'URL portfolio invalide' })
    @MaxLength(500)
    portfolioUrl?: string;

    @ApiPropertyOptional({ type: [String], description: 'Skills' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(15, { message: 'Maximum 15 compétences' })
    @IsString({ each: true })
    @MaxLength(50, { each: true })
    skills?: string[];

    @ApiPropertyOptional({ type: [String], description: 'Languages' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10, { message: 'Maximum 10 langues' })
    @IsString({ each: true })
    @MaxLength(50, { each: true })
    languages?: string[];

    @ApiPropertyOptional({ type: [String], description: 'Certifications' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10, { message: 'Maximum 10 certifications' })
    @IsString({ each: true })
    @MaxLength(100, { each: true })
    certifications?: string[];

    @ApiPropertyOptional({ description: 'Years of experience' })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(50)
    yearsOfExperience?: number;

    @ApiPropertyOptional({ description: 'Work experience (JSON array)' })
    @IsOptional()
    @IsObject({ each: true })
    @IsArray()
    experience?: Record<string, any>[];

    @ApiPropertyOptional({ description: 'Education (JSON array)' })
    @IsOptional()
    @IsObject({ each: true })
    @IsArray()
    education?: Record<string, any>[];
}
```

- [ ] **Step 2: Slim CreateCandidateProfileDto — remove fields migrated to User**

Replace the entire content of `api/src/users/dto/create-candidate-profile.dto.ts` with:

```typescript
import { IsString, IsOptional, IsArray, MaxLength, ArrayMaxSize, IsIn, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateProfileDto {
    @ApiPropertyOptional({ description: 'Short pitch (280 chars)' })
    @IsOptional()
    @IsString()
    @MaxLength(280, { message: 'Le pitch court ne doit pas dépasser 280 caractères' })
    shortPitch?: string;

    @ApiPropertyOptional({ description: 'Long pitch / motivation' })
    @IsOptional()
    @IsString()
    @MaxLength(2000, { message: 'Le message libre ne doit pas dépasser 2000 caractères' })
    longPitch?: string;

    @ApiPropertyOptional({ description: 'Vision at 3-5 years' })
    @IsOptional()
    @IsString()
    @MaxLength(500, { message: 'La vision ne doit pas dépasser 500 caractères' })
    vision?: string;

    @ApiPropertyOptional({ example: 'TECH' })
    @IsOptional()
    @IsIn(['TECH', 'PRODUCT', 'MARKETING', 'OPS', 'FINANCE'], { message: 'Type de rôle invalide' })
    roleType?: string;

    @ApiPropertyOptional({ example: 'SERIOUS' })
    @IsOptional()
    @IsIn(['SIDE', 'SERIOUS', 'FULLTIME'], { message: 'Type d\'engagement invalide' })
    commitmentType?: string;

    @ApiPropertyOptional({ example: 'EQUITY' })
    @IsOptional()
    @IsIn(['EQUITY', 'PAID', 'HYBRID', 'DISCUSS'], { message: 'Préférence de collaboration invalide' })
    collabPref?: string;

    @ApiPropertyOptional({ example: 'REMOTE' })
    @IsOptional()
    @IsIn(['REMOTE', 'HYBRID', 'ONSITE'], { message: 'Préférence de lieu invalide' })
    locationPref?: string;

    @ApiPropertyOptional({ example: 'YES' })
    @IsOptional()
    @IsIn(['YES', 'NO'], { message: 'Valeur invalide pour hasCofounded' })
    hasCofounded?: string;

    @ApiPropertyOptional({ example: 'FULLTIME' })
    @IsOptional()
    @IsIn(['2-5H', '5-10H', '10-20H', 'FULLTIME'], { message: 'Disponibilité invalide' })
    availability?: string;

    @ApiPropertyOptional({ example: ['TECH', 'IMPACT'], type: [String] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10, { message: 'Maximum 10 secteurs' })
    @IsIn(['TECH', 'HYBRID', 'IMPACT', 'ANY'], { each: true, message: 'Type de projet invalide' })
    projectPref?: string[];

    @ApiPropertyOptional({ description: 'Resume URL' })
    @IsOptional()
    @IsUrl({}, { message: 'URL CV invalide' })
    @MaxLength(500)
    resumeUrl?: string;
}
```

- [ ] **Step 3: Update ChangeRoleDto in admin DTOs**

In `api/src/admin/dto/admin.dto.ts`, replace:

```typescript
export class ChangeRoleDto {
  @IsEnum(['ADMIN', 'FOUNDER', 'CANDIDATE', 'USER'])
  role: 'ADMIN' | 'FOUNDER' | 'CANDIDATE' | 'USER';
}
```

With:

```typescript
export class ChangeRoleDto {
  @IsEnum(['ADMIN', 'USER'])
  role: 'ADMIN' | 'USER';
}
```

- [ ] **Step 4: Commit**

```bash
git add api/src/users/dto/ api/src/admin/dto/
git commit -m "feat(dto): update DTOs for flexible roles — typed User fields, slim candidate DTO"
```

---

## Task 3: Backend — Update UsersService

**Files:**
- Modify: `api/src/users/users.service.ts`

- [ ] **Step 1: Update findOne — remove founderProfile, add new User fields to candidateProfile select**

In `api/src/users/users.service.ts`, replace the `findOne` method (lines 19-57) with:

```typescript
    async findOne(firebaseUid: string) {
        return this.prisma.user.findUnique({
            where: { firebaseUid },
            include: {
                projects: true,
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
            }
        });
    }
```

- [ ] **Step 2: Update findPublicProfile — read from User instead of founderProfile**

Replace the `findPublicProfile` method (lines 59-128) with:

```typescript
    async findPublicProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                name: true,
                email: true,
                phone: true,
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
                        qualityScore: true,
                        profileCompleteness: true,
                        status: true,
                        createdAt: true,
                    },
                },
                createdAt: true,
                projects: {
                    where: { status: 'PUBLISHED' },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        slug: true,
                        name: true,
                        pitch: true,
                        logoUrl: true,
                        sector: true,
                        stage: true,
                        location: true,
                        lookingForRole: true,
                        collabType: true,
                        createdAt: true,
                        _count: { select: { applications: true } },
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('Utilisateur introuvable');
        }

        return user;
    }
```

- [ ] **Step 3: Update updateProfile — remove founderProfile JSON validation**

Replace the `updateProfile` method (lines 138-153) with:

```typescript
    async updateProfile(firebaseUid: string, dto: UpdateUserProfileDto) {
        return this.prisma.user.update({
            where: { firebaseUid },
            data: {
                ...dto,
            },
        });
    }
```

- [ ] **Step 4: Update createCandidateProfile — remove role check, simplify data mapping**

Replace the `createCandidateProfile` method (lines 229-292) with:

```typescript
    async createCandidateProfile(firebaseUid: string, dto: CreateCandidateProfileDto) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true, candidateProfile: { select: { id: true } } },
        });

        if (!user) {
            throw new NotFoundException('Utilisateur non trouvé');
        }

        if (user.candidateProfile) {
            throw new ConflictException('Vous avez déjà un profil candidat');
        }

        const profile = await this.prisma.candidateProfile.create({
            data: {
                userId: user.id,
                shortPitch: dto.shortPitch || null,
                longPitch: dto.longPitch || null,
                vision: dto.vision || null,
                roleType: dto.roleType || null,
                commitmentType: dto.commitmentType || null,
                collabPref: dto.collabPref || null,
                locationPref: dto.locationPref || null,
                hasCofounded: dto.hasCofounded || null,
                availability: dto.availability || null,
                desiredSectors: dto.projectPref?.length ? dto.projectPref : [],
                remoteOnly: dto.locationPref === 'REMOTE',
                resumeUrl: dto.resumeUrl || null,
                status: 'ANALYZING',
            },
            select: { id: true, status: true },
        });

        // Clear onboarding draft
        await this.prisma.user.update({
            where: { firebaseUid },
            data: { projectDraft: Prisma.JsonNull },
        });

        this.logger.log(`Candidate profile created: ${profile.id} for user ${user.id}`);

        return profile;
    }
```

- [ ] **Step 5: Update updateCandidateProfile — remove migrated fields**

Replace the `updateCandidateProfile` method (lines 297-362) with:

```typescript
    async updateCandidateProfile(firebaseUid: string, dto: CreateCandidateProfileDto) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true, candidateProfile: { select: { id: true } } },
        });

        if (!user) {
            throw new NotFoundException('Utilisateur non trouvé');
        }

        if (!user.candidateProfile) {
            throw new NotFoundException('Profil candidat introuvable');
        }

        const updateData: Record<string, any> = { status: 'ANALYZING' };

        if (dto.shortPitch !== undefined) updateData.shortPitch = dto.shortPitch || null;
        if (dto.longPitch !== undefined) updateData.longPitch = dto.longPitch || null;
        if (dto.vision !== undefined) updateData.vision = dto.vision || null;
        if (dto.roleType !== undefined) updateData.roleType = dto.roleType || null;
        if (dto.commitmentType !== undefined) updateData.commitmentType = dto.commitmentType || null;
        if (dto.collabPref !== undefined) updateData.collabPref = dto.collabPref || null;
        if (dto.hasCofounded !== undefined) updateData.hasCofounded = dto.hasCofounded || null;
        if (dto.availability !== undefined) updateData.availability = dto.availability || null;
        if (dto.locationPref !== undefined) {
            updateData.remoteOnly = dto.locationPref === 'REMOTE';
            updateData.locationPref = dto.locationPref || null;
        }
        if (dto.projectPref !== undefined) updateData.desiredSectors = dto.projectPref?.length ? dto.projectPref : [];
        if (dto.resumeUrl !== undefined) updateData.resumeUrl = dto.resumeUrl || null;

        const profile = await this.prisma.candidateProfile.update({
            where: { id: user.candidateProfile.id },
            data: updateData,
            select: { id: true, status: true },
        });

        this.logger.log(`Candidate profile updated: ${profile.id} → ANALYZING`);

        return profile;
    }
```

- [ ] **Step 6: Update getCandidatesFeed — read title/bio/skills from User**

Replace the `getCandidatesFeed` method (lines 364-428) with:

```typescript
    async getCandidatesFeed(
        firebaseUid: string | null,
        cursor: string | null,
        limit: number = 7,
        filters?: { city?: string; skills?: string[]; sector?: string },
    ) {
        const take = Math.min(limit, 20);

        const where: Prisma.CandidateProfileWhereInput = {
            status: 'PUBLISHED',
            ...(filters?.city ? {
                user: { city: { contains: filters.city, mode: 'insensitive' as Prisma.QueryMode } }
            } : {}),
            ...(filters?.skills && filters.skills.length > 0 ? {
                user: { skills: { hasSome: filters.skills } }
            } : {}),
            ...(filters?.sector ? {
                desiredSectors: { has: filters.sector }
            } : {}),
        };

        const candidates = await this.prisma.candidateProfile.findMany({
            where,
            take: take + 1,
            cursor: cursor ? { id: cursor } : undefined,
            skip: cursor ? 1 : 0,
            select: {
                id: true,
                shortPitch: true,
                roleType: true,
                commitmentType: true,
                collabPref: true,
                locationPref: true,
                desiredSectors: true,
                remoteOnly: true,
                availability: true,
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

        const nextCursor = candidates.length > take ? candidates[take].id : null;
        const page = candidates.slice(0, take);

        return {
            candidates: page,
            nextCursor,
        };
    }
```

- [ ] **Step 7: Update generateCandidateEmbeddings — read from User**

Replace the `generateCandidateEmbeddings` method (lines 433-468) with:

```typescript
    async generateCandidateEmbeddings(candidateProfileId: string) {
        const profile = await this.prisma.candidateProfile.findUnique({
            where: { id: candidateProfileId },
            select: {
                id: true,
                user: { select: { title: true, bio: true, skills: true } },
            },
        });
        if (!profile) return;

        // Bio embedding
        const bioText = [profile.user.title, profile.user.bio].filter(Boolean).join(' ');
        if (bioText.length >= 10) {
            const bioEmbedding = await this.aiService.getEmbedding(bioText);
            const bioVector = `[${bioEmbedding.join(',')}]`;
            const embeddingModel = this.aiService.getEmbeddingModel();
            await this.prisma.$executeRaw`
                UPDATE candidate_profiles
                SET bio_embedding = ${bioVector}::vector,
                    embedding_model = ${embeddingModel},
                    last_embedded_at = NOW()
                WHERE id = ${candidateProfileId}
            `;
        }

        // Skills embedding
        if (profile.user.skills.length > 0) {
            const skillsText = profile.user.skills.join(', ');
            const skillsEmbedding = await this.aiService.getEmbedding(skillsText);
            const skillsVector = `[${skillsEmbedding.join(',')}]`;
            await this.prisma.$executeRaw`
                UPDATE candidate_profiles
                SET skills_embedding = ${skillsVector}::vector
                WHERE id = ${candidateProfileId}
            `;
        }

        this.logger.log(`Embeddings generated for candidate ${candidateProfileId}`);
    }
```

- [ ] **Step 8: Update getTrendingCandidates — read from User**

Replace the `getTrendingCandidates` method (lines 475-534) — in the `select` replace `title: true, skills: true` at CandidateProfile level with reading from user:

```typescript
    async getTrendingCandidates() {
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

        const candidates = await this.prisma.candidateProfile.findMany({
            where: { status: 'PUBLISHED' },
            select: {
                id: true,
                qualityScore: true,
                createdAt: true,
                user: {
                    select: { id: true, name: true, image: true, title: true, skills: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        if (candidates.length === 0) return [];

        const userIds = candidates.map((c) => c.user.id);

        const applicationCounts = await this.prisma.application.groupBy({
            by: ['candidateId'],
            where: { candidateId: { in: userIds } },
            _count: true,
        });

        const appMap = new Map(applicationCounts.map((a) => [a.candidateId, a._count]));
        const maxApps = Math.max(1, ...applicationCounts.map((a) => a._count));

        const scored = candidates.map((c) => {
            const qualityNorm = (c.qualityScore || 0) / 100;
            const ageMs = now - new Date(c.createdAt).getTime();
            const freshnessNorm = Math.max(0, 1 - ageMs / thirtyDaysMs);
            const popularityNorm = (appMap.get(c.user.id) || 0) / maxApps;

            const score = qualityNorm * 0.4 + freshnessNorm * 0.3 + popularityNorm * 0.3;

            return {
                id: c.id,
                userId: c.user.id,
                name: c.user.name,
                image: c.user.image,
                title: c.user.title,
                skills: c.user.skills?.slice(0, 3) || [],
                qualityScore: c.qualityScore,
                score,
            };
        });

        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, 5);
    }
```

- [ ] **Step 9: Commit**

```bash
git add api/src/users/users.service.ts
git commit -m "feat(users): update UsersService for flexible roles — read from User columns"
```

---

## Task 4: Backend — Update ApplicationsService, ProjectsService, AdsService, AdminService

**Files:**
- Modify: `api/src/applications/applications.service.ts`
- Modify: `api/src/projects/projects.service.ts`
- Modify: `api/src/admin/admin.service.ts`
- Modify: `api/src/ads/ads.service.ts`

- [ ] **Step 1: Update ApplicationsService.apply — read from User instead of founderProfile**

In `api/src/applications/applications.service.ts`, replace lines 28-78 (the user lookup + validation + auto-create block) with:

```typescript
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                name: true,
                title: true,
                bio: true,
                skills: true,
                candidateProfile: { select: { id: true } },
            },
        });

        if (!user) {
            throw new NotFoundException('Utilisateur non trouvé');
        }

        // Validate profile completeness before applying
        const missingFields: string[] = [];
        if (!user.firstName) missingFields.push('Prénom');
        if (!user.lastName) missingFields.push('Nom');
        if (!user.title) missingFields.push('Titre professionnel');
        if (!user.bio) missingFields.push('Bio');
        if (!user.skills || user.skills.length === 0) missingFields.push('Compétences');

        if (missingFields.length > 0) {
            throw new BadRequestException({
                message: 'Veuillez compléter votre profil avant de postuler',
                missingFields,
                code: 'INCOMPLETE_PROFILE',
            });
        }

        // Auto-create candidateProfile if needed (minimal — candidate-specific fields empty)
        if (!user.candidateProfile) {
            const profile = await this.prisma.candidateProfile.create({
                data: {
                    userId: user.id,
                    status: 'ANALYZING',
                },
                select: { id: true },
            });
            user.candidateProfile = profile;
            this.logger.log(`Auto-created candidate profile for user ${user.id}`);

            // Lancer la modération IA en fire-and-forget
            this.candidateModerationService.moderateProfile(profile.id).catch(() => {});
        }
```

- [ ] **Step 2: Update ProjectsService — select User fields instead of founderProfile**

In `api/src/projects/projects.service.ts`, find line 576 (`founderProfile: true,`) and replace the founder select block (lines 567-578) with:

```typescript
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        name: true,
                        email: true,
                        phone: true,
                        image: true,
                        plan: true,
                        title: true,
                        bio: true,
                        country: true,
                        city: true,
                        linkedinUrl: true,
                        websiteUrl: true,
                        skills: true,
                        languages: true,
                        yearsOfExperience: true,
                        experience: true,
                        education: true,
                        createdAt: true,
                    }
```

- [ ] **Step 3: Update AdminService stats — replace role counts**

In `api/src/admin/admin.service.ts`, replace lines 91-94:

```typescript
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { role: 'FOUNDER' } }),
      this.prisma.user.count({ where: { role: 'CANDIDATE' } }),
      this.prisma.user.count({ where: { role: 'USER' } }),
```

With:

```typescript
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { projects: { some: {} } } }),
      this.prisma.user.count({ where: { candidateProfile: { isNot: null } } }),
      this.prisma.user.count({ where: { role: 'USER' } }),
```

Also update the variable names in the destructuring above (around line 55) — rename `founderCount` to `activeFoundersCount` and `candidateCount` to `activeCandidatesCount` if those names exist, or keep the same names since they still represent the same concept (founders/candidates) just calculated differently.

- [ ] **Step 4: Update AdsService — read skills/city from User instead of candidateProfile**

In `api/src/ads/ads.service.ts`, replace lines 574-579:

```typescript
    if (user.candidateProfile) {
      user.candidateProfile.skills.forEach((s) => skills.add(s));
      user.candidateProfile.desiredSectors.forEach((s) => sectors.add(s));
      city = user.candidateProfile.location;
    }
```

With:

```typescript
    // Skills and city from User profile
    if (user.skills) {
      user.skills.forEach((s: string) => skills.add(s));
    }
    if (user.city) {
      city = user.city;
    }
    // Sectors from candidateProfile
    if (user.candidateProfile) {
      user.candidateProfile.desiredSectors.forEach((s: string) => sectors.add(s));
    }
```

Also ensure the Prisma select for this query includes `skills` and `city` on the User. Search for the query that populates the `user` variable in this method and add `skills: true, city: true` to the User select if not already there.

- [ ] **Step 5: Commit**

```bash
git add api/src/applications/ api/src/projects/ api/src/admin/ api/src/ads/
git commit -m "feat(api): update services for flexible roles — read from User columns"
```

---

## Task 5: Frontend — Update types, auth context, dashboard layout, sidebar

**Files:**
- Modify: `web/src/types/shared.ts`
- Modify: `web/src/app/(dashboard)/layout.tsx`
- Modify: `web/src/components/layout/sidebar-left.tsx`

- [ ] **Step 1: Update UserDTO type**

Replace the content of `web/src/types/shared.ts`:

```typescript
export interface UserDTO {
    id: string;
    email: string;
    role: 'ADMIN' | 'USER';
}

export const API_VERSION = 'v1';
```

- [ ] **Step 2: Update dashboard layout — replace role check with onboarding check**

In `web/src/app/(dashboard)/layout.tsx`, replace lines 20-28:

```typescript
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
        // Rediriger les utilisateurs sans rôle vers l'onboarding
        if (!loading && user && dbUser && dbUser.role === 'USER') {
            router.replace('/onboarding/role');
        }
    }, [loading, user, dbUser, router]);
```

With:

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

- [ ] **Step 3: Update sidebar — remove role-based condition**

In `web/src/components/layout/sidebar-left.tsx`, replace lines 58-64:

```typescript
    const hasProject = dbUser?.projects && dbUser.projects.length > 0;

    if (hasProject) {
        dynamicItems.push({ icon: FolderKanban, label: 'Mes Projets', path: '/my-project' });
    } else if (dbUser?.role !== 'CANDIDATE') {
        dynamicItems.push({ icon: Rocket, label: 'Lancer un projet', path: '/create/project' });
    }
```

With:

```typescript
    const hasProject = dbUser?.projects && dbUser.projects.length > 0;

    if (hasProject) {
        dynamicItems.push({ icon: FolderKanban, label: 'Mes Projets', path: '/my-project' });
    } else {
        dynamicItems.push({ icon: Rocket, label: 'Lancer un projet', path: '/create/project' });
    }
```

- [ ] **Step 4: Commit**

```bash
git add web/src/types/ web/src/app/\(dashboard\)/layout.tsx web/src/components/layout/sidebar-left.tsx
git commit -m "feat(web): update types, layout guard, sidebar for flexible roles"
```

---

## Task 6: Frontend — Update profile page to unified layout

**Files:**
- Modify: `web/src/app/(dashboard)/profile/page.tsx`

- [ ] **Step 1: Replace role-based conditional with dynamic sections**

In `web/src/app/(dashboard)/profile/page.tsx`, replace lines 105-106:

```typescript
    const isCandidate = displayUser.role === 'CANDIDATE';
    const cp = displayUser.candidateProfile;
```

With:

```typescript
    const hasCandidate = !!displayUser.candidateProfile;
    const cp = displayUser.candidateProfile;
```

- [ ] **Step 2: Replace the form conditional rendering**

Replace lines 117-123:

```typescript
                <div className="lg:col-span-2 space-y-6">
                    {isCandidate ? (
                        <CandidateProfileForm user={displayUser} onSaved={handleProfileSaved} />
                    ) : (
                        <ProfileForm user={displayUser} onSaved={handleProfileSaved} />
                    )}
                </div>
```

With:

```typescript
                <div className="lg:col-span-2 space-y-6">
                    {/* General + Professional — always shown */}
                    <ProfileForm user={displayUser} onSaved={handleProfileSaved} />

                    {/* Candidate section — shown if candidateProfile exists */}
                    {hasCandidate ? (
                        <CandidateProfileForm user={displayUser} onSaved={handleProfileSaved} />
                    ) : (
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Vous cherchez un projet ?</h3>
                            <p className="text-sm text-gray-500 mb-4">Activez votre profil candidat pour postuler aux projets et apparaître dans le feed.</p>
                            <button
                                onClick={() => router.push('/onboarding/candidate')}
                                className="px-6 h-[44px] bg-kezak-primary text-white rounded-xl font-semibold hover:bg-kezak-dark transition-all"
                            >
                                Activer mon profil candidat
                            </button>
                        </div>
                    )}
                </div>
```

- [ ] **Step 3: Replace the sidebar stats conditional**

Replace lines 127-180 (the `isCandidate && cp ?` block) with:

```typescript
                    {hasCandidate && cp && (
                        <>
                            {/* Status du profil candidat */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4">Profil candidat</h3>
                                <div className="space-y-4">
                                    <StatusBadge status={cp.status || 'DRAFT'} />
                                    <CompletenessBar value={cp.profileCompleteness || 0} />
                                </div>
                            </div>

                            {/* Statistiques candidat */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4">Statistiques candidat</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-500">
                                            <Star className="w-4 h-4" />
                                            Score qualité
                                        </span>
                                        <span className="font-semibold text-gray-900">{Math.round(cp.qualityScore || 0)}/100</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-500">
                                            <Eye className="w-4 h-4" />
                                            Vues du profil
                                        </span>
                                        <span className="font-medium">0</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-500">
                                            <Send className="w-4 h-4" />
                                            Candidatures
                                        </span>
                                        <span className="font-medium">{displayUser._count?.applications || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* General stats — always shown */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Statistiques</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Projets publiés</span>
                                <span className="font-medium">{displayUser.projects?.length || 0}</span>
                            </div>
                        </div>
                    </div>
```

- [ ] **Step 4: Commit**

```bash
git add web/src/app/\(dashboard\)/profile/
git commit -m "feat(web): unified profile page with dynamic sections"
```

---

## Task 7: Frontend — Update ProfileForm to read from User instead of founderProfile

**Files:**
- Modify: `web/src/components/profile/profile-form.tsx`

- [ ] **Step 1: Update state initialization — read from user.* instead of user.founderProfile.***

In `web/src/components/profile/profile-form.tsx`, replace lines 39-76:

```typescript
    const fp = user.founderProfile || {};

    // Section 1: Infos personnelles
    const [firstName, setFirstName] = useState(user.firstName || '');
    const [lastName, setLastName] = useState(user.lastName || '');
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [country, setCountry] = useState(fp.country || '');
    const [city, setCity] = useState(fp.city || '');
    const [address, setAddress] = useState(user.address || '');

    // Section 2: Profil pro
    const [title, setTitle] = useState(fp.title || '');
    const [bio, setBio] = useState(fp.bio || '');
    const [yearsOfExperience, setYearsOfExperience] = useState<number | ''>(fp.yearsOfExperience ?? '');

    // Section 3: Liens
    const [linkedinUrl, setLinkedinUrl] = useState(fp.linkedinUrl || '');
    const [websiteUrl, setWebsiteUrl] = useState(fp.websiteUrl || '');

    // Section 4: Compétences & Langues
    const [skills, setSkills] = useState<string[]>(fp.skills || []);
    const [languages, setLanguages] = useState<string[]>(fp.languages || []);

    // Section 5: Expériences
    const [experience, setExperience] = useState<ExperienceItem[]>(
        fp.experience?.map((e: any) => ({
            role: e.role || '', company: e.company || '',
            startYear: e.startYear || '', endYear: e.endYear ?? '',
        })) || []
    );

    // Section 6: Formation
    const [education, setEducation] = useState<EducationItem[]>(
        fp.education?.map((e: any) => ({
            degree: e.degree || '', school: e.school || '', year: e.year || '',
        })) || []
    );
```

With:

```typescript
    // Section 1: Infos personnelles
    const [firstName, setFirstName] = useState(user.firstName || '');
    const [lastName, setLastName] = useState(user.lastName || '');
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [country, setCountry] = useState(user.country || '');
    const [city, setCity] = useState(user.city || '');
    const [address, setAddress] = useState(user.address || '');

    // Section 2: Profil pro
    const [title, setTitle] = useState(user.title || '');
    const [bio, setBio] = useState(user.bio || '');
    const [yearsOfExperience, setYearsOfExperience] = useState<number | ''>(user.yearsOfExperience ?? '');

    // Section 3: Liens
    const [linkedinUrl, setLinkedinUrl] = useState(user.linkedinUrl || '');
    const [websiteUrl, setWebsiteUrl] = useState(user.websiteUrl || '');

    // Section 4: Compétences & Langues
    const [skills, setSkills] = useState<string[]>(user.skills || []);
    const [languages, setLanguages] = useState<string[]>(user.languages || []);

    // Section 5: Expériences
    const [experience, setExperience] = useState<ExperienceItem[]>(
        user.experience?.map((e: any) => ({
            role: e.role || '', company: e.company || '',
            startYear: e.startYear || '', endYear: e.endYear ?? '',
        })) || []
    );

    // Section 6: Formation
    const [education, setEducation] = useState<EducationItem[]>(
        user.education?.map((e: any) => ({
            degree: e.degree || '', school: e.school || '', year: e.year || '',
        })) || []
    );
```

- [ ] **Step 2: Update saveAll — send flat fields instead of founderProfile wrapper**

Replace lines 85-114 (the `saveAll` function) with:

```typescript
    const saveAll = async () => {
        setIsSaving(true);
        try {
            await AXIOS_INSTANCE.patch('/users/profile', {
                firstName, lastName, phone, address,
                title, bio, country, city, linkedinUrl, websiteUrl,
                skills, languages,
                yearsOfExperience: yearsOfExperience === '' ? null : yearsOfExperience,
                experience: experience.filter(e => e.role && e.company).map(e => ({
                    role: e.role, company: e.company,
                    startYear: e.startYear || undefined,
                    endYear: e.endYear || null,
                })),
                education: education.filter(e => e.degree && e.school).map(e => ({
                    degree: e.degree, school: e.school,
                    year: e.year || undefined,
                })),
            });

            const { data: freshProfile } = await AXIOS_INSTANCE.get('/users/profile');
            onSaved?.(freshProfile);
            showToast('Profil mis à jour avec succès', 'success');
        } catch {
            showToast('Erreur lors de la sauvegarde', 'error');
        } finally {
            setIsSaving(false);
        }
    };
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/profile/profile-form.tsx
git commit -m "feat(web): ProfileForm reads from User columns instead of founderProfile JSON"
```

---

## Task 8: Frontend — Slim CandidateProfileForm

**Files:**
- Modify: `web/src/components/profile/candidate-profile-form.tsx`

- [ ] **Step 1: Remove personal/professional sections from CandidateProfileForm**

In `web/src/components/profile/candidate-profile-form.tsx`, remove the state variables for fields now on User (lines 112-157). Replace with only candidate-specific state:

```typescript
export function CandidateProfileForm({ user, onSaved }: CandidateProfileFormProps) {
    const { showToast } = useToast();
    const cp = user.candidateProfile || {};

    // ─── Candidate-specific fields only
    const [roleType, setRoleType] = useState(cp.roleType || '');
    const [vision, setVision] = useState(cp.vision || '');
    const [hasCofounded, setHasCofounded] = useState(cp.hasCofounded || '');
    const [projectPref, setProjectPref] = useState<string[]>(cp.desiredSectors || []);
    const [availability, setAvailability] = useState(cp.availability || '');
    const [commitmentType, setCommitmentType] = useState(cp.commitmentType || '');
    const [collabPref, setCollabPref] = useState(cp.collabPref || '');
    const [locationPref, setLocationPref] = useState(() => {
        if (cp.remoteOnly) return 'REMOTE';
        return cp.locationPref || '';
    });
    const [shortPitch, setShortPitch] = useState(cp.shortPitch || '');
    const [longPitch, setLongPitch] = useState(cp.longPitch || '');

    const [isSaving, setIsSaving] = useState(false);

    const saveAll = async () => {
        setIsSaving(true);
        try {
            await AXIOS_INSTANCE.patch('/users/candidate-profile', {
                shortPitch,
                longPitch,
                vision,
                locationPref,
                availability,
                collabPref,
                projectPref,
                roleType,
                commitmentType,
                hasCofounded,
            });

            const { data } = await AXIOS_INSTANCE.get('/users/profile');
            onSaved?.(data);
            showToast('Profil candidat mis à jour avec succès', 'success');
        } catch {
            showToast('Erreur lors de la sauvegarde', 'error');
        } finally {
            setIsSaving(false);
        }
    };
```

- [ ] **Step 2: Remove the "Informations personnelles" and "Expertise & Profil" sections from the JSX**

Remove these sections from the return JSX:
- `<SectionCard icon={User} title="Informations personnelles">` (the entire block)
- `<SectionCard icon={Briefcase} title="Expertise & Profil">` (the entire block)
- `<SectionCard icon={MapPin} title="Liens professionnels">` (the entire block)

Keep only:
- Vision & Projet recherché
- Disponibilité
- Conditions de collaboration
- Pitch
- Save button

- [ ] **Step 3: Commit**

```bash
git add web/src/components/profile/candidate-profile-form.tsx
git commit -m "feat(web): slim CandidateProfileForm to candidate-specific fields only"
```

---

## Task 9: Frontend — Update founder-facing components (FounderSidebar, ProjectDeck, FounderPage)

**Files:**
- Modify: `web/src/components/project-deck/founder-sidebar.tsx`
- Modify: `web/src/components/project-deck/project-deck.tsx`
- Modify: `web/src/app/(dashboard)/founders/[id]/page.tsx`

- [ ] **Step 1: Update FounderSidebar — read from founder.* instead of founder.founderProfile.***

In `web/src/components/project-deck/founder-sidebar.tsx`:

Replace the `FounderProfile` interface and `FounderSidebarProps` (lines 31-58) with:

```typescript
export interface FounderSidebarProps {
    founder: {
        id?: string | null;
        image?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        name?: string | null;
        email?: string | null;
        phone?: string | null;
        address?: string | null;
        createdAt?: string | null;
        title?: string | null;
        bio?: string | null;
        country?: string | null;
        city?: string | null;
        linkedinUrl?: string | null;
        websiteUrl?: string | null;
        skills?: string[];
        experience?: { company: string; role: string; startYear: number; endYear?: number | null }[];
        education?: { school: string; degree: string; year?: number }[];
        yearsOfExperience?: number | null;
        languages?: string[];
        _isLocked?: boolean;
    };
}
```

Replace line 62 (`const profile = founder.founderProfile;`) and update all references from `profile.X` to `founder.X`:

```typescript
export function FounderSidebar({ founder }: FounderSidebarProps) {
    const displayName =
        founder.name ||
        [founder.firstName, founder.lastName].filter(Boolean).join(' ') ||
        'Fondateur';

    const isLocked = founder._isLocked === true;
    const hasLinks = !isLocked && (founder.linkedinUrl || founder.websiteUrl);
    const locationParts = [founder.city, founder.country].filter(Boolean);
    const locationStr = locationParts.length > 0 ? locationParts.join(', ') : null;
    const founderCountry = founder.country
        ? COUNTRIES.find(c => c.label === founder.country || c.code === founder.country)
        : null;
    const phoneDisplay = founder.phone
        ? `${founderCountry?.dialCode || ''} ${founder.phone}`.trim()
        : null;
```

Then throughout the JSX, replace all `profile?.X` with `founder.X` (or `founder?.X`):
- `profile?.title` → `founder.title`
- `profile?.bio` → `founder.bio`
- `profile?.skills` → `founder.skills`
- `profile?.experience` → `founder.experience`
- `profile?.education` → `founder.education`
- `profile?.yearsOfExperience` → `founder.yearsOfExperience`
- `profile?.languages` → `founder.languages`
- `profile?.linkedinUrl` → `founder.linkedinUrl`
- `profile?.websiteUrl` → `founder.websiteUrl`

Also remove the unused `FounderProfile` interface and the `FounderExperience` / `FounderEducation` interfaces (lines 18-43).

- [ ] **Step 2: Update project-deck.tsx — read from dbUser.* instead of dbUser.founderProfile.***

In `web/src/components/project-deck/project-deck.tsx`, replace lines 431-437:

```typescript
                                            const fp = (dbUser?.founderProfile ?? {}) as any;
                                            const missing: string[] = [];
                                            if (!dbUser?.firstName) missing.push('Prénom');
                                            if (!dbUser?.lastName) missing.push('Nom');
                                            if (!fp.title) missing.push('Titre professionnel');
                                            if (!fp.bio) missing.push('Bio');
                                            if (!fp.skills || fp.skills.length === 0) missing.push('Compétences');
```

With:

```typescript
                                            const missing: string[] = [];
                                            if (!dbUser?.firstName) missing.push('Prénom');
                                            if (!dbUser?.lastName) missing.push('Nom');
                                            if (!dbUser?.title) missing.push('Titre professionnel');
                                            if (!dbUser?.bio) missing.push('Bio');
                                            if (!dbUser?.skills || dbUser.skills.length === 0) missing.push('Compétences');
```

- [ ] **Step 3: Update founders/[id]/page.tsx — read from user.* instead of user.founderProfile***

In `web/src/app/(dashboard)/founders/[id]/page.tsx`, replace line 93:

```typescript
    const profile = user.founderProfile || {};
```

With:

```typescript
    const profile = user; // Professional fields are now directly on User
```

This makes all `profile.city`, `profile.country`, `profile.linkedinUrl`, etc. work as-is since they're now on the user object directly.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/project-deck/ web/src/app/\(dashboard\)/founders/
git commit -m "feat(web): update founder components to read from User columns"
```

---

## Task 10: Frontend — Replace onboarding/role with onboarding/start

**Files:**
- Modify: `web/src/app/onboarding/role/page.tsx`

- [ ] **Step 1: Replace role selection with intention selector**

Replace the entire content of `web/src/app/onboarding/role/page.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Rocket, Compass, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

const intentions = [
    {
        id: 'PUBLISH',
        label: 'Publier un projet',
        description: 'J\'ai une idée ou un projet en cours et je cherche des co-fondateurs.',
        icon: Rocket,
    },
    {
        id: 'SEARCH',
        label: 'Chercher un projet',
        description: 'Je veux rejoindre un projet ambitieux et apporter mes compétences.',
        icon: Compass,
    }
];

export default function OnboardingStartPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [selected, setSelected] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleContinue = async () => {
        if (!selected || !user) return;

        setLoading(true);
        setError('');
        try {
            // Store intention in localStorage for post-onboarding redirect
            localStorage.setItem('onboarding_intention', selected);
            // Go to profile onboarding (same for everyone)
            router.push('/onboarding/founder');
        } catch {
            setError('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-kezak-primary/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-kezak-accent/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-4xl relative z-10">
                <div className="text-center mb-16">
                    <img src="/logo/logo.svg" alt="MojiraX" className="mx-auto h-12 w-12 mb-8 opacity-80" />
                    <h1 className="text-4xl md:text-5xl font-bold text-kezak-dark mb-4 tracking-tight">
                        Que souhaitez-vous faire ?
                    </h1>
                    <p className="text-lg text-gray-500 max-w-xl mx-auto">
                        Vous pourrez toujours faire les deux par la suite. Ce choix personnalise votre première expérience.
                    </p>
                </div>

                {error && (
                    <div className="mb-8 max-w-md mx-auto bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
                    {intentions.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => { setSelected(item.id); setError(''); }}
                            className={`
                                relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 group
                                ${selected === item.id
                                    ? 'bg-white border-kezak-primary ring-4 ring-kezak-primary/10 shadow-xl scale-[1.02]'
                                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-lg hover:-translate-y-1'
                                }
                            `}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className={`
                                    w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300
                                    ${selected === item.id ? 'bg-kezak-primary text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-kezak-light group-hover:text-kezak-primary'}
                                `}>
                                    <item.icon className="w-7 h-7" />
                                </div>
                                {selected === item.id && (
                                    <div className="text-kezak-primary">
                                        <CheckCircle className="w-6 h-6 fill-kezak-primary text-white" />
                                    </div>
                                )}
                            </div>

                            <h3 className={`text-xl font-bold mb-3 transition-colors ${selected === item.id ? 'text-kezak-dark' : 'text-gray-900'}`}>
                                {item.label}
                            </h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center">
                    <Button
                        onClick={handleContinue}
                        disabled={!selected || loading}
                        className="!h-14 !px-12 text-lg !rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        {loading ? 'Traitement...' : (
                            <>
                                Continuer <ArrowRight className="ml-2 w-5 h-5" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Also create the `/onboarding/start` route alias**

Create `web/src/app/onboarding/start/page.tsx` that re-exports the role page (since the dashboard layout now redirects to `/onboarding/start`):

```tsx
export { default } from '../role/page';
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/onboarding/
git commit -m "feat(web): replace role selection with intention selector at /onboarding/start"
```

---

## Task 11: Backend — Verify build & fix compilation errors

**Files:**
- All modified backend files

- [ ] **Step 1: Run TypeScript compilation**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors. If errors appear, fix them — they'll likely be references to `founderProfile`, `role: 'FOUNDER'`, or removed CandidateProfile fields.

- [ ] **Step 2: Fix any remaining founderProfile references**

Search for any remaining `founderProfile` references in the API:

```bash
cd api && grep -r "founderProfile" src/ --include="*.ts" -l
```

For each file found, update the reference to use the new User columns.

- [ ] **Step 3: Fix any remaining FOUNDER/CANDIDATE role references**

Search for remaining role enum references:

```bash
cd api && grep -r "'FOUNDER'\|'CANDIDATE'" src/ --include="*.ts" -l
```

For each file found, update or remove the role check as appropriate.

- [ ] **Step 4: Commit fixes**

```bash
git add api/src/
git commit -m "fix(api): resolve remaining founderProfile and role references"
```

---

## Task 12: Frontend — Verify build & fix compilation errors

**Files:**
- All modified frontend files

- [ ] **Step 1: Run Next.js build**

```bash
cd web && npx next build
```

Expected: No errors. If errors appear, fix them.

- [ ] **Step 2: Fix any remaining founderProfile references**

```bash
cd web && grep -r "founderProfile" src/ --include="*.tsx" --include="*.ts" -l
```

For each file found, update to read from user directly.

- [ ] **Step 3: Fix any remaining FOUNDER/CANDIDATE role checks**

```bash
cd web && grep -r "'FOUNDER'\|'CANDIDATE'" src/ --include="*.tsx" --include="*.ts" -l
```

For each file found, update the logic (the admin pages may still reference these for display — update the display labels to use computed values).

- [ ] **Step 4: Commit fixes**

```bash
git add web/src/
git commit -m "fix(web): resolve remaining founderProfile and role references"
```

---

## Task 13: Smoke test — verify key flows

- [ ] **Step 1: Start the dev environment**

```bash
docker compose up -d && cd web && npm run dev
```

- [ ] **Step 2: Test new user onboarding**

1. Open http://localhost:3000 in browser
2. Sign up with a new account
3. Verify redirect to `/onboarding/start` (intention selector)
4. Select "Publier un projet" → verify redirect to `/onboarding/founder`
5. Complete profile onboarding → verify redirect to project creation

- [ ] **Step 3: Test profile page**

1. Navigate to `/profile`
2. Verify General + Professional form shows
3. Verify "Activer mon profil candidat" CTA appears
4. Verify sidebar shows both "Lancer un projet" and "Mes Candidatures"

- [ ] **Step 4: Test existing data**

1. Log in with an existing account (previously FOUNDER or CANDIDATE)
2. Verify profile page shows migrated data (title, bio, skills)
3. Verify project pages show founder info correctly (sidebar)

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: smoke test fixes for flexible roles"
```
