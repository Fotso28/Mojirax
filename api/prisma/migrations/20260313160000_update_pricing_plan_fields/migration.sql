-- AlterTable: PricingPlan — price Int→Decimal, add currency, add description
ALTER TABLE "pricing_plans" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10, 2);
ALTER TABLE "pricing_plans" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE "pricing_plans" ADD COLUMN "description" TEXT;
