# Messagerie temps réel — Design Spec

> Date : 2026-03-12
> Statut : Validé (review pass 2)
> Stack : PostgreSQL + Redis (Streams adapter) + Socket.io v4 + NestJS Gateway + Next.js

---

## 1. Contexte et objectifs

MojiraX est une plateforme de matching fondateur ↔ co-fondateur pour l'Afrique. La messagerie permet aux fondateurs et candidats acceptés de communiquer en temps réel avec une rigueur de type WhatsApp.

### Objectifs

- Messagerie 1-à-1 entre fondateur et candidat après acceptation de candidature
- Triple check : envoyé (✓), reçu (✓✓), lu (✓✓ bleu)
- Indicateur "en train d'écrire..."
- Échange de texte, emojis (picker + réactions), fichiers PDF/DOCX (5 MB max)
- Notifications push FCM + son
- Connection State Recovery via Redis Streams (robustesse déconnexion)

### Hors scope

- Conversations de groupe
- Appels audio/vidéo
- Suppression de messages
- Chiffrement de bout en bout

---

## 2. Architecture

### 3 couches

| Couche | Rôle | Techno |
|--------|------|--------|
| **Persistance** | Messages, conversations, fichiers | PostgreSQL (Prisma) |
| **Pub/Sub + Cache** | Distribution real-time, sessions, presence, typing | Redis (Streams adapter) |
| **Transport** | Connexion bidirectionnelle client ↔ serveur | Socket.io v4 + `@socket.io/redis-streams-adapter` |

### Flux d'un message

```
1. Alice tape        → event "typing"      → Redis pub/sub     → Bob voit "écrit..."
2. Alice envoie      → event "message:send" → PostgreSQL INSERT → ✓ (envoyé)
3. Serveur           → Socket.io emit       → Redis Streams     → Bob reçoit → event "delivered" → ✓✓
4. Bob lit           → event "message:read" → PostgreSQL UPDATE readAt → ✓✓ bleu
5. Si Bob offline    → FCM push + son       → message en attente dans PostgreSQL
6. Bob revient       → Connection State Recovery OU fetch depuis DB
```

### Packages nécessaires

**API (NestJS) :**
- `@nestjs/websockets` — Intégration NestJS
- `@nestjs/platform-socket.io` — Adapter Socket.io pour NestJS
- `socket.io` — Serveur Socket.io v4
- `@socket.io/redis-streams-adapter` — Redis Streams pour Connection State Recovery
- `redis` (ou `ioredis`) — Client Redis

**Web (Next.js) :**
- `socket.io-client` — Client Socket.io v4
- `@emoji-mart/react` + `@emoji-mart/data` — Picker emoji

---

## 3. Modèle de données

### Conversation

| Champ | Type | Contrainte |
|-------|------|-----------|
| `id` | UUID | PK |
| `applicationId` | UUID | FK → Application, UNIQUE, onDelete Cascade |
| `founderId` | UUID | FK → User |
| `candidateId` | UUID | FK → User |
| `lastMessageAt` | DateTime? | Dénormalisé, mis à jour à chaque message. Tri des conversations. |
| `lastMessagePreview` | String? | Max 100 chars, tronqué. Affiché dans la liste. |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Relation inverse** : Ajouter `conversation Conversation?` sur le modèle `Application` existant.

### Message

| Champ | Type | Contrainte |
|-------|------|-----------|
| `id` | UUID | PK |
| `conversationId` | UUID | FK → Conversation, onDelete Cascade, INDEX |
| `senderId` | UUID | FK → User |
| `content` | String? | Max 5000 chars, nullable |
| `fileUrl` | String? | URL MinIO, nullable |
| `fileName` | String? | Nom original du fichier |
| `fileSize` | Int? | Taille en octets |
| `fileMimeType` | String? | MIME type |
| `status` | Enum | SENT, DELIVERED, READ |
| `deliveredAt` | DateTime? | |
| `readAt` | DateTime? | |
| `createdAt` | DateTime | INDEX |

Pas de `updatedAt` sur Message — les champs `deliveredAt` et `readAt` servent de timestamps de transition d'état.

### MessageReaction

| Champ | Type | Contrainte |
|-------|------|-----------|
| `id` | UUID | PK |
| `messageId` | UUID | FK → Message, onDelete Cascade |
| `userId` | UUID | FK → User |
| `emoji` | String | L'emoji |
| `createdAt` | DateTime | |
| | | UNIQUE(messageId, userId, emoji) |

### Contraintes et cascades

