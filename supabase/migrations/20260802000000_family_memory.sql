-- Cloud-sync favorites and activity history on the per-user family_settings row.

ALTER TABLE "public"."family_settings"
    ADD COLUMN IF NOT EXISTS "saved_activities" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    ADD COLUMN IF NOT EXISTS "activity_history" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    ADD COLUMN IF NOT EXISTS "last_successful_moment" "jsonb";
