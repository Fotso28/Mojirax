# Audit : Messagerie temps réel (v3 — post-simplify)

**Date** : 2026-03-12
**Fichiers analysés** : 24

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

> Tous les problèmes critiques, hauts et moyens des audits précédents ont été corrigés.

### Vérifications passées

**Backend :**
- [x] Tous les endpoints REST ont `@UseGuards(FirebaseAuthGuard)` (class-level controller L23)
- [x] Tous les handlers WS ont `@UseGuards(WsAuthGuard)`
- [x] Ownership vérifié via `req.user.uid` → `resolveUserId()` (jamais de userId depuis body)
- [x] `@Body()` utilise DTOs typés (`GetMessagesDto`, `SendMessageDto`)
- [x] `@MessageBody()` utilise DTOs typés avec `class-validator` (`WsSendMessageDto`, `WsConversationIdDto`, `WsMessageIdDto`, `WsReactionDto`, `WsAuthRefreshDto`)
- [x] `select` explicite sur toutes les requêtes Prisma
- [x] Pagination bornée : `Math.min(limit || 20, 100)` (service L94, L131)
- [x] Pagination WS room join bornée : `take: 500` (service L266)
- [x] Logger NestJS utilisé partout (jamais de `console.log`)
- [x] Pas de `$queryRawUnsafe`
- [x] Pas de secret en dur
- [x] Validation M02 : byte length (20KB) + char length (5000) + fileSize (5MB) + MIME whitelist
- [x] Membership vérifiée sur typing:start/stop (M01)
- [x] Rate limiting Redis sur tous les événements WS (M03) : message:send, typing:start/stop, reaction:add/remove
- [x] Auth Firebase WS + re-auth 50min (M04)
- [x] Curseurs validés avant utilisation (fallback sur première page si curseur inexistant)
- [x] Présence multi-onglets via INCR/DECR (pas de flag simple)
- [x] Redis safe-wrapper `safeRedis()` — ne crash jamais l'app
- [x] Emoji limité à `@db.VarChar(32)` dans le schéma
- [x] Cascade `onDelete: Cascade` sur Conversation → User (founder + candidate)
- [x] Room join dynamique via `conversation:join` event

**Frontend :**
- [x] Pas de `dangerouslySetInnerHTML`
- [x] Pas de `console.log` / `console.error`
- [x] Pas de `eval()` / `innerHTML`
- [x] Pas de secret en dur
- [x] Événements Socket alignés avec le gateway (`presence:update`, `typing:update`, `message:new`, `message:status`, `message:read`, `reaction:update`, `conversation:join`)
- [x] URL API correctes (`/messages/${id}`, `/messages/conversations`)
- [x] Format réponse correct (`data.items`)
- [x] Badge filtré par senderId + décrémente via refetch sur `message:read`
- [x] Messages filtrés par conversationId dans ChatView
- [x] Accept fichier limité à PDF/DOCX
- [x] AbortController sur le chargement des messages (race condition sur switch)
- [x] UI optimiste sur envoi de message (status `SENDING`)
- [x] Feedback d'erreur sur upload échoué (toast)
- [x] État d'erreur sur chargement des conversations (bouton réessayer)
- [x] Timeout typing indicator côté client (4s)
- [x] Fallback avatar `onError` (initiales affichées si image cassée)

---

## Sécurité (OWASP)

| # | Règle | Fichier | Problème | Sévérité |
|---|-------|---------|----------|----------|
| — | — | — | — | — |

> Aucune faille de sécurité détectée. Toutes les règles OWASP (A01-A10) et messagerie (M01-M04) sont respectées.

### Détail des vérifications OWASP

| Code | Statut | Détail |
|------|--------|--------|
| A01 | OK | Guards sur tous les endpoints REST et WS. Ownership via `req.user.uid` → `resolveUserId()`. Pas de données sensibles exposées (select explicites). |
| A02 | OK | Pas de secret en dur. Tokens non loggés. |
| A03 | OK | Pas de `$queryRawUnsafe`. Pas de `dangerouslySetInnerHTML`. Pas d'`eval()`. |
| A04 | OK | DTOs typés sur REST et WS (`class-validator`). Rate limiting sur tous les événements WS. Pagination bornée (max 100, défaut 20). |
| A05 | OK | CORS configuré via `process.env.FRONTEND_URL`. Pas de `origin: '*'`. |
| A06 | OK | Packages standards (socket.io, ioredis, @emoji-mart). |
| A07 | OK | Auth Firebase exclusivement. userId toujours depuis `req.user` ou `client.data.user`. |
| A08 | OK | Upload validé type MIME + taille (5MB) côté controller ET gateway. |
| A09 | OK | Logger NestJS partout. Pas de `console.log`. Pas de données sensibles loggées. |
| A10 | OK | Pas de fetch sur URL utilisateur. `fileUrl` est généré par le serveur via `UploadService`. |

