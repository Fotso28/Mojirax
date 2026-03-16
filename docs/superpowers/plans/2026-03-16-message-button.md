# Bouton "Message" & Conversations Directes — Plan d'implémentation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à tout utilisateur connecté d'envoyer un message à un autre utilisateur via un bouton "Message" sur les cards du feed, la page projet et la page profil.

**Architecture:** Nouveau endpoint REST `POST /messages/conversations` (find-or-create avec normalisation d'IDs). Le modèle `Conversation` est modifié pour rendre `applicationId` optionnel et ajouter une contrainte unique `[founderId, candidateId]`. La liste des conversations est filtrée par `lastMessageAt IS NOT NULL` sauf override via query param `active`.

**Tech Stack:** Prisma migration, NestJS controller/service/DTO, Next.js composants React, Lucide icons, class-validator

**Spec:** `docs/superpowers/specs/2026-03-16-message-button-design.md`

---

## Chunk 1: Backend — Schema & Endpoint

### Task 1: Migration Prisma — applicationId optionnel + contrainte unique

**Files:**
- Modify: `api/prisma/schema.prisma:861-876`
- Create: migration file via `prisma migrate dev`

- [ ] **Step 1: Modifier le modèle Conversation dans schema.prisma**

Remplacer les lignes 863-864 :

```prisma
applicationId      String?     @unique @map("application_id")
application        Application? @relation(fields: [applicationId], references: [id], onDelete: Cascade)
```

Et ajouter avant `@@map("conversations")` (ligne 875) :

```prisma
@@unique([founderId, candidateId])
```

- [ ] **Step 2: Générer et appliquer la migration**

```bash
cd api && npx prisma migrate dev --name direct_conversations
```

Expected: Migration créée et appliquée avec succès.

- [ ] **Step 3: Vérifier que le client Prisma est régénéré**

```bash
cd api && npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations/
git commit -m "feat(schema): make applicationId optional and add unique constraint on conversation pair"
```

---

### Task 2: DTO — CreateConversationDto + GetConversationsQueryDto

**Files:**
- Create: `api/src/messaging/dto/create-conversation.dto.ts`
- Create: `api/src/messaging/dto/get-conversations-query.dto.ts`

- [ ] **Step 1: Créer CreateConversationDto**

```typescript
// api/src/messaging/dto/create-conversation.dto.ts
import { IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  targetUserId: string;
}
```

Note : ce DTO est volontairement minimaliste. `forbidNonWhitelisted: true` dans le ValidationPipe global rejettera tout champ supplémentaire.

- [ ] **Step 2: Créer GetConversationsQueryDto**

```typescript
// api/src/messaging/dto/get-conversations-query.dto.ts
import { IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetConversationsQueryDto {
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsUUID()
  active?: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add api/src/messaging/dto/create-conversation.dto.ts api/src/messaging/dto/get-conversations-query.dto.ts
git commit -m "feat(messaging): add DTOs for conversation creation and query"
```

---

### Task 3: Service — findOrCreateConversation()

**Files:**
- Modify: `api/src/messaging/messaging.service.ts`

- [ ] **Step 1: Ajouter la méthode findOrCreateConversation()**

Ajouter après la méthode `verifyMembership()` (après ligne 30) :

```typescript
/** Find or create a direct conversation between two users */
async findOrCreateConversation(userId: string, targetUserId: string) {
  if (userId === targetUserId) {
    throw new BadRequestException('Vous ne pouvez pas vous envoyer un message');
  }

  // Verify both users exist and are ACTIVE
  const [user, target] = await Promise.all([
    this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true } }),
    this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, status: true } }),
  ]);

  if (!target) throw new NotFoundException('Utilisateur introuvable');
  if (user.status !== 'ACTIVE' || target.status !== 'ACTIVE') {
    throw new ForbiddenException('Action non autorisée');
  }

  // Normalize pair: smaller ID = founderId, larger = candidateId
  const [founderId, candidateId] = userId < targetUserId
    ? [userId, targetUserId]
    : [targetUserId, userId];

  const select = {
    id: true,
    founderId: true,
    candidateId: true,
    lastMessageAt: true,
    lastMessagePreview: true,
    founder: { select: { id: true, firstName: true, lastName: true, image: true } },
    candidate: { select: { id: true, firstName: true, lastName: true, image: true } },
  };

  // Find existing
  const existing = await this.prisma.conversation.findUnique({
    where: { founderId_candidateId: { founderId, candidateId } },
    select,
  });
  if (existing) return existing;

  // Create new — handle race condition (P2002) with catch-and-retry
  try {
    const conversation = await this.prisma.conversation.create({
      data: { founderId, candidateId },
      select,
    });
    this.logger.log('Conversation created', { conversationId: conversation.id, founderId, candidateId });
    return conversation;
  } catch (error) {
    // Concurrent creation — conversation already exists, fetch it
    if (error?.code === 'P2002') {
      return this.prisma.conversation.findUnique({
        where: { founderId_candidateId: { founderId, candidateId } },
        select,
      });
    }
    throw error;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/messaging/messaging.service.ts
git commit -m "feat(messaging): add findOrCreateConversation service method"
```

---

### Task 4: Service — Modifier getConversations() pour filtrer

**Files:**
- Modify: `api/src/messaging/messaging.service.ts:151-183`

- [ ] **Step 1: Modifier la signature et la logique de getConversations()**

Remplacer la méthode `getConversations()` (lignes 151-183) par :

```typescript
/** List user conversations (paginated, max 100, default 20) */
async getConversations(userId: string, cursor?: string, limit?: number, activeConversationId?: string) {
  const take = Math.min(limit || 20, 100);

  // If active param provided, verify membership
  if (activeConversationId) {
    await this.verifyMembership(activeConversationId, userId);
  }

  let cursorOption = {};
  if (cursor) {
    const exists = await this.prisma.conversation.findUnique({
      where: { id: cursor },
      select: { id: true },
    });
    if (exists) {
      cursorOption = { cursor: { id: cursor }, skip: 1 };
    }
  }

  const conversations = await this.prisma.conversation.findMany({
    where: {
      AND: [
        { OR: [{ founderId: userId }, { candidateId: userId }] },
        {
          OR: [
            { lastMessageAt: { not: null } },
            ...(activeConversationId ? [{ id: activeConversationId }] : []),
          ],
        },
      ],
    },
    select: {
      id: true, lastMessageAt: true, lastMessagePreview: true,
      founderId: true, candidateId: true,
      founder: { select: { id: true, firstName: true, lastName: true, image: true } },
      candidate: { select: { id: true, firstName: true, lastName: true, image: true } },
    },
    orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    take: take + 1,
    ...cursorOption,
  });

  const hasMore = conversations.length > take;
  const items = hasMore ? conversations.slice(0, take) : conversations;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { items, nextCursor, hasMore };
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/messaging/messaging.service.ts
git commit -m "feat(messaging): filter conversations to show only those with messages"
```

---

### Task 5: Controller — Ajouter endpoint et modifier getConversations

**Files:**
- Modify: `api/src/messaging/messaging.controller.ts:34-38`

- [ ] **Step 1: Ajouter les imports manquants**

Ajouter `Body` et `Post` à l'import `@nestjs/common` existant (s'ils ne sont pas déjà présents). Puis ajouter les nouveaux imports :

