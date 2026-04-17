-- Migration: Convert String fields to JSONB for i18n support
-- Tables: pricing_plans, faqs, testimonials

-- ─── pricing_plans ───────────────────────────────────────

-- name: text → jsonb (wrap existing value as {"fr": "..."})
ALTER TABLE "pricing_plans" ADD COLUMN "name_new" JSONB;
UPDATE "pricing_plans" SET "name_new" = jsonb_build_object('fr', "name");
ALTER TABLE "pricing_plans" DROP COLUMN "name";
ALTER TABLE "pricing_plans" RENAME COLUMN "name_new" TO "name";
ALTER TABLE "pricing_plans" ALTER COLUMN "name" SET NOT NULL;

-- period: text → jsonb
ALTER TABLE "pricing_plans" ADD COLUMN "period_new" JSONB;
UPDATE "pricing_plans" SET "period_new" = jsonb_build_object('fr', "period");
ALTER TABLE "pricing_plans" DROP COLUMN "period";
ALTER TABLE "pricing_plans" RENAME COLUMN "period_new" TO "period";
ALTER TABLE "pricing_plans" ALTER COLUMN "period" SET NOT NULL;

-- description: text → jsonb (nullable)
ALTER TABLE "pricing_plans" ADD COLUMN "description_new" JSONB;
UPDATE "pricing_plans" SET "description_new" = CASE
  WHEN "description" IS NOT NULL THEN jsonb_build_object('fr', "description")
  ELSE NULL
END;
ALTER TABLE "pricing_plans" DROP COLUMN "description";
ALTER TABLE "pricing_plans" RENAME COLUMN "description_new" TO "description";

-- features: text[] → jsonb (wrap array as {"fr": [...]})
ALTER TABLE "pricing_plans" ADD COLUMN "features_new" JSONB;
UPDATE "pricing_plans" SET "features_new" = jsonb_build_object('fr', to_jsonb("features"));
ALTER TABLE "pricing_plans" DROP COLUMN "features";
ALTER TABLE "pricing_plans" RENAME COLUMN "features_new" TO "features";
ALTER TABLE "pricing_plans" ALTER COLUMN "features" SET NOT NULL;

-- cta_label: text → jsonb
ALTER TABLE "pricing_plans" ADD COLUMN "cta_label_new" JSONB;
UPDATE "pricing_plans" SET "cta_label_new" = jsonb_build_object('fr', "cta_label");
ALTER TABLE "pricing_plans" DROP COLUMN "cta_label";
ALTER TABLE "pricing_plans" RENAME COLUMN "cta_label_new" TO "cta_label";
ALTER TABLE "pricing_plans" ALTER COLUMN "cta_label" SET NOT NULL;

-- ─── faqs ────────────────────────────────────────────────

-- question: text → jsonb
ALTER TABLE "faqs" ADD COLUMN "question_new" JSONB;
UPDATE "faqs" SET "question_new" = jsonb_build_object('fr', "question");
ALTER TABLE "faqs" DROP COLUMN "question";
ALTER TABLE "faqs" RENAME COLUMN "question_new" TO "question";
ALTER TABLE "faqs" ALTER COLUMN "question" SET NOT NULL;

-- answer: text → jsonb
ALTER TABLE "faqs" ADD COLUMN "answer_new" JSONB;
UPDATE "faqs" SET "answer_new" = jsonb_build_object('fr', "answer");
ALTER TABLE "faqs" DROP COLUMN "answer";
ALTER TABLE "faqs" RENAME COLUMN "answer_new" TO "answer";
ALTER TABLE "faqs" ALTER COLUMN "answer" SET NOT NULL;

-- ─── testimonials ────────────────────────────────────────

-- role: text → jsonb
ALTER TABLE "testimonials" ADD COLUMN "role_new" JSONB;
UPDATE "testimonials" SET "role_new" = jsonb_build_object('fr', "role");
ALTER TABLE "testimonials" DROP COLUMN "role";
ALTER TABLE "testimonials" RENAME COLUMN "role_new" TO "role";
ALTER TABLE "testimonials" ALTER COLUMN "role" SET NOT NULL;

-- quote: text → jsonb
ALTER TABLE "testimonials" ADD COLUMN "quote_new" JSONB;
UPDATE "testimonials" SET "quote_new" = jsonb_build_object('fr', "quote");
ALTER TABLE "testimonials" DROP COLUMN "quote";
ALTER TABLE "testimonials" RENAME COLUMN "quote_new" TO "quote";
ALTER TABLE "testimonials" ALTER COLUMN "quote" SET NOT NULL;
