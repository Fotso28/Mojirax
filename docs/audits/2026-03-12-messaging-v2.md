# Audit : Messagerie temps réel (post-corrections)

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
| 1 | `web/src/components/messaging/conversation-list.tsx:8` | Type `any[]` pour le prop `conversations` — devrait utiliser une interface typée | BASSE |

> Tous les bugs critiques et hauts du premier audit ont été corrigés.

### Vérifications passées

**Backend :**
- [x] Tous les endpoints ont `@UseGuards(FirebaseAuthGuard)` (class-level L23)
- [x] Ownership vérifié via `req.user.uid` → `resolveUserId()` (jamais de userId depuis body)
- [x] `@Body()` utilise DTOs typés (`GetMessagesDto`, `SendMessageDto`)
- [x] `select` explicite sur toutes les requêtes Prisma
- [x] Pagination bornée : `Math.min(limit || 20, 100)` (service L94, L118)
- [x] Logger NestJS utilisé partout (jamais de console.log)
- [x] Pas de `$queryRawUnsafe`
- [x] Pas de secret en dur
- [x] Validation M02 côté WebSocket (content 5000, fileSize 5MB, MIME)
- [x] Membership vérifiée sur typing:start/stop (M01)
- [x] Rate limiting Redis sur tous les événements WS (M03)
- [x] Auth Firebase WS + re-auth 50min (M04)

**Frontend :**
- [x] Pas de `dangerouslySetInnerHTML`
- [x] Pas de `console.log` / `console.error`
- [x] Pas de `eval()` / `innerHTML`
- [x] Pas de secret en dur
- [x] Événements Socket alignés avec le gateway (`presence:update`, `typing:update`)
- [x] URL API correctes (`/messages/${id}`, `/messages/conversations`)
- [x] Format réponse correct (`data.items`)
- [x] Badge filtré par senderId
- [x] Messages filtrés par conversationId dans ChatView
- [x] Accept fichier limité à PDF/DOCX

---

## Sécurité (OWASP)

| # | Règle | Fichier | Problème | Sévérité |
|---|-------|---------|----------|----------|
| — | — | — | — | — |

> Aucune faille de sécurité détectée. Toutes les règles OWASP (A01-A10) et messagerie (M01-M04) sont respectées.

---

## Résumé fonctionnel

### Ajouts / Modifications

**Backend (9 fichiers) :**
- `MessagingService` : CRUD messages, conversations, réactions, membership check
- `MessagingController` : 4 endpoints REST avec FirebaseAuthGuard
- `MessagingGateway` : WebSocket avec 8 événements, auth Firebase, rate limiting Redis, push FCM offline
- `WsAuthGuard` + `WsRateLimiter` : sécurité WebSocket
- `RedisIoAdapter` : Connection State Recovery via Redis Streams (2 min)
- DTOs typés : `SendMessageDto`, `GetMessagesDto`

**Frontend (12 fichiers) :**
- Page `/messages` : layout 2 colonnes responsive (mobile toggle)
- 10 composants messaging : ChatView, ConversationList/Item, MessageBubble, MessageStatus, FilePreview, TypingIndicator, EmojiPicker, EmojiReactions, OnlineBadge
- `SocketProvider` : contexte React global, Web Audio API notification, auto-reconnexion
- Badge non-lu dans la sidebar (filtré par senderId)

### Endpoints touchés

| Méthode | Path | Description |
|---------|------|-------------|
| GET | `/messages/conversations` | Liste conversations (cursor pagination) |
| GET | `/messages/conversations/unread-count` | Nombre de messages non lus |
| GET | `/messages/:conversationId` | Historique messages (cursor pagination) |
| POST | `/messages/upload` | Upload fichier PDF/DOCX (5 MB max) |

### Événements WebSocket (namespace `/messaging`)

| Direction | Événement | Description |
|-----------|-----------|-------------|
| client → server | `message:send` | Envoi message (validé M02) |
| client → server | `message:delivered` | Accusé de réception |
| client → server | `message:read` | Marquage comme lu |
| client → server | `typing:start/stop` | Indicateurs de frappe (membership M01) |
| client → server | `reaction:add/remove` | Réactions emoji |
| client → server | `auth:refresh` | Rafraîchissement token |
| server → client | `message:new` | Nouveau message |
| server → client | `message:status` | Changement statut (DELIVERED/READ) |
| server → client | `message:read` | Conversation marquée lue |
| server → client | `presence:update` | Statut en ligne/hors ligne |
| server → client | `typing:update` | Indicateur de frappe |
| server → client | `reaction:update` | Mise à jour réactions |

### Modèles Prisma impactés
- `Conversation` (`conversations`) — `@@map`, cascade Application, relations User
- `Message` (`messages`) — `@@map`, index [conversationId, createdAt], cascade Conversation
- `MessageReaction` (`message_reactions`) — `@@unique` [messageId, userId, emoji], cascade Message
- `MessageStatus` enum — SENT, DELIVERED, READ
- `NotificationType` — ajout MESSAGE_RECEIVED

---

## Score

| Catégorie | Score | Commentaire |
|-----------|-------|-------------|
| Qualité | 9/10 | Code propre, DTOs typés, Logger NestJS, pagination bornée. Un type `any` mineur reste dans conversation-list. |
| Sécurité | 9/10 | Guards, ownership, validation M02 WS, rate limiting M03, auth M04, membership M01. Aucune faille détectée. |
| **Global** | **9/10** | **Implémentation solide après correction des 10 bugs du premier audit. Architecture bien structurée, sécurité OWASP respectée.** |
