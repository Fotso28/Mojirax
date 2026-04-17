import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { localized, localizedArray } from '../i18n/localized';
import { Locale } from '../i18n/i18n.service';

@Injectable()
export class LandingService {
  private readonly logger = new Logger(LandingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPlans(locale: Locale = 'fr') {
    const plans = await this.prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      take: 20,
      select: {
        id: true,
        name: true,
        price: true,
        period: true,
        currency: true,
        description: true,
        features: true,
        isPopular: true,
        order: true,
        ctaLabel: true,
        planKey: true,
      },
    });
    return plans.map((p) => ({
      ...p,
      price: Number(p.price),
      name: localized(p.name, locale),
      period: localized(p.period, locale),
      description: p.description ? localized(p.description, locale) : null,
      features: localizedArray(p.features, locale),
      ctaLabel: localized(p.ctaLabel, locale),
    }));
  }

  async getFaq(locale: Locale = 'fr') {
    const faqs = await this.prisma.faq.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      take: 20,
      select: {
        id: true,
        question: true,
        answer: true,
      },
    });
    return faqs.map((f) => ({
      ...f,
      question: localized(f.question, locale),
      answer: localized(f.answer, locale),
    }));
  }

  async getTestimonials(locale: Locale = 'fr') {
    const testimonials = await this.prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      take: 20,
      select: {
        id: true,
        name: true,
        role: true,
        location: true,
        quote: true,
        imageUrl: true,
      },
    });
    return testimonials.map((t) => ({
      ...t,
      role: localized(t.role, locale),
      quote: localized(t.quote, locale),
    }));
  }
}
