-- Per-child outcomes for activity sessions (group/family play).

CREATE TABLE IF NOT EXISTS "public"."activity_session_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "child_id" "text" NOT NULL,
    "engagement_rating" "text",
    "completion_status" "text",
    "rejection_reason" "text",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "left_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_session_participants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_session_participants_session_id_fkey"
        FOREIGN KEY ("session_id")
        REFERENCES "public"."activity_sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "activity_session_participants_session_child_unique"
        UNIQUE ("session_id", "child_id")
);

CREATE INDEX IF NOT EXISTS "activity_session_participants_session_idx"
    ON "public"."activity_session_participants" ("session_id");

CREATE INDEX IF NOT EXISTS "activity_session_participants_child_idx"
    ON "public"."activity_session_participants" ("child_id");

ALTER TABLE "public"."activity_session_participants" OWNER TO "postgres";
ALTER TABLE "public"."activity_session_participants" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."activity_session_participants" TO "service_role";
REVOKE ALL ON TABLE "public"."activity_session_participants" FROM "anon", "authenticated";

COMMENT ON TABLE "public"."activity_session_participants" IS
    'Individual child outcomes for a shared activity session.';
