-- Step 1: Add new columns to users table
ALTER TABLE "users"
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "education" JSONB,
ADD COLUMN     "experience" JSONB,
ADD COLUMN     "github_url" TEXT,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "linkedin_url" TEXT,
ADD COLUMN     "portfolio_url" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "title" TEXT,
ADD COLUMN     "website_url" TEXT,
ADD COLUMN     "years_of_experience" INTEGER;

-- Step 2: Migrate data from founder_profile JSON to new typed columns
UPDATE "users" SET
  "title" = "founder_profile"->>'title',
  "bio" = "founder_profile"->>'bio',
  "country" = "founder_profile"->>'country',
  "city" = "founder_profile"->>'city',
  "linkedin_url" = "founder_profile"->>'linkedinUrl',
  "website_url" = "founder_profile"->>'websiteUrl',
  "years_of_experience" = ("founder_profile"->>'yearsOfExperience')::int,
  "experience" = "founder_profile"->'experience',
  "education" = "founder_profile"->'education',
  "skills" = COALESCE(
    (SELECT array_agg(elem::text) FROM jsonb_array_elements_text("founder_profile"->'skills') AS elem),
    '{}'
  ),
  "languages" = COALESCE(
    (SELECT array_agg(elem::text) FROM jsonb_array_elements_text("founder_profile"->'languages') AS elem),
    '{}'
  )
WHERE "founder_profile" IS NOT NULL;

-- Step 3: Migrate data from candidate_profiles for users who had no founder_profile
UPDATE "users" SET
  "title" = COALESCE("users"."title", cp."title"),
  "bio" = COALESCE("users"."bio", cp."bio"),
  "linkedin_url" = COALESCE("users"."linkedin_url", cp."linkedin_url"),
  "github_url" = COALESCE("users"."github_url", cp."github_url"),
  "portfolio_url" = COALESCE("users"."portfolio_url", cp."portfolio_url"),
  "years_of_experience" = COALESCE("users"."years_of_experience", cp."years_of_experience"),
  "experience" = COALESCE("users"."experience", cp."experience"),
  "education" = COALESCE("users"."education", cp."education"),
  "country" = COALESCE("users"."country", cp."location"),
  "skills" = CASE WHEN "users"."skills" = '{}' THEN cp."skills" ELSE "users"."skills" END,
  "languages" = CASE WHEN "users"."languages" = '{}' THEN cp."languages" ELSE "users"."languages" END,
  "certifications" = CASE WHEN "users"."certifications" = '{}' THEN cp."certifications" ELSE "users"."certifications" END
FROM "candidate_profiles" cp
WHERE cp."user_id" = "users"."id";

-- Step 4: Convert FOUNDER and CANDIDATE roles to USER (before enum change)
UPDATE "users" SET "role" = 'USER' WHERE "role" IN ('FOUNDER', 'CANDIDATE');

-- Step 5: Drop duplicate columns from candidate_profiles
DROP INDEX "candidate_profiles_location_idx";
DROP INDEX "candidate_profiles_skills_idx";

ALTER TABLE "candidate_profiles" DROP COLUMN "bio",
DROP COLUMN "certifications",
DROP COLUMN "education",
DROP COLUMN "experience",
DROP COLUMN "github_url",
DROP COLUMN "languages",
DROP COLUMN "linkedin_url",
DROP COLUMN "location",
DROP COLUMN "portfolio_url",
DROP COLUMN "skills",
DROP COLUMN "title",
DROP COLUMN "years_of_experience";

-- Step 6: Drop founder_profile from users
ALTER TABLE "users" DROP COLUMN "founder_profile";

-- Step 7: Update UserRole enum (remove FOUNDER, CANDIDATE)
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'USER');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;
