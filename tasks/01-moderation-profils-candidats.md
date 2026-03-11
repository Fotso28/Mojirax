# 01 — Création de profil candidat + Modération automatique IA

## Résumé

Le flow d'onboarding candidat est **cassé** : le wizard collecte les données mais ne crée jamais le `CandidateProfile` en base (le `pitch.tsx` a un TODO non implémenté). Cette tâche corrige le flow complet : création du profil → modération IA → publication ou signalement.

## Diagnostic du problème

**Flow actuel (cassé) :**
```
Signup → role=CANDIDATE → Wizard 5 étapes → Submit pitch
  ↓
pitch.tsx ligne 16 : // TODO: Call actual API ← JAMAIS IMPLÉMENTÉ
  ↓
console.log() + redirect vers / → AUCUN CandidateProfile créé
  ↓
Candidat INVISIBLE dans le feed (filtre status='PUBLISHED')
```

**Le seul endroit où CandidateProfile est créé :** `applications.service.ts` quand un fondateur postule — avec `status: 'PUBLISHED'` direct, sans modération.

## Flow cible

```
INSCRIPTION
  1. Firebase Auth (Google / Email)
  2. POST /auth/sync → User créé, role='USER'
  3. Sélection rôle → PATCH /users/profile { role: 'CANDIDATE' }
  4. Wizard 5 étapes (auto-save dans User.projectDraft)
  5. Submit final (pitch.tsx)
     └─ POST /users/candidate-profile ← NOUVEAU ENDPOINT
        Body: données complètes du wizard
        Backend:
          ├─ Mapper wizard → champs CandidateProfile Prisma
          ├─ Créer CandidateProfile (status='ANALYZING')
          ├─ Lancer modération IA (fire-and-forget)
          └─ Retourner { id, status: 'ANALYZING' }

MODÉRATION IA (async, non-bloquante)
  6. candidateModerationService.moderateProfile(id)
     ├─ aiService.validateCandidateProfile(profileData)
     │   ├─ Qualité (0-100) : bio cohérente, skills réalistes
     │   ├─ Légitimité (0-100) : pas spam, pas arnaque
     │   └─ Complétude (0-100) : champs essentiels remplis
     │
     ├─ Si valide (qualité ≥ 50 ET légitimité ≥ 70)
     │   ├─ status → PUBLISHED
     │   ├─ Générer embeddings (bio + skills)
     │   ├─ Notification : "Votre profil est maintenant visible"
     │   └─ Candidat VISIBLE dans le feed ✅
     │
     └─ Si suspect
         ├─ status → PENDING_AI
         ├─ Notification : "Votre profil est en cours de vérification"
         └─ Candidat INVISIBLE — attente revue admin
  7. Écrire ModerationLog en base

MODIFICATION DE PROFIL
  8. PATCH /users/candidate-profile
     ├─ Mettre status → ANALYZING
     ├─ Re-lancer modération IA
     └─ Re-générer embeddings si modifié

AUTO-CRÉATION (fondateur qui postule)
  9. applications.service.ts → apply()
     ├─ Si pas de CandidateProfile → créer depuis founderProfile
     ├─ Lancer modération IA (au lieu de PUBLISHED direct)
     └─ Même flow async
```

## Spécification détaillée

### A. Mapping wizard → CandidateProfile

Les données du wizard sont dans `User.projectDraft.data` sous cette forme :

```json
{
  "title": "Senior React Developer",
  "role_type": "TECH",
  "years_exp": "6-10",
  "main_competence": "React",
  "achievements": "Built scalable architecture...",
  "has_cofounded": "YES",
  "vision": "Looking to build AI-powered fintech...",
  "project_pref": "TECH",
  "time_availability": "FULLTIME",
  "commitment_type": "SERIOUS",
  "collab_pref": "EQUITY",
  "location_pref": "REMOTE",
  "short_pitch": "Expert React seeking ambitious CTO...",
  "long_pitch": "I'm passionate about..."
}
```

Mapping vers `CandidateProfile` Prisma :

| Wizard field | CandidateProfile field | Transformation |
|---|---|---|
| `title` | `title` | Direct |
| `short_pitch` + `long_pitch` | `bio` | Concaténer : `short_pitch + '\n\n' + long_pitch` |
| `main_competence` | `skills[]` | `[main_competence]` (tableau) |
| `years_exp` | `yearsOfExperience` | `"0-2"→1, "3-5"→4, "6-10"→8, "10+"→12` |
| `location_pref` | `remoteOnly` | `"REMOTE"→true, sinon→false` |
| `project_pref` | `desiredSectors[]` | `[project_pref]` |
| `time_availability` | `availability` | Direct |
| `vision` | Stocké dans `bio` ou champ JSON | Ajouté au bio |
| `collab_pref` | Stocké dans le JSON profil | Pas de champ Prisma dédié |