- **Chaîne de cascade complète** : `Application (delete) → Conversation (cascade) → Message (cascade) → MessageReaction (cascade)`
- `Conversation` créée automatiquement quand `Application.status` passe à `ACCEPTED`
- Un seul `Conversation` par `Application` (contrainte UNIQUE sur `applicationId`)
- Index composé sur `(conversationId, createdAt)` pour pagination curseur
- `content` et `fileUrl` ne peuvent pas être tous les deux null (validation service)

### Résolution des FK

- `Conversation.founderId` = `application.project.founderId` (déjà un `User.id`)
- `Conversation.candidateId` = `application.candidate.userId` (résolu depuis `CandidateProfile.userId` → `User.id`, car `Application.candidateId` pointe vers `CandidateProfile.id`, pas `User.id`)

### Création de conversation — Point d'intégration

La conversation est créée **dans `ApplicationsService.updateStatus()`**, de manière transactionnelle avec le changement de statut :

```typescript
await this.prisma.$transaction(async (tx) => {
  // 1. Update application status → ACCEPTED
  const application = await tx.application.update({ ... });
  // 2. Résoudre le candidateId (User.id) depuis CandidateProfile
  const candidate = await tx.candidateProfile.findUnique({
    where: { id: application.candidateId },
    select: { userId: true },
  });
  // 3. Créer la conversation
  await tx.conversation.create({
    data: {
      applicationId: application.id,
      founderId: application.project.founderId,
      candidateId: candidate.userId,
    },
  });
});
```

Pas d'event bus — création inline dans la transaction pour garantir l'atomicité.

---

## 4. Backend

### Structure des fichiers

```
api/src/messaging/
├── messaging.module.ts          — Module NestJS
├── messaging.gateway.ts         — @WebSocketGateway (Socket.io)
├── messaging.service.ts         — Logique métier (Prisma + Redis)
├── messaging.controller.ts      — Endpoints REST (historique, upload)
├── dto/
│   ├── send-message.dto.ts      — Validation du message
│   └── get-messages.dto.ts      — Pagination curseur
└── messaging.guard.ts           — Auth Firebase pour WebSocket
```

### Events Socket.io

**Client → Serveur :**

| Event | Payload | Action |
|-------|---------|--------|
| `message:send` | `{ conversationId, content?, fileUrl? }` | Persiste DB → emit participants |
| `message:delivered` | `{ messageId }` | Update DELIVERED + deliveredAt |
| `message:read` | `{ conversationId }` | Update tous non-lus → READ + readAt |
| `typing:start` | `{ conversationId }` | Redis SET TTL 3s → emit destinataire |
| `typing:stop` | `{ conversationId }` | Redis DEL → emit destinataire |
| `reaction:add` | `{ messageId, emoji }` | Prisma INSERT → emit participants |
| `reaction:remove` | `{ messageId, emoji }` | Prisma DELETE → emit participants |

**Serveur → Client :**

| Event | Payload | Quand |
|-------|---------|-------|
| `message:new` | `{ message complet }` | Nouveau message reçu |
| `message:status` | `{ messageId, status, timestamp }` | ✓ → ✓✓ → ✓✓ bleu |
| `typing:indicator` | `{ conversationId, userId, isTyping }` | Typing start/stop |
| `reaction:update` | `{ messageId, reactions[] }` | Réaction ajoutée/retirée |
| `user:online` | `{ userId, isOnline, lastSeen }` | Présence |

### Auth WebSocket

```
Client connecte avec auth: { token: firebaseIdToken }
→ Middleware Socket.io vérifie le token via Firebase Admin SDK
→ Si invalide → disconnect
→ Si valide → socket.data.user = { uid, userId }
→ Auto-join room "user:{userId}"
→ Auto-join rooms "conversation:{id}" pour chaque conversation active
→ Re-vérification du token toutes les 50 minutes (tokens Firebase expirent après 1h)
→ Token expiré → disconnect avec reason "auth_expired"
```

### Redis — 3 usages

| Usage | Clé Redis | TTL | Type |
|-------|-----------|-----|------|
| Streams adapter | Géré par `@socket.io/redis-streams-adapter` | auto | Stream |
| Typing indicator | `typing:{conversationId}:{userId}` | 3s | String |
| Presence | `presence:{userId}` | 60s (refresh 30s) | String |

### Endpoints REST

