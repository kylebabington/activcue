-- Persist the actual selected playing children (not just activity_mode / active_child_id).

ALTER TABLE "public"."family_settings"
    ADD COLUMN IF NOT EXISTS "playing_child_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL;

COMMENT ON COLUMN "public"."family_settings"."playing_child_ids" IS
    'Child profile ids currently selected to play. Source of truth for participant selection; activity_mode and active_child_id are derived from this list.';
