# Design — Bouton "Message" et conversations directes

**Date :** 2026-03-16
**Statut :** Validé (rev.2 — post code-review)

---

## Contexte

Actuellement, les conversations ne sont créées que lorsqu'un fondateur accepte une candidature (lien 1:1 avec `Application`). Il n'existe aucun bouton "Message" sur les cards du feed, la page projet ou les profils. L'objectif est de permettre à tout utilisateur connecté d'envoyer un message à n'importe quel autre utilisateur directement depuis ces pages.

## Décisions clés

- **Qui peut écrire à qui :** Tout utilisateur connecté (ACTIVE) → tout autre utilisateur (ACTIVE)
- **1 conversation par paire :** Find-or-create avec normalisation d'IDs, pas de doublons
- **`applicationId` optionnel :** Les conversations directes n'ont pas de candidature associée
- **Filtrage liste :** Seules les conversations avec `lastMessageAt IS NOT NULL` sont affichées, sauf exception via query param
- **Approche :** Création côté backend (endpoint REST), pas via WebSocket
- **Nommage :** Les champs `founderId`/`candidateId` sont conservés (renommer serait un refactor trop large). Convention : l'ID le plus petit (lexicographiquement) est `founderId`, le plus grand est `candidateId`.

---

## 1. Schéma Prisma

### Changements sur `Conversation`

- `applicationId` passe de `String` (required, unique) à `String?` (optional, unique)
- Ajout contrainte unique `@@unique([founderId, candidateId])` pour garantir 1 conversation max par paire

### Normalisation de la paire

Pour que la contrainte unique fonctionne dans les 2 sens, la paire est **normalisée** à la création : l'ID lexicographiquement le plus petit est toujours `founderId`, le plus grand est `candidateId`. Cela empêche d'avoir (A→B) et (B→A) comme 2 conversations distinctes.

### Impact migration

- Rendre `applicationId` nullable
- Ajouter la contrainte unique composite
- **Audit :** Le code existant ne référence jamais `conversation.applicationId` dans le service messaging, le gateway, ou le controller. Le service notifications gère déjà le cas `null` avec un check `if (d.applicationId)`. Aucun changement nécessaire dans le code existant.

---

## 2. Backend — Nouvel endpoint

### `POST /messages/conversations`

- **Guard :** `FirebaseAuthGuard`
- **Rate limiting :** `@Throttle({ default: { limit: 10, ttl: 3600000 } })` (10 créations/heure)
- **DTO :** `CreateConversationDto` avec `targetUserId: string` (`@IsUUID()`, required)

### Logique du service

1. Résoudre `req.user.uid` → `userId`
2. Vérifier que `targetUserId` existe, ≠ `userId`, et que le user cible a `status: ACTIVE`
3. Vérifier que l'utilisateur courant a `status: ACTIVE`
4. **Normaliser la paire** : `smallerId = min(userId, targetUserId)`, `largerId = max(userId, targetUserId)`
5. Chercher conversation existante avec `founderId = smallerId AND candidateId = largerId`
6. Si trouvée → retourner
7. Sinon → créer avec `founderId = smallerId`, `candidateId = largerId`, `applicationId = null`
8. Logger : `this.logger.log('Conversation created', { conversationId, founderId, candidateId })`
9. Retourner avec select explicite :

```typescript
{
  id: true,
  founderId: true,
  candidateId: true,
  founder: { select: { id: true, firstName: true, lastName: true, image: true } },
  candidate: { select: { id: true, firstName: true, lastName: true, image: true } },
}
```

### Erreurs

| Cas | Code | Message |
|-----|------|---------|
| Target = self | 400 | "Vous ne pouvez pas vous envoyer un message" |
| Target inexistant | 404 | "Utilisateur introuvable" |
| Target ou self BANNED | 403 | "Action non autorisée" |

---

## 3. Backend — Filtrage conversations

### Modifier `getConversations()`

- Filtre par défaut : `lastMessageAt: { not: null }` (plus performant qu'un subquery `messages: { some: {} }`)
- Param optionnel `active` : `@IsUUID() @IsOptional()` dans le DTO
- Si `active` est fourni : vérifier que l'utilisateur est **membre** de cette conversation (ownership check), puis l'inclure même si vide
- Endpoint : `GET /messages/conversations?active=<conversationId>`

---

## 4. Frontend — Bouton "Message"

### Emplacements

1. **ProjectCard (feed)** — à côté de "Voir projet", icône `MessageCircle` + "Message". Cible : le fondateur du projet.
2. **ProjectDeck (détail projet)** — dans le footer CTA ou la FounderSidebar. Cible : le fondateur.
3. **Page profil** (`/founders/[id]`) — dans le hero section. Cible : l'utilisateur du profil.

### Comportement au clic

1. Afficher un loading state sur le bouton
2. `POST /messages/conversations` avec `{ targetUserId }`
3. Récupérer `conversationId`
4. `router.push(/messages?conv=${conversationId})`
5. En cas d'erreur : toast avec le message d'erreur

### Conditions d'affichage

- Utilisateur connecté (sinon le bouton est masqué)
- Ce n'est pas son propre profil/projet

---

## 5. Frontend — Page messages avec query param

- Lire le query param `conv` depuis l'URL
- Passer comme `active` dans `GET /messages/conversations?active=<conv>`
- Sélectionner automatiquement cette conversation comme active
- Si l'utilisateur quitte sans écrire, la conversation vide disparaît au prochain chargement (`lastMessageAt` reste null)

---

## Hors scope

- Notifications à la création de conversation (le premier message suffit)
- Blocage / signalement d'utilisateurs
- Changement au flux candidature existant
