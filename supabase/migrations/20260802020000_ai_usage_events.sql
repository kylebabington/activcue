-- AI usage logging for cost visibility per paid family.

CREATE TABLE IF NOT EXISTS "public"."ai_usage_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "operation" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "success" boolean DEFAULT true NOT NULL,
    CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_usage_events_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ai_usage_events_user_created_idx"
    ON "public"."ai_usage_events" ("user_id", "created_at" DESC);

ALTER TABLE "public"."ai_usage_events" OWNER TO "postgres";

ALTER TABLE "public"."ai_usage_events" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."ai_usage_events" TO "service_role";

REVOKE ALL ON TABLE "public"."ai_usage_events" FROM "anon";
REVOKE ALL ON TABLE "public"."ai_usage_events" FROM "authenticated";
