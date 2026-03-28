-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PLUS', 'PRO', 'ELITE');

-- AlterTable
ALTER TABLE "pricing_plans" ADD COLUMN     "plan_key" "UserPlan",
ADD COLUMN     "stripe_price_id" TEXT;

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "provider" SET DEFAULT 'STRIPE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "plan_expires_at" TIMESTAMP(3),
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plans_stripe_price_id_key" ON "pricing_plans"("stripe_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");
