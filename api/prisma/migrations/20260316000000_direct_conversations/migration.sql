-- AlterTable: make applicationId optional
ALTER TABLE "conversations" ALTER COLUMN "application_id" DROP NOT NULL;

-- CreateIndex: unique constraint on (founder_id, candidate_id)
CREATE UNIQUE INDEX "conversations_founder_id_candidate_id_key" ON "conversations"("founder_id", "candidate_id");
