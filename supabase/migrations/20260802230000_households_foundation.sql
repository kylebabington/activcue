-- Household sharing foundation (schema only — no full sharing UI yet).
-- Children and inventory remain on family_settings for now.
-- family_settings.household_id is a nullable future FK placeholder.

CREATE TABLE IF NOT EXISTS "public"."households" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "households_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "households_created_by_fkey" FOREIGN KEY ("created_by")
        REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "public"."household_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'owner'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id")
        REFERENCES "public"."households"("id") ON DELETE CASCADE,
    CONSTRAINT "household_members_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE,
    CONSTRAINT "household_members_role_check" CHECK (
        ("role" = ANY (ARRAY['owner'::"text", 'member'::"text", 'viewer'::"text"]))
    ),
    CONSTRAINT "household_members_household_user_unique" UNIQUE ("household_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "household_members_user_idx"
    ON "public"."household_members" ("user_id");

CREATE INDEX IF NOT EXISTS "household_members_household_idx"
    ON "public"."household_members" ("household_id");

ALTER TABLE "public"."households" OWNER TO "postgres";
ALTER TABLE "public"."household_members" OWNER TO "postgres";

ALTER TABLE "public"."households" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."household_members" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."households" TO "service_role";
GRANT ALL ON TABLE "public"."household_members" TO "service_role";

REVOKE ALL ON TABLE "public"."households" FROM "anon";
REVOKE ALL ON TABLE "public"."households" FROM "authenticated";
REVOKE ALL ON TABLE "public"."household_members" FROM "anon";
REVOKE ALL ON TABLE "public"."household_members" FROM "authenticated";

-- Future FK only: children/inventory stay on family_settings until sharing UI.
ALTER TABLE "public"."family_settings"
    ADD COLUMN IF NOT EXISTS "household_id" "uuid";

COMMENT ON COLUMN "public"."family_settings"."household_id" IS
    'Nullable future FK to households.id. Children and inventory stay on this row until sharing ships.';

COMMENT ON TABLE "public"."households" IS
    'Household sharing foundation. Product UI for invites/sharing is not wired yet.';
