# Messagerie temps réel — Plan d'implémentation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter une messagerie 1-à-1 temps réel (PostgreSQL + Redis Streams + Socket.io v4) entre fondateurs et candidats acceptés, avec triple check (✓✓✓), réactions emoji, upload PDF/DOCX, et push FCM + son.

**Architecture:** Gateway Socket.io NestJS avec Redis Streams adapter pour Connection State Recovery. Messages persistés en PostgreSQL via Prisma. Frontend React avec SocketProvider au niveau dashboard layout.

**Tech Stack:** NestJS 11, Socket.io v4, `@socket.io/redis-streams-adapter`, Redis, Prisma, `@emoji-mart/react`, Firebase Auth + FCM

**Spec:** `docs/superpowers/specs/2026-03-12-messaging-design.md`

---

## Chunk 1 : Base de données et backend core

### Task 1 : Schéma Prisma — Modèles Conversation, Message, MessageReaction

**Files:**
- Modify: `api/prisma/schema.prisma`

- [ ] **Step 1: Ajouter l'enum MessageStatus après NotificationType (ligne ~525)**

```prisma
enum MessageStatus {
  SENT
  DELIVERED
  READ
}
```

- [ ] **Step 2: Ajouter MESSAGE_RECEIVED à l'enum NotificationType (ligne ~514)**

```prisma
enum NotificationType {
  SYSTEM
  APPLICATION_RECEIVED
  APPLICATION_ACCEPTED
  APPLICATION_REJECTED
  MODERATION_ALERT
  DOCUMENT_ANALYZED
  DOCUMENT_ANALYSIS_FAILED
  PROFILE_PUBLISHED
  PROFILE_REVIEW
  PROFILE_UNLOCKED
  MESSAGE_RECEIVED
}
```

- [ ] **Step 3: Ajouter le modèle Conversation (avec @@map pour respecter les conventions du schéma)**

```prisma
model Conversation {
  id                 String    @id @default(uuid())
  applicationId      String    @unique @map("application_id")
  application        Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  founderId          String    @map("founder_id")
  founder            User      @relation("FounderConversations", fields: [founderId], references: [id])
  candidateId        String    @map("candidate_id")
  candidate          User      @relation("CandidateConversations", fields: [candidateId], references: [id])
  lastMessageAt      DateTime? @map("last_message_at")
  lastMessagePreview String?   @map("last_message_preview")
  messages           Message[]
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  @@map("conversations")
}
```

- [ ] **Step 4: Ajouter le modèle Message**

```prisma
model Message {
  id             String        @id @default(uuid())
  conversationId String        @map("conversation_id")
  conversation   Conversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String        @map("sender_id")
  sender         User          @relation("SentMessages", fields: [senderId], references: [id])
  content        String?
  fileUrl        String?       @map("file_url")
  fileName       String?       @map("file_name")
  fileSize       Int?          @map("file_size")
  fileMimeType   String?       @map("file_mime_type")
  status         MessageStatus @default(SENT)
  deliveredAt    DateTime?     @map("delivered_at")
  readAt         DateTime?     @map("read_at")
  reactions      MessageReaction[]
  createdAt      DateTime      @default(now()) @map("created_at")

  @@index([conversationId, createdAt])
  @@map("messages")
}
```

- [ ] **Step 5: Ajouter le modèle MessageReaction**

```prisma
model MessageReaction {
  id        String   @id @default(uuid())
  messageId String   @map("message_id")
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  userId    String   @map("user_id")
  user      User     @relation("MessageReactions", fields: [userId], references: [id])
  emoji     String
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([messageId, userId, emoji])
  @@map("message_reactions")
}
```

- [ ] **Step 6: Ajouter les relations inverses sur User (dans le modèle User existant)**

```prisma
  founderConversations   Conversation[]   @relation("FounderConversations")
  candidateConversations Conversation[]   @relation("CandidateConversations")
  sentMessages           Message[]        @relation("SentMessages")
  messageReactions       MessageReaction[] @relation("MessageReactions")
```

- [ ] **Step 7: Ajouter la relation inverse sur Application (dans le modèle Application existant)**

```prisma
  conversation Conversation?
```

- [ ] **Step 8: Générer et appliquer la migration**

Run: `cd api && npx prisma migrate dev --name add_messaging_models`
Expected: Migration créée et appliquée, `prisma generate` auto-exécuté.

- [ ] **Step 9: Commit**

```bash
git add api/prisma/
git commit -m "feat(messaging): add Conversation, Message, MessageReaction models with cascade chain"
```

---

### Task 2 : Installer les dépendances backend (Socket.io + Redis)

**Files:**
- Modify: `api/package.json`

- [ ] **Step 1: Installer les packages**

Run:
```bash
cd api && npm install @nestjs/websockets @nestjs/platform-socket.io socket.io @socket.io/redis-streams-adapter ioredis
```

- [ ] **Step 2: Installer les types**

Run:
```bash
cd api && npm install -D @types/ioredis
```

- [ ] **Step 3: Commit**

```bash
git add api/package.json api/package-lock.json
git commit -m "feat(messaging): install socket.io, redis streams adapter, ioredis"
```

---

### Task 3 : Module Redis partagé

**Files:**
- Create: `api/src/redis/redis.module.ts`
- Create: `api/src/redis/redis.constants.ts`

- [ ] **Step 1: Créer le fichier de constantes**

```typescript
// api/src/redis/redis.constants.ts
export const REDIS_CLIENT = 'REDIS_CLIENT';
```

- [ ] **Step 2: Créer le module Redis global**

```typescript
// api/src/redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        return new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD', undefined),
          maxRetriesPerRequest: null,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
```

- [ ] **Step 3: Enregistrer RedisModule dans AppModule**

Modify `api/src/app.module.ts` — ajouter dans le tableau `imports`:
```typescript
import { RedisModule } from './redis/redis.module';
// dans imports: [...]
RedisModule,
```

- [ ] **Step 4: Ajouter REDIS_HOST et REDIS_PORT dans .env**

Ajouter dans `.env` (fichier existant, ne pas committer) :
```
REDIS_HOST=localhost
REDIS_PORT=6379
```

- [ ] **Step 5: Commit**

```bash
git add api/src/redis/ api/src/app.module.ts
git commit -m "feat(messaging): add global Redis module with ioredis"
```

---

### Task 4 : MessagingModule — Service core (CRUD messages)

**Files:**
- Create: `api/src/messaging/messaging.module.ts`
- Create: `api/src/messaging/messaging.service.ts`
- Create: `api/src/messaging/dto/send-message.dto.ts`
- Create: `api/src/messaging/dto/get-messages.dto.ts`

- [ ] **Step 1: Créer les DTOs**

