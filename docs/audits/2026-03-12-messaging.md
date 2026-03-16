# Audit : Messagerie temps réel

**Date** : 2026-03-12
**Fichiers analysés** : 22

---

## Compilation

| Cible | Statut | Erreurs |
|-------|--------|---------|
| API (`api/`) | OK | Aucune |
| Web (`web/`) | OK | Aucune |

---

## Qualité du code

| # | Fichier | Problème | Sévérité |
|---|---------|----------|----------|
| 1 | `web/src/components/messaging/chat-view.tsx:66` | **URL API incorrecte** : appelle `/messages/conversations/${convId}/messages` au lieu de `/messages/${convId}`. La route backend est `@Get(':conversationId')` sur `@Controller('messages')` → `GET /messages/:conversationId`. Résultat : 404 systématique au chargement des messages. | CRITIQUE |
| 2 | `web/src/app/(dashboard)/messages/page.tsx:83-84` | **Nom d'événement Socket incorrect** : écoute `user:online` et `user:offline` mais le gateway émet `presence:update` avec `{ userId, status: 'online'\|'offline' }`. La présence ne sera jamais mise à jour côté frontend. | CRITIQUE |
| 3 | `web/src/components/messaging/chat-view.tsx:147` | **Nom d'événement Socket incorrect** : écoute `typing:indicator` mais le gateway émet `typing:update`. L'indicateur de frappe ne fonctionnera jamais. | CRITIQUE |
| 4 | `api/src/messaging/messaging.gateway.ts:243` | **Émission vers mauvaise room** : `handleMarkDelivered` émet `message:status` vers `conversation:${result.senderId}`. `senderId` est un userId, pas un conversationId — personne n'est dans cette room. L'émission aux lignes 251-263 vers la vraie conversation est correcte mais redondante avec ce bug. | HAUTE |
| 5 | `api/src/messaging/messaging.gateway.ts:155-164` | **Pas de validation DTO sur WebSocket** : `message:send` accepte un objet brut sans passer par `SendMessageDto`. Le contenu peut dépasser 5000 caractères, le fileSize peut être > 5MB. Violation M02. Le service `sendMessage` ne valide pas non plus la longueur. | HAUTE |
| 6 | `api/src/messaging/messaging.controller.ts:34` | **Pagination manquante sur getConversations** : n'extrait pas `cursor`/`limit` des query params. Le service accepte ces paramètres mais le controller ne les transmet pas. Toujours le résultat par défaut (20). Violation A04. | HAUTE |
| 7 | `web/src/components/layout/sidebar-left.tsx:25-27` | **Badge incrémenté pour ses propres messages** : le handler `message:new` incrémente `unreadCount` pour TOUS les messages, y compris ceux envoyés par l'utilisateur courant. Devrait vérifier `message.senderId !== dbUser?.id`. | HAUTE |
| 8 | `web/src/components/messaging/chat-view.tsx:340` | **Accept du file input incohérent** : accepte `image/jpeg,image/png,image/webp` mais le backend n'autorise que PDF et DOCX. L'utilisateur peut sélectionner une image, l'upload échouera côté serveur sans feedback clair. | MOYENNE |
| 9 | `web/src/components/messaging/chat-view.tsx:84` | **Réponse API pas au bon format** : appelle `data.messages` (L84) mais le service retourne `{ items, nextCursor, hasMore }`. Devrait être `data.items`. | CRITIQUE |
| 10 | `web/src/components/messaging/conversation-list.tsx:8` | **Type `any[]`** pour le prop `conversations`. Perte de type safety. | BASSE |

---

## Sécurité (OWASP)

