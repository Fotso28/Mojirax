import {
    Injectable,
    Logger,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Crée une notification pour un utilisateur.
     * Méthode destinée à être appelée par les autres services.
     */
    async notify(
        userId: string,
        type: NotificationType,
        title: string,
        message: string,
        data?: Prisma.InputJsonValue,
    ) {
        const notification = await this.prisma.notification.create({
            data: { userId, type, title, message, data },
            select: { id: true, type: true, title: true, createdAt: true },
        });

        this.logger.log(`Notification created: type=${type} user=${userId}`);

        return notification;
    }

    /**
     * Liste les notifications de l'utilisateur avec pagination cursor-based.
     */
    async findAll(
        firebaseUid: string,
        unreadOnly?: boolean,
        cursor?: string,
        limit?: number,
    ) {
        const user = await this.resolveUser(firebaseUid);
        const take = Math.min(limit || 20, 20);

        const where: Record<string, unknown> = { userId: user.id };
        if (unreadOnly) {
            where.isRead = false;
        }

        const notifications = await this.prisma.notification.findMany({
            where,
            select: {
                id: true,
                type: true,
                title: true,
                message: true,
                isRead: true,
                data: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: take + 1, // +1 pour détecter s'il y a une page suivante
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = notifications.length > take;
        const items = hasMore ? notifications.slice(0, take) : notifications;
        const nextCursor = hasMore ? items[items.length - 1].id : null;

        return { items, nextCursor, hasMore };
    }

    /**
     * Retourne le nombre de notifications non-lues.
     */
    async getUnreadCount(firebaseUid: string) {
        const user = await this.resolveUser(firebaseUid);

        const count = await this.prisma.notification.count({
            where: { userId: user.id, isRead: false },
        });

        return { count };
    }

    /**
     * Marque une notification comme lue (avec vérification d'ownership).
     */
    async markAsRead(firebaseUid: string, notificationId: string) {
        const user = await this.resolveUser(firebaseUid);

        const notification = await this.prisma.notification.findUnique({
            where: { id: notificationId },
            select: { id: true, userId: true },
        });

        if (!notification) {
            throw new NotFoundException('Notification non trouvée');
        }

        if (notification.userId !== user.id) {
            this.logger.warn(`Unauthorized mark-as-read: user=${user.id} notification=${notificationId}`);
            throw new ForbiddenException('Cette notification ne vous appartient pas');
        }

        await this.prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });

        return { success: true };
    }

    /**
     * Marque toutes les notifications non-lues du user comme lues.
     */
    async markAllAsRead(firebaseUid: string) {
        const user = await this.resolveUser(firebaseUid);

        const result = await this.prisma.notification.updateMany({
            where: { userId: user.id, isRead: false },
            data: { isRead: true },
        });

        this.logger.log(`Marked ${result.count} notifications as read for user=${user.id}`);

        return { updated: result.count };
    }

    /**
     * Résout un firebaseUid en userId interne.
     */
    private async resolveUser(firebaseUid: string) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true },
        });

        if (!user) {
            throw new NotFoundException('Utilisateur non trouvé');
        }

        return user;
    }
}
