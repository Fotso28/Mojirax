-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'BANNED');

-- AlterEnum
ALTER TYPE "ModerationStatus" ADD VALUE 'REMOVED_BY_ADMIN';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';