```typescript
// api/src/messaging/dto/send-message.dto.ts
import { IsString, IsOptional, IsUUID, MaxLength, IsUrl, IsInt, Max, IsIn } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  conversationId: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsInt()
  @Max(5_242_880)
  fileSize?: number;

  @IsOptional()
  @IsIn(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
  fileMimeType?: string;
}
```

```typescript
// api/src/messaging/dto/get-messages.dto.ts
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMessagesDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
```

- [ ] **Step 2: Créer le service messaging**

```typescript
// api/src/messaging/messaging.service.ts
import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Résout firebaseUid → userId */
  async resolveUserId(firebaseUid: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user.id;
  }

  /** Vérifie que l'utilisateur appartient à la conversation */
  async verifyMembership(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { founderId: true, candidateId: true },
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable');
    if (conversation.founderId !== userId && conversation.candidateId !== userId) {
      throw new ForbiddenException('Accès refusé à cette conversation');
    }
  }

  /** Récupère l'ID du destinataire dans une conversation */
  async getRecipientId(conversationId: string, senderId: string): Promise<string> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { founderId: true, candidateId: true },
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable');
    return conversation.founderId === senderId ? conversation.candidateId : conversation.founderId;
  }

  /** Envoie un message et met à jour la conversation */
  async sendMessage(senderId: string, dto: {
    conversationId: string;
    content?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileMimeType?: string;
  }) {
    if (!dto.content && !dto.fileUrl) {
      throw new BadRequestException('Le message doit contenir du texte ou un fichier');
    }

    await this.verifyMembership(dto.conversationId, senderId);

    const preview = dto.content
      ? dto.content.substring(0, 100)
      : `📎 ${dto.fileName || 'Fichier'}`;

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: dto.conversationId,
          senderId,
          content: dto.content,
          fileUrl: dto.fileUrl,
          fileName: dto.fileName,
          fileSize: dto.fileSize,
          fileMimeType: dto.fileMimeType,
          status: 'SENT',
        },
        select: {
          id: true, conversationId: true, senderId: true,
          content: true, fileUrl: true, fileName: true,
          fileSize: true, fileMimeType: true, status: true,
          createdAt: true,
        },
      }),
      this.prisma.conversation.update({
        where: { id: dto.conversationId },
        data: { lastMessageAt: new Date(), lastMessagePreview: preview },
      }),
    ]);

    this.logger.log(`Message sent in conversation ${dto.conversationId}`);
    return message;
  }

  /** Historique paginé par curseur */
  async getMessages(conversationId: string, userId: string, cursor?: string, limit?: number) {
    await this.verifyMembership(conversationId, userId);

    const take = Math.min(limit || 20, 100);
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      select: {
        id: true, content: true, fileUrl: true, fileName: true,
        fileSize: true, fileMimeType: true, status: true,
        deliveredAt: true, readAt: true, createdAt: true,
        senderId: true,
        reactions: { select: { id: true, emoji: true, userId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > take;
    const items = hasMore ? messages.slice(0, take) : messages;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
  }

  /** Liste des conversations de l'utilisateur (paginé, max 100, default 20) */
  async getConversations(userId: string, cursor?: string, limit?: number) {
    const take = Math.min(limit || 20, 100);
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ founderId: userId }, { candidateId: userId }] },
      select: {
        id: true, lastMessageAt: true, lastMessagePreview: true,
        founderId: true, candidateId: true,
        founder: { select: { id: true, firstName: true, lastName: true, image: true } },
        candidate: { select: { id: true, firstName: true, lastName: true, image: true } },
      },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = conversations.length > take;
    const items = hasMore ? conversations.slice(0, take) : conversations;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
  }

  /** Compteur de messages non-lus */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        conversation: { OR: [{ founderId: userId }, { candidateId: userId }] },
        senderId: { not: userId },
        status: { not: 'READ' },
      },
    });
  }

  /** Marquer comme DELIVERED */
  async markDelivered(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, status: true, conversationId: true },
    });
    if (!message) throw new NotFoundException();
    if (message.senderId === userId) return; // L'envoyeur ne peut pas marquer delivered
    if (message.status !== 'SENT') return; // Déjà delivered ou lu

    await this.verifyMembership(message.conversationId, userId);

    return this.prisma.message.update({
      where: { id: messageId },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
      select: { id: true, status: true, deliveredAt: true },
    });
  }

  /** Marquer tous les non-lus d'une conversation comme READ */
  async markRead(conversationId: string, userId: string) {
    await this.verifyMembership(conversationId, userId);

    const now = new Date();
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: { status: 'READ', readAt: now },
    });

    return { conversationId, readAt: now };
  }

  /** Ajouter une réaction */
  async addReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true, reactions: { select: { emoji: true }, distinct: ['emoji'] } },
    });
    if (!message) throw new NotFoundException();
    await this.verifyMembership(message.conversationId, userId);

    const distinctEmojis = new Set(message.reactions.map((r) => r.emoji));
    if (!distinctEmojis.has(emoji) && distinctEmojis.size >= 6) {
      throw new BadRequestException('Maximum de réactions atteint (6 emojis distincts)');
    }

    await this.prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });

    return this.getReactions(messageId);
  }

  /** Retirer une réaction */
  async removeReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });
    if (!message) throw new NotFoundException();
    await this.verifyMembership(message.conversationId, userId);

    await this.prisma.messageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });

    return this.getReactions(messageId);
  }

  /** Récupérer les réactions d'un message */
  private async getReactions(messageId: string) {
    return this.prisma.messageReaction.findMany({
      where: { messageId },
      select: { id: true, emoji: true, userId: true },
    });
  }

  /** IDs des conversations d'un utilisateur (pour join rooms) */
  async getUserConversationIds(userId: string): Promise<string[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ founderId: userId }, { candidateId: userId }] },
      select: { id: true },
    });
    return conversations.map((c) => c.id);
  }
}
```

- [ ] **Step 3: Créer le module**

```typescript
// api/src/messaging/messaging.module.ts
import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';

@Module({
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
```

- [ ] **Step 4: Enregistrer MessagingModule dans AppModule**

Modify `api/src/app.module.ts` — ajouter dans `imports`:
```typescript
import { MessagingModule } from './messaging/messaging.module';
// dans imports: [...]
MessagingModule,
```

- [ ] **Step 5: Commit**

```bash
git add api/src/messaging/ api/src/app.module.ts
git commit -m "feat(messaging): add MessagingService with CRUD, pagination, reactions, read receipts"
```

---

### Task 5 : Création automatique de conversation à l'acceptation

