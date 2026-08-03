-- AI usage response id + total tokens for unit economics.

ALTER TABLE "public"."ai_usage_events"
    ADD COLUMN IF NOT EXISTS "response_id" "text",
    ADD COLUMN IF NOT EXISTS "total_tokens" integer;

CREATE INDEX IF NOT EXISTS "ai_usage_events_response_id_idx"
    ON "public"."ai_usage_events" ("response_id")
    WHERE "response_id" IS NOT NULL;
