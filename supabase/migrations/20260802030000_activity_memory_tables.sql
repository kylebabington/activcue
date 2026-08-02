-- First-class favorites and activity event history (replaces JSON-only memory).

CREATE TABLE IF NOT EXISTS "public"."saved_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "saved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "saved_activities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "saved_activities_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "saved_activities_user_saved_idx"
    ON "public"."saved_activities" ("user_id", "saved_at" DESC);

CREATE TABLE IF NOT EXISTS "public"."activity_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "child_id" "text" DEFAULT ''::"text" NOT NULL,
    "activity_id" "text",
    "activity_title" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "activity_style" "text",
    "energy" "text",
    "mess" "text",
    "adult_help" "text",
    "estimated_minutes" integer,
    "uses" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_events_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "activity_events_user_created_idx"
    ON "public"."activity_events" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "activity_events_user_child_idx"
    ON "public"."activity_events" ("user_id", "child_id", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "public"."activity_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "child_id" "text" DEFAULT ''::"text" NOT NULL,
    "activity_title" "text" NOT NULL,
    "activity_style" "text",
    "requested_minutes" integer,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "parent_activity" "text",
    "parent_availability" "text",
    "space" "text",
    "noise_limit" "text",
    "mess_limit" "text",
    "supervision_level" "text",
    "activity_energy" "text",
    "activity_mess" "text",
    "activity_adult_help" "text",
    "activity_supplies" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "actual_minutes" integer,
    "completion_status" "text",
    "independence_rating" "text",
    "cleanup_rating" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_sessions_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "activity_sessions_user_started_idx"
    ON "public"."activity_sessions" ("user_id", "started_at" DESC);

ALTER TABLE "public"."saved_activities" OWNER TO "postgres";
ALTER TABLE "public"."activity_events" OWNER TO "postgres";
ALTER TABLE "public"."activity_sessions" OWNER TO "postgres";

ALTER TABLE "public"."saved_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."activity_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."activity_sessions" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."saved_activities" TO "service_role";
GRANT ALL ON TABLE "public"."activity_events" TO "service_role";
GRANT ALL ON TABLE "public"."activity_sessions" TO "service_role";

REVOKE ALL ON TABLE "public"."saved_activities" FROM "anon", "authenticated";
REVOKE ALL ON TABLE "public"."activity_events" FROM "anon", "authenticated";
REVOKE ALL ON TABLE "public"."activity_sessions" FROM "anon", "authenticated";
