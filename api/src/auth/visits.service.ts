import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisitsService {
  private readonly logger = new Logger(VisitsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre ou met à jour une visite utilisateur.
   * Si une visite existe dans les 30 dernières minutes → met à jour lastSeenAt.
   * Sinon → crée une nouvelle session de visite.
   */
  async trackVisit(userId: string, ip?: string, userAgent?: string) {
    try {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Chercher une visite récente (même user, < 30 min)
      const recentVisit = await this.prisma.userVisit.findFirst({
        where: {
          userId,
          lastSeenAt: { gte: thirtyMinAgo },
        },
        select: { id: true },
        orderBy: { lastSeenAt: 'desc' },
      });

      if (recentVisit) {
        // Même session → prolonger
        await this.prisma.userVisit.update({
          where: { id: recentVisit.id },
          data: { lastSeenAt: new Date() },
        });
        return;
      }

      // Nouvelle session de visite
      const parsed = this.parseUserAgent(userAgent);

      await this.prisma.userVisit.create({
        data: {
          userId,
          ip: ip ? this.anonymizeIp(ip) : null,
          userAgent: userAgent ? userAgent.substring(0, 500) : null,
          device: parsed.device,
          browser: parsed.browser,
          os: parsed.os,
        },
      });

      this.logger.log(`New visit tracked for user ${userId} (${parsed.device})`);
    } catch (error) {
      // Ne pas bloquer l'auth si le tracking échoue
      this.logger.warn(`Failed to track visit: ${(error as Error).message}`);
    }
  }

  /**
   * Parse basique du User-Agent pour extraire device/browser/os.
   */
  private parseUserAgent(ua?: string): { device: string; browser: string; os: string } {
    if (!ua) return { device: 'UNKNOWN', browser: 'UNKNOWN', os: 'UNKNOWN' };

    // Device
    let device = 'DESKTOP';
    if (/mobile|android.*mobile|iphone|ipod/i.test(ua)) device = 'MOBILE';
    else if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) device = 'TABLET';

    // Browser
    let browser = 'OTHER';
    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/opr|opera/i.test(ua)) browser = 'Opera';
    else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';

    // OS
    let os = 'OTHER';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac os|macintosh/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua) && !/android/i.test(ua)) os = 'Linux';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

    return { device, browser, os };
  }

  /**
   * Anonymise l'IP en supprimant le dernier octet (RGPD).
   * Ex: 192.168.1.45 → 192.168.1.0
   */
  private anonymizeIp(ip: string): string {
    if (ip.includes('.')) {
      const parts = ip.split('.');
      parts[parts.length - 1] = '0';
      return parts.join('.');
    }
    // IPv6 : garder les 3 premiers groupes
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return parts.slice(0, 3).join(':') + '::';
    }
    return ip;
  }
}