| Méthode | Route | Usage |
|---------|-------|-------|
| `GET /messages/:conversationId` | Historique paginé (curseur, default 20, max 100) | Scroll back |
| `GET /messages/conversations` | Liste conversations + dernier message | Page /messages |
| `GET /messages/conversations/unread-count` | Compteur total non-lus | Badge menu |
| `POST /messages/upload` | Upload fichier PDF/DOCX → retourne fileUrl | Avant envoi message |

### Select clauses REST (conformité CLAUDE.md A01)

**`GET /messages/conversations`** — retourne par conversation :
```typescript
select: {
  id: true, lastMessageAt: true, lastMessagePreview: true,
  founder: { select: { id: true, displayName: true, avatarUrl: true } },
  candidate: { select: { id: true, displayName: true, avatarUrl: true } },
  messages: false, // jamais inclus ici
}
```
Tri : `orderBy: { lastMessageAt: 'desc' }` — grâce au champ dénormalisé, pas de sous-requête.

**`GET /messages/:conversationId`** — retourne par message :
```typescript
select: {
  id: true, content: true, fileUrl: true, fileName: true, fileSize: true,
  fileMimeType: true, status: true, deliveredAt: true, readAt: true, createdAt: true,
  senderId: true,
  reactions: { select: { id: true, emoji: true, userId: true } },
}
```
Jamais exposé : `email`, `phone`, `firebaseUid` des participants.

---

## 5. Frontend

### Structure des fichiers

```
web/src/app/(dashboard)/messages/
├── page.tsx                     — Page principale /messages

web/src/components/messaging/
├── conversation-list.tsx        — Liste des conversations (colonne 2)
├── conversation-item.tsx        — Une ligne de conversation
├── chat-view.tsx                — Zone de chat (colonne 3)
├── message-bubble.tsx           — Bulle de message
├── message-input.tsx            — Barre de saisie (texte + emoji + upload)
├── typing-indicator.tsx         — "Alice écrit..."
├── emoji-picker.tsx             — Picker emoji (@emoji-mart/react)
├── emoji-reactions.tsx          — Réactions sous un message
├── file-preview.tsx             — Preview fichier (icône PDF/DOCX + nom + taille)
├── message-status.tsx           — ✓ / ✓✓ / ✓✓ bleu
└── online-badge.tsx             — Pastille verte "en ligne"

web/src/hooks/
└── use-socket.ts                — Hook React centralisé Socket.io
```

### Layout

**Desktop (3 colonnes) :**

| Colonne | Largeur | Contenu |
|---------|---------|---------|
| 1 — Sidebar gauche existante | 280px | Menu navigation |
| 2 — Liste conversations | 300px | Recherche + conversations triées |
| 3 — Zone de chat | Reste | Header contact + messages + input |

Pas de sidebar droite sur `/messages` — tout l'espace pour le chat.

**Mobile :**
- Vue 1 : Liste des conversations (plein écran)
- Tap → Vue 2 : Chat plein écran avec ← retour

### États vides

- Aucune conversation → illustration + "Vos conversations apparaîtront ici quand un fondateur acceptera votre candidature"
- Conversation sélectionnée vide → "Envoyez le premier message à [Prénom] !"

### Comportements

- **Scroll infini inversé** : messages récents en bas, scroll up pour historique (pagination curseur)
- **Son** : fichier `/public/sounds/message.mp3` joué quand `message:new` reçu et onglet pas focus ou pas sur la conversation concernée
- **Badge menu** : compteur non-lu dans sidebar-left mis à jour en temps réel via Socket.io
- **Emoji picker** : `@emoji-mart/react`, ouverture au clic bouton 😀
- **Réactions** : hover/long-press → barre rapide (👍 ❤️ 😂 😮 😢) + bouton "+" picker complet

### Contexte Socket.io (`SocketProvider`)

La connexion Socket.io vit dans un **React Context/Provider** au niveau du `(dashboard)/layout.tsx`, pas dans un hook par page. Ainsi la connexion survit aux navigations entre pages (`/messages` → `/feed` → `/messages`).

```
app/(dashboard)/layout.tsx
  └─ SocketProvider        ← connexion Socket.io persistante
      └─ DashboardShell
          └─ children
```

**Hook `useSocket()`** : consomme le contexte, expose les méthodes `emit()`, `on()`, `off()`, `connected`, `recovered`.

- Connexion au mount du provider avec Firebase token dans `auth`
- Auto-reconnexion + Connection State Recovery
- `onIdTokenChanged()` → event `auth:refresh` pour re-auth proactive
- Cleanup au unmount du provider (logout ou fermeture app)

---

## 6. Sécurité — Règles CLAUDE.md

### M01 — Contrôle d'accès messagerie

