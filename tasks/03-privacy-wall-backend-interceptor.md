# 03 — Privacy Wall — Backend Interceptor

## Résumé

Créer un intercepteur NestJS qui strip automatiquement les champs de contact sensibles (email, téléphone, LinkedIn, etc.) des réponses API avant envoi au frontend. Les données ne sont visibles que si l'utilisateur a débloqué le profil via un `Unlock`.

## Contexte

**Le problème actuel :**
- `GET /projects/:idOrSlug` retourne le `founderProfile` complet incluant `linkedinUrl`, `websiteUrl`, et le `User` avec `email`, `phone` — **tout est exposé sans restriction**
- `founder-sidebar.tsx` affiche email, téléphone, LinkedIn, site web sans aucune protection
- Le PRD exige que les informations de contact soient masquées pour les non-premium

**Ce qui existe :**
- Composant frontend `privacy-wall.tsx` avec blur + cadenas + bouton "Débloquer" (non fonctionnel)
- Table `Unlock` en base : `userId`, `targetCandidateId`, `targetProjectId`, `transactionId`
- Champ `isContactVisible` sur `CandidateProfile` (existe, jamais utilisé)
- Le feed candidats est déjà protégé (select ne retourne pas email/phone)

## Spécification

### A. Champs sensibles à protéger

| Modèle | Champs à masquer |
|--------|-----------------|
| `User` (fondateur) | `email`, `phone` |
| `founderProfile` (JSON) | `linkedinUrl`, `websiteUrl` |
| `CandidateProfile` | `linkedinUrl`, `resumeUrl`, `githubUrl`, `portfolioUrl` |
| `User` (candidat) | `email`, `phone` |

### B. Nouveau service `UnlockService`

**Fichier :** `api/src/unlock/unlock.service.ts`

```typescript
// Vérifie si un utilisateur a débloqué un profil/projet
async hasUnlock(userId: string, targetId: string): Promise<boolean>

// Crée un unlock après paiement confirmé
async createUnlock(userId: string, targetId: string, transactionId: string, type: 'candidate' | 'project'): Promise<Unlock>
```

**Cache :** Utiliser un cache in-memory (Map ou Redis si disponible) pour éviter de requêter la DB à chaque appel API. TTL : 5 minutes.

### C. Intercepteur `PrivacyInterceptor`

**Fichier :** `api/src/common/interceptors/privacy.interceptor.ts`

**Logique :**

1. S'exécute **après** le handler du controller (dans le `pipe` de sortie)
2. Récupère `req.user?.uid` (utilisateur connecté, peut être `null` pour les endpoints publics)
3. Parcourt la réponse et détecte les objets contenant des champs sensibles
4. Pour chaque objet contenant des données de contact :
   - Si l'utilisateur est le propriétaire du profil → ne pas masquer (on peut toujours voir ses propres infos)
   - Si un `Unlock` existe pour ce couple `(userId, targetId)` → ne pas masquer
   - Sinon → remplacer les champs par `null` et ajouter un flag `_isLocked: true`

**Appliquer via décorateur `@UseInterceptors(PrivacyInterceptor)` sur :**
- `ProjectsController.findOne()` — `GET /projects/:idOrSlug`
- `UsersController.getPublicProfile()` — `GET /users/:id/public`
- `ApplicationsController.findByProject()` — `GET /applications/project/:id`
- `MatchingController.getTopMatchesForProject()` — `GET /matching/project/:id`

**Ne PAS appliquer sur :**
- `GET /users/profile` (son propre profil)
- `GET /applications/mine` (ses propres candidatures)

### D. Adaptation des réponses API

**Avant (sans interceptor) :**
```json
{
  "founder": {
    "email": "oswald@example.com",
    "phone": "+237699000000",
    "founderProfile": {
      "linkedinUrl": "https://linkedin.com/in/oswald",
      "websiteUrl": "https://oswald.dev"
    }
  }
}
```

