-- Persist AI-generated activity categories and traits on sessions.

ALTER TABLE "public"."activity_sessions"
    ADD COLUMN IF NOT EXISTS "activity_categories" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    ADD COLUMN IF NOT EXISTS "activity_traits" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL;

COMMENT ON COLUMN "public"."activity_sessions"."activity_categories" IS
    'Structured play categories from generation (e.g. building, creative).';

COMMENT ON COLUMN "public"."activity_sessions"."activity_traits" IS
    'Structured traits: setupEffort, structure, socialMode, creativity, movement.';