- Un utilisateur ne peut accéder qu'aux conversations où il est `founderId` ou `candidateId`
- Toute requête (REST ou WebSocket) vérifie l'appartenance AVANT toute action
- Le gateway auto-join UNIQUEMENT les rooms des conversations de l'utilisateur
- Impossible d'envoyer dans une conversation à laquelle on n'appartient pas
- Création de conversation AUTOMATIQUE (acceptance candidature) — jamais manuelle

### M02 — Validation des messages

- `content` : max 5000 caractères, sanitisé (pas de HTML/script)
- `fileUrl` : doit pointer vers le bucket MinIO autorisé (allowlist de domaines)
- `fileMimeType` : uniquement `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
- `fileSize` : max 5 MB (5_242_880 octets), vérifié côté serveur
- **Note** : CLAUDE.md A08 doit être mis à jour pour ajouter le MIME DOCX à la liste des types autorisés pour les uploads messagerie
- Un message DOIT avoir soit `content`, soit `fileUrl` (pas les deux null)
- Réactions : max 6 emojis distincts par message, 1 réaction par utilisateur par emoji. Au-delà de 6 emojis distincts → event `error` avec message "Maximum de réactions atteint"

### M03 — Rate limiting WebSocket

- `message:send` : max 30 / 60 secondes par utilisateur
- `typing:start` : max 10 / 10 secondes par utilisateur
- `reaction:add` : max 20 / 60 secondes par utilisateur
- Dépassement → event `error` au client + log serveur
- **Implémentation** : Compteurs Redis `INCR` + `EXPIRE` par clé `ratelimit:{userId}:{eventType}`. Vérifié dans le gateway avant traitement de chaque event. `@nestjs/throttler` ne s'applique pas aux WebSocket gateways — solution Redis custom nécessaire.

### M04 — Auth WebSocket

- Token Firebase validé à la connexion ET toutes les 50 minutes (les tokens Firebase expirent après 1h ; 50min laisse une marge de sécurité)
- Le client utilise `onIdTokenChanged()` pour rafraîchir le token proactivement et émettre un event `auth:refresh` avec le nouveau token
- Token expiré → disconnect forcé avec reason "auth_expired"
- Jamais de userId dans le payload client — toujours depuis `socket.data.user`
- **Guard WebSocket** : `WsAuthGuard` implémente `CanActivate`, rejette via `WsException`. Appliqué au niveau `@WebSocketGateway` (global) ou par `@SubscribeMessage` handler via `@UseGuards(WsAuthGuard)`

### Intégrité des données

- Status avance uniquement : `SENT → DELIVERED → READ` (jamais reculer)
- `deliveredAt` et `readAt` immutables une fois définis
- Seul le destinataire peut marquer DELIVERED ou READ
- Information de lecture non exposée à des tiers

---

## 7. Notifications push + son

### Intégration FCM

- Nouveau type : `MESSAGE_RECEIVED` ajouté à l'enum `NotificationType`
- Destinataire **offline** (pas de socket connecté) → push FCM
- Destinataire **online mais onglet pas focus** → son + notification browser

### Payload FCM

```json
{
  "title": "Alice Dupont",
  "body": "Salut, j'ai regardé ton projet...",
  "data": {
    "type": "MESSAGE_RECEIVED",
    "conversationId": "uuid",
    "senderId": "uuid"
  }
}
```

Pour un fichier : `body: "📎 brief.pdf"`

### Pas de double notification

- Socket connecté et event `message:new` reçu → pas de push FCM
- Push FCM uniquement si aucun socket actif (vérifié via Redis presence)

---

## 8. Connection State Recovery + Offline

### Déconnexion courte (< 2 min)

1. Utilisateur perd le réseau
2. Redis Streams conserve les events
3. Reconnexion automatique Socket.io
4. Connection State Recovery → Redis rejoue les events manqués
5. Aucun appel API nécessaire

### Déconnexion longue (> 2 min)

1. Redis Streams a expiré les events
2. Reconnexion → `socket.recovered === false`
3. Client fetch `GET /messages/:conversationId?since=lastMessageId`
4. Messages manqués chargés depuis PostgreSQL

### Config

```typescript
connectionStateRecovery: {
  maxDisconnectionDuration: 2 * 60 * 1000,  // 2 minutes
  skipMiddlewares: false,  // toujours re-vérifier l'auth
}
```

### Offline queue

- Message envoyé pendant micro-déconnexion → bufferisé par Socket.io (packet buffering natif)
- Apparaît dans l'UI avec status ✓ → se confirme quand le socket reprend
