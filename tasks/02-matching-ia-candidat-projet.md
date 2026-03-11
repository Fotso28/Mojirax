# 02 — Matching IA candidat ↔ projet (MatchScore)

## Résumé

Calculer automatiquement un score de compatibilité entre chaque candidat publié et chaque projet publié, en combinant similarité vectorielle (embeddings) et comparaison de champs structurés. Les scores sont stockés en base et utilisés pour améliorer le feed et proposer des recommandations.

## Contexte

**Ce qui existe :**
- Table `MatchScore` prête en base avec : `overallScore`, `skillsMatch`, `experienceMatch`, `locationMatch`, `culturalFit`, `aiReason`, `aiConfidence`, `modelVersion`
- Index optimisés `[projectId, overallScore DESC]` et `[candidateId, overallScore DESC]`
- Contrainte `@@unique([candidateId, projectId])`
- Embeddings candidat : `bioEmbedding` (1536d), `skillsEmbedding` (1536d)
- Embedding projet : `descriptionEmbedding` (1536d)
- `getEmbedding()` dans `ai.service.ts` (OpenAI text-embedding-3-small)
- `generateCandidateEmbeddings()` dans `users.service.ts`
- `generateProjectEmbedding()` dans `projects.service.ts`

**Données disponibles pour le matching :**

| Candidat | Projet | Score |
|----------|--------|-------|
| `skills[]` | `requiredSkills[]`, `niceToHaveSkills[]` | `skillsMatch` |
| `yearsOfExperience` | `stage` (complexité implicite) | `experienceMatch` |
| `location`, `remoteOnly`, `willingToRelocate` | `location`, `isRemote` | `locationMatch` |
| `desiredSectors[]`, `desiredStage[]` | `sector`, `stage` | `culturalFit` |
| `availability` | `commitment` | bonus |

## Spécification

### A. Nouveau service `MatchingService`

**Fichier :** `api/src/matching/matching.service.ts`

**Méthodes :**

#### `calculateScore(candidateId, projectId): Promise<MatchScore>`

1. **skillsMatch (0-100)** — Pondération 40%
   - Similarité cosinus entre `skillsEmbedding` et `descriptionEmbedding` via requête pgvector
   - Bonus : intersection `candidate.skills` ∩ `project.requiredSkills` (chaque match +10, max 50)
   - Bonus : intersection avec `niceToHaveSkills` (+5 chaque)
   - Normaliser à 0-100

2. **experienceMatch (0-100)** — Pondération 20%
   - Mapping stage → expérience minimale attendue :
     - `IDEA` → 0 ans, `PROTOTYPE` → 1 an, `MVP_BUILD` → 2 ans, `MVP_LIVE` → 3 ans, `TRACTION` → 4 ans, `SCALE` → 5 ans
   - Si `candidate.yearsOfExperience >= seuil` → 100
   - Sinon → `(yearsOfExperience / seuil) * 100`

3. **locationMatch (0-100)** — Pondération 15%
   - Projet remote + candidat remote → 100
   - Même ville → 100
   - Même pays → 70
   - Candidat `willingToRelocate` + pays différent → 50
   - Sinon → 20

4. **culturalFit (0-100)** — Pondération 25%
   - `project.sector` ∈ `candidate.desiredSectors` → +40
   - `project.stage` ∈ `candidate.desiredStage` → +30
   - Similarité cosinus `bioEmbedding` vs `descriptionEmbedding` × 30

5. **overallScore** = `skillsMatch×0.4 + experienceMatch×0.2 + locationMatch×0.15 + culturalFit×0.25`

6. Stocker via `prisma.matchScore.upsert()` (mise à jour si existe déjà)

#### `calculateForProject(projectId): Promise<void>`

- Récupérer tous les candidats `PUBLISHED` avec embeddings
- Calculer le score pour chaque paire
- Batch upsert en base

#### `calculateForCandidate(candidateId): Promise<void>`

- Récupérer tous les projets `PUBLISHED` avec embeddings
- Calculer le score pour chaque paire
- Batch upsert en base

#### `getTopMatchesForProject(projectId, limit = 10): Promise<MatchScore[]>`

- `SELECT * FROM match_scores WHERE project_id = ? ORDER BY overall_score DESC LIMIT ?`

#### `getTopMatchesForCandidate(candidateId, limit = 10): Promise<MatchScore[]>`

- `SELECT * FROM match_scores WHERE candidate_id = ? ORDER BY overall_score DESC LIMIT ?`

### B. Nouveau module `MatchingModule`

**Fichier :** `api/src/matching/matching.module.ts`

Imports : `PrismaModule`, `AiModule` (pour les embeddings si besoin de recalcul)

### C. Nouveau controller `MatchingController`

**Fichier :** `api/src/matching/matching.controller.ts`

| Endpoint | Description | Guard |
|----------|-------------|-------|
| `GET /matching/project/:id` | Top candidats pour un projet | FirebaseAuthGuard + ownership |
| `GET /matching/candidate/:id` | Top projets pour un candidat | FirebaseAuthGuard + ownership |
| `POST /matching/recalculate/project/:id` | Forcer recalcul pour un projet | FirebaseAuthGuard + ownership |

### D. Déclencheurs automatiques

- Quand un projet passe à `PUBLISHED` → `matchingService.calculateForProject(projectId)` (fire-and-forget)
- Quand un candidat passe à `PUBLISHED` → `matchingService.calculateForCandidate(candidateId)` (fire-and-forget)
- Planifiable via cron job futur pour recalcul global périodique

### E. Intégration feed (optionnel, Phase 2)

- Dans `projects.service.ts` → `getFeed()`, booster les projets avec un `MatchScore` élevé pour le candidat connecté
- Afficher un badge "Match 85%" sur la carte projet

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `api/src/matching/matching.module.ts` | **Créer** |
| `api/src/matching/matching.service.ts` | **Créer** |
| `api/src/matching/matching.controller.ts` | **Créer** |
| `api/src/app.module.ts` | Enregistrer `MatchingModule` |
| `api/src/documents/document-analysis.service.ts` | Appeler `calculateForProject` après publication |
| `api/src/users/candidate-moderation.service.ts` | Appeler `calculateForCandidate` après publication (dépend tâche 01) |

## Tests et validation

### Tests unitaires

- [ ] `calculateScore()` retourne un `overallScore` entre 0 et 100
- [ ] Un candidat avec les mêmes skills que le projet obtient `skillsMatch > 70`
- [ ] Un candidat sans skills en commun obtient `skillsMatch < 30`
- [ ] Un candidat dans la même ville que le projet obtient `locationMatch = 100`
- [ ] Un candidat remote + projet remote → `locationMatch = 100`
- [ ] `calculateForProject()` crée des `MatchScore` pour tous les candidats publiés
- [ ] `upsert` met à jour un score existant sans erreur de doublon

### Tests d'intégration

- [ ] Publier un projet → les MatchScores sont calculés en background
- [ ] `GET /matching/project/:id` retourne les candidats triés par score décroissant
- [ ] `GET /matching/candidate/:id` retourne les projets triés par score décroissant
- [ ] Un non-propriétaire du projet reçoit `403 Forbidden`
- [ ] Les scores sont recalculés quand un candidat modifie son profil

### Condition de validation finale

> Quand un projet est publié, des scores de compatibilité sont automatiquement calculés pour chaque candidat publié. Le fondateur peut consulter ses meilleurs matchs via `GET /matching/project/:id`, triés par pertinence. Les scores reflètent fidèlement la compatibilité skills / expérience / localisation / secteur.
