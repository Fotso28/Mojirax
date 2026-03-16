import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Resolve firebaseUid → userId */
  async resolveUserId(firebaseUid: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user.id;
  }

  /** Verify user belongs to conversation */
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

    if (!user || !target) throw new NotFoundException('Utilisateur introuvable');
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
      where: { founderId_candidateId: { founderId, candidateId } } as any,
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
          where: { founderId_candidateId: { founderId, candidateId } } as any,
          select,
        });
      }
      throw error;
    }
  }

  /** Get recipient ID in a conversation */
  async getRecipientId(conversationId: string, senderId: string): Promise<string> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { founderId: true, candidateId: true },
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable');
    return conversation.founderId === senderId ? conversation.candidateId : conversation.founderId;
  }

  /** Send a message and update conversation (idempotent via clientMessageId) */
  async sendMessage(senderId: string, dto: {
    conversationId: string;
    clientMessageId?: string;
    content?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileMimeType?: string;
  }) {
    if (!dto.content && !dto.fileUrl) {
      throw new BadRequestException('Le message doit contenir du texte ou un fichier');
    }

    // Idempotency: if clientMessageId provided and already exists, return existing message
    if (dto.clientMessageId) {
      const existing = await this.prisma.message.findUnique({
        where: { clientMessageId: dto.clientMessageId },
        select: {
          id: true, conversationId: true, senderId: true,
          content: true, fileUrl: true, fileName: true,
          fileSize: true, fileMimeType: true, status: true,
          createdAt: true,
        },
      });
      if (existing) {
        this.logger.log(`Idempotent hit: clientMessageId=${dto.clientMessageId}`);
        return existing;
      }
    }

    await this.verifyMembership(dto.conversationId, senderId);

    const preview = dto.content
      ? dto.content.substring(0, 100)
      : `📎 ${dto.fileName || 'Fichier'}`;

    const messageSelect = {
      id: true, conversationId: true, senderId: true,
      content: true, fileUrl: true, fileName: true,
      fileSize: true, fileMimeType: true, status: true,
      createdAt: true,
    };

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: dto.conversationId,
          senderId,
          clientMessageId: dto.clientMessageId || null,
          content: dto.content,
          fileUrl: dto.fileUrl,
          fileName: dto.fileName,
          fileSize: dto.fileSize,
          fileMimeType: dto.fileMimeType,
          status: 'SENT',
        },
        select: messageSelect,
      }),
      this.prisma.conversation.update({
        where: { id: dto.conversationId },
        data: { lastMessageAt: new Date(), lastMessagePreview: preview },
      }),
    ]);

    this.logger.log(`Message sent in conversation ${dto.conversationId}`);
    return message;
  }

  /** Paginated message history (cursor-based) */
  async getMessages(conversationId: string, userId: string, cursor?: string, limit?: number) {
    await this.verifyMembership(conversationId, userId);

    const take = Math.min(limit || 20, 100);

    let cursorOption = {};
    if (cursor) {
      // Validate cursor exists to avoid Prisma crash on deleted cursor
      const exists = await this.prisma.message.findUnique({
        where: { id: cursor },
        select: { id: true },
      });
      if (exists) {
        cursorOption = { cursor: { id: cursor }, skip: 1 };
      }
    }

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
      ...cursorOption,
    });

    const hasMore = messages.length > take;
    const items = hasMore ? messages.slice(0, take) : messages;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
  }

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

  /** Count unread messages */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        conversation: { OR: [{ founderId: userId }, { candidateId: userId }] },
        senderId: { not: userId },
        status: { not: 'READ' },
      },
    });
  }

  /** Mark message as DELIVERED */
  async markDelivered(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, status: true, conversationId: true },
    });
    if (!message) throw new NotFoundException();
    if (message.senderId === userId) return null;
    if (message.status !== 'SENT') return null;

    await this.verifyMembership(message.conversationId, userId);

    return this.prisma.message.update({
      where: { id: messageId },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
      select: { id: true, status: true, deliveredAt: true, senderId: true, conversationId: true },
    });
  }

  /** Mark all unread messages in conversation as READ */
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

  /** Add emoji reaction — returns { conversationId, reactions } */
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

    const reactions = await this.getReactions(messageId);
    return { conversationId: message.conversationId, reactions };
  }

  /** Remove emoji reaction — returns { conversationId, reactions } */
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

    const reactions = await this.getReactions(messageId);
    return { conversationId: message.conversationId, reactions };
  }

  /** Get reactions for a message */
  private async getReactions(messageId: string) {
    return this.prisma.messageReaction.findMany({
      where: { messageId },
      select: { id: true, emoji: true, userId: true },
    });
  }

  /** Get conversation IDs for a user (for socket room join, capped at 500) */
  async getUserConversationIds(userId: string): Promise<string[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ founderId: userId }, { candidateId: userId }] },
      select: { id: true },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      take: 500,
    });
    return conversations.map((c) => c.id);
  }
}
