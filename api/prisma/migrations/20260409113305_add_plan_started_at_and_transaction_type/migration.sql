-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SUBSCRIPTION', 'UNLOCK');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "type" "TransactionType" NOT NULL DEFAULT 'SUBSCRIPTION';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan_started_at" TIMESTAMP(3);

-- Backfill: mark transactions with unlocks as UNLOCK type
UPDATE "transactions" SET "type" = 'UNLOCK' WHERE id IN (SELECT DISTINCT "transaction_id" FROM "unlocks");

-- Backfill: set planStartedAt from first SUBSCRIPTION transaction
UPDATE "users" u SET "plan_started_at" = sub.first_paid
FROM (
  SELECT "user_id", MIN("created_at") as first_paid
  FROM "transactions"
  WHERE "type" = 'SUBSCRIPTION' AND "status" = 'PAID'
  GROUP BY "user_id"
) sub
WHERE u.id = sub.user_id AND u.plan != 'FREE';
