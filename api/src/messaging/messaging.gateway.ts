import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { UseGuards, Inject, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as admin from 'firebase-admin';
import Redis from 'ioredis';

import { MessagingService } from './messaging.service';
import { WsAuthGuard } from './ws-auth.guard';
import { WsRateLimiter } from './ws-rate-limiter';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../notifications/push.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { NotificationType } from '@prisma/client';

const PRESENCE_TTL = 300; // 5 minutes
const TYPING_TTL = 3; // 3 seconds
const REAUTH_INTERVAL_MS = 50 * 60 * 1000; // 50 minutes

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
  private readonly reauthTimers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    private readonly messagingService: MessagingService,
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushService,
    private readonly prisma: PrismaService,
    private readonly rateLimiter: WsRateLimiter,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ) {}

  // ─── Connection ────────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        this.logger.warn('Connection rejected: no token');
        client.emit('error', { message: 'Token manquant' });
        client.disconnect();
        return;
      }

      // Verify Firebase token
      const decoded = await this.firebaseAdmin.auth().verifyIdToken(token);
      const uid = decoded.uid;

      // Resolve internal userId
      const userId = await this.messagingService.resolveUserId(uid);

      // Store user data on socket
      client.data.user = { uid, userId };

      // Join user's conversation rooms
      const conversationIds = await this.messagingService.getUserConversationIds(userId);
      for (const convId of conversationIds) {
        await client.join(`conversation:${convId}`);
      }

      // Set presence in Redis
      await this.redis.set(`presence:${userId}`, 'online', 'EX', PRESENCE_TTL);

      // Broadcast online status to all conversations
      for (const convId of conversationIds) {
        client.to(`conversation:${convId}`).emit('presence:update', {
          userId,
          status: 'online',
        });
      }

      // Start re-auth timer (refresh token every 50 min)
      const timer = setInterval(async () => {
        try {
          const freshToken = client.handshake.auth?.token;
          if (!freshToken) {
            this.logger.warn(`Re-auth failed: no token for user=${userId}`);
            client.disconnect();
            return;
          }
          await this.firebaseAdmin.auth().verifyIdToken(freshToken);
          // Refresh presence TTL
          await this.redis.set(`presence:${userId}`, 'online', 'EX', PRESENCE_TTL);
        } catch {
          this.logger.warn(`Re-auth failed for user=${userId}, disconnecting`);
          client.disconnect();
        }
      }, REAUTH_INTERVAL_MS);

      this.reauthTimers.set(client.id, timer);

      this.logger.log(`Client connected: socketId=${client.id} userId=${userId}`);
    } catch (err: any) {
      this.logger.warn(`Connection rejected: ${err?.message}`);
      client.emit('error', { message: 'Authentification échouée' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data?.user?.userId;

    // Clear re-auth timer
    const timer = this.reauthTimers.get(client.id);
    if (timer) {
      clearInterval(timer);
      this.reauthTimers.delete(client.id);
    }

    if (!userId) return;

    try {
      // Remove presence
      await this.redis.del(`presence:${userId}`);

      // Broadcast offline to conversations
      const conversationIds = await this.messagingService.getUserConversationIds(userId);
      for (const convId of conversationIds) {
        client.to(`conversation:${convId}`).emit('presence:update', {
          userId,
          status: 'offline',
        });
      }

      this.logger.log(`Client disconnected: socketId=${client.id} userId=${userId}`);
    } catch (err: any) {
      this.logger.error(`Disconnect cleanup failed: ${err?.message}`);
    }
  }

  // ─── Message Sending ──────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      conversationId: string;
      content?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      fileMimeType?: string;
    },
  ) {
    const userId = client.data.user.userId;

    try {
      // Rate limit check
      const allowed = await this.rateLimiter.check(userId, 'message:send');
      if (!allowed) {
        client.emit('error', { message: 'Trop de messages, réessayez dans un instant' });
        return;
      }

      const message = await this.messagingService.sendMessage(userId, {
        conversationId: data.conversationId,
        content: data.content,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileMimeType: data.fileMimeType,
      });

      // Emit to all participants in the conversation room
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message:new', message);

      // Check if recipient is offline → send push
      const recipientId = await this.messagingService.getRecipientId(
        data.conversationId,
        userId,
      );
      const isOnline = await this.redis.get(`presence:${recipientId}`);

      if (!isOnline) {
        // Get sender name for push notification
        const sender = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        });
        const senderName = sender
          ? `${sender.firstName} ${sender.lastName}`.trim()
          : 'Quelqu\'un';
        const body = data.content
          ? data.content.substring(0, 100)
          : 'Fichier envoyé';

        this.notificationsService
          .notify(
            recipientId,
            NotificationType.MESSAGE_RECEIVED,
            `Nouveau message de ${senderName}`,
            body,
            { conversationId: data.conversationId, senderId: userId },
          )
          .catch((err) =>
            this.logger.error(`Push failed: ${err.message}`),
          );
      }
    } catch (err: any) {
      this.logger.error(`message:send failed: ${err?.message}`);
      client.emit('error', { message: err?.message || 'Erreur d\'envoi du message' });
    }
  }

  // ─── Delivery Receipt ─────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('message:delivered')
  async handleMarkDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    const userId = client.data.user.userId;

    try {
      const result = await this.messagingService.markDelivered(data.messageId, userId);
      if (result) {
        // Notify sender of delivery
        this.server
          .to(`conversation:${result.senderId}`)
          .emit('message:status', {
            messageId: data.messageId,
            status: 'DELIVERED',
            deliveredAt: result.deliveredAt,
          });

        // Find the conversation for this message to emit to room
        const message = await this.prisma.message.findUnique({
          where: { id: data.messageId },
          select: { conversationId: true },
        });
        if (message) {
          this.server
            .to(`conversation:${message.conversationId}`)
            .emit('message:status', {
              messageId: data.messageId,
              status: 'DELIVERED',
              deliveredAt: result.deliveredAt,
            });
        }
      }
    } catch (err: any) {
      this.logger.error(`message:delivered failed: ${err?.message}`);
      client.emit('error', { message: err?.message || 'Erreur de confirmation de livraison' });
    }
  }

  // ─── Read Receipt ─────────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.user.userId;

    try {
      const result = await this.messagingService.markRead(data.conversationId, userId);

      // Emit to conversation room
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message:read', {
          conversationId: data.conversationId,
          readBy: userId,
          readAt: result.readAt,
        });
    } catch (err: any) {
      this.logger.error(`message:read failed: ${err?.message}`);
      client.emit('error', { message: err?.message || 'Erreur de marquage comme lu' });
    }
  }

  // ─── Typing Indicators ────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.user.userId;

    try {
      const allowed = await this.rateLimiter.check(userId, 'typing:start');
      if (!allowed) return;

      // Set typing flag in Redis with short TTL
      await this.redis.set(
        `typing:${data.conversationId}:${userId}`,
        '1',
        'EX',
        TYPING_TTL,
      );

      // Broadcast to conversation (excluding sender)
      client.to(`conversation:${data.conversationId}`).emit('typing:update', {
        conversationId: data.conversationId,
        userId,
        isTyping: true,
      });
    } catch (err: any) {
      this.logger.error(`typing:start failed: ${err?.message}`);
      client.emit('error', { message: err?.message || 'Erreur indicateur de frappe' });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.user.userId;

    try {
      const allowed = await this.rateLimiter.check(userId, 'typing:stop');
      if (!allowed) return;

      // Remove typing flag
      await this.redis.del(`typing:${data.conversationId}:${userId}`);

      // Broadcast to conversation (excluding sender)
      client.to(`conversation:${data.conversationId}`).emit('typing:update', {
        conversationId: data.conversationId,
        userId,
        isTyping: false,
      });
    } catch (err: any) {
      this.logger.error(`typing:stop failed: ${err?.message}`);
      client.emit('error', { message: err?.message || 'Erreur indicateur de frappe' });
    }
  }

  // ─── Reactions ─────────────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('reaction:add')
  async handleReactionAdd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    const userId = client.data.user.userId;

    try {
      const allowed = await this.rateLimiter.check(userId, 'reaction:add');
      if (!allowed) {
        client.emit('error', { message: 'Trop de réactions, réessayez dans un instant' });
        return;
      }

      const reactions = await this.messagingService.addReaction(
        data.messageId,
        userId,
        data.emoji,
      );

      // Get the conversation to emit to
      const message = await this.prisma.message.findUnique({
        where: { id: data.messageId },
        select: { conversationId: true },
      });

      if (message) {
        this.server
          .to(`conversation:${message.conversationId}`)
          .emit('reaction:update', {
            messageId: data.messageId,
            reactions,
          });
      }
    } catch (err: any) {
      this.logger.error(`reaction:add failed: ${err?.message}`);
      client.emit('error', { message: err?.message || 'Erreur d\'ajout de réaction' });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('reaction:remove')
  async handleReactionRemove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    const userId = client.data.user.userId;

    try {
      const allowed = await this.rateLimiter.check(userId, 'reaction:remove');
      if (!allowed) {
        client.emit('error', { message: 'Trop de réactions, réessayez dans un instant' });
        return;
      }

      const reactions = await this.messagingService.removeReaction(
        data.messageId,
        userId,
        data.emoji,
      );

      const message = await this.prisma.message.findUnique({
        where: { id: data.messageId },
        select: { conversationId: true },
      });

      if (message) {
        this.server
          .to(`conversation:${message.conversationId}`)
          .emit('reaction:update', {
            messageId: data.messageId,
            reactions,
          });
      }
    } catch (err: any) {
      this.logger.error(`reaction:remove failed: ${err?.message}`);
      client.emit('error', { message: err?.message || 'Erreur de suppression de réaction' });
    }
  }

  // ─── Token Refresh ─────────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('auth:refresh')
  async handleAuthRefresh(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { token: string },
  ) {
    const userId = client.data.user.userId;

    try {
      const decoded = await this.firebaseAdmin.auth().verifyIdToken(data.token);

      // Update the token in handshake for re-auth timer
      client.handshake.auth.token = data.token;

      // Refresh presence
      await this.redis.set(`presence:${userId}`, 'online', 'EX', PRESENCE_TTL);

      this.logger.log(`Token refreshed for user=${userId} uid=${decoded.uid}`);
      client.emit('auth:refreshed', { success: true });
    } catch (err: any) {
      this.logger.error(`auth:refresh failed: ${err?.message}`);
      client.emit('error', { message: 'Échec du rafraîchissement du token' });
      client.disconnect();
    }
  }
}