### B. Nouveau endpoint `POST /users/candidate-profile`

**Fichier :** `api/src/users/users.controller.ts`

```typescript
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Post('candidate-profile')
@ApiOperation({ summary: 'Create candidate profile from onboarding data' })
async createCandidateProfile(@Request() req, @Body() dto: CreateCandidateProfileDto) {
  return this.usersService.createCandidateProfile(req.user.uid, dto);
}
```

**DTO :** `api/src/users/dto/create-candidate-profile.dto.ts`

```typescript
class CreateCandidateProfileDto {
  @IsString() title: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() shortPitch?: string;
  @IsOptional() @IsString() longPitch?: string;
  @IsOptional() @IsString() mainCompetence?: string;
  @IsOptional() @IsString() yearsExp?: string;
  @IsOptional() @IsString() vision?: string;
  @IsOptional() @IsString() locationPref?: string;
  @IsOptional() @IsString() availability?: string;
  @IsOptional() @IsString() collabPref?: string;
  @IsOptional() @IsString() projectPref?: string;
  @IsOptional() @IsString() roleType?: string;
  @IsOptional() @IsString() commitmentType?: string;
}
```

### C. `usersService.createCandidateProfile()`

**Fichier :** `api/src/users/users.service.ts`

```
1. Trouver le User par firebaseUid
2. Vérifier qu'il n'a pas déjà un CandidateProfile (si oui → 409 Conflict)
3. Mapper les champs du DTO vers CandidateProfile
4. prisma.candidateProfile.create({ data: { userId, ..., status: 'ANALYZING' } })
5. Effacer User.projectDraft (brouillon consommé)
6. Lancer moderateProfile(profile.id) en fire-and-forget
7. Retourner { id, status: 'ANALYZING' }
```

### D. Nouveau endpoint `PATCH /users/candidate-profile`

Pour les modifications ultérieures :

```
1. Trouver le CandidateProfile du user
2. Mettre à jour les champs modifiés
3. Passer status → ANALYZING
4. Re-lancer modération IA (fire-and-forget)
5. Retourner le profil mis à jour
```

### E. `CandidateModerationService`

**Fichier :** `api/src/users/candidate-moderation.service.ts`

**Méthode `moderateProfile(candidateProfileId: string)` :**

```
1. Récupérer CandidateProfile + User relation
2. Appeler aiService.validateCandidateProfile({
     title, bio, skills, yearsOfExperience, location
   })
3. Créer un ModerationLog :
   {
     candidateProfileId,
     aiScore: result.qualityScore / 100,
     aiReason: result.reason,
     aiPayload: result (JSON complet),
     status: résultat final
   }
4. Si valide :
   ├─ status → PUBLISHED
   ├─ qualityScore = result.qualityScore
   ├─ profileCompleteness = result.completenessScore
   ├─ Lancer generateCandidateEmbeddings(profile.id) (fire-and-forget)
   └─ Notification PROFILE_PUBLISHED
5. Si suspect :
   ├─ status → PENDING_AI
   └─ Notification PROFILE_REVIEW
```

### F. `aiService.validateCandidateProfile()`

**Fichier :** `api/src/projects/ai.service.ts`

**Prompt IA (français) :**
```
Tu es un modérateur de plateforme professionnelle de mise en relation.
Évalue ce profil de candidat co-fondateur.

Profil :
- Titre : {title}
- Bio : {bio}
- Compétences : {skills}
- Expérience : {yearsOfExperience} ans
- Localisation : {location}

Évalue sur 3 axes (score 0-100 chacun) :

1. QUALITÉ : La bio est-elle cohérente et professionnelle ?
   Les compétences sont-elles réalistes ? Le profil apporte-t-il de la valeur ?

2. LÉGITIMITÉ : Le profil est-il authentique ?
   Pas de spam, pas de contenu offensant, pas de données fausses évidentes ?

3. COMPLÉTUDE : Les champs essentiels sont-ils remplis de manière utile ?
   Le profil donne-t-il assez d'informations pour être pertinent ?

Réponds en JSON strict :
{
  "qualityScore": number,
  "legitimacyScore": number,
  "completenessScore": number,
  "isValid": boolean,
  "reason": "string (explication courte si rejeté ou signalé)"
}
```

**Retour :**
```typescript
interface CandidateValidationResult {
  isValid: boolean;
  qualityScore: number;
  legitimacyScore: number;
  completenessScore: number;
  reason?: string;
}
```

