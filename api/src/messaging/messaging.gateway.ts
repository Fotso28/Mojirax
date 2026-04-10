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
import { UseGuards, UseFilters, Inject, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as admin from 'firebase-admin';
import Redis from 'ioredis';

import { MessagingService } from './messaging.service';
import { WsAuthGuard } from './ws-auth.guard';
import { WsExceptionFilter } from './ws-exception.filter';
import { WsRateLimiter } from './ws-rate-limiter';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { NotificationType, UserPlan } from '@prisma/client';
import { getPlanLimits } from '../common/config/plan-limits.config';
import {
  WsSendMessageDto,
  WsConversationIdDto,
  WsMessageIdDto,
  WsReactionDto,
  WsAuthRefreshDto,
} from './dto/ws-message.dto';

const PRESENCE_TTL = 300; // 5 minutes
const TYPING_TTL = 3; // 3 seconds
const REAUTH_INTERVAL_MS = 50 * 60 * 1000; // 50 minutes
const MAX_CONTENT_BYTES = 20_000; // 20 KB max for message content

@WebSocketGateway({
  namespace: '/messaging',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5000',
    credentials: true,
  },
})
@UseFilters(new WsExceptionFilter())
@UsePipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) => new WsException(errors),
}))
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private readonly reauthTimers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    private readonly messagingService: MessagingService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
    private readonly rateLimiter: WsRateLimiter,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────

  /** Safe Redis call — logs error but never throws */
  private async safeRedis<T>(op: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await op();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Redis operation failed: ${message}`);
      return fallback;
    }
  }

  /** Increment presence counter (atomic pipeline) */
  private async presenceIncr(userId: string): Promise<void> {
    await this.safeRedis(async () => {
      const key = `presence:${userId}`;
      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, PRESENCE_TTL);
      await pipeline.exec();
    }, undefined);
  }

  /** Decrement presence counter (atomic pipeline) — returns true if user went offline */
  private async presenceDecr(userId: string): Promise<boolean> {
    return this.safeRedis(async () => {
      const key = `presence:${userId}`;
      const count = await this.redis.decr(key);
      if (count <= 0) {
        await this.redis.del(key);
        return true;
      }
      const pipeline = this.redis.pipeline();
      pipeline.expire(key, PRESENCE_TTL);
      await pipeline.exec();
      return false;
    }, true);
  }

  /** Check if user is online (presence counter > 0) */
  private async isUserOnline(userId: string): Promise<boolean> {
    return this.safeRedis(async () => {
      const val = await this.redis.get(`presence:${userId}`);
      return val !== null && parseInt(val, 10) > 0;
    }, false);
  }

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

      // Check if user is banned
      const userRecord = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { status: true, plan: true, isInvisible: true },
      });
      if (userRecord?.status === 'BANNED') {
        this.logger.warn(`Banned user tried to connect: userId=${userId}`);
        client.emit('error', { code: 'ACCOUNT_BANNED', message: 'Votre compte a été désactivé' });
        client.disconnect();
        return;
      }

      // Store user data on socket
      client.data.user = { uid, userId, plan: userRecord?.plan || 'FREE', isInvisible: userRecord?.isInvisible || false };

      // Join user's conversation rooms (parallel)
      const conversationIds = await this.messagingService.getUserConversationIds(userId);
      await Promise.all(conversationIds.map((convId) => client.join(`conversation:${convId}`)));

      // Cache conversation IDs on socket for disconnect
      client.data.conversationIds = conversationIds;

      // Increment presence counter
      await this.presenceIncr(userId);

      // Broadcast online status to all conversations (skip if invisible)
      if (!client.data.user.isInvisible) {
        for (const convId of conversationIds) {
          client.to(`conversation:${convId}`).emit('presence:update', {
            userId,
            status: 'online',
          });
        }
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
          await this.safeRedis(
            () => this.redis.expire(`presence:${userId}`, PRESENCE_TTL),
            0,
          );
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
      // Decrement presence — only broadcast offline if counter reached 0
      const wentOffline = await this.presenceDecr(userId);

      if (wentOffline && !client.data?.user?.isInvisible) {
        // Use cached conversationIds to avoid extra DB query
        const conversationIds =
          client.data.conversationIds ||
          (await this.messagingService.getUserConversationIds(userId));

        for (const convId of conversationIds) {
          client.to(`conversation:${convId}`).emit('presence:update', {
            userId,
            status: 'offline',
          });
        }
      }

      this.logger.log(`Client disconnected: socketId=${client.id} userId=${userId}`);
    } catch (err: any) {
      this.logger.error(`Disconnect cleanup failed: ${err?.message}`);
    }
  }

  // ─── Room Management ───────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsConversationIdDto,
  ) {
    const userId = client.data.user.userId;

    try {
      await this.messagingService.verifyMembership(data.conversationId, userId);
      await client.join(`conversation:${data.conversationId}`);

      // Update cached conversationIds (avoid duplicates)
      if (client.data.conversationIds && !client.data.conversationIds.includes(data.conversationId)) {
        client.data.conversationIds.push(data.conversationId);
      }
    } catch (err: any) {
      this.logger.error(`conversation:join failed: ${err?.message}`);
      client.emit('error', { message: err?.message || 'Erreur de rejoindre la conversation' });
    }
  }

  // ─── Message Sending ──────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsSendMessageDto,
  ): Promise<{ status: 'ok'; message: Record<string, unknown> } | { status: 'error'; error: string }> {
    const userId = client.data.user.userId;

    try {
      // Rate limit check
      const allowed = await this.rateLimiter.check(userId, 'message:send');
      if (!allowed) {
        return { status: 'error', error: 'Trop de messages, réessayez dans un instant' };
      }

      // Daily message quota check
      const plan = client.data.user.plan || 'FREE';
      const { messagesPerDay } = getPlanLimits(plan as UserPlan);
      if (messagesPerDay !== Infinity) {
        const today = new Date().toISOString().slice(0, 10);
        const dailyKey = `msg_daily:${userId}:${today}`;
        const count = await this.redis.incr(dailyKey);
        if (count === 1) await this.redis.expire(dailyKey, 86400);
        if (count > messagesPerDay) {
          return { status: 'error', error: `Limite de ${messagesPerDay} messages/jour atteinte. Passez au plan supérieur.` };
        }
      }

      // Validate content byte length (M02 — prevent multi-byte char DoS)
      if (data.content && Buffer.byteLength(data.content, 'utf8') > MAX_CONTENT_BYTES) {
        return { status: 'error', error: 'Message trop long' };
      }

      const message = await this.messagingService.sendMessage(userId, {
        conversationId: data.conversationId,
        clientMessageId: data.clientMessageId,
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

      // Check if recipient is offline → send push (fire-and-forget, non-blocking)
      this.sendOfflinePush(data.conversationId, userId, data.content).catch(
        (err) => this.logger.error(`Push pipeline failed: ${err?.message}`),
      );

      // Return ack to sender — confirms server processed the message
      return { status: 'ok', message };
    } catch (err: any) {
      this.logger.error(`message:send failed: ${err?.message}`);
      return { status: 'error', error: err?.message || 'Erreur d\'envoi du message' };
    }
  }

  /** Send push notification to offline recipient (fire-and-forget helper) */
  private async sendOfflinePush(
    conversationId: string,
    senderId: string,
    content?: string,
  ): Promise<void> {
    const [recipientId, sender] = await Promise.all([
      this.messagingService.getRecipientId(conversationId, senderId),
      this.prisma.user.findUnique({
        where: { id: senderId },
        select: { firstName: true, lastName: true },
      }),
    ]);

    const isOnline = await this.isUserOnline(recipientId);
    if (isOnline) return;

    const senderName = sender
      ? `${sender.firstName} ${sender.lastName}`.trim()
      : 'Quelqu\'un';
    const body = content ? content.substring(0, 100) : 'Fichier envoyé';

    await this.notificationsService.notify(
      recipientId,
      NotificationType.MESSAGE_RECEIVED,
      `Nouveau message de ${senderName}`,
      body,
      { conversationId, senderId },
    );
  }

  // ─── Delivery Receipt ─────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('message:delivered')
  async handleMarkDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsMessageIdDto,
  ) {
    const userId = client.data.user.userId;

    try {
      const result = await this.messagingService.markDelivered(data.messageId, userId);
      if (result) {
        // Notify conversation room of delivery status
        this.server
          .to(`conversation:${result.conversationId}`)
          .emit('message:status', {
            messageId: data.messageId,
            status: 'DELIVERED',
            deliveredAt: result.deliveredAt,
          });
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
    @MessageBody() data: WsConversationIdDto,
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
    @MessageBody() data: WsConversationIdDto,
  ) {
    const userId = client.data.user.userId;

    try {
      const allowed = await this.rateLimiter.check(userId, 'typing:start');
      if (!allowed) return;

      // Verify user belongs to conversation (M01)
      await this.messagingService.verifyMembership(data.conversationId, userId);

      // Set typing flag in Redis with short TTL
      await this.safeRedis(
        () => this.redis.set(`typing:${data.conversationId}:${userId}`, '1', 'EX', TYPING_TTL),
        'OK',
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
    @MessageBody() data: WsConversationIdDto,
  ) {
    const userId = client.data.user.userId;

    try {
      const allowed = await this.rateLimiter.check(userId, 'typing:stop');
      if (!allowed) return;

      // Verify user belongs to conversation (M01)
      await this.messagingService.verifyMembership(data.conversationId, userId);

      // Remove typing flag
      await this.safeRedis(
        () => this.redis.del(`typing:${data.conversationId}:${userId}`),
        0,
      );

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
    @MessageBody() data: WsReactionDto,
  ) {
    const userId = client.data.user.userId;

    try {
      const allowed = await this.rateLimiter.check(userId, 'reaction:add');
      if (!allowed) {
        client.emit('error', { message: 'Trop de réactions, réessayez dans un instant' });
        return;
      }

      const { conversationId, reactions } = await this.messagingService.addReaction(
        data.messageId,
        userId,
        data.emoji,
      );

      this.server
        .to(`conversation:${conversationId}`)
        .emit('reaction:update', {
          messageId: data.messageId,
          reactions,
        });
    } catch (err: any) {
      this.logger.error(`reaction:add failed: ${err?.message}`);
      client.emit('error', { message: err?.message || 'Erreur d\'ajout de réaction' });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('reaction:remove')
  async handleReactionRemove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsReactionDto,
  ) {
    const userId = client.data.user.userId;

    try {
      const allowed = await this.rateLimiter.check(userId, 'reaction:remove');
      if (!allowed) {
        client.emit('error', { message: 'Trop de réactions, réessayez dans un instant' });
        return;
      }

      const { conversationId, reactions } = await this.messagingService.removeReaction(
        data.messageId,
        userId,
        data.emoji,
      );

      this.server
        .to(`conversation:${conversationId}`)
        .emit('reaction:update', {
          messageId: data.messageId,
          reactions,
        });
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
    @MessageBody() data: WsAuthRefreshDto,
  ) {
    const userId = client.data.user.userId;

    try {
      const decoded = await this.firebaseAdmin.auth().verifyIdToken(data.token);

      // Verify the token belongs to the same user
      if (decoded.uid !== client.data.user.uid) {
        this.logger.warn(`auth:refresh rejected: token uid mismatch for user=${userId}`);
        client.emit('error', { message: 'Token invalide' });
        client.disconnect();
        return;
      }

      // Update the token in handshake for re-auth timer
      client.handshake.auth.token = data.token;

      // Refresh presence TTL
      await this.safeRedis(
        () => this.redis.expire(`presence:${userId}`, PRESENCE_TTL),
        0,
      );

      this.logger.log(`Token refreshed for user=${userId} uid=${decoded.uid}`);
      client.emit('auth:refreshed', { success: true });
    } catch (err: any) {
      this.logger.error(`auth:refresh failed: ${err?.message}`);
      client.emit('error', { message: 'Échec du rafraîchissement du token' });
      client.disconnect();
    }
  }

  // ─── Admin: Force Disconnect ─────────────────────────────

  async disconnectUser(userId: string): Promise<number> {
    let disconnected = 0;
    const sockets = await this.server.fetchSockets();
    for (const socket of sockets) {
      if (socket.data?.user?.userId === userId) {
        socket.emit('error', { code: 'ACCOUNT_BANNED', message: 'Votre compte a été désactivé' });
        socket.disconnect(true);
        disconnected++;
      }
    }
    if (disconnected > 0) {
      this.logger.warn(`Disconnected ${disconnected} socket(s) for banned userId=${userId}`);
    }
    return disconnected;
  }
}