**Files:**
- Modify: `api/src/applications/applications.service.ts` (méthode `updateStatus`, ~ligne 289)
- Modify: `api/src/applications/applications.module.ts` (importer MessagingModule si nécessaire)

- [ ] **Step 1: Modifier updateStatus pour créer la conversation dans une transaction Prisma**

Dans `api/src/applications/applications.service.ts`, remplacer le `updateMany` pour ACCEPTED par une transaction atomique :

```typescript
// Remplacer le bloc if (status === 'ACCEPTED') par une transaction :
if (status === 'ACCEPTED') {
  await this.prisma.$transaction(async (tx) => {
    // 1. Update application status → ACCEPTED (atomique avec guard)
    await tx.application.updateMany({
      where: { id: applicationId, status: 'PENDING' },
      data: { status: 'ACCEPTED' },
    });

    // 2. Résoudre le candidateId (User.id) depuis CandidateProfile
    const candidateProfile = await tx.candidateProfile.findUnique({
      where: { id: application.candidateId },
      select: { userId: true },
    });

    // 3. Créer la conversation (atomique — rollback si échec)
    if (candidateProfile) {
      await tx.conversation.create({
        data: {
          applicationId: application.id,
          founderId: project.founderId,
          candidateId: candidateProfile.userId,
        },
      });
    }
  });
  this.logger.log(`Application ${applicationId} accepted, conversation created`);
}
```

Note: Vérifier que la variable `project` inclut `founderId` dans sa select clause. Ajouter `project: { select: { founderId: true } }` au findUnique initial si absent. Le try/catch autour de la transaction gère le cas d'unicité (conversation déjà existante).

- [ ] **Step 2: Commit**

```bash
git add api/src/applications/
git commit -m "feat(messaging): auto-create conversation on application acceptance"
```

---

### Task 6 : Controller REST messaging

**Files:**
- Create: `api/src/messaging/messaging.controller.ts`
- Modify: `api/src/messaging/messaging.module.ts` (ajouter le controller)

- [ ] **Step 1: Créer le controller**

```typescript
// api/src/messaging/messaging.controller.ts
import {
  Controller, Get, Post, Param, Query, Req, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException, Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { MessagingService } from './messaging.service';
import { GetMessagesDto } from './dto/get-messages.dto';
import { UploadService } from '../upload/upload.service';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('messages')
export class MessagingController {
  private readonly logger = new Logger(MessagingController.name);

  constructor(
    private readonly messagingService: MessagingService,
    private readonly uploadService: UploadService,
  ) {}

  /** Résout firebaseUid → userId via le service */
  private async resolveUserId(firebaseUid: string): Promise<string> {
    return this.messagingService.resolveUserId(firebaseUid);
  }

  @Get('conversations')
  async getConversations(@Req() req: any) {
    const userId = await this.resolveUserId(req.user.uid);
    return this.messagingService.getConversations(userId);
  }

  @Get('conversations/unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = await this.resolveUserId(req.user.uid);
    const count = await this.messagingService.getUnreadCount(userId);
    return { count };
  }

  @Get(':conversationId')
  async getMessages(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Query() dto: GetMessagesDto,
  ) {
    const userId = await this.resolveUserId(req.user.uid);
    return this.messagingService.getMessages(conversationId, userId, dto.cursor, dto.limit);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');

    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non autorisé (PDF ou DOCX uniquement)');
    }
    if (file.size > 5_242_880) {
      throw new BadRequestException('Fichier trop volumineux (5 MB max)');
    }

    const userId = await this.resolveUserId(req.user.uid);
    const url = await this.uploadService.uploadFile(
      'messages',
      `${userId}/${Date.now()}-${file.originalname}`,
      file.buffer,
      file.mimetype,
    );

    return { fileUrl: url, fileName: file.originalname, fileSize: file.size, fileMimeType: file.mimetype };
  }
}
```

- [ ] **Step 2: Mettre à jour le module pour inclure controller et dépendances**

```typescript
// api/src/messaging/messaging.module.ts
import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { UploadModule } from '../upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [UploadModule, NotificationsModule],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
```

- [ ] **Step 3: Ajouter la méthode `uploadFile` au UploadService si elle n'existe pas**

Le service actuel ne gère que les images. Ajouter dans `api/src/upload/upload.service.ts` :

```typescript
async uploadFile(folder: string, key: string, buffer: Buffer, contentType: string): Promise<string> {
  const fullKey = `${folder}/${key}`;
  await this.s3.send(
    new PutObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return `${this.endpoint}/${this.bucket}/${fullKey}`;
}
```

- [ ] **Step 4: Commit**

```bash
git add api/src/messaging/ api/src/upload/
git commit -m "feat(messaging): add REST controller with conversations list, history, file upload"
```

---

## Chunk 2 : Gateway Socket.io et temps réel

### Task 7 : WebSocket Auth Guard

**Files:**
- Create: `api/src/messaging/ws-auth.guard.ts`

- [ ] **Step 1: Créer le guard WebSocket Firebase**

```typescript
// api/src/messaging/ws-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const user = client.data?.user;

    if (!user?.uid || !user?.userId) {
      throw new WsException('Non authentifié');
    }

    return true;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/messaging/ws-auth.guard.ts
git commit -m "feat(messaging): add WsAuthGuard for WebSocket Firebase auth"
```

---

### Task 8 : WebSocket Rate Limiter (Redis)

**Files:**
- Create: `api/src/messaging/ws-rate-limiter.ts`

- [ ] **Step 1: Créer le rate limiter basé sur Redis**

```typescript
// api/src/messaging/ws-rate-limiter.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const LIMITS: Record<string, RateLimitConfig> = {
  'message:send': { maxRequests: 30, windowSeconds: 60 },
  'typing:start': { maxRequests: 10, windowSeconds: 10 },
  'typing:stop': { maxRequests: 10, windowSeconds: 10 },
  'reaction:add': { maxRequests: 20, windowSeconds: 60 },
  'reaction:remove': { maxRequests: 20, windowSeconds: 60 },
};

@Injectable()
export class WsRateLimiter {
  private readonly logger = new Logger(WsRateLimiter.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async check(userId: string, event: string): Promise<boolean> {
    const config = LIMITS[event];
    if (!config) return true;

    const key = `ratelimit:${userId}:${event}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, config.windowSeconds);
    }

    if (current > config.maxRequests) {
      this.logger.warn(`Rate limit exceeded: user=${userId} event=${event} count=${current}`);
      return false;
    }

    return true;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/messaging/ws-rate-limiter.ts