**Après (avec interceptor, non débloqué) :**
```json
{
  "founder": {
    "email": null,
    "phone": null,
    "founderProfile": {
      "linkedinUrl": null,
      "websiteUrl": null
    },
    "_isLocked": true
  }
}
```

**Après (avec interceptor, débloqué ou propriétaire) :**
```json
{
  "founder": {
    "email": "oswald@example.com",
    "phone": "+237699000000",
    "founderProfile": {
      "linkedinUrl": "https://linkedin.com/in/oswald",
      "websiteUrl": "https://oswald.dev"
    },
    "_isLocked": false
  }
}
```

### E. Adaptation frontend

**`founder-sidebar.tsx` :**
- Vérifier `founder._isLocked`
- Si `true` → wrapper les infos de contact dans `<PrivacyWall isPremium={false}>`
- Le bouton "Débloquer" → appeler le flow de paiement (tâche 05)

**`privacy-wall.tsx` :**
- Ajouter prop `onUnlock?: () => void` au bouton "Débloquer"
- Prop `lockedFieldsCount?: number` pour afficher "3 informations masquées"

### F. Endpoint de vérification unlock

| Endpoint | Description |
|----------|-------------|
| `GET /unlock/check/:targetId` | Retourne `{ unlocked: boolean }` pour un profil/projet donné |

Utilisé par le frontend pour afficher l'état initial sans attendre le chargement complet.

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `api/src/unlock/unlock.module.ts` | **Créer** |
| `api/src/unlock/unlock.service.ts` | **Créer** |
| `api/src/unlock/unlock.controller.ts` | **Créer** — endpoint `GET /unlock/check/:targetId` |
| `api/src/common/interceptors/privacy.interceptor.ts` | **Créer** |
| `api/src/app.module.ts` | Enregistrer `UnlockModule` |
| `api/src/projects/projects.controller.ts` | Ajouter `@UseInterceptors(PrivacyInterceptor)` sur `findOne` |
| `api/src/users/users.controller.ts` | Ajouter interceptor sur `getPublicProfile` |
| `web/src/components/project-deck/founder-sidebar.tsx` | Conditionner l'affichage via `_isLocked` |
| `web/src/components/project-deck/privacy-wall.tsx` | Ajouter `onUnlock` et `lockedFieldsCount` |

## Tests et validation

### Tests unitaires

- [ ] `PrivacyInterceptor` masque `email`, `phone`, `linkedinUrl`, `websiteUrl` quand pas d'unlock
- [ ] `PrivacyInterceptor` ne masque PAS quand l'utilisateur est propriétaire du profil
- [ ] `PrivacyInterceptor` ne masque PAS quand un `Unlock` existe
- [ ] `PrivacyInterceptor` ajoute `_isLocked: true` sur les objets masqués
- [ ] `UnlockService.hasUnlock()` retourne `true` si unlock existe en DB
- [ ] `UnlockService.hasUnlock()` retourne `false` si pas d'unlock
- [ ] Le cache fonctionne (2e appel ne fait pas de requête DB)

### Tests d'intégration

- [ ] `GET /projects/:slug` sans auth → infos de contact masquées
- [ ] `GET /projects/:slug` avec auth (non propriétaire, pas d'unlock) → infos masquées
- [ ] `GET /projects/:slug` avec auth (propriétaire) → infos visibles
- [ ] `GET /projects/:slug` avec auth (unlock existant) → infos visibles
- [ ] `GET /users/:id/public` → même logique
- [ ] `GET /unlock/check/:targetId` retourne le bon statut
- [ ] Le frontend affiche le Privacy Wall quand `_isLocked: true`

### Condition de validation finale

> Un utilisateur non connecté ou non premium ne voit jamais les informations de contact (email, téléphone, LinkedIn, site web) d'un fondateur ou candidat. Les données sont **supprimées côté serveur** avant envoi — le frontend ne reçoit que des `null`. Le propriétaire du profil voit toujours ses propres informations. Un utilisateur ayant débloqué un profil voit les informations complètes.