---

## Résumé fonctionnel

### Ajouts / Modifications (v3 — corrections de robustesse)

**Backend (11 fichiers) :**
- `MessagingService` : CRUD messages, conversations, réactions, membership check, cursor validation, pagination bornée (500 pour rooms)
- `MessagingController` : 4 endpoints REST avec FirebaseAuthGuard
- `MessagingGateway` : WebSocket avec 9 événements (ajout `conversation:join`), auth Firebase, rate limiting Redis, push FCM offline, présence INCR/DECR, safeRedis wrapper
- `WsAuthGuard` + `WsRateLimiter` : sécurité WebSocket
- `RedisIoAdapter` : Connection State Recovery via Redis Streams (2 min)
- DTOs REST typés : `SendMessageDto`, `GetMessagesDto`
- DTOs WS typés : `WsSendMessageDto`, `WsConversationIdDto`, `WsMessageIdDto`, `WsReactionDto`, `WsAuthRefreshDto`

**Frontend (13 fichiers) :**
- Page `/messages` : layout 2 colonnes responsive (mobile toggle), état d'erreur avec bouton réessayer
- 10 composants messaging : ChatView (optimistic UI, AbortController, upload error toast, typing timeout), ConversationList/Item (avatar fallback), MessageBubble (status SENDING), MessageStatus (icône Clock), FilePreview, TypingIndicator, EmojiPicker, EmojiReactions, OnlineBadge
- `SocketProvider` : contexte React global, Web Audio API notification, auto-reconnexion, `joinConversation()` exposé, refetch signal sur reconnexion non-récupérée
- Badge non-lu dans la sidebar (filtré par senderId, décrémente via refetch sur `message:read`)

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
| client → server | `message:send` | Envoi message (validé M02, DTO typé) |
| client → server | `message:delivered` | Accusé de réception |
| client → server | `message:read` | Marquage comme lu |
| client → server | `typing:start/stop` | Indicateurs de frappe (membership M01) |
| client → server | `reaction:add/remove` | Réactions emoji (DTO typé, emoji max 32 chars) |
| client → server | `auth:refresh` | Rafraîchissement token |
| client → server | `conversation:join` | Rejoindre une nouvelle conversation room |
| server → client | `message:new` | Nouveau message |
| server → client | `message:status` | Changement statut (DELIVERED/READ) |
| server → client | `message:read` | Conversation marquée lue |
| server → client | `presence:update` | Statut en ligne/hors ligne (INCR/DECR multi-tab) |
| server → client | `typing:update` | Indicateur de frappe |
| server → client | `reaction:update` | Mise à jour réactions |

### Modèles Prisma impactés
- `Conversation` (`conversations`) — `@@map`, cascade Application + User (founder/candidate), relations User
- `Message` (`messages`) — `@@map`, index [conversationId, createdAt], cascade Conversation
- `MessageReaction` (`message_reactions`) — `@@unique` [messageId, userId, emoji], cascade Message, `emoji @db.VarChar(32)`
- `MessageStatus` enum — SENT, DELIVERED, READ
- `NotificationType` — ajout MESSAGE_RECEIVED

---

## Score

| Catégorie | Score | Commentaire |
|-----------|-------|-------------|
| Qualité | 10/10 | Code propre, DTOs typés REST et WS, Logger NestJS, pagination bornée, cursor validation, optimistic UI, error handling. Un type `any` mineur reste dans conversation-list (cosmétique). |
| Sécurité | 10/10 | Guards, ownership, validation M02 byte+char+file, rate limiting M03, auth M04, membership M01, safeRedis, cascade FK, emoji VarChar. Aucune faille détectée. |
| **Global** | **10/10** | **Implémentation robuste après 3 itérations d'audit. Architecture bien structurée, sécurité OWASP respectée, 17 problèmes du test paranoïaque corrigés.** |
