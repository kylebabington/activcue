-- Cross-account shared activity candidate library for Plan B / Rescue.

CREATE TABLE IF NOT EXISTS "public"."shared_activity_candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content_hash" "text" NOT NULL,
    "activity_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "activity_style" "text",
    "categories" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "traits" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "energy" "text",
    "mess" "text",
    "adult_help" "text",
    "estimated_minutes" integer,
    "supplies" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "source" "text" DEFAULT 'ai'::"text" NOT NULL,
    "times_served" integer DEFAULT 0 NOT NULL,
    "times_started" integer DEFAULT 0 NOT NULL,
    "times_completed" integer DEFAULT 0 NOT NULL,
    "times_rejected" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shared_activity_candidates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shared_activity_candidates_content_hash_key" UNIQUE ("content_hash"),
    CONSTRAINT "shared_activity_candidates_source_check"
        CHECK (("source" = ANY (ARRAY['ai'::"text", 'preset-import'::"text"])))
);

CREATE INDEX IF NOT EXISTS "shared_activity_candidates_active_style_idx"
    ON "public"."shared_activity_candidates" ("is_active", "activity_style", "estimated_minutes");

CREATE TABLE IF NOT EXISTS "public"."user_candidate_impressions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "times_shown" integer DEFAULT 1 NOT NULL,
    "times_started" integer DEFAULT 0 NOT NULL,
    "times_rejected" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_candidate_impressions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_candidate_impressions_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE,
    CONSTRAINT "user_candidate_impressions_candidate_id_fkey"
        FOREIGN KEY ("candidate_id")
        REFERENCES "public"."shared_activity_candidates"("id") ON DELETE CASCADE,
    CONSTRAINT "user_candidate_impressions_user_candidate_unique"
        UNIQUE ("user_id", "candidate_id")
);

CREATE INDEX IF NOT EXISTS "user_candidate_impressions_user_idx"
    ON "public"."user_candidate_impressions" ("user_id", "last_seen_at" DESC);

ALTER TABLE "public"."shared_activity_candidates" OWNER TO "postgres";
ALTER TABLE "public"."user_candidate_impressions" OWNER TO "postgres";

ALTER TABLE "public"."shared_activity_candidates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_candidate_impressions" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."shared_activity_candidates" TO "service_role";
GRANT ALL ON TABLE "public"."user_candidate_impressions" TO "service_role";

REVOKE ALL ON TABLE "public"."shared_activity_candidates" FROM "anon", "authenticated";
REVOKE ALL ON TABLE "public"."user_candidate_impressions" FROM "anon", "authenticated";
