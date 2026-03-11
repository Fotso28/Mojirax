# 04 — Unlock Service — Vérification côté serveur

## Résumé

Compléter le service d'unlock avec la logique de vérification serveur : s'assurer que seuls les utilisateurs ayant payé peuvent accéder aux données débloquées, et que les unlocks sont correctement enregistrés après confirmation de paiement.

## Contexte

**Dépend de :** Tâche 03 (Privacy Wall Backend Interceptor)

**Ce qui existe :**
- Table `Unlock` : `userId`, `targetCandidateId`, `targetProjectId`, `transactionId`, contraintes `@@unique`
- Table `Transaction` : `amount`, `currency` (XAF), `status` (PENDING/PAID/FAILED/REFUNDED), `provider` (LYGOS), `externalId`
- `UnlockService` créé dans la tâche 03 avec `hasUnlock()` et `createUnlock()`
- `PrivacyInterceptor` qui vérifie les unlocks avant d'exposer les données

**Ce qui manque :**
- La logique complète de création d'unlock après paiement
- Les gardes de sécurité empêchant la création d'unlock sans transaction valide
- Les endpoints pour gérer les unlocks côté utilisateur

## Spécification

### A. Compléter `UnlockService`

**Fichier :** `api/src/unlock/unlock.service.ts`

```typescript
// Créer un unlock UNIQUEMENT si la transaction est PAID
async createUnlockFromTransaction(
  userId: string,
  transactionId: string,
  targetId: string,
  type: 'candidate' | 'project'
): Promise<Unlock>
```

**Règles :**
1. Vérifier que la `Transaction` existe ET que `status === 'PAID'`
2. Vérifier que la `Transaction` appartient au `userId`
3. Vérifier qu'aucun `Unlock` n'existe déjà pour ce couple (éviter double paiement)
4. Créer le `Unlock` et invalider le cache
5. Créer une notification pour l'utilisateur : "Vous avez débloqué le profil de X"

**Sécurité :**
- Ne JAMAIS accepter un `transactionId` fourni par le frontend sans vérification
- L'unlock est créé uniquement par le webhook de paiement (tâche 05) ou par le `PaymentsService`

### B. Compléter `UnlockController`

**Fichier :** `api/src/unlock/unlock.controller.ts`

| Endpoint | Description | Guard |
|----------|-------------|-------|
| `GET /unlock/check/:targetId` | Vérifier si un profil/projet est débloqué | FirebaseAuthGuard |
| `GET /unlock/mine` | Lister mes unlocks (profils débloqués) | FirebaseAuthGuard |

**`GET /unlock/mine`** retourne :
```json
[
  {
    "id": "...",
    "targetType": "candidate",
    "targetId": "...",
    "targetName": "Jean Dupont",
    "targetImage": "https://...",
    "unlockedAt": "2026-03-09T..."
  }
]
```

### C. Gestion des cas limites

| Cas | Comportement |
|-----|--------------|
| Transaction `PENDING` | Unlock non créé, attendre webhook |
| Transaction `FAILED` | Unlock non créé, notification d'échec |
| Transaction `REFUNDED` | Unlock supprimé, données re-masquées |
| Double paiement pour même profil | Bloqué par contrainte `@@unique`, retourner 409 Conflict |
| Profil cible supprimé | `onDelete: SetNull` — unlock existe mais `targetCandidateId = null` |
| Utilisateur essaie de débloquer son propre profil | Interdit, retourner 400 Bad Request |

### D. Invalidation cache

Quand un unlock est créé ou supprimé :
1. Invalider l'entrée cache pour `(userId, targetId)`
2. Si Redis est utilisé, publier un event pour les instances multiples

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `api/src/unlock/unlock.service.ts` | Compléter `createUnlockFromTransaction`, ajouter `listMyUnlocks`, gestion refund |
| `api/src/unlock/unlock.controller.ts` | Ajouter `GET /unlock/mine` |
| `api/src/notifications/notifications.service.ts` | Ajouter type `PROFILE_UNLOCKED` |

## Tests et validation

### Tests unitaires

- [ ] `createUnlockFromTransaction()` crée un unlock si la transaction est `PAID`
- [ ] `createUnlockFromTransaction()` refuse si la transaction est `PENDING`
- [ ] `createUnlockFromTransaction()` refuse si la transaction appartient à un autre utilisateur
- [ ] `createUnlockFromTransaction()` refuse si un unlock existe déjà (pas de double paiement)
- [ ] `createUnlockFromTransaction()` refuse de débloquer son propre profil
- [ ] Le cache est invalidé après création d'un unlock
- [ ] `listMyUnlocks()` retourne les unlocks de l'utilisateur avec les infos du profil cible

### Tests d'intégration

- [ ] `GET /unlock/check/:targetId` retourne `{ unlocked: false }` par défaut
- [ ] Après création d'un unlock, `GET /unlock/check/:targetId` retourne `{ unlocked: true }`
- [ ] `GET /unlock/mine` retourne une liste vide puis une liste avec l'unlock créé
- [ ] Après unlock, `GET /projects/:slug` retourne les informations de contact complètes
- [ ] Un remboursement (Transaction → REFUNDED) supprime l'unlock et re-masque les données

### Condition de validation finale

> Un unlock ne peut être créé que via une transaction `PAID` vérifiée côté serveur. Il est impossible de contourner le paiement en appelant directement l'API. Le cache est correctement invalidé après chaque opération. Un remboursement supprime l'unlock et re-masque les données.