| # | Règle | Fichier | Problème | Sévérité |
|---|-------|---------|----------|----------|
| 1 | M02 | `api/src/messaging/messaging.gateway.ts:155` | Pas de validation de longueur/type sur les données WebSocket `message:send`. Un client malveillant peut envoyer un contenu de taille illimitée. | HAUTE |
| 2 | A04 | `api/src/messaging/messaging.controller.ts:34` | Endpoint `GET /messages/conversations` ne supporte pas la pagination via query params, bien que le service le permette. Si un utilisateur a des centaines de conversations, tout est retourné. | HAUTE |
| 3 | M01 | `api/src/messaging/messaging.gateway.ts:301-330` | `typing:start` et `typing:stop` ne vérifient pas la membership de la conversation. Un utilisateur authentifié pourrait envoyer des indicateurs de frappe dans des conversations auxquelles il n'appartient pas. | MOYENNE |
| 4 | A01 | `api/src/messaging/messaging.gateway.ts:232-268` | `message:delivered` vérifie la membership dans le service mais émet aussi vers une room invalide (`conversation:${senderId}`), ce qui est un bug fonctionnel plus que de sécurité. | BASSE |

---

## Résumé fonctionnel

### Ajouts / Modifications

**Backend :**
- Module complet `api/src/messaging/` (9 fichiers) : service, controller REST, gateway WebSocket, DTOs, guard WS, rate limiter Redis, adapter Redis Streams
- Modèles Prisma : `Conversation`, `Message`, `MessageReaction` avec `@@map`, index, cascade delete
- Intégration avec `NotificationsModule` pour push FCM offline
- Auto-création de conversation à l'acceptation d'une candidature (via `ApplicationsService`)
- `RedisIoAdapter` pour Connection State Recovery (2 min)

**Frontend :**
- Page `/messages` avec layout 2 colonnes responsive
- 10 composants dans `web/src/components/messaging/`
- `SocketProvider` au niveau dashboard layout avec Web Audio API notification
- Badge non-lu dans la sidebar
- Emoji picker (`@emoji-mart/react`) + réactions groupées
- Upload PDF/DOCX via REST

### Endpoints touchés

| Méthode | Path | Description |
|---------|------|-------------|
| GET | `/messages/conversations` | Liste des conversations (paginée côté service) |
| GET | `/messages/conversations/unread-count` | Nombre de messages non lus |
| GET | `/messages/:conversationId` | Historique messages (cursor pagination) |
| POST | `/messages/upload` | Upload fichier PDF/DOCX (5 MB max) |

### Événements WebSocket

| Événement client → serveur | Description |
|---------------------------|-------------|
| `message:send` | Envoi d'un message |
| `message:delivered` | Accusé de réception |
| `message:read` | Marquage comme lu |
| `typing:start` / `typing:stop` | Indicateurs de frappe |
| `reaction:add` / `reaction:remove` | Réactions emoji |
| `auth:refresh` | Rafraîchissement du token |

| Événement serveur → client | Description |
|---------------------------|-------------|
| `message:new` | Nouveau message |
| `message:status` | Changement de statut (DELIVERED/READ) |
| `message:read` | Conversation marquée comme lue |
| `presence:update` | Statut en ligne/hors ligne |
| `typing:update` | Indicateur de frappe |
| `reaction:update` | Mise à jour des réactions |

### Modèles Prisma impactés
- `Conversation` (`conversations`) — lien Application ↔ User × 2
- `Message` (`messages`) — contenu, fichier, statut, index [conversationId, createdAt]
- `MessageReaction` (`message_reactions`) — unique [messageId, userId, emoji]
- `MessageStatus` enum — SENT, DELIVERED, READ
- `NotificationType` — ajout MESSAGE_RECEIVED

---

## Score

| Catégorie | Score | Commentaire |
|-----------|-------|-------------|
| Qualité | 4/10 | 4 bugs critiques (URL API, noms d'événements, format réponse) empêchent le fonctionnement. L'architecture est solide mais l'intégration front↔back est cassée. |
| Sécurité | 7/10 | Auth et ownership bien implémentés dans le service. Manque la validation DTO côté WebSocket et la vérification membership sur typing. |
| **Global** | **5/10** | **Architecture backend excellente, mais le frontend ne peut pas fonctionner en l'état à cause des désynchronisations d'événements et d'URL. Corrections nécessaires avant tout test.** |
