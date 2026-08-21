-- Participant fit metadata for shared library and presets.

ALTER TABLE "public"."shared_activity_candidates"
    ADD COLUMN IF NOT EXISTS "participant_mode" "text",
    ADD COLUMN IF NOT EXISTS "participant_min" integer,
    ADD COLUMN IF NOT EXISTS "participant_max" integer,
    ADD COLUMN IF NOT EXISTS "participant_fit_validated" boolean DEFAULT false NOT NULL;

ALTER TABLE "public"."preset_activities"
    ADD COLUMN IF NOT EXISTS "participant_mode" "text",
    ADD COLUMN IF NOT EXISTS "participant_min" integer,
    ADD COLUMN IF NOT EXISTS "participant_max" integer,
    ADD COLUMN IF NOT EXISTS "participant_fit_validated" boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN "public"."shared_activity_candidates"."participant_mode" IS
    'single | group — who the activity is designed for';
COMMENT ON COLUMN "public"."shared_activity_candidates"."participant_min" IS
    'Minimum participating children';
COMMENT ON COLUMN "public"."shared_activity_candidates"."participant_max" IS
    'Maximum participating children';

CREATE INDEX IF NOT EXISTS "shared_activity_candidates_participant_idx"
    ON "public"."shared_activity_candidates" ("participant_mode", "participant_min", "participant_max")
    WHERE "is_active" = true;

CREATE INDEX IF NOT EXISTS "preset_activities_participant_idx"
    ON "public"."preset_activities" ("participant_mode", "participant_min", "participant_max");
