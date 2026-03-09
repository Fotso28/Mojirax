-- AlterEnum
ALTER TYPE "ModerationStatus" ADD VALUE 'ANALYZING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_ANALYZED';
ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_ANALYSIS_FAILED';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "ai_summary" JSONB,
ADD COLUMN     "document_mime_type" TEXT,
ADD COLUMN     "document_name" TEXT,
ADD COLUMN     "document_url" TEXT;
