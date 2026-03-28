import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LandingService {
  private readonly logger = new Logger(LandingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPlans() {
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
    return plans.map((p) => ({ ...p, price: Number(p.price) }));
  }

  async getFaq() {
    return this.prisma.faq.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      take: 20,
      select: {
        id: true,
        question: true,
        answer: true,
      },
    });
  }

  async getTestimonials() {
    return this.prisma.testimonial.findMany({
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
  }
}
