-- Household invites + backfill + household_id on family-owned tables.

CREATE TABLE IF NOT EXISTS "public"."household_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "token" "text" NOT NULL,
    "invited_by" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    CONSTRAINT "household_invites_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "household_invites_household_id_fkey"
        FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE,
    CONSTRAINT "household_invites_invited_by_fkey"
        FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL,
    CONSTRAINT "household_invites_token_key" UNIQUE ("token"),
    CONSTRAINT "household_invites_role_check"
        CHECK (("role" = ANY (ARRAY['owner'::"text", 'member'::"text", 'viewer'::"text"]))),
    CONSTRAINT "household_invites_status_check"
        CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'revoked'::"text"])))
);

CREATE INDEX IF NOT EXISTS "household_invites_email_idx"
    ON "public"."household_invites" ("email");

ALTER TABLE "public"."household_invites" OWNER TO "postgres";
ALTER TABLE "public"."household_invites" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE "public"."household_invites" TO "service_role";
REVOKE ALL ON TABLE "public"."household_invites" FROM "anon", "authenticated";

-- Backfill one household per profile that lacks membership.
DO $$
DECLARE
  profile_row RECORD;
  new_household_id uuid;
BEGIN
  FOR profile_row IN
    SELECT p.user_id
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.household_members hm WHERE hm.user_id = p.user_id
    )
  LOOP
    INSERT INTO public.households (name, created_by)
    VALUES ('Family', profile_row.user_id)
    RETURNING id INTO new_household_id;

    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (new_household_id, profile_row.user_id, 'owner')
    ON CONFLICT (household_id, user_id) DO NOTHING;

    UPDATE public.family_settings
    SET household_id = new_household_id
    WHERE user_id = profile_row.user_id
      AND (household_id IS NULL OR household_id IS DISTINCT FROM new_household_id);
  END LOOP;
END $$;

ALTER TABLE "public"."activity_sessions"
    ADD COLUMN IF NOT EXISTS "household_id" "uuid";
ALTER TABLE "public"."activity_events"
    ADD COLUMN IF NOT EXISTS "household_id" "uuid";
ALTER TABLE "public"."saved_activities"
    ADD COLUMN IF NOT EXISTS "household_id" "uuid";
ALTER TABLE "public"."product_events"
    ADD COLUMN IF NOT EXISTS "household_id" "uuid";
ALTER TABLE "public"."user_candidate_impressions"
    ADD COLUMN IF NOT EXISTS "household_id" "uuid";

-- Formalize backend-only access for household tables (already revoked in foundation).
REVOKE ALL ON TABLE "public"."households" FROM "anon", "authenticated";
REVOKE ALL ON TABLE "public"."household_members" FROM "anon", "authenticated";