```typescript
// Ajouter Body, Post à l'import @nestjs/common existant
import { Controller, Get, Post, Req, Query, Body, Param, ... } from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { GetConversationsQueryDto } from './dto/get-conversations-query.dto';
import { Throttle } from '@nestjs/throttler';
```

- [ ] **Step 2: Ajouter l'endpoint POST /messages/conversations**

Ajouter **avant** le `GET conversations` existant (avant ligne 34) :

```typescript
@Post('conversations')
@Throttle({ default: { limit: 10, ttl: 3600000 } })
async createConversation(@Req() req: any, @Body() dto: CreateConversationDto) {
  const userId = await this.messagingService.resolveUserId(req.user.uid);
  return this.messagingService.findOrCreateConversation(userId, dto.targetUserId);
}
```

- [ ] **Step 3: Modifier le GET conversations existant pour utiliser le nouveau DTO**

Remplacer les lignes 34-38 par :

```typescript
@Get('conversations')
async getConversations(@Req() req: any, @Query() dto: GetConversationsQueryDto) {
  const userId = await this.messagingService.resolveUserId(req.user.uid);
  return this.messagingService.getConversations(userId, dto.cursor, dto.limit, dto.active);
}
```

- [ ] **Step 4: Vérifier la compilation**

```bash
cd api && npx tsc --noEmit
```

