import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserPlan } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

const PLAN_HIERARCHY: Record<UserPlan, number> = {
  FREE: 0,
  PLUS: 1,
  PRO: 2,
  ELITE: 3,
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow<string>('STRIPE_SECRET_KEY'));
  }

  /**
   * Create a Stripe Checkout Session for a subscription plan.
   */
  async createCheckoutSession(firebaseUid: string, planId: string): Promise<{ url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: { id: true, email: true, plan: true, stripeCustomerId: true },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const pricingPlan = await this.prisma.pricingPlan.findUnique({
      where: { id: planId },
    });

    if (!pricingPlan || !pricingPlan.isActive) {
      throw new NotFoundException('Plan introuvable ou inactif');
    }

    if (!pricingPlan.stripePriceId) {
      throw new BadRequestException('Ce plan n\'est pas encore configuré pour le paiement Stripe');
    }

    if (!pricingPlan.planKey) {
      throw new BadRequestException('Ce plan n\'a pas de niveau associé');
    }

    // Prevent subscribing to same or lower plan
    if (PLAN_HIERARCHY[user.plan] >= PLAN_HIERARCHY[pricingPlan.planKey]) {
      throw new BadRequestException(
        `Vous avez déjà le plan ${user.plan}. Choisissez un plan supérieur.`,
      );
    }

    // Get or create Stripe Customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id, firebaseUid },
      });
      stripeCustomerId = customer.id;

      await this.prisma.user.update({
        where: { firebaseUid },
        data: { stripeCustomerId },
      });
    }

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');

    const session = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: pricingPlan.stripePriceId, quantity: 1 }],
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/cancel`,
      metadata: {
        userId: user.id,
        planId: pricingPlan.id,
        planKey: pricingPlan.planKey,
      },
    });

    this.logger.log(`Checkout session created for user ${user.id}, plan ${pricingPlan.name}`);

    return { url: session.url! };
  }

  /**
   * Create a Stripe Customer Portal session for managing subscription.
   */
  async createPortalSession(firebaseUid: string): Promise<{ url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new BadRequestException('Aucun abonnement Stripe trouvé');
    }

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl}/settings`,
    });

    return { url: session.url };
  }

  /**
   * Get payment/subscription status for the current user.
   */
  async getStatus(firebaseUid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: { plan: true, planExpiresAt: true, stripeSubscriptionId: true },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const isActive =
      user.plan !== UserPlan.FREE &&
      (!user.planExpiresAt || user.planExpiresAt > new Date());

    return {
      plan: user.plan,
      planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
      isActive,
    };
  }

  /**
   * Get full billing info: plan details + subscription transaction history.
   */
  async getBilling(firebaseUid: string, page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: {
        id: true,
        plan: true,
        planStartedAt: true,
        planExpiresAt: true,
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const isActive =
      user.plan !== UserPlan.FREE &&
      (!user.planExpiresAt || user.planExpiresAt > new Date());

    const userId = user.id;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, type: 'SUBSCRIPTION' },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.transaction.count({
        where: { userId, type: 'SUBSCRIPTION' },
      }),
    ]);

    return {
      plan: user.plan,
      planStartedAt: user.planStartedAt?.toISOString() ?? null,
      planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
      isActive,
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        currency: t.currency,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Handle incoming Stripe webhook events.
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  // --- Private helpers ---

  /**
   * Extract current_period_end from a subscription's first item.
   * In Stripe SDK v21+, current_period_end is on SubscriptionItem, not Subscription.
   */
  private getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date {
    const periodEnd = subscription.items.data[0]?.current_period_end;
    if (periodEnd) {
      return new Date(periodEnd * 1000);
    }
    // Fallback: use cancel_at or 30 days from now
    return subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  /**
   * Extract subscription ID from an invoice.
   * In Stripe SDK v21+, subscription is in parent.subscription_details.
   */
  private getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
    const subDetails = invoice.parent?.subscription_details;
    if (subDetails?.subscription) {
      return typeof subDetails.subscription === 'string'
        ? subDetails.subscription
        : subDetails.subscription.id;
    }
    return null;
  }

  // --- Private webhook handlers ---

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const planKey = session.metadata?.planKey as UserPlan | undefined;

    if (!userId || !planKey) {
      this.logger.error('Checkout session missing metadata (userId or planKey)');
      return;
    }

    const subscriptionId = session.subscription as string;

    // Retrieve subscription to get the current period end
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = this.getSubscriptionPeriodEnd(subscription);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: planKey,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        planExpiresAt: periodEnd,
        planStartedAt: new Date(),
      },
    });

    // Create transaction record
    await this.prisma.transaction.create({
      data: {
        userId,
        amount: (session.amount_total ?? 0) / 100,
        currency: (session.currency ?? 'eur').toUpperCase(),
        status: 'PAID',
        provider: 'STRIPE',
        externalId: session.id,
        type: 'SUBSCRIPTION',
      },
    });

    this.logger.log(`User ${userId} activated plan ${planKey}`);
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = this.getInvoiceSubscriptionId(invoice);
    if (!subscriptionId) return;

    const user = await this.prisma.user.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true },
    });

    if (!user) {
      this.logger.warn(`No user found for subscription ${subscriptionId}`);
      return;
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = this.getSubscriptionPeriodEnd(subscription);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { planExpiresAt: periodEnd },
    });

    await this.prisma.transaction.create({
      data: {
        userId: user.id,
        amount: (invoice.amount_paid ?? 0) / 100,
        currency: (invoice.currency ?? 'eur').toUpperCase(),
        status: 'PAID',
        provider: 'STRIPE',
        externalId: invoice.id,
        type: 'SUBSCRIPTION',
      },
    });

    this.logger.log(`Invoice paid for user ${user.id}, subscription renewed`);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = this.getInvoiceSubscriptionId(invoice);
    if (!subscriptionId) return;

    const user = await this.prisma.user.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true },
    });

    if (!user) return;

    await this.prisma.transaction.create({
      data: {
        userId: user.id,
        amount: (invoice.amount_due ?? 0) / 100,
        currency: (invoice.currency ?? 'eur').toUpperCase(),
        status: 'FAILED',
        provider: 'STRIPE',
        externalId: invoice.id,
        type: 'SUBSCRIPTION',
      },
    });

    this.logger.warn(`Payment failed for user ${user.id}, subscription ${subscriptionId}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true },
    });

    if (!user) return;

    const priceId = subscription.items.data[0]?.price?.id;
    if (!priceId) return;

    const pricingPlan = await this.prisma.pricingPlan.findUnique({
      where: { stripePriceId: priceId },
    });

    if (!pricingPlan?.planKey) return;

    const periodEnd = this.getSubscriptionPeriodEnd(subscription);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        plan: pricingPlan.planKey,
        planExpiresAt: periodEnd,
      },
    });

    this.logger.log(`Subscription updated for user ${user.id}, new plan: ${pricingPlan.planKey}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true, planExpiresAt: true },
    });

    if (!user) return;

    if (user.planExpiresAt && user.planExpiresAt > new Date()) {
      this.logger.log(
        `Subscription deleted for user ${user.id}, access maintained until ${user.planExpiresAt.toISOString()}`,
      );
      await this.prisma.user.update({
        where: { id: user.id },
        data: { stripeSubscriptionId: null },
      });
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        plan: UserPlan.FREE,
        stripeSubscriptionId: null,
      },
    });

    this.logger.log(`User ${user.id} reverted to FREE plan (subscription deleted)`);
  }
}
