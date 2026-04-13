# Design — Rôles flexibles : tout utilisateur peut fonder ET candidater

**Date :** 2026-04-13
**Statut :** Validé
**Auteur :** Claude (architecte) + Oswald (validation)

---

## Contexte & Problème

Le système actuel impose un rôle figé (`FOUNDER` ou `CANDIDATE`) à chaque utilisateur lors de l'onboarding. Ce choix est irréversible et empêche un fondateur de candidater à d'autres projets, ou un candidat de publier son propre projet.

Les champs personnels/professionnels sont éparpillés à 3 endroits :
- `User` (firstName, lastName, email, phone)
- `User.founderProfile` (JSON blob : title, bio, skills, experience, education, linkedinUrl, etc.)
- `CandidateProfile` (table : title, bio, skills, languages, linkedinUrl — dupliqués)

Le `founderProfile` JSON ne contient **aucun champ spécifique au fondateur** — ce sont tous des attributs personnels/professionnels.

## Décision

**Approche A** — Promouvoir les champs personnels dans `User`, supprimer `founderProfile` JSON, slimmer `CandidateProfile` aux seuls champs spécifiques candidat. Supprimer les rôles `FOUNDER`/`CANDIDATE` de l'enum.

**Principe :**
- "Être fondateur" = avoir publié un projet (`projects.length > 0`)
- "Être candidat" = avoir un `candidateProfile` actif

---

## 1. Modèle de données

### 1.1 Enum UserRole

```prisma
enum UserRole {
  ADMIN
  USER    // seul rôle non-admin
}
```

`FOUNDER` et `CANDIDATE` sont supprimés.

### 1.2 User — nouveaux champs (migrés depuis founderProfile JSON)

```prisma
model User {
  // Existants inchangés : id, firstName, lastName, name, email, phone, address,
  //   emailVerified, firebaseUid, image, status, plan, stripe*, isInvisible,
  //   createdAt, updatedAt, onboardingState, projectDraft, preferredLang

  role UserRole @default(USER)  // Plus que USER ou ADMIN

  // ── Profil pro (migrés depuis founderProfile JSON) ──
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
  experience        Json?     @db.JsonB   // [{role, company, startYear, endYear}]
  education         Json?     @db.JsonB   // [{degree, school, year}]

  // ── SUPPRIMÉ ──
  // founderProfile Json?  ← données migrées vers les colonnes ci-dessus

  // Relations inchangées
}
```

### 1.3 CandidateProfile — slimmé

Champs **supprimés** (maintenant sur User) :
- `title`, `bio`, `location`, `linkedinUrl`, `skills[]`, `languages[]`, `certifications[]`, `yearsOfExperience`, `githubUrl`, `portfolioUrl`, `experience`, `education`

Champs **conservés** (spécifiques candidat) :