Expected: Pas d'erreurs TypeScript.

- [ ] **Step 5: Commit**

```bash
git add api/src/messaging/messaging.controller.ts
git commit -m "feat(messaging): add POST /conversations endpoint and filter query param"
```

---

## Chunk 2: Frontend — Bouton Message & Intégration

### Task 6: Hook utilitaire — useStartConversation

**Files:**
- Create: `web/src/hooks/use-start-conversation.ts`

- [ ] **Step 1: Créer le hook**

```typescript
// web/src/hooks/use-start-conversation.ts
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useToast } from '@/context/toast-context';

export function useStartConversation() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const startConversation = async (targetUserId: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await AXIOS_INSTANCE.post('/messages/conversations', { targetUserId });
      router.push(`/messages?conv=${data.id}`);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Impossible de démarrer la conversation';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return { startConversation, loading };
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/hooks/use-start-conversation.ts
git commit -m "feat(web): add useStartConversation hook"
```

---

### Task 7: Bouton Message sur ProjectCard (feed)

**Files:**
- Modify: `web/src/components/feed/project-card.tsx:218-234`

- [ ] **Step 1: Ajouter les imports**

Ajouter en haut du fichier :

```typescript
import { MessageCircle } from 'lucide-react';
import { useStartConversation } from '@/hooks/use-start-conversation';
```

- [ ] **Step 2: Ajouter useAuth et initialiser les hooks**

Ajouter l'import de `useAuth` s'il n'est pas déjà présent :

```typescript
import { useAuth } from '@/context/auth-context';
```

Ajouter dans le corps du composant ProjectCard, après les autres hooks :

```typescript
const { dbUser } = useAuth();
const { startConversation, loading: messageLoading } = useStartConversation();
```

- [ ] **Step 3: Ajouter le bouton Message dans le footer**

Dans le footer actions (lignes 218-234), ajouter le bouton Message **entre** le bouton "Voir projet" et le bouton "Sauver". Le bouton ne s'affiche que si l'utilisateur est connecté et n'est pas le fondateur :

```tsx
{dbUser && dbUser.id !== project.founder?.id && (
  <button
    onClick={(e) => { e.stopPropagation(); startConversation(project.founder.id); }}
    disabled={messageLoading}
    className="flex items-center gap-2 px-4 h-11 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200 flex-shrink-0 disabled:opacity-50"
  >
    <MessageCircle className="w-4 h-4" />
    <span className="hidden sm:inline">Message</span>
  </button>
)}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/feed/project-card.tsx
git commit -m "feat(feed): add Message button on project cards"
```

---

### Task 8: Bouton Message sur ProjectDeck (détail projet)

**Files:**
- Modify: `web/src/components/project-deck/project-deck.tsx:388-439`

- [ ] **Step 1: Ajouter les imports**

```typescript
import { MessageCircle } from 'lucide-react';
import { useStartConversation } from '@/hooks/use-start-conversation';
```

- [ ] **Step 2: Initialiser le hook**

Ajouter dans le composant ProjectDeck après les autres hooks :

```typescript
const { startConversation, loading: messageLoading } = useStartConversation();
```

- [ ] **Step 3: Ajouter le bouton Message dans le footer CTA**

Dans le footer CTA (lignes 388-439), ajouter le bouton Message à côté de "Postuler", visible uniquement pour les non-propriétaires. Insérer dans le bloc `else` (quand l'utilisateur n'est pas le fondateur), avant ou après le bouton Postuler :

```tsx
{dbUser && dbUser.id !== project.founderId && (
  <button
    onClick={() => startConversation(project.founderId)}
    disabled={messageLoading}
    className="flex items-center gap-2 px-5 h-[44px] rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
  >
    <MessageCircle className="w-4 h-4" />
    Message
  </button>
)}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/project-deck/project-deck.tsx
git commit -m "feat(project-detail): add Message button on project deck"
```

---

### Task 9: Bouton Message sur la page profil fondateur

**Files:**
- Modify: `web/src/app/(dashboard)/founders/[id]/page.tsx`

- [ ] **Step 1: Ajouter les imports**

