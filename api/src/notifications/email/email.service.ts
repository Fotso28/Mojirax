import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { BrevoClient } from '@getbrevo/brevo';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailCompilerService } from './email-compiler.service';
import {
  resolveUserName,
  resolveTemplateName,
  resolveActionUrl,
} from './email.constants';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly brevoClient: BrevoClient | null = null;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly compiler: EmailCompilerService,
  ) {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (apiKey) {
      this.brevoClient = new BrevoClient({ apiKey });
    } else {
      this.logger.warn('BREVO_API_KEY not set — emails will be skipped');
    }
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
  }

  /**
   * Envoie un email pour une notification.
   * Appele depuis NotificationsService.notify() en fire & forget.
   */
  async sendEmail(
    userId: string,
    type: NotificationType,
    data?: Record<string, any>,
  ): Promise<void> {
    try {
      // 1. Check config
      const config = await this.getConfig();
      if (!config.enabled || !config.enabledTypes.includes(type)) {
        return;
      }

      // 2. Fetch user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          name: true,
          preferredLang: true,
        },
      });
      if (!user?.email) return;

      const lang = user.preferredLang || 'fr';
      const userName = resolveUserName({
        firstName: user.firstName ?? undefined,
        name: user.name ?? undefined,
      });

      // 3. Resolve template
      const templateName = resolveTemplateName(type, data);
      const actionUrl = resolveActionUrl(this.frontendUrl, type, data);

      // 4. Build variables
      const variables: Record<string, string> = {
        userName,
        actionUrl,
        ...(data?.candidateName && { candidateName: data.candidateName }),
        ...(data?.founderName && { founderName: data.founderName }),
        ...(data?.projectName && { projectName: data.projectName }),
        ...(data?.targetName && { targetName: data.targetName }),
        ...(data?.reason && { reason: data.reason }),
        ...(data?.message && { message: data.message }),
      };

      // 5. Compile template
      const htmlContent = this.compiler.compile(templateName, lang, variables);
      if (!htmlContent) return;

      // 6. Get subject
      const subject = this.compiler.getSubject(templateName, lang);

      // 7. Send via Brevo
      if (!this.brevoClient) {
        this.logger.warn('BREVO_API_KEY not set — skipping email');
        return;
      }

      const response = await this.brevoClient.transactionalEmails.sendTransacEmail({
        sender: { name: config.fromName, email: config.fromEmail },
        to: [{ email: user.email, name: userName }],
        replyTo: { email: config.fromEmail, name: config.fromName },
        subject,
        htmlContent,
        tags: [type],
      });

      // 8. Log success
      await this.prisma.emailLog.create({
        data: {
          userId: user.id,
          type,
          to: user.email,
          subject,
          brevoId: (response as any)?.messageId || null,
          status: 'SENT',
        },
      });

      this.logger.log(`Email sent: ${type} to ${user.id}`);
    } catch (error) {
      this.logger.error(`Email failed: ${type} to ${userId}`, error);

      // Log failure
      await this.prisma.emailLog
        .create({
          data: {
            userId,
            type,
            to: 'unknown',
            subject: 'unknown',
            status: 'FAILED',
            error: error instanceof Error ? error.message : String(error),
          },
        })
        .catch((e) => this.logger.error('Failed to log email error', e));
    }
  }

  /**
   * Envoie l'email de bienvenue (pas de notification in-app).
   */
  async sendWelcome(userId: string): Promise<void> {
    return this.sendEmail(userId, NotificationType.WELCOME);
  }

  /**
   * Envoie le rappel d'onboarding (cron quotidien a 10h).
   */
  async sendOnboardingReminder(userId: string): Promise<void> {
    return this.sendEmail(userId, NotificationType.ONBOARDING_REMINDER);
  }

  /**
   * Cron: envoie les rappels d'onboarding aux utilisateurs inactifs.
   * Cible: crees il y a 48h+, sans role defini, max 1 rappel par user.
   * Traitement par batch de 50.
   */
  @Cron('0 10 * * *')
  async handleOnboardingReminders(): Promise<void> {
    this.logger.log('Running onboarding reminder cron...');

    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Users crees il y a 48h+ sans role defini et sans rappel envoye
      const users = await this.prisma.user.findMany({
        where: {
          createdAt: { lte: twoDaysAgo },
          role: 'USER',
          emailLogs: {
            none: { type: NotificationType.ONBOARDING_REMINDER },
          },
        },
        select: { id: true },
        take: 50,
      });

      this.logger.log(`Found ${users.length} users for onboarding reminder`);

      for (const user of users) {
        // Create in-app notification
        await this.prisma.notification
          .create({
            data: {
              userId: user.id,
              type: NotificationType.ONBOARDING_REMINDER,
              title: 'Completez votre profil',
              message: 'Remplissez votre profil pour trouver votre co-fondateur ideal.',
            },
          })
          .catch((e) => this.logger.warn(`Onboarding notif failed for ${user.id}`, e));

        // Send email
        await this.sendOnboardingReminder(user.id).catch((e) =>
          this.logger.error(`Onboarding reminder email failed for ${user.id}`, e),
        );
      }
    } catch (error) {
      this.logger.error('Onboarding reminder cron failed', error);
    }
  }

  private async getConfig() {
    let config = await this.prisma.emailConfig.findUnique({
      where: { id: 'singleton' },
    });

    if (!config) {
      config = await this.prisma.emailConfig.create({
        data: { id: 'singleton' },
      });
    }

    return config;
  }
}
