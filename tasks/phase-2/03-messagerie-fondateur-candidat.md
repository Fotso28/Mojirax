# 03 — Messagerie Fondateur ↔ Candidat

## Résumé

Permettre aux fondateurs et candidats de communiquer via un système de messagerie interne, activé après acceptation d'une candidature.

## Contexte

**Ce qui existe :**
- Système de candidatures complet (postuler, accepter, rejeter)
- Notifications in-app
- Aucune table de messagerie en base
- Aucun module de messagerie

**Règle métier :** La messagerie n'est disponible qu'entre un fondateur et un candidat dont la candidature a été **acceptée**. Pas de messagerie entre inconnus.

## Spécification

### A. Migration Prisma — Nouvelles tables

```prisma
model Conversation {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Lien avec l'application acceptée
  applicationId String @unique @map("application_id")
  application   Application @relation(fields: [applicationId], references: [id])

  messages Message[]
  participants ConversationParticipant[]

  @@map("conversations")
}

model ConversationParticipant {
  id             String       @id @default(cuid())
  conversationId String       @map("conversation_id")
  userId         String       @map("user_id")
  lastReadAt     DateTime?    @map("last_read_at")

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id])

  @@unique([conversationId, userId])
  @@map("conversation_participants")
}

model Message {
  id             String       @id @default(cuid())
  conversationId String       @map("conversation_id")
  senderId       String       @map("sender_id")
  content        String       @db.Text
  createdAt      DateTime     @default(now()) @map("created_at")

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender       User         @relation(fields: [senderId], references: [id])

  @@index([conversationId, createdAt])
  @@map("messages")
}
```

### B. `MessagingModule` — Backend

**Endpoints :**

| Endpoint | Description | Guard |
|----------|-------------|-------|
| `GET /messages/conversations` | Mes conversations | FirebaseAuthGuard |
| `GET /messages/conversations/:id` | Messages d'une conversation (paginé) | FirebaseAuthGuard + participant |
| `POST /messages/conversations/:id` | Envoyer un message | FirebaseAuthGuard + participant |
| `PATCH /messages/conversations/:id/read` | Marquer comme lu | FirebaseAuthGuard + participant |
| `GET /messages/unread-count` | Nombre total de messages non lus | FirebaseAuthGuard |

### C. Création automatique de conversation

Quand un fondateur **accepte** une candidature (`PATCH /applications/:id/status` → `ACCEPTED`) :
1. Créer une `Conversation` liée à l'`Application`
2. Ajouter les 2 participants (founderId + candidateUserId)
3. Créer un message système : "La candidature a été acceptée. Vous pouvez maintenant discuter."
4. Notifier les 2 utilisateurs

### D. Sécurité

- Un utilisateur ne peut accéder qu'à ses propres conversations
- Vérifier `ConversationParticipant.userId === req.user.id`
- Modération IA optionnelle sur le contenu des messages (Phase 4)
- Rate limit : max 30 messages/minute par utilisateur
- Taille max message : 2000 caractères

### E. Frontend

**Pages :**

| Page | Route | Description |
|------|-------|-------------|
| Liste conversations | `/messages` | Inbox avec aperçu dernier message |
| Conversation | `/messages/[id]` | Chat avec scroll infini |

**Composants :**
- `conversation-list.tsx` — liste des conversations avec badge non-lu
- `chat-view.tsx` — fil de messages avec input en bas
- `message-bubble.tsx` — bulle de message (gauche/droite selon sender)

**Navigation :** Ajouter icône "Messages" dans le header avec badge non-lu.

## Fichiers à créer

| Fichier | Action |
|---------|--------|
| `api/prisma/schema.prisma` | Ajouter models `Conversation`, `ConversationParticipant`, `Message` |
| `api/src/messaging/messaging.module.ts` | **Créer** |
| `api/src/messaging/messaging.service.ts` | **Créer** |
| `api/src/messaging/messaging.controller.ts` | **Créer** |
| `api/src/messaging/dto/send-message.dto.ts` | **Créer** |
| `api/src/app.module.ts` | Enregistrer `MessagingModule` |
| `api/src/applications/applications.service.ts` | Créer conversation après acceptation |
| `web/src/app/(dashboard)/messages/page.tsx` | **Créer** |
| `web/src/app/(dashboard)/messages/[id]/page.tsx` | **Créer** |
| `web/src/components/messaging/conversation-list.tsx` | **Créer** |
| `web/src/components/messaging/chat-view.tsx` | **Créer** |
| `web/src/components/messaging/message-bubble.tsx` | **Créer** |

## Tests et validation

- [ ] Accepter une candidature crée automatiquement une conversation
- [ ] `GET /messages/conversations` retourne les conversations de l'utilisateur
- [ ] `POST /messages/conversations/:id` envoie un message
- [ ] Un non-participant reçoit 403
- [ ] Les messages sont paginés (20 par page, scroll infini)
- [ ] Le compteur non-lu est correct
- [ ] L'UI de chat fonctionne (envoi, scroll, badges)

### Condition de validation finale

> Après acceptation d'une candidature, une conversation est créée automatiquement. Les deux parties peuvent échanger des messages. Chaque utilisateur ne voit que ses propres conversations. Les messages non lus sont comptés et affichés dans le header.