```prisma
model CandidateProfile {
  id     String @id @default(cuid())
  userId String @unique @map("user_id")

  // Pitch
  shortPitch     String? @map("short_pitch") @db.Text
  longPitch      String? @map("long_pitch") @db.Text

  // Vision
  vision         String? @db.Text
  hasCofounded   String? @map("has_cofounded")   // YES, NO
  roleType       String? @map("role_type")       // TECH, PRODUCT, MARKETING, OPS, FINANCE

  // Disponibilité
  availability    String?
  commitmentType  String? @map("commitment_type") // SIDE, SERIOUS, FULLTIME

  // Préférences collaboration
  collabPref     String? @map("collab_pref")      // EQUITY, PAID, HYBRID, DISCUSS
  locationPref   String? @map("location_pref")    // REMOTE, HYBRID, ONSITE

  // Matching
  desiredSectors    String[] @default([]) @map("desired_sectors")
  desiredStage      String[] @default([]) @map("desired_stage")
  desiredLocation   String[] @default([]) @map("desired_location")
  minSalary         Int?     @map("min_salary")
  maxSalary         Int?     @map("max_salary")
  willingToRelocate Boolean  @default(false) @map("willing_to_relocate")
  remoteOnly        Boolean  @default(false) @map("remote_only")

  // CV
  resumeUrl String? @map("resume_url")

  // Privacy & Monetization
  isContactVisible Boolean @default(false) @map("is_contact_visible")

  // Modération & AI (inchangés)
  status              ModerationStatus @default(DRAFT)
  bioEmbedding        Unsupported("vector(1024)")? @map("bio_embedding")
  skillsEmbedding     Unsupported("vector(1024)")? @map("skills_embedding")
  embeddingModel      String?  @map("embedding_model")
  embeddingVersion    String?  @map("embedding_version")
  lastEmbeddedAt      DateTime? @map("last_embedded_at")
  profileCompleteness Float @default(0.0) @map("profile_completeness")
  qualityScore        Float @default(0.0) @map("quality_score")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations (inchangées)
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  moderationLogs ModerationLog[]
  unlocks        Unlock[]
  applications   Application[]
  matchScores    MatchScore[]

  @@index([status])
  @@index([desiredSectors])
  @@map("candidate_profiles")
}
```

### 1.4 Migration SQL

```sql
-- Étape 1 : Ajouter les colonnes sur users
ALTER TABLE users
  ADD COLUMN title VARCHAR,
  ADD COLUMN bio TEXT,
  ADD COLUMN country VARCHAR,
  ADD COLUMN city VARCHAR,
  ADD COLUMN linkedin_url VARCHAR,
  ADD COLUMN website_url VARCHAR,
  ADD COLUMN github_url VARCHAR,
  ADD COLUMN portfolio_url VARCHAR,
  ADD COLUMN skills TEXT[] DEFAULT '{}',
  ADD COLUMN languages TEXT[] DEFAULT '{}',
  ADD COLUMN certifications TEXT[] DEFAULT '{}',
  ADD COLUMN years_of_experience INT,
  ADD COLUMN experience JSONB,
  ADD COLUMN education JSONB;

-- Étape 2 : Migrer depuis founder_profile JSON
UPDATE users SET
  title = founder_profile->>'title',
  bio = founder_profile->>'bio',
  country = founder_profile->>'country',
  city = founder_profile->>'city',
  linkedin_url = founder_profile->>'linkedinUrl',
  website_url = founder_profile->>'websiteUrl',
  skills = COALESCE(
    (SELECT array_agg(elem::text) FROM jsonb_array_elements_text(founder_profile->'skills') AS elem),
    '{}'
  ),
  languages = COALESCE(
    (SELECT array_agg(elem::text) FROM jsonb_array_elements_text(founder_profile->'languages') AS elem),
    '{}'
  ),
  years_of_experience = (founder_profile->>'yearsOfExperience')::int,
  experience = founder_profile->'experience',
  education = founder_profile->'education'
WHERE founder_profile IS NOT NULL;

-- Étape 3 : Migrer depuis candidate_profiles (candidats purs sans founderProfile)
UPDATE users SET
  title = COALESCE(users.title, cp.title),
  bio = COALESCE(users.bio, cp.bio),
  linkedin_url = COALESCE(users.linkedin_url, cp.linkedin_url),
  github_url = COALESCE(users.github_url, cp.github_url),
  portfolio_url = COALESCE(users.portfolio_url, cp.portfolio_url),
  skills = CASE WHEN users.skills = '{}' THEN cp.skills ELSE users.skills END,
  languages = CASE WHEN users.languages = '{}' THEN cp.languages ELSE users.languages END,
  certifications = CASE WHEN users.certifications = '{}' THEN cp.certifications ELSE users.certifications END,
  years_of_experience = COALESCE(users.years_of_experience, cp.years_of_experience),
  experience = COALESCE(users.experience, cp.experience),
  education = COALESCE(users.education, cp.education),
  country = COALESCE(users.country, cp.location)
FROM candidate_profiles cp
WHERE cp.user_id = users.id;

-- Étape 4 : Supprimer les colonnes dupliquées de candidate_profiles
ALTER TABLE candidate_profiles
  DROP COLUMN title,
  DROP COLUMN bio,
  DROP COLUMN location,
  DROP COLUMN linkedin_url,
  DROP COLUMN skills,
  DROP COLUMN languages,
  DROP COLUMN certifications,
  DROP COLUMN years_of_experience,
  DROP COLUMN github_url,
  DROP COLUMN portfolio_url,
  DROP COLUMN experience,
  DROP COLUMN education;

-- Étape 5 : Supprimer founder_profile JSON
ALTER TABLE users DROP COLUMN founder_profile;

-- Étape 6 : Convertir les rôles FOUNDER/CANDIDATE en USER
UPDATE users SET role = 'USER' WHERE role IN ('FOUNDER', 'CANDIDATE');

-- Étape 7 : Supprimer les valeurs obsolètes de l'enum
-- (via Prisma migrate — recréation de l'enum)
```