**Règles :**
- `isValid = legitimacyScore >= 70 AND qualityScore >= 50`
- Utilise le même fallback multi-provider (DeepSeek → Claude → GPT)
- Si aucun provider dispo → fallback `{ isValid: true, qualityScore: 70, legitimacyScore: 100, completenessScore: 50 }`

### G. Correction `pitch.tsx` (frontend)

Remplacer le TODO par un vrai appel :

```typescript
const handleSubmit = async () => {
  await submitForm(async (formData) => {
    await AXIOS_INSTANCE.post('/users/candidate-profile', {
      title: formData.title,
      shortPitch: formData.short_pitch,
      longPitch: formData.long_pitch,
      mainCompetence: formData.main_competence,
      yearsExp: formData.years_exp,
      vision: formData.vision,
      locationPref: formData.location_pref,
      availability: formData.time_availability,
      collabPref: formData.collab_pref,
      projectPref: formData.project_pref,
      roleType: formData.role_type,
      commitmentType: formData.commitment_type,
      bio: formData.achievements,
    });
  });
  showToast('Profil créé ! Vérification en cours...', 'success');
  router.push('/');
};
```

### H. Correction `applications.service.ts`

Dans `apply()`, remplacer :
```typescript
// AVANT
status: 'PUBLISHED',  // ← Direct, sans modération

// APRÈS
status: 'ANALYZING',  // ← En attente de modération
// + lancer candidateModerationService.moderateProfile(profile.id)
```

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `api/src/users/dto/create-candidate-profile.dto.ts` | DTO validé pour la création |
| `api/src/users/candidate-moderation.service.ts` | Service de modération async |

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `api/src/users/users.controller.ts` | Ajouter `POST /users/candidate-profile` et `PATCH /users/candidate-profile` |
| `api/src/users/users.service.ts` | Ajouter `createCandidateProfile()` et `updateCandidateProfile()` |
| `api/src/users/users.module.ts` | Enregistrer `CandidateModerationService`, importer `AiService` |
| `api/src/projects/ai.service.ts` | Ajouter `validateCandidateProfile()` |
| `api/src/applications/applications.service.ts` | Remplacer `PUBLISHED` par `ANALYZING` + appel modération |
| `api/src/notifications/notifications.service.ts` | Ajouter types `PROFILE_PUBLISHED`, `PROFILE_REVIEW` |
| `web/src/app/onboarding/candidate/steps/pitch.tsx` | Remplacer le TODO par l'appel API réel |

## Tests et validation

### Tests unitaires

- [ ] `createCandidateProfile()` crée un `CandidateProfile` avec status `ANALYZING`
- [ ] `createCandidateProfile()` refuse si le user a déjà un profil (409)
- [ ] `createCandidateProfile()` efface `User.projectDraft` après création
- [ ] Le mapping `years_exp → yearsOfExperience` est correct ("6-10" → 8)
- [ ] `validateCandidateProfile()` retourne `isValid: true` pour un profil complet
- [ ] `validateCandidateProfile()` retourne `isValid: false` pour un profil spam
- [ ] `validateCandidateProfile()` retourne fallback si aucun provider IA dispo
- [ ] `moderateProfile()` crée un `ModerationLog` en base
- [ ] `moderateProfile()` met status à `PUBLISHED` si valide
- [ ] `moderateProfile()` met status à `PENDING_AI` si suspect
- [ ] `moderateProfile()` crée une notification pour le candidat
- [ ] `moderateProfile()` lance la génération d'embeddings si publié

### Tests d'intégration

- [ ] Compléter le wizard candidat → `POST /users/candidate-profile` → CandidateProfile créé en base
- [ ] Le profil passe de `ANALYZING` à `PUBLISHED` automatiquement (modération IA)
- [ ] Un profil `PUBLISHED` apparaît dans le feed candidats
- [ ] Un profil `ANALYZING` n'apparaît PAS dans le feed
- [ ] Modifier un profil existant → re-modération déclenchée
- [ ] Un fondateur qui postule → CandidateProfile auto-créé + modération lancée
- [ ] Le brouillon (`projectDraft`) est effacé après création du profil

### Condition de validation finale

> Un candidat qui termine son onboarding voit son profil réellement créé en base de données, évalué automatiquement par l'IA, puis publié dans le feed si valide ou signalé pour revue si suspect. Le flow complet fonctionne de bout en bout : wizard → API → CandidateProfile → modération IA → PUBLISHED/PENDING_AI → notification. Aucun profil n'est publié sans vérification IA préalable. Le bug du TODO dans `pitch.tsx` est corrigé.
