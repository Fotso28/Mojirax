/*
  Warnings:

  - You are about to alter the column `emoji` on the `message_reactions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.

*/
-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_founder_id_fkey";

-- AlterTable
ALTER TABLE "email_configs" ALTER COLUMN "enabled_types" SET DEFAULT ARRAY['SYSTEM', 'APPLICATION_RECEIVED', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'MODERATION_ALERT', 'DOCUMENT_ANALYZED', 'DOCUMENT_ANALYSIS_FAILED', 'PROFILE_PUBLISHED', 'PROFILE_REVIEW', 'PROFILE_UNLOCKED', 'WELCOME', 'ONBOARDING_REMINDER', 'MESSAGE_RECEIVED']::TEXT[];

-- AlterTable
ALTER TABLE "message_reactions" ALTER COLUMN "emoji" SET DATA TYPE VARCHAR(32);

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
