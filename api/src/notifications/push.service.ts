import { Injectable, Logger, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ) {}

  /**
   * Enregistre ou met à jour un token FCM pour un utilisateur.
   */
  async subscribe(userId: string, token: string, device?: string, browser?: string) {
    // Upsert : si le token existe déjà (même device), on le rattache au user
    await this.prisma.fcmToken.upsert({
      where: { token },
      update: { userId, device, browser, updatedAt: new Date() },
      create: { userId, token, device, browser },
    });

    this.logger.log(`FCM token registered for user ${userId} (${device}/${browser})`);
  }

  /**
   * Supprime un token FCM (déconnexion ou token expiré).
   */
  async unsubscribe(token: string) {
    await this.prisma.fcmToken.deleteMany({ where: { token } });
  }

  /**
   * Envoie une notification push à un utilisateur via FCM.
   * Gère les tokens invalides en les supprimant automatiquement.
   */
  async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    // Vérifier si le push est activé pour ce type
    const config = await this.prisma.pushConfig.findUnique({
      where: { id: 'singleton' },
      select: { enabled: true, enabledTypes: true },
    });

    if (!config?.enabled) return;

    // Vérifier si le type est activé (data.type contient le NotificationType)
    if (data?.type && !config.enabledTypes.includes(data.type)) {
      return;
    }

    // Récupérer tous les tokens de l'utilisateur
    const tokens = await this.prisma.fcmToken.findMany({
      where: { userId },
      select: { id: true, token: true },
    });

    if (tokens.length === 0) return;

    // Envoyer à chaque device
    const staleTokenIds: string[] = [];

    for (const { id, token } of tokens) {
      try {
        await this.firebaseAdmin.messaging().send({
          token,
          notification: { title, body },
          data: data || {},
          webpush: {
            notification: {
              title,
              body,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
            },
            fcmOptions: {
              link: data?.projectId ? `/projects/${data.projectId}` : '/',
            },
          },
        });
      } catch (error: any) {
        // Token invalide ou expiré → supprimer
        if (
          error?.code === 'messaging/invalid-registration-token' ||
          error?.code === 'messaging/registration-token-not-registered'
        ) {
          staleTokenIds.push(id);
          this.logger.warn(`Stale FCM token removed for user ${userId}`);
        } else {
          this.logger.warn(`FCM send failed for user ${userId}: ${error?.message}`);
        }
      }
    }

    // Nettoyer les tokens invalides
    if (staleTokenIds.length > 0) {
      await this.prisma.fcmToken.deleteMany({
        where: { id: { in: staleTokenIds } },
      });
    }
  }
}