---

## 2. Onboarding

### 2.1 Nouveau flux

```
Inscription
  → /onboarding/start       "Que souhaitez-vous faire en premier ?"
                              • Publier un projet
                              • Chercher un projet
  → /onboarding/profile/*    Profil commun (titre, bio, skills, localisation, liens)
  → Redirection selon intention :
      • "Publier" → /create/project
      • "Chercher" → mini-wizard candidat (pitch, vision, dispo) → création CandidateProfile
```

### 2.2 Garde du dashboard

```typescript
// Condition d'accès au dashboard
const hasCompletedOnboarding = !!(dbUser.title && dbUser.bio);
if (!hasCompletedOnboarding) router.replace('/onboarding/profile');
```

Le check `role === 'USER'` disparaît.

---

## 3. Backend — Changements endpoints

### 3.1 UsersService

- `GET /users/profile` — retourne `user.title`, `user.bio`, `user.skills`, etc. directement (plus de `founderProfile` wrapper)
- `PATCH /users/profile` — accepte `title`, `bio`, `skills[]`, etc. au premier niveau du DTO
- `createCandidateProfile()` — supprimer le check `if (user.role !== 'CANDIDATE')`. Tout utilisateur authentifié peut créer un candidateProfile
- `PATCH /users/candidate-profile` — inchangé dans la logique, mais n'écrit plus title/bio/skills (ils sont sur User)

### 3.2 ProjectsService

- `create()` — aucun changement. `founderId = user.id` fonctionne déjà
- Feeds/search — les `select`/`include` qui référencent `founder.founderProfile` doivent lire `founder.title`, `founder.skills`, etc.

### 3.3 ApplicationsService

- Auto-création de `CandidateProfile` (lignes 62-77) — simplifier : ne plus copier title/bio/skills depuis founderProfile, créer un CandidateProfile minimal (champs candidat-spécifiques vides)
- Supprimer tout check de rôle

### 3.4 AdminService

- Stats par rôle → remplacer par :
  - `Fondateurs actifs` = users avec ≥1 project
  - `Candidats actifs` = users avec candidateProfile
- Changement de rôle → ne garde que `USER ↔ ADMIN`

### 3.5 DTOs

- `UpdateUserDto` — ajouter title, bio, skills, languages, etc.
- `CreateCandidateProfileDto` — supprimer title, bio, skills et tous les champs migrés
- Nouveau `SaveOnboardingProfileDto` — pour l'onboarding commun

### 3.6 Privacy Wall

Aucun impact. Vérifie `plan`/`is_premium`, pas le rôle.

---

## 4. Frontend — Changements

### 4.1 Page Profil unifiée (`/profile`)

Sections affichées dynamiquement :

