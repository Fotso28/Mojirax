# 02 — Tests Unitaires + E2E

## Résumé

Mettre en place une couverture de tests minimale avant le lancement : tests unitaires des services critiques côté API, et tests end-to-end des parcours utilisateurs principaux.

## Contexte

**Ce qui existe :**
- Jest configuré côté API (`jest` dans `package.json`)
- 1 seul fichier de test : `app.controller.spec.ts` (smoke test)
- Aucun test frontend
- Aucun test e2e

**Objectif :** Couverture > 70% sur les services critiques, tests e2e des 3 parcours principaux.

## Spécification

### A. Tests unitaires API (Jest)

**Services critiques à tester :**

| Service | Priorité | Tests |
|---------|----------|-------|
| `UnlockService` | 🔴 | `hasUnlock`, `createUnlockFromTransaction` (PAID/PENDING/FAILED, ownership, doublon, self-unlock), `revokeUnlockOnRefund`, cache |
| `PrivacyInterceptor` | 🔴 | Masquage champs (owner, non-owner, unlock, pas d'auth), structure _isLocked |
| `ProjectsService` | 🔴 | `create`, `findOne`, `findAll`, `update`, `remove`, ownership |
| `UsersService` | 🔴 | `findOne`, `findPublicProfile`, `createCandidateProfile`, `updateCandidateProfile` |
| `ApplicationsService` | 🟡 | `apply`, `findByProject`, `updateStatus`, doublon, ownership |
| `NotificationsService` | 🟡 | `notify`, `findAll`, `markAsRead`, `markAllAsRead`, ownership |
| `MatchingService` | 🟡 | `calculateScore` (skills, experience, location, cultural fit), `calculateForProject` |
| `SearchService` | 🟢 | `search`, `getHistory` |

**Structure des fichiers de test :**
```
api/src/
├── unlock/
│   └── unlock.service.spec.ts
├── common/interceptors/
│   └── privacy.interceptor.spec.ts
├── projects/
│   └── projects.service.spec.ts
├── users/
│   └── users.service.spec.ts
├── applications/
│   └── applications.service.spec.ts
├── notifications/
│   └── notifications.service.spec.ts
└── matching/
    └── matching.service.spec.ts
```

**Approche :** Mocker PrismaService avec des données en mémoire. Ne pas nécessiter de base de données pour les tests unitaires.

### B. Tests d'intégration API (Supertest)

**Fichier :** `api/test/`

| Parcours | Tests |
|----------|-------|
| Auth flow | `POST /auth/sync` crée un user, retourne le profil |
| Project CRUD | Créer → modifier → publier → supprimer un projet |
| Privacy wall | `GET /projects/:slug` sans auth → champs masqués |
| Unlock flow | Vérifier que les champs sont visibles après unlock |
| Applications | Postuler → accepter → vérifier notifications |

### C. Tests E2E Frontend (Playwright)

**Package :** `npm install -D @playwright/test`

**Parcours à tester :**

| Parcours | Steps |
|----------|-------|
| Onboarding Founder | Login → choix rôle → wizard 4 étapes → création projet |
| Onboarding Candidate | Login → choix rôle → wizard 5 étapes → profil créé |
| Consultation projet | Feed → clic projet → page détail → privacy wall visible |

### D. Configuration CI

Ajouter un script `test` dans les `package.json` :
- `api/package.json` : `"test": "jest --passWithNoTests"`, `"test:cov": "jest --coverage"`
- `web/package.json` : `"test:e2e": "playwright test"`

## Fichiers à créer

| Fichier | Action |
|---------|--------|
| `api/src/unlock/unlock.service.spec.ts` | **Créer** |
| `api/src/common/interceptors/privacy.interceptor.spec.ts` | **Créer** |
| `api/src/projects/projects.service.spec.ts` | **Créer** |
| `api/src/users/users.service.spec.ts` | **Créer** |
| `api/test/app.e2e-spec.ts` | **Créer** (intégration API) |
| `web/e2e/onboarding.spec.ts` | **Créer** (Playwright) |
| `web/playwright.config.ts` | **Créer** |

## Tests et validation

- [ ] `npm test` passe dans `api/` avec 0 échec
- [ ] Couverture > 70% sur `UnlockService`, `PrivacyInterceptor`, `ProjectsService`
- [ ] Tests d'intégration API passent (auth, CRUD, privacy)
- [ ] Tests Playwright passent sur les 3 parcours principaux
- [ ] Scripts `test` et `test:cov` fonctionnels dans les deux packages

### Condition de validation finale

> Tous les services critiques ont des tests unitaires. Les parcours principaux sont couverts par des tests e2e. La couverture globale dépasse 70% sur les modules clés. Les tests peuvent tourner en CI sans base de données externe (mocks Prisma).
