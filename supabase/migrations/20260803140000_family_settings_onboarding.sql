-- Onboarding completion markers on family_settings (answers live in child_profiles / inventory / moment).

ALTER TABLE "public"."family_settings"
    ADD COLUMN IF NOT EXISTS "onboarding_version" integer,
    ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp with time zone,
    ADD COLUMN IF NOT EXISTS "onboarding_skipped_at" timestamp with time zone;

COMMENT ON COLUMN "public"."family_settings"."onboarding_version" IS
    'Onboarding flow version completed or skipped by this family.';
COMMENT ON COLUMN "public"."family_settings"."onboarding_completed_at" IS
    'When onboarding finished with a first-activity path.';
COMMENT ON COLUMN "public"."family_settings"."onboarding_skipped_at" IS
    'When onboarding was skipped.';