| Section | Condition d'affichage | Composant |
|---------|----------------------|-----------|
| Informations personnelles | Toujours | `PersonalInfoSection` |
| Profil professionnel | Toujours | `ProfessionalSection` |
| Mes Projets | `projects.length > 0` | `ProjectsSection` + lien créer |
| Profil Candidat | `candidateProfile` existe | `CandidateSection` (slimmé) |
| CTA Candidat | `!candidateProfile` | Bouton "Activer mon profil candidat" |
| CTA Projet | `projects.length === 0` | Bouton "Lancer un projet" |

### 4.2 Formulaires

- `ProfileForm` → formulaire **Général + Pro** (pour tous les utilisateurs)
  - Lit/écrit `user.title`, `user.bio`, `user.skills`, etc.
- `CandidateProfileForm` → slimmé aux champs candidat uniquement
  - Plus de section "Informations personnelles" ni "Expertise"
  - Garde : Pitch, Vision, Disponibilité, Conditions, Préférences matching

### 4.3 Sidebar

```typescript
// Visible pour TOUS les utilisateurs authentifiés
{ label: 'Lancer un projet', href: '/create/project', icon: Rocket }
{ label: 'Mes candidatures', href: '/applications', icon: FileText }
```

### 4.4 Auth Context

- Supprimer les checks `dbUser.role === 'FOUNDER'` / `dbUser.role === 'CANDIDATE'`
- Dériver dynamiquement :
  ```typescript
  const isFounder = (dbUser.projects?.length ?? 0) > 0;
  const isCandidate = !!dbUser.candidateProfile;
  ```

### 4.5 Onboarding

- `/onboarding/role` → remplacé par `/onboarding/start` (choix d'intention)
- `/onboarding/founder/steps/*` → renommé `/onboarding/profile/steps/*`
- `/onboarding/candidate/steps/*` → gardé pour wizard candidat slimmé

### 4.6 Feeds & cartes publiques

Partout où `user.founderProfile.title` ou `candidateProfile.title` était lu, lire `user.title` directement.

---

## 5. Fichiers impactés (exhaustif)

### Backend
- `api/prisma/schema.prisma` — enum, User, CandidateProfile
- `api/src/users/users.service.ts` — suppression check rôle, nouveau mapping champs
- `api/src/users/users.controller.ts` — endpoints profile
- `api/src/users/dto/update-user.dto.ts` — nouveaux champs
- `api/src/users/dto/create-candidate-profile.dto.ts` — slimmer
- `api/src/auth/auth.service.ts` — rôle par défaut USER (déjà le cas)
- `api/src/applications/applications.service.ts` — simplifier auto-create
- `api/src/projects/projects.service.ts` — select/include founder fields
- `api/src/admin/admin.service.ts` — stats, gestion rôles
- `api/src/auth/admin.guard.ts` — inchangé (check ADMIN)

### Frontend
- `web/src/app/(dashboard)/layout.tsx` — garde onboarding
- `web/src/app/(dashboard)/profile/page.tsx` — page unifiée
- `web/src/components/profile/profile-form.tsx` — formulaire général+pro
- `web/src/components/profile/candidate-profile-form.tsx` — slimmé
- `web/src/components/layout/sidebar-left.tsx` — supprimer condition rôle
- `web/src/app/onboarding/role/page.tsx` → renommer/remplacer
- `web/src/app/onboarding/founder/steps/*` → renommer
- `web/src/app/onboarding/candidate/steps/*` → slimmer
- `web/src/context/auth-context.tsx` — dérivation dynamique
- `web/src/types/shared.ts` — supprimer type role FOUNDER/CANDIDATE

---

## 6. Ce qui ne change PAS

- Privacy Wall (basé sur plan, pas rôle)
- Messaging (basé sur user IDs)
- Firebase Auth / FirebaseAuthGuard
- Admin guard (check ADMIN)
- Stripe / paiements
- Upload MinIO
- Modération IA CandidateProfile
