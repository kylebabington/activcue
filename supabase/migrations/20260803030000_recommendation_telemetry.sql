-- Recommendation telemetry: durable presented/started timing + rejection reasons.

ALTER TABLE "public"."activity_sessions"
    ADD COLUMN IF NOT EXISTS "candidate_id" "uuid",
    ADD COLUMN IF NOT EXISTS "recommendation_batch_id" "uuid",
    ADD COLUMN IF NOT EXISTS "presented_at" timestamp with time zone,
    ADD COLUMN IF NOT EXISTS "selected_at" timestamp with time zone,
    ADD COLUMN IF NOT EXISTS "rejection_reason" "text";

CREATE INDEX IF NOT EXISTS "activity_sessions_candidate_idx"
    ON "public"."activity_sessions" ("candidate_id")
    WHERE "candidate_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "activity_sessions_batch_idx"
    ON "public"."activity_sessions" ("recommendation_batch_id")
    WHERE "recommendation_batch_id" IS NOT NULL;

COMMENT ON COLUMN "public"."activity_sessions"."presented_at" IS
    'When this recommendation was shown to the parent/child.';
COMMENT ON COLUMN "public"."activity_sessions"."selected_at" IS
    'When the activity was selected before start.';
