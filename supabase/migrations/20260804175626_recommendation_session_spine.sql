-- Recommendation session spine: immutable moments + durable batch/candidate rows.

CREATE TABLE IF NOT EXISTS "public"."activity_moments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "household_id" "uuid",
    "available_minutes" integer,
    "parent_activity" "text",
    "availability" "text",
    "space" "text",
    "mess_level" "text",
    "noise_level" "text",
    "supervision_level" "text",
    "child_ids" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "child_count" integer DEFAULT 0 NOT NULL,
    "kid_mood" "text",
    "rescue_mode" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_moments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_moments_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "activity_moments_user_created_idx"
    ON "public"."activity_moments" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "activity_moments_household_created_idx"
    ON "public"."activity_moments" ("household_id", "created_at" DESC)
    WHERE "household_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "public"."recommendation_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "household_id" "uuid",
    "moment_id" "uuid",
    "source" "text" NOT NULL,
    "mode" "text" DEFAULT 'normal'::"text" NOT NULL,
    "model" "text",
    "latency_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recommendation_batches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recommendation_batches_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE,
    CONSTRAINT "recommendation_batches_moment_id_fkey" FOREIGN KEY ("moment_id")
        REFERENCES "public"."activity_moments"("id") ON DELETE SET NULL,
    CONSTRAINT "recommendation_batches_source_check" CHECK (
        ("source" = ANY (ARRAY[
            'openai'::"text",
            'shared_library'::"text",
            'current_batch'::"text",
            'curated'::"text",
            'templates'::"text"
        ]))
    ),
    CONSTRAINT "recommendation_batches_mode_check" CHECK (
        ("mode" = ANY (ARRAY['normal'::"text", 'rescue'::"text"]))
    )
);

CREATE INDEX IF NOT EXISTS "recommendation_batches_user_created_idx"
    ON "public"."recommendation_batches" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "recommendation_batches_moment_idx"
    ON "public"."recommendation_batches" ("moment_id")
    WHERE "moment_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "public"."recommendation_candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recommendation_batch_id" "uuid" NOT NULL,
    "shared_candidate_id" "uuid",
    "position" integer NOT NULL DEFAULT 0,
    "fit_score" numeric(8, 3),
    "source" "text",
    "title" "text",
    "categories" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "traits" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "presented_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recommendation_candidates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recommendation_candidates_batch_id_fkey" FOREIGN KEY ("recommendation_batch_id")
        REFERENCES "public"."recommendation_batches"("id") ON DELETE CASCADE,
    CONSTRAINT "recommendation_candidates_shared_candidate_id_fkey" FOREIGN KEY ("shared_candidate_id")
        REFERENCES "public"."shared_activity_candidates"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "recommendation_candidates_batch_idx"
    ON "public"."recommendation_candidates" ("recommendation_batch_id", "position");

CREATE INDEX IF NOT EXISTS "recommendation_candidates_shared_idx"
    ON "public"."recommendation_candidates" ("shared_candidate_id")
    WHERE "shared_candidate_id" IS NOT NULL;

ALTER TABLE "public"."activity_sessions"
    ADD COLUMN IF NOT EXISTS "moment_id" "uuid";

CREATE INDEX IF NOT EXISTS "activity_sessions_moment_idx"
    ON "public"."activity_sessions" ("moment_id")
    WHERE "moment_id" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activity_sessions_moment_id_fkey'
  ) THEN
    ALTER TABLE "public"."activity_sessions"
      ADD CONSTRAINT "activity_sessions_moment_id_fkey"
      FOREIGN KEY ("moment_id") REFERENCES "public"."activity_moments"("id") ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE "public"."ai_usage_events"
    ADD COLUMN IF NOT EXISTS "recommendation_batch_id" "uuid",
    ADD COLUMN IF NOT EXISTS "household_id" "uuid";

CREATE INDEX IF NOT EXISTS "ai_usage_events_batch_idx"
    ON "public"."ai_usage_events" ("recommendation_batch_id")
    WHERE "recommendation_batch_id" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_events_batch_id_fkey'
  ) THEN
    ALTER TABLE "public"."ai_usage_events"
      ADD CONSTRAINT "ai_usage_events_batch_id_fkey"
      FOREIGN KEY ("recommendation_batch_id")
      REFERENCES "public"."recommendation_batches"("id") ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE "public"."activity_moments" OWNER TO "postgres";
ALTER TABLE "public"."recommendation_batches" OWNER TO "postgres";
ALTER TABLE "public"."recommendation_candidates" OWNER TO "postgres";

ALTER TABLE "public"."activity_moments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."recommendation_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."recommendation_candidates" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."activity_moments" TO "service_role";
GRANT ALL ON TABLE "public"."recommendation_batches" TO "service_role";
GRANT ALL ON TABLE "public"."recommendation_candidates" TO "service_role";

REVOKE ALL ON TABLE "public"."activity_moments" FROM "anon", "authenticated";
REVOKE ALL ON TABLE "public"."recommendation_batches" FROM "anon", "authenticated";
REVOKE ALL ON TABLE "public"."recommendation_candidates" FROM "anon", "authenticated";

COMMENT ON TABLE "public"."activity_moments" IS
  'Immutable snapshot of the parent situation at recommend/rescue time.';
COMMENT ON TABLE "public"."recommendation_batches" IS
  'One row per recommendation request (AI, library, curated, templates).';
COMMENT ON TABLE "public"."recommendation_candidates" IS
  'Impression row for each candidate shown in a batch.';
