-- Sparse product analytics events (server-written via service role).
-- Do not store free-text child notes or prompts in properties.

CREATE TABLE IF NOT EXISTS "public"."product_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_name" "text" NOT NULL,
    "properties" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_events_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "product_events_created_idx"
    ON "public"."product_events" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "product_events_user_created_idx"
    ON "public"."product_events" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "product_events_name_created_idx"
    ON "public"."product_events" ("event_name", "created_at" DESC);

ALTER TABLE "public"."product_events" OWNER TO "postgres";

ALTER TABLE "public"."product_events" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."product_events" TO "service_role";

REVOKE ALL ON TABLE "public"."product_events" FROM "anon";
REVOKE ALL ON TABLE "public"."product_events" FROM "authenticated";
