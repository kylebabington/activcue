-- Display-ready validation metadata for shared activity cache.
-- Quarantine invalid rows via is_active=false; do not DELETE (preserves impressions).

ALTER TABLE public.shared_activity_candidates
  ADD COLUMN IF NOT EXISTS display_validated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_validation_status text
    DEFAULT 'unchecked'
    CHECK (
      display_validation_status IN ('valid', 'invalid', 'unchecked')
    ),
  ADD COLUMN IF NOT EXISTS display_validation_errors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS display_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS activity_format_version integer;

COMMENT ON COLUMN public.shared_activity_candidates.display_validated IS
  'True when activity_data passed validateActivityForDisplay on raw content.';
COMMENT ON COLUMN public.shared_activity_candidates.display_validation_status IS
  'valid | invalid | unchecked — set by audit / ingest gates.';
COMMENT ON COLUMN public.shared_activity_candidates.display_validation_errors IS
  'Array of display validation error codes from the last audit or gate.';
COMMENT ON COLUMN public.shared_activity_candidates.activity_format_version IS
  'Denormalized activityFormatVersion from activity_data for filtering.';

-- Backfill format version from JSON when present.
UPDATE public.shared_activity_candidates
SET activity_format_version = COALESCE(
  activity_format_version,
  NULLIF(activity_data->>'activityFormatVersion', '')::integer
)
WHERE activity_format_version IS NULL
  AND activity_data ? 'activityFormatVersion';
