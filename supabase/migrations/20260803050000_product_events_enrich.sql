-- Enrich product_events for funnel analytics.

ALTER TABLE "public"."product_events"
    ADD COLUMN IF NOT EXISTS "session_id" "text",
    ADD COLUMN IF NOT EXISTS "app_version" "text";

CREATE INDEX IF NOT EXISTS "product_events_session_idx"
    ON "public"."product_events" ("session_id")
    WHERE "session_id" IS NOT NULL;
