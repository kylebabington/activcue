-- Enrich AI usage events for cost accounting and latency review.

ALTER TABLE "public"."ai_usage_events"
    ADD COLUMN IF NOT EXISTS "model" "text",
    ADD COLUMN IF NOT EXISTS "input_tokens" integer,
    ADD COLUMN IF NOT EXISTS "output_tokens" integer,
    ADD COLUMN IF NOT EXISTS "estimated_cost" numeric(12, 6),
    ADD COLUMN IF NOT EXISTS "latency_ms" integer,
    ADD COLUMN IF NOT EXISTS "failure_type" "text";

-- success already exists from the original migration; keep idempotent.
ALTER TABLE "public"."ai_usage_events"
    ALTER COLUMN "success" SET DEFAULT true;

CREATE INDEX IF NOT EXISTS "ai_usage_events_user_operation_created_idx"
    ON "public"."ai_usage_events" ("user_id", "operation", "created_at" DESC);