git commit -m "feat(messaging): add Redis-based WebSocket rate limiter"
```

---

### Task 9 : Gateway Socket.io avec Redis Streams

**Files:**
- Create: `api/src/messaging/messaging.gateway.ts`
- Modify: `api/src/messaging/messaging.module.ts`

- [ ] **Step 1: Créer le gateway**

```typescript
// api/src/messaging/messaging.gateway.ts
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards, Logger, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as admin from 'firebase-admin';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { MessagingService } from './messaging.service';
import { PushService } from '../notifications/push.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WsAuthGuard } from './ws-auth.guard';
import { WsRateLimiter } from './ws-rate-limiter';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  namespace: '/messaging',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly messagingService: MessagingService,
    private readonly pushService: PushService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
    private readonly rateLimiter: WsRateLimiter,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /** Auth middleware — vérifie le token Firebase à la connexion */
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        client.disconnect(true);
        return;
      }

      const decoded = await admin.auth().verifyIdToken(token);
      const user = await this.prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
        select: { id: true },
      });

      if (!user) {
        client.disconnect(true);
        return;
      }

      // Stocker les données user sur le socket
      client.data.user = { uid: decoded.uid, userId: user.id };

      // Marquer en ligne dans Redis (TTL 60s, refresh toutes les 30s)
      await this.redis.set(`presence:${user.id}`, 'online', 'EX', 60);

      // Rejoindre les rooms personnelle + conversations
      client.join(`user:${user.id}`);
      const conversationIds = await this.messagingService.getUserConversationIds(user.id);
      for (const id of conversationIds) {
        client.join(`conversation:${id}`);
      }

      // Timer re-vérification token toutes les 50 min (lit le token depuis handshake.auth, pas la closure)
      const reAuthInterval = setInterval(async () => {
        try {
          const currentToken = client.handshake.auth?.token;
          if (!currentToken) throw new Error('No token');
          await admin.auth().verifyIdToken(currentToken);
        } catch {
          client.emit('error', { message: 'auth_expired' });
          client.disconnect(true);
          clearInterval(reAuthInterval);
        }
      }, 50 * 60 * 1000);
      client.data.reAuthInterval = reAuthInterval;

      // Timer presence refresh toutes les 30s
      const presenceInterval = setInterval(async () => {
        await this.redis.set(`presence:${user.id}`, 'online', 'EX', 60);
      }, 30_000);
      client.data.presenceInterval = presenceInterval;

      this.logger.log(`Client connected: ${user.id}`);
    } catch (error) {
      this.logger.warn(`Connection rejected: ${error.message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.user?.userId;
    if (userId) {
      await this.redis.del(`presence:${userId}`);
      // Broadcast lastSeen aux contacts
      const conversationIds = await this.messagingService.getUserConversationIds(userId);
      for (const id of conversationIds) {
        client.to(`conversation:${id}`).emit('user:online', {
          userId, isOnline: false, lastSeen: new Date(),
        });
      }
    }
    clearInterval(client.data?.reAuthInterval);
    clearInterval(client.data?.presenceInterval);
    this.logger.log(`Client disconnected: ${userId || 'unknown'}`);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content?: string; fileUrl?: string; fileName?: string; fileSize?: number; fileMimeType?: string },
  ) {
    const userId = client.data.user.userId;
    if (!(await this.rateLimiter.check(userId, 'message:send'))) {
      client.emit('error', { message: 'Trop de messages envoyés, réessayez dans quelques secondes' });
      return;
    }

    let message;
    try {
      message = await this.messagingService.sendMessage(userId, data);
    } catch (error) {
      client.emit('error', { message: error.message || 'Erreur envoi message' });
      return;
    }

    // Émettre aux participants de la conversation
    this.server.to(`conversation:${data.conversationId}`).emit('message:new', message);

    // Vérifier si le destinataire est en ligne
    const recipientId = await this.messagingService.getRecipientId(data.conversationId, userId);
    const recipientOnline = await this.redis.get(`presence:${recipientId}`);

    if (!recipientOnline) {
      // Destinataire offline → push FCM
      const sender = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const title = `${sender?.firstName || ''} ${sender?.lastName || ''}`.trim();
      const body = data.content?.substring(0, 100) || `📎 ${data.fileName || 'Fichier'}`;

      this.notificationsService.notify(
        recipientId, 'MESSAGE_RECEIVED' as any, title, body,
        { conversationId: data.conversationId, senderId: userId },
      ).catch((err) => this.logger.error(`Push failed: ${err.message}`));
    }

    return message;
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('message:delivered')
  async handleDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    const userId = client.data.user.userId;
    const result = await this.messagingService.markDelivered(data.messageId, userId);
    if (result) {
      // Notifier l'envoyeur du changement de status
      const message = await this.prisma.message.findUnique({
        where: { id: data.messageId },
        select: { senderId: true },
      });
      if (message) {
        this.server.to(`user:${message.senderId}`).emit('message:status', {
          messageId: data.messageId, status: 'DELIVERED', timestamp: result.deliveredAt,
        });
      }
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('message:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.user.userId;
    const result = await this.messagingService.markRead(data.conversationId, userId);

    // Récupérer les messages qui viennent d'être marqués lus pour notifier l'envoyeur
    const messages = await this.prisma.message.findMany({
      where: { conversationId: data.conversationId, readAt: result.readAt },
      select: { id: true, senderId: true },
    });

    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    for (const senderId of senderIds) {
      const messageIds = messages.filter((m) => m.senderId === senderId).map((m) => m.id);
      this.server.to(`user:${senderId}`).emit('message:status', {
        messageIds, status: 'READ', timestamp: result.readAt,
      });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.user.userId;
    if (!(await this.rateLimiter.check(userId, 'typing:start'))) return;

    await this.redis.set(`typing:${data.conversationId}:${userId}`, '1', 'EX', 3);
    client.to(`conversation:${data.conversationId}`).emit('typing:indicator', {
      conversationId: data.conversationId, userId, isTyping: true,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.user.userId;
    await this.redis.del(`typing:${data.conversationId}:${userId}`);
    client.to(`conversation:${data.conversationId}`).emit('typing:indicator', {
      conversationId: data.conversationId, userId, isTyping: false,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('reaction:add')
  async handleReactionAdd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    const userId = client.data.user.userId;
    if (!(await this.rateLimiter.check(userId, 'reaction:add'))) {
      client.emit('error', { message: 'Trop de réactions, réessayez dans quelques secondes' });
      return;
    }

    const reactions = await this.messagingService.addReaction(data.messageId, userId, data.emoji);
    const message = await this.prisma.message.findUnique({
      where: { id: data.messageId },
      select: { conversationId: true },
    });
    if (message) {
      this.server.to(`conversation:${message.conversationId}`).emit('reaction:update', {
        messageId: data.messageId, reactions,
      });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('reaction:remove')
  async handleReactionRemove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    const userId = client.data.user.userId;
    if (!(await this.rateLimiter.check(userId, 'reaction:remove'))) return;

    const reactions = await this.messagingService.removeReaction(data.messageId, userId, data.emoji);
    const message = await this.prisma.message.findUnique({
      where: { id: data.messageId },
      select: { conversationId: true },
    });
    if (message) {
      this.server.to(`conversation:${message.conversationId}`).emit('reaction:update', {
        messageId: data.messageId, reactions,
      });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('auth:refresh')
  async handleAuthRefresh(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { token: string },
  ) {
    try {
      const decoded = await admin.auth().verifyIdToken(data.token);
      client.handshake.auth.token = data.token;
      this.logger.log(`Token refreshed for user ${decoded.uid}`);
    } catch {
      client.emit('error', { message: 'auth_expired' });
      client.disconnect(true);
    }
  }
}
```

- [ ] **Step 2: Mettre à jour le module avec le gateway et les providers**

```typescript
// api/src/messaging/messaging.module.ts
import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { MessagingGateway } from './messaging.gateway';
import { WsAuthGuard } from './ws-auth.guard';
import { WsRateLimiter } from './ws-rate-limiter';
import { UploadModule } from '../upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [UploadModule, NotificationsModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway, WsAuthGuard, WsRateLimiter],
  exports: [MessagingService],
})
export class MessagingModule {}
```

- [ ] **Step 3: Créer un custom IoAdapter pour Redis Streams + Connection State Recovery**

Créer `api/src/messaging/redis-io.adapter.ts` :

```typescript
// api/src/messaging/redis-io.adapter.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-streams-adapter';
import Redis from 'ioredis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;

  async connectToRedis(): Promise<void> {
    const redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });

    this.adapterConstructor = createAdapter(redisClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,  // 2 minutes
        skipMiddlewares: false,
      },
    });

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
```

- [ ] **Step 4: Utiliser le RedisIoAdapter dans main.ts**

Modifier `api/src/main.ts` — dans la fonction `bootstrap()`, après la création de l'app :

```typescript
import { RedisIoAdapter } from './messaging/redis-io.adapter';

// Après const app = await NestFactory.create(AppModule) :
const redisIoAdapter = new RedisIoAdapter(app);
await redisIoAdapter.connectToRedis();
app.useWebSocketAdapter(redisIoAdapter);
```

- [ ] **Step 4: Commit**

```bash
git add api/src/messaging/ api/src/main.ts
git commit -m "feat(messaging): add Socket.io gateway with Redis Streams, auth, rate limiting, typing, reactions"
```

---

## Chunk 3 : Frontend — Dépendances, provider, hook

### Task 10 : Installer les dépendances frontend

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Installer les packages**

Run:
```bash
cd web && npm install socket.io-client @emoji-mart/react @emoji-mart/data
```

- [ ] **Step 2: Commit**

```bash
git add web/package.json web/package-lock.json
git commit -m "feat(messaging): install socket.io-client and emoji-mart"
```

---

### Task 11 : SocketProvider — Contexte React global

**Files:**
- Create: `web/src/context/socket-context.tsx`
- Modify: `web/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Créer le SocketProvider**

```typescript
// web/src/context/socket-context.tsx
'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged } from 'firebase/auth';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  recovered: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  recovered: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        // Déconnecter si logout
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
          setConnected(false);
        }
        return;
      }

      const token = await user.getIdToken();

      // Si déjà connecté, juste rafraîchir le token
      if (socketRef.current?.connected) {
        socketRef.current.emit('auth:refresh', { token });
        return;
      }

      // Nouvelle connexion
      const socket = io(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/messaging`,
        {
          auth: { token },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000,
          reconnectionAttempts: Infinity,
        },
      );

      socket.on('connect', () => {
        setConnected(true);
        setRecovered(socket.recovered);
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('error', (err: { message: string }) => {
        if (err.message === 'auth_expired') {
          socket.disconnect();
        }
      });

      socketRef.current = socket;
      setSocketInstance(socket); // Trigger re-render pour les consumers du context
    });

    return () => {
      unsubscribe();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketInstance(null);
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketInstance, connected, recovered }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
```

- [ ] **Step 2: Intégrer SocketProvider dans le layout dashboard**

Modifier `web/src/app/(dashboard)/layout.tsx` :

```typescript
'use client';

import { SidebarProvider } from '@/context/sidebar-context';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { SocketProvider } from '@/context/socket-context';

export default function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <SocketProvider>
      <SidebarProvider>
        <DashboardShell>
          {children}
          {modal}
        </DashboardShell>
      </SidebarProvider>
    </SocketProvider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/context/socket-context.tsx web/src/app/\(dashboard\)/layout.tsx
git commit -m "feat(messaging): add SocketProvider with Firebase token refresh and Connection State Recovery"
```

---

### Task 12 : Badge non-lu dans sidebar-left

**Files:**
- Modify: `web/src/components/layout/sidebar-left.tsx`

- [ ] **Step 1: Ajouter le compteur non-lu sur l'item Messages**

Importer `useSocket` et `useEffect/useState`. Ajouter un fetch initial du compteur via REST + écoute Socket.io `message:new` pour incrémenter en temps réel.

Le badge est un petit cercle rouge avec le nombre, affiché à droite du label "Messages" :

```tsx
// Dans le composant, après les imports existants :
import { useSocket } from '@/context/socket-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';

// Dans le composant :
const { socket } = useSocket();
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  AXIOS_INSTANCE.get('/messages/conversations/unread-count')
    .then((res) => setUnreadCount(res.data.count))
    .catch(() => {});
}, []);

useEffect(() => {
  if (!socket) return;
  const handler = () => setUnreadCount((c) => c + 1);
  socket.on('message:new', handler);
  return () => { socket.off('message:new', handler); };
}, [socket]);
```

Afficher le badge sur l'item Messages :
```tsx
{item.path === '/messages' && unreadCount > 0 && (
  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
    {unreadCount > 99 ? '99+' : unreadCount}
  </span>
)}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/layout/sidebar-left.tsx
git commit -m "feat(messaging): add unread badge to Messages nav item with real-time updates"
```

---

## Chunk 4 : Frontend — Page messages et composants chat

### Task 13 : Page /messages et composants de liste

**Files:**
- Create: `web/src/app/(dashboard)/messages/page.tsx`
- Create: `web/src/components/messaging/conversation-list.tsx`
- Create: `web/src/components/messaging/conversation-item.tsx`
- Create: `web/src/components/messaging/online-badge.tsx`

- [ ] **Step 1: Créer le composant OnlineBadge**

```tsx
// web/src/components/messaging/online-badge.tsx
'use client';

export function OnlineBadge({ isOnline }: { isOnline: boolean }) {
  if (!isOnline) return null;
  return (
    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
  );
}
```

- [ ] **Step 2: Créer ConversationItem**

```tsx
// web/src/components/messaging/conversation-item.tsx
'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { OnlineBadge } from './online-badge';

interface ConversationItemProps {
  conversation: {
    id: string;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    founder: { id: string; firstName: string; lastName: string; image: string | null };
    candidate: { id: string; firstName: string; lastName: string; image: string | null };
    founderId: string;
    candidateId: string;
  };
  currentUserId: string;
  isActive: boolean;
  isOnline: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, currentUserId, isActive, isOnline, onClick }: ConversationItemProps) {
  const other = conversation.founderId === currentUserId ? conversation.candidate : conversation.founder;
  const name = `${other.firstName || ''} ${other.lastName || ''}`.trim() || 'Utilisateur';
  const timeAgo = conversation.lastMessageAt
    ? formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false, locale: fr })
    : '';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
        isActive ? 'bg-kezak-primary/10' : 'hover:bg-gray-50'
      }`}
    >
      <div className="relative flex-shrink-0">
        {other.image ? (
          <img src={other.image} alt={name} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-kezak-light flex items-center justify-center text-kezak-primary font-semibold">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <OnlineBadge isOnline={isOnline} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 truncate">{name}</span>
          {timeAgo && <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo}</span>}
        </div>
        {conversation.lastMessagePreview && (
          <p className="text-sm text-gray-500 truncate">{conversation.lastMessagePreview}</p>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 3: Créer ConversationList**

```tsx
// web/src/components/messaging/conversation-list.tsx
'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { ConversationItem } from './conversation-item';

interface ConversationListProps {
  conversations: any[];
  currentUserId: string;
  activeId: string | null;
  onlineUsers: Set<string>;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, currentUserId, activeId, onlineUsers, onSelect }: ConversationListProps) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const other = c.founderId === currentUserId ? c.candidate : c.founder;
    const name = `${other.firstName} ${other.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full border-r border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une conversation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 mt-8">Aucune conversation</p>
        ) : (
          filtered.map((c) => {
            const otherId = c.founderId === currentUserId ? c.candidateId : c.founderId;
            return (
              <ConversationItem
                key={c.id}
                conversation={c}
                currentUserId={currentUserId}
                isActive={c.id === activeId}
                isOnline={onlineUsers.has(otherId)}
                onClick={() => onSelect(c.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Créer la page /messages**

```tsx
// web/src/app/(dashboard)/messages/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useAuth } from '@/context/auth-context';
import { useSocket } from '@/context/socket-context';
import { ConversationList } from '@/components/messaging/conversation-list';
import { ChatView } from '@/components/messaging/chat-view';

export default function MessagesPage() {
  const { dbUser } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Charger les conversations
  useEffect(() => {
    AXIOS_INSTANCE.get('/messages/conversations')
      .then((res) => setConversations(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Écouter les événements Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: any) => {
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === message.conversationId
              ? { ...c, lastMessageAt: message.createdAt, lastMessagePreview: message.content?.substring(0, 100) || `📎 ${message.fileName || 'Fichier'}` }
              : c,
          )
          .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()),
      );
    };

    const handleOnline = (data: { userId: string; isOnline: boolean }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        data.isOnline ? next.add(data.userId) : next.delete(data.userId);
        return next;
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('user:online', handleOnline);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('user:online', handleOnline);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-kezak-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Colonne 2: Liste conversations */}
      <div className={`w-[300px] flex-shrink-0 ${activeConversationId ? 'hidden md:flex md:flex-col' : 'flex flex-col w-full md:w-[300px]'}`}>
        <ConversationList
          conversations={conversations}
          currentUserId={dbUser?.id || ''}
          activeId={activeConversationId}
          onlineUsers={onlineUsers}
          onSelect={setActiveConversationId}
        />
      </div>

      {/* Colonne 3: Zone de chat */}
      <div className={`flex-1 ${!activeConversationId ? 'hidden md:flex' : 'flex'} flex-col`}>
        {activeConversationId ? (
          <ChatView
            conversationId={activeConversationId}
            currentUserId={dbUser?.id || ''}
            conversations={conversations}
            onBack={() => setActiveConversationId(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="h-16 w-16 mb-4 stroke-1" />
            <p className="text-lg font-medium">Sélectionnez une conversation</p>
            <p className="text-sm mt-1">
              Vos conversations apparaîtront ici quand un fondateur acceptera votre candidature
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add web/src/app/\(dashboard\)/messages/ web/src/components/messaging/
git commit -m "feat(messaging): add messages page with conversation list and responsive layout"
```

---

### Task 14 : Composants de chat — ChatView, MessageBubble, MessageStatus, FilePreview

**Files:**
- Create: `web/src/components/messaging/chat-view.tsx`
- Create: `web/src/components/messaging/message-bubble.tsx`
- Create: `web/src/components/messaging/message-status.tsx`
- Create: `web/src/components/messaging/file-preview.tsx`
- Create: `web/src/components/messaging/typing-indicator.tsx`

- [ ] **Step 1: Créer MessageStatus**

```tsx
// web/src/components/messaging/message-status.tsx
'use client';

import { Check, CheckCheck } from 'lucide-react';

export function MessageStatus({ status }: { status: 'SENT' | 'DELIVERED' | 'READ' }) {
  if (status === 'SENT') return <Check className="h-4 w-4 text-gray-400" />;
  if (status === 'DELIVERED') return <CheckCheck className="h-4 w-4 text-gray-400" />;
  return <CheckCheck className="h-4 w-4 text-kezak-primary" />;
}
```

- [ ] **Step 2: Créer FilePreview**

```tsx
// web/src/components/messaging/file-preview.tsx
'use client';

import { FileText, Download } from 'lucide-react';

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
}

export function FilePreview({ fileUrl, fileName, fileSize, fileMimeType }: FilePreviewProps) {
  const isPdf = fileMimeType === 'application/pdf';
  const sizeLabel = fileSize < 1024 * 1024
    ? `${Math.round(fileSize / 1024)} KB`
    : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isPdf ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
        <p className="text-xs text-gray-500">{isPdf ? 'PDF' : 'DOCX'} · {sizeLabel}</p>
      </div>
      <Download className="h-4 w-4 text-gray-400 flex-shrink-0" />
    </a>
  );
}
```

- [ ] **Step 3: Créer TypingIndicator**

```tsx
// web/src/components/messaging/typing-indicator.tsx
'use client';

export function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
      </div>
      <span>{name} écrit...</span>
    </div>
  );
}
```

- [ ] **Step 4: Créer MessageBubble**

```tsx
// web/src/components/messaging/message-bubble.tsx
'use client';

import { format } from 'date-fns';
import { MessageStatus } from './message-status';
import { FilePreview } from './file-preview';
import { EmojiReactions } from './emoji-reactions';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string | null;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    fileMimeType: string | null;
    status: 'SENT' | 'DELIVERED' | 'READ';
    createdAt: string;
    senderId: string;
    reactions: { id: string; emoji: string; userId: string }[];
  };
  isMine: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReact: (messageId: string, emoji: string) => void;
  currentUserId: string;
}

export function MessageBubble({ message, isMine, onReact, onRemoveReact, currentUserId }: MessageBubbleProps) {
  const time = format(new Date(message.createdAt), 'HH:mm');

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2 group`}>
      <div className={`max-w-[70%] ${isMine ? 'order-1' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-2 ${
            isMine
              ? 'bg-kezak-primary text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}
        >
          {message.content && <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>}
          {message.fileUrl && message.fileName && message.fileSize && message.fileMimeType && (
            <div className={message.content ? 'mt-2' : ''}>
              <FilePreview
                fileUrl={message.fileUrl}
                fileName={message.fileName}
                fileSize={message.fileSize}
                fileMimeType={message.fileMimeType}
              />
            </div>
          )}
          <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
            <span className="text-xs">{time}</span>
            {isMine && <MessageStatus status={message.status} />}
          </div>
        </div>
        {message.reactions.length > 0 && (
          <EmojiReactions
            reactions={message.reactions}
            messageId={message.id}
            currentUserId={currentUserId}
            onReact={onReact}
            onRemoveReact={onRemoveReact}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Créer ChatView**

```tsx
// web/src/components/messaging/chat-view.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Paperclip, Smile, Send } from 'lucide-react';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useSocket } from '@/context/socket-context';
import { MessageBubble } from './message-bubble';
import { TypingIndicator } from './typing-indicator';
import { EmojiPicker } from './emoji-picker';
import { OnlineBadge } from './online-badge';

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
  conversations: any[];
  onBack: () => void;
}

export function ChatView({ conversationId, currentUserId, conversations, onBack }: ChatViewProps) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const conversation = conversations.find((c) => c.id === conversationId);
  const other = conversation
    ? conversation.founderId === currentUserId ? conversation.candidate : conversation.founder
    : null;
  const otherName = other ? `${other.firstName || ''} ${other.lastName || ''}`.trim() : '';

  // Charger les messages
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setCursor(null);
    AXIOS_INSTANCE.get(`/messages/${conversationId}`)
      .then((res) => {
        setMessages(res.data.items.reverse());
        setHasMore(res.data.hasMore);
        setCursor(res.data.nextCursor);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversationId]);

  // Scroll to bottom uniquement pour les nouveaux messages (pas le load more)
  const prevLengthRef = useRef(0);
  useEffect(() => {
    // Ne scroll que si des messages ont été ajoutés à la FIN (nouveau message), pas au début (load more)
    if (messages.length > prevLengthRef.current && prevLengthRef.current > 0) {
      const lastMsg = messages[messages.length - 1];
      const prevLastMsg = messages[prevLengthRef.current - 1];
      if (lastMsg?.id !== prevLastMsg?.id) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (prevLengthRef.current === 0 && messages.length > 0) {
      // Premier chargement → scroll en bas
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
    prevLengthRef.current = messages.length;
  }, [messages]);

  // Marquer comme lu uniquement à l'ouverture de la conversation
  useEffect(() => {
    if (socket && conversationId) {
      socket.emit('message:read', { conversationId });
    }
  }, [socket, conversationId]);

  // Écouter les events Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: any) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => [...prev, message]);
        // Marquer comme delivered si c'est pas le mien
        if (message.senderId !== currentUserId) {
          socket.emit('message:delivered', { messageId: message.id });
          socket.emit('message:read', { conversationId });
        }
      }
    };

    const handleStatus = (data: any) => {
      const ids = data.messageIds || [data.messageId];
      setMessages((prev) =>
        prev.map((m) => ids.includes(m.id) ? { ...m, status: data.status } : m),
      );
    };

    const handleTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setTypingUser(data.isTyping ? data.userId : null);
      }
    };

    const handleReaction = (data: { messageId: string; reactions: any[] }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === data.messageId ? { ...m, reactions: data.reactions } : m),
      );
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:status', handleStatus);
    socket.on('typing:indicator', handleTyping);
    socket.on('reaction:update', handleReaction);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:status', handleStatus);
      socket.off('typing:indicator', handleTyping);
      socket.off('reaction:update', handleReaction);
    };
  }, [socket, conversationId, currentUserId]);

  // Envoyer un message
  const sendMessage = useCallback(() => {
    if (!socket || !input.trim()) return;
    socket.emit('message:send', { conversationId, content: input.trim() });
    setInput('');
    setShowEmojiPicker(false);
    handleTypingStop();
  }, [socket, input, conversationId]);

  // Typing indicators
  const handleTypingStart = useCallback(() => {
    if (!socket || isTyping) return;
    setIsTyping(true);
    socket.emit('typing:start', { conversationId });
  }, [socket, isTyping, conversationId]);

  const handleTypingStop = useCallback(() => {
    if (!socket) return;
    setIsTyping(false);
    socket.emit('typing:stop', { conversationId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [socket, conversationId]);

  const handleInputChange = (value: string) => {
    setInput(value);
    handleTypingStart();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(handleTypingStop, 3000);
  };

  // Upload fichier
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await AXIOS_INSTANCE.post('/messages/upload', formData);
      socket.emit('message:send', {
        conversationId,
        fileUrl: res.data.fileUrl,
        fileName: res.data.fileName,
        fileSize: res.data.fileSize,
        fileMimeType: res.data.fileMimeType,
      });
    } catch {
      // Erreur gérée par l'interceptor axios
    }
    e.target.value = '';
  };

  // Réactions
  const handleReact = (messageId: string, emoji: string) => {
    socket?.emit('reaction:add', { messageId, emoji });
  };
  const handleRemoveReact = (messageId: string, emoji: string) => {
    socket?.emit('reaction:remove', { messageId, emoji });
  };

  // Charger plus (scroll up)
  const loadMore = async () => {
    if (!cursor || !hasMore) return;
    const res = await AXIOS_INSTANCE.get(`/messages/${conversationId}?cursor=${cursor}`);
    setMessages((prev) => [...res.data.items.reverse(), ...prev]);
    setHasMore(res.data.hasMore);
    setCursor(res.data.nextCursor);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button onClick={onBack} className="md:hidden p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative">
          {other?.image ? (
            <img src={other.image} alt={otherName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-kezak-light flex items-center justify-center text-kezak-primary font-semibold">
              {otherName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900">{otherName}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {hasMore && (
          <button onClick={loadMore} className="w-full text-center text-sm text-kezak-primary mb-4 hover:underline">
            Charger les messages précédents
          </button>
        )}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-kezak-primary" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-400 mt-8">
            Envoyez le premier message à {otherName} !
          </p>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.senderId === currentUserId}
              onReact={handleReact}
              onRemoveReact={handleRemoveReact}
              currentUserId={currentUserId}
            />
          ))
        )}
        {typingUser && <TypingIndicator name={otherName} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100">
        {showEmojiPicker && (
          <div className="mb-2">
            <EmojiPicker onSelect={(emoji: string) => setInput((prev) => prev + emoji)} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Smile className="h-5 w-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileUpload} />
          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Votre message..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="p-2.5 bg-kezak-primary text-white rounded-xl hover:bg-kezak-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add web/src/components/messaging/
git commit -m "feat(messaging): add ChatView with bubbles, typing indicator, file preview, message status"
```

---

### Task 15 : Composants emoji — Picker + Réactions

**Files:**
- Create: `web/src/components/messaging/emoji-picker.tsx`
- Create: `web/src/components/messaging/emoji-reactions.tsx`

- [ ] **Step 1: Créer EmojiPicker**

```tsx
// web/src/components/messaging/emoji-picker.tsx
'use client';

import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';

const Picker = dynamic(() => import('@emoji-mart/react').then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="h-[350px] w-[350px] bg-gray-50 rounded-xl animate-pulse" />,
});

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  return (
    <Picker
      data={data}
      onEmojiSelect={(emoji: any) => onSelect(emoji.native)}
      theme="light"
      locale="fr"
      previewPosition="none"
      skinTonePosition="none"
      maxFrequentRows={2}
    />
  );
}
```

- [ ] **Step 2: Créer EmojiReactions**

```tsx
// web/src/components/messaging/emoji-reactions.tsx
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { EmojiPicker } from './emoji-picker';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];

interface EmojiReactionsProps {
  reactions: { id: string; emoji: string; userId: string }[];
  messageId: string;
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReact: (messageId: string, emoji: string) => void;
}

export function EmojiReactions({ reactions, messageId, currentUserId, onReact, onRemoveReact }: EmojiReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Grouper par emoji
  const grouped = reactions.reduce<Record<string, { count: number; userReacted: boolean }>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, userReacted: false };
    acc[r.emoji].count++;
    if (r.userId === currentUserId) acc[r.emoji].userReacted = true;
    return acc;
  }, {});

  const handleClick = (emoji: string, userReacted: boolean) => {
    if (userReacted) {
      onRemoveReact(messageId, emoji);
    } else {
      onReact(messageId, emoji);
    }
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, { count, userReacted }]) => (
        <button
          key={emoji}
          onClick={() => handleClick(emoji, userReacted)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
            userReacted
              ? 'border-kezak-primary/30 bg-kezak-primary/10 text-kezak-primary'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span>{emoji}</span>
          <span>{count}</span>
        </button>
      ))}
      {showPicker && (
        <div className="absolute z-10 mt-6">
          <EmojiPicker onSelect={(emoji) => { onReact(messageId, emoji); setShowPicker(false); }} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/messaging/emoji-picker.tsx web/src/components/messaging/emoji-reactions.tsx
git commit -m "feat(messaging): add emoji picker and reactions with quick reaction bar"
```

---

## Chunk 5 : Son, push notifications, mise à jour CLAUDE.md

### Task 16 : Son de notification

**Files:**
- Create: `web/public/sounds/message.mp3` (fichier audio court, à fournir)
- Modify: `web/src/context/socket-context.tsx`

- [ ] **Step 1: Ajouter la logique de son dans le SocketProvider**

Dans `web/src/context/socket-context.tsx`, après la connexion du socket, ajouter l'écoute pour le son :

```typescript
// Dans le useEffect après socket.on('connect', ...) :
// Note: Le userId de l'utilisateur courant doit être stocké dans le provider (via auth context)
socket.on('message:new', (message: any) => {
  // Ne pas jouer le son pour ses propres messages
  // Jouer le son si onglet pas focus ou pas sur la conversation
  const currentUserId = /* récupéré depuis dbUser.id du auth context */ null;
  if (message.senderId !== currentUserId && document.hidden) {
    try {
      new Audio('/sounds/message.mp3').play().catch(() => {});
    } catch {}
  }
});
```

Note: Le fichier `message.mp3` doit être un son court (~0.5s). Utiliser un fichier libre de droits type notification sound.

- [ ] **Step 2: Commit**

```bash
git add web/src/context/socket-context.tsx web/public/sounds/
git commit -m "feat(messaging): add notification sound on new message when tab not focused"
```

---

### Task 17 : Mettre à jour CLAUDE.md avec les règles messagerie

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Ajouter les sections M01-M04 à la fin de CLAUDE.md (avant la checklist)**

Ajouter les 4 sections de sécurité messagerie telles que définies dans le spec (Section 6) :
- M01 — Contrôle d'accès messagerie
- M02 — Validation des messages
- M03 — Rate limiting WebSocket
- M04 — Auth WebSocket

- [ ] **Step 2: Mettre à jour la section A08 pour inclure DOCX**

Dans la section A08, ajouter le MIME DOCX à la liste des types autorisés :
```
Types autorisés : `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add messaging security rules M01-M04 to CLAUDE.md"
```

---

### Task 18 : Vérification finale et cleanup

- [ ] **Step 1: Vérifier que le serveur NestJS compile**

Run: `cd api && npx tsc --noEmit`
Expected: Aucune erreur de compilation.

- [ ] **Step 2: Vérifier que le client Next.js compile**

Run: `cd web && npx next build`
Expected: Build réussi.

- [ ] **Step 3: Vérifier que la migration Prisma est bien appliquée**

Run: `cd api && npx prisma migrate status`
Expected: Toutes les migrations appliquées.

- [ ] **Step 4: Tester manuellement la connexion Socket.io**

1. Démarrer Redis : `redis-server`
2. Démarrer l'API : `cd api && npm run start:dev`
3. Démarrer le web : `cd web && npm run dev`
4. Ouvrir `/messages` dans le navigateur
5. Vérifier la connexion WebSocket dans les DevTools (onglet Network → WS)

- [ ] **Step 5: Commit final**

```bash
git add api/src/messaging/ api/src/main.ts web/src/ CLAUDE.md
git commit -m "feat(messaging): complete real-time messaging with PostgreSQL + Redis + Socket.io"
```
