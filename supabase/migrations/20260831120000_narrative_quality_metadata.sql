-- Narrative quality metadata for shared activity cache (V4 imaginative causal story).

ALTER TABLE public.shared_activity_candidates
  ADD COLUMN IF NOT EXISTS quality_contract_version integer,
  ADD COLUMN IF NOT EXISTS narrative_validated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS narrative_validation_status text
    DEFAULT 'unchecked'
    CHECK (
      narrative_validation_status IN ('valid', 'invalid', 'legacy', 'unchecked')
    ),
  ADD COLUMN IF NOT EXISTS narrative_validation_errors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS narrative_validated_at timestamptz;

COMMENT ON COLUMN public.shared_activity_candidates.quality_contract_version IS
  'Denormalized qualityContractVersion from activity_data.';
COMMENT ON COLUMN public.shared_activity_candidates.narrative_validated IS
  'True when V4 imaginative activity passed narrative quality validation.';
COMMENT ON COLUMN public.shared_activity_candidates.narrative_validation_status IS
  'valid | invalid | legacy | unchecked — V2/V3 imaginative are legacy.';

-- Existing imaginative rows are legacy until regenerated as V4.
UPDATE public.shared_activity_candidates
SET narrative_validation_status = 'legacy',
    narrative_validated = false
WHERE activity_style = 'imaginative'
  AND (activity_format_version IS NULL OR activity_format_version < 4);
