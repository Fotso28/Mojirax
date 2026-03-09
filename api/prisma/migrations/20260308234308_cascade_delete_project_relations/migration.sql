-- DropForeignKey
ALTER TABLE "moderation_logs" DROP CONSTRAINT "moderation_logs_candidate_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "moderation_logs" DROP CONSTRAINT "moderation_logs_project_id_fkey";

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
