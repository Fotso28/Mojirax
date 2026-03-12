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

  /** Get recipient ID in a conversation */
  async getRecipientId(conversationId: string, senderId: string): Promise<string> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { founderId: true, candidateId: true },
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable');
    return conversation.founderId === senderId ? conversation.candidateId : conversation.founderId;
  }

  /** Send a message and update conversation */
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

  /** Paginated message history (cursor-based) */
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

  /** List user conversations (paginated, max 100, default 20) */
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
      select: { id: true, status: true, deliveredAt: true, senderId: true },
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

  /** Add emoji reaction */
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

  /** Remove emoji reaction */
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

  /** Get reactions for a message */
  private async getReactions(messageId: string) {
    return this.prisma.messageReaction.findMany({
      where: { messageId },
      select: { id: true, emoji: true, userId: true },
    });
  }

  /** Get all conversation IDs for a user (for socket room join) */
  async getUserConversationIds(userId: string): Promise<string[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ founderId: userId }, { candidateId: userId }] },
      select: { id: true },
    });
    return conversations.map((c) => c.id);
  }
}
