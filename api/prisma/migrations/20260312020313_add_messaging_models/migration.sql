-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('FEED', 'SIDEBAR', 'BANNER', 'SEARCH');

-- CreateEnum
CREATE TYPE "AdEventType" AS ENUM ('IMPRESSION', 'CLICK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PROFILE_UNLOCKED';
ALTER TYPE "NotificationType" ADD VALUE 'WELCOME';
ALTER TYPE "NotificationType" ADD VALUE 'ONBOARDING_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'MESSAGE_RECEIVED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferred_lang" TEXT NOT NULL DEFAULT 'fr';

-- CreateTable
CREATE TABLE "ads" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "link_url" TEXT,
    "cta_text" TEXT,
    "placement" "AdPlacement" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "target_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_sectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_stages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "max_impressions_per_user_per_day" INTEGER NOT NULL DEFAULT 3,
    "total_impressions" INTEGER NOT NULL DEFAULT 0,
    "total_clicks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_events" (
    "id" TEXT NOT NULL,
    "ad_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" "AdEventType" NOT NULL,
    "placement" "AdPlacement" NOT NULL,
    "position" INTEGER,
    "viewport_ms" INTEGER,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "feed_insert_every" INTEGER NOT NULL DEFAULT 8,
    "feed_randomize" BOOLEAN NOT NULL DEFAULT true,
    "sidebar_max_ads" INTEGER NOT NULL DEFAULT 2,
    "banner_enabled" BOOLEAN NOT NULL DEFAULT true,
    "search_insert_position" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "default_provider" TEXT NOT NULL DEFAULT 'DEEPSEEK',
    "embedding_provider" TEXT NOT NULL DEFAULT 'JINA',
    "provider_per_action" JSONB NOT NULL DEFAULT '{}',
    "models" JSONB NOT NULL DEFAULT '{}',
    "max_tokens" INTEGER NOT NULL DEFAULT 4096,
    "temperature" DOUBLE PRECISION,
    "moderation_thresholds" JSONB NOT NULL DEFAULT '{"publishMin":0.7,"rejectMax":0.3}',
    "matching_weights" JSONB NOT NULL DEFAULT '{"skills":40,"experience":20,"location":15,"culture":25}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompts" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previous_versions" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_call_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "estimated_cost_usd" DOUBLE PRECISION,
    "error" TEXT,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_visits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "login_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_configs" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "enabled_types" TEXT[] DEFAULT ARRAY['SYSTEM', 'APPLICATION_RECEIVED', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'MODERATION_ALERT', 'DOCUMENT_ANALYZED', 'DOCUMENT_ANALYSIS_FAILED', 'PROFILE_PUBLISHED', 'PROFILE_REVIEW', 'PROFILE_UNLOCKED', 'WELCOME', 'ONBOARDING_REMINDER']::TEXT[],
    "from_name" TEXT NOT NULL DEFAULT 'MojiraX',
    "from_email" TEXT NOT NULL DEFAULT 'noreply@mojirax.com',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "brevo_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filter_embeddings" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "embedding" vector(1024),
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filter_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "last_message_preview" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT,
    "file_url" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "file_mime_type" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reactions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ads_placement_is_active_idx" ON "ads"("placement", "is_active");

-- CreateIndex
CREATE INDEX "ads_start_date_end_date_idx" ON "ads"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "ad_events_ad_id_type_idx" ON "ad_events"("ad_id", "type");

-- CreateIndex
CREATE INDEX "ad_events_user_id_ad_id_created_at_idx" ON "ad_events"("user_id", "ad_id", "created_at");

-- CreateIndex
CREATE INDEX "ad_events_created_at_idx" ON "ad_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompts_action_key" ON "ai_prompts"("action");

-- CreateIndex
CREATE INDEX "ai_call_logs_action_idx" ON "ai_call_logs"("action");

-- CreateIndex
CREATE INDEX "ai_call_logs_provider_idx" ON "ai_call_logs"("provider");

-- CreateIndex
CREATE INDEX "ai_call_logs_created_at_idx" ON "ai_call_logs"("created_at");

-- CreateIndex
CREATE INDEX "ai_call_logs_success_idx" ON "ai_call_logs"("success");

-- CreateIndex
CREATE INDEX "user_visits_user_id_login_at_idx" ON "user_visits"("user_id", "login_at");

-- CreateIndex
CREATE INDEX "user_visits_login_at_idx" ON "user_visits"("login_at");

-- CreateIndex
CREATE INDEX "user_visits_user_id_last_seen_at_idx" ON "user_visits"("user_id", "last_seen_at");

-- CreateIndex
CREATE INDEX "email_logs_user_id_created_at_idx" ON "email_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "filter_embeddings_type_value_key" ON "filter_embeddings"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_application_id_key" ON "conversations"("application_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_message_id_user_id_emoji_key" ON "message_reactions"("message_id", "user_id", "emoji");

-- AddForeignKey
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_visits" ADD CONSTRAINT "user_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
