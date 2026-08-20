-- Age Fit Hardening: first-class age metadata on library + presets.
-- Nullable initially; backfill from existing JSON ageFit claims (unvalidated).

ALTER TABLE public.shared_activity_candidates
  ADD COLUMN IF NOT EXISTS age_min integer,
  ADD COLUMN IF NOT EXISTS age_max integer,
  ADD COLUMN IF NOT EXISTS target_ages integer[],
  ADD COLUMN IF NOT EXISTS maturity_level text,
  ADD COLUMN IF NOT EXISTS age_fit_version integer,
  ADD COLUMN IF NOT EXISTS age_fit_validated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS age_fit_reviewed_at timestamptz;

ALTER TABLE public.preset_activities
  ADD COLUMN IF NOT EXISTS age_min integer,
  ADD COLUMN IF NOT EXISTS age_max integer,
  ADD COLUMN IF NOT EXISTS target_ages integer[],
  ADD COLUMN IF NOT EXISTS maturity_level text,
  ADD COLUMN IF NOT EXISTS age_fit_version integer,
  ADD COLUMN IF NOT EXISTS age_fit_validated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS age_fit_reviewed_at timestamptz;

-- Backfill shared candidates from activity_data.ageFit (imported claims, not trusted).
UPDATE public.shared_activity_candidates
SET
  age_min = COALESCE(
    age_min,
    NULLIF(activity_data->'ageFit'->>'minAge', '')::integer
  ),
  age_max = COALESCE(
    age_max,
    NULLIF(activity_data->'ageFit'->>'maxAge', '')::integer
  ),
  target_ages = COALESCE(
    target_ages,
    CASE
      WHEN jsonb_typeof(activity_data->'ageFit'->'targetAges') = 'array'
      THEN ARRAY(
        SELECT jsonb_array_elements_text(activity_data->'ageFit'->'targetAges')::integer
      )
      ELSE NULL
    END
  ),
  maturity_level = COALESCE(
    maturity_level,
    NULLIF(activity_data->'ageFit'->>'maturityLevel', '')
  ),
  age_fit_version = COALESCE(age_fit_version, 1),
  age_fit_validated = COALESCE(age_fit_validated, false)
WHERE activity_data ? 'ageFit';

-- Backfill presets from full_content.ageFit.
UPDATE public.preset_activities
SET
  age_min = COALESCE(
    age_min,
    NULLIF(full_content->'ageFit'->>'minAge', '')::integer
  ),
  age_max = COALESCE(
    age_max,
    NULLIF(full_content->'ageFit'->>'maxAge', '')::integer
  ),
  target_ages = COALESCE(
    target_ages,
    CASE
      WHEN jsonb_typeof(full_content->'ageFit'->'targetAges') = 'array'
      THEN ARRAY(
        SELECT jsonb_array_elements_text(full_content->'ageFit'->'targetAges')::integer
      )
      ELSE NULL
    END
  ),
  maturity_level = COALESCE(
    maturity_level,
    NULLIF(full_content->'ageFit'->>'maturityLevel', '')
  ),
  age_fit_version = COALESCE(age_fit_version, 1),
  age_fit_validated = COALESCE(age_fit_validated, false)
WHERE full_content ? 'ageFit';

CREATE INDEX IF NOT EXISTS shared_activity_candidates_age_range_idx
  ON public.shared_activity_candidates (age_min, age_max)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS shared_activity_candidates_age_validated_idx
  ON public.shared_activity_candidates (age_min, age_max)
  WHERE is_active = true AND age_fit_validated = true;

CREATE INDEX IF NOT EXISTS preset_activities_age_range_idx
  ON public.preset_activities (age_min, age_max)
  WHERE is_active = true;