```typescript
import { MessageCircle } from 'lucide-react';
import { useStartConversation } from '@/hooks/use-start-conversation';
```

- [ ] **Step 2: Initialiser le hook**

Ajouter dans le composant après les autres hooks :

```typescript
const { startConversation, loading: messageLoading } = useStartConversation();
```

- [ ] **Step 3: Ajouter le bouton dans le hero section**

Ajouter l'import `useAuth` et extraire `dbUser`. Ajouter le bouton après le nom et le badge rôle, visible uniquement si l'utilisateur est connecté et n'est pas le propriétaire du profil :

```tsx
{dbUser && dbUser.id !== user.id && (
  <button
    onClick={() => startConversation(user.id)}
    disabled={messageLoading}
    className="flex items-center gap-2 px-5 h-[44px] rounded-xl text-sm font-semibold bg-kezak-primary text-white hover:bg-kezak-primary/90 transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-50"
  >
    <MessageCircle className="w-4 h-4" />
    Envoyer un message
  </button>
)}
```

Note : sur le profil le bouton est bleu primaire (plus proéminent que sur les cards) car c'est l'action principale de contact.

- [ ] **Step 4: Commit**

```bash
git add "web/src/app/(dashboard)/founders/[id]/page.tsx"
git commit -m "feat(profile): add Message button on founder profile page"
```

---

### Task 10: Page messages — Lire query param et activer conversation

**Files:**
- Modify: `web/src/app/(dashboard)/messages/page.tsx:33-43`

- [ ] **Step 1: Ajouter l'import useSearchParams**

```typescript
import { useSearchParams } from 'next/navigation';
```

- [ ] **Step 2: Lire le query param et le passer au fetch**

Modifier le composant pour lire `conv` et l'utiliser :

```typescript
const searchParams = useSearchParams();
const convParam = searchParams.get('conv');
```

- [ ] **Step 3: Modifier fetchConversations pour passer le param active**

Remplacer le fetch (lignes 33-43) :

```typescript
const fetchConversations = useCallback(async () => {
  try {
    setError(false);
    const params = new URLSearchParams();
    if (convParam) params.set('active', convParam);
    const { data } = await AXIOS_INSTANCE.get(`/messages/conversations?${params.toString()}`);
    setConversations(data?.items ?? data ?? []);
  } catch {
    setError(true);
  } finally {
    setLoading(false);
  }
}, [convParam]);
```

- [ ] **Step 4: Auto-sélectionner la conversation du query param**

Ajouter un `useEffect` après le fetch pour sélectionner automatiquement la conversation :

```typescript
useEffect(() => {
  if (convParam && conversations.length > 0 && !activeConvId) {
    const target = conversations.find(c => c.id === convParam);
    if (target) {
      setActiveConvId(target.id);
      setShowChat(true);
    }
  }
}, [convParam, conversations, activeConvId]);
```

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(dashboard)/messages/page.tsx"
git commit -m "feat(messages): support conv query param for direct conversation opening"
```

---

### Task 11: Test end-to-end manuel & commit final

- [ ] **Step 1: Vérifier la compilation complète**

```bash
cd api && npx tsc --noEmit && cd ../web && npx next build --no-lint
```

- [ ] **Step 2: Tester manuellement le flux**

1. Ouvrir le feed → voir le bouton "Message" sur une card d'un autre fondateur
2. Cliquer → redirigé vers `/messages?conv=<id>`
3. La conversation vide apparaît dans la liste, sélectionnée
4. Écrire un message → la conversation a un `lastMessageAt`, visible normalement
5. Revenir sur `/messages` sans le param → la conversation avec message est visible
6. Vérifier qu'une conversation vide (sans message) n'apparaît PAS dans la liste
7. Vérifier le bouton sur la page projet (ProjectDeck)
8. Vérifier le bouton sur la page profil fondateur
9. Vérifier que le bouton n'apparaît PAS sur son propre profil/projet

- [ ] **Step 3: Commit final si ajustements**

Stage uniquement les fichiers modifiés dans ce plan, puis commit :

```bash
git add api/src/messaging/ web/src/hooks/ web/src/components/feed/ web/src/components/project-deck/ "web/src/app/(dashboard)/founders/" "web/src/app/(dashboard)/messages/"
git commit -m "feat(messaging): complete Message button and direct conversations feature"
```
