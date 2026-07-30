-- Per-user durable family settings (phase 1).
-- Express writes via the service role; RLS stays deny-all for anon/authenticated.

CREATE TABLE IF NOT EXISTS "public"."family_settings" (
    "user_id" "uuid" NOT NULL,
    "activity_mode" "text" DEFAULT 'single-child'::"text" NOT NULL,
    "active_child_id" "text" DEFAULT ''::"text" NOT NULL,
    "active_parent_preset_key" "text" DEFAULT ''::"text" NOT NULL,
    "child_profiles" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "inventory" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "safety_settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "current_moment" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "custom_parent_presets" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "family_settings_activity_mode_check" CHECK (
        ("activity_mode" = ANY (ARRAY['single-child'::"text", 'family'::"text"]))
    )
);

ALTER TABLE "public"."family_settings" OWNER TO "postgres";

ALTER TABLE ONLY "public"."family_settings"
    ADD CONSTRAINT "family_settings_pkey" PRIMARY KEY ("user_id");

ALTER TABLE ONLY "public"."family_settings"
    ADD CONSTRAINT "family_settings_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "public"."profiles"("user_id")
    ON DELETE CASCADE;

CREATE OR REPLACE TRIGGER "family_settings_set_updated_at"
    BEFORE UPDATE ON "public"."family_settings"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."set_updated_at"();

ALTER TABLE "public"."family_settings" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."family_settings" TO "service_role";

REVOKE REFERENCES ON TABLE "public"."family_settings" FROM "anon";
REVOKE TRIGGER ON TABLE "public"."family_settings" FROM "anon";
REVOKE TRUNCATE ON TABLE "public"."family_settings" FROM "anon";

REVOKE REFERENCES ON TABLE "public"."family_settings" FROM "authenticated";
REVOKE TRIGGER ON TABLE "public"."family_settings" FROM "authenticated";
REVOKE TRUNCATE ON TABLE "public"."family_settings" FROM "authenticated";
