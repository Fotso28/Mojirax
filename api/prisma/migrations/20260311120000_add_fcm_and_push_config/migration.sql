-- CreateTable (if not exists — tables may have been created via db push)
CREATE TABLE IF NOT EXISTS "fcm_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device" TEXT,
    "browser" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "push_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "enabled_types" TEXT[] DEFAULT ARRAY['SYSTEM', 'APPLICATION_RECEIVED', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'MODERATION_ALERT', 'DOCUMENT_ANALYZED', 'DOCUMENT_ANALYSIS_FAILED', 'PROFILE_PUBLISHED', 'PROFILE_REVIEW', 'PROFILE_UNLOCKED']::TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "fcm_tokens_token_key" ON "fcm_tokens"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fcm_tokens_user_id_idx" ON "fcm_tokens"("user_id");

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fcm_tokens_user_id_fkey'
    ) THEN
        ALTER TABLE "fcm_tokens" ADD CONSTRAINT "fcm_tokens_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Seed singleton push config
INSERT INTO "push_config" ("id", "enabled", "enabled_types", "updated_at")
VALUES ('singleton', true, ARRAY['SYSTEM', 'APPLICATION_RECEIVED', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'MODERATION_ALERT', 'DOCUMENT_ANALYZED', 'DOCUMENT_ANALYSIS_FAILED', 'PROFILE_PUBLISHED', 'PROFILE_REVIEW', 'PROFILE_UNLOCKED']::TEXT[], NOW())
ON CONFLICT ("id") DO NOTHING;
