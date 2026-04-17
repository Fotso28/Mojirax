/**
 * Script de migration des données existantes vers le format i18n JSON.
 *
 * Convertit les champs String simples en objets { "fr": "valeur" }
 * pour PricingPlan, Faq et Testimonial.
 *
 * Usage :
 *   npx ts-node prisma/migrations/convert-i18n-fields.ts
 *
 * IMPORTANT : Exécuter APRÈS la migration Prisma i18n_json_fields
 * et AVANT de déployer le nouveau code en production.
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting i18n data migration...');

  // ─── PricingPlan ───────────────────────────────────────
  const plans = await prisma.$queryRaw<
    Array<{
      id: string;
      name: unknown;
      description: unknown;
      period: unknown;
      features: unknown;
      cta_label: unknown;
    }>
  >`SELECT id, name, description, period, features, cta_label FROM pricing_plans`;

  for (const plan of plans) {
    const data: Prisma.PricingPlanUpdateInput = {};

    if (typeof plan.name === 'string') {
      data.name = { fr: plan.name };
    }
    if (typeof plan.description === 'string') {
      data.description = { fr: plan.description };
    }
    if (typeof plan.period === 'string') {
      data.period = { fr: plan.period };
    }
    if (typeof plan.cta_label === 'string') {
      data.ctaLabel = { fr: plan.cta_label };
    }
    // features: was String[] (PostgreSQL text array), convert to { "fr": [...] }
    if (Array.isArray(plan.features)) {
      data.features = { fr: plan.features };
    }

    if (Object.keys(data).length > 0) {
      await prisma.pricingPlan.update({
        where: { id: plan.id },
        data,
      });
      console.log(`  PricingPlan ${plan.id} migrated`);
    }
  }
  console.log(`PricingPlan: ${plans.length} rows processed`);

  // ─── Faq ───────────────────────────────────────────────
  const faqs = await prisma.$queryRaw<
    Array<{ id: string; question: unknown; answer: unknown }>
  >`SELECT id, question, answer FROM faqs`;

  for (const faq of faqs) {
    const data: Prisma.FaqUpdateInput = {};

    if (typeof faq.question === 'string') {
      data.question = { fr: faq.question };
    }
    if (typeof faq.answer === 'string') {
      data.answer = { fr: faq.answer };
    }

    if (Object.keys(data).length > 0) {
      await prisma.faq.update({
        where: { id: faq.id },
        data,
      });
      console.log(`  Faq ${faq.id} migrated`);
    }
  }
  console.log(`Faq: ${faqs.length} rows processed`);

  // ─── Testimonial ───────────────────────────────────────
  const testimonials = await prisma.$queryRaw<
    Array<{ id: string; role: unknown; quote: unknown }>
  >`SELECT id, role, quote FROM testimonials`;

  for (const t of testimonials) {
    const data: Prisma.TestimonialUpdateInput = {};

    if (typeof t.role === 'string') {
      data.role = { fr: t.role };
    }
    if (typeof t.quote === 'string') {
      data.quote = { fr: t.quote };
    }

    if (Object.keys(data).length > 0) {
      await prisma.testimonial.update({
        where: { id: t.id },
        data,
      });
      console.log(`  Testimonial ${t.id} migrated`);
    }
  }
  console.log(`Testimonial: ${testimonials.length} rows processed`);

  console.log('i18n data migration complete!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
