-- Store non-sensitive generation context on recommendation batches.

ALTER TABLE public.recommendation_batches
  ADD COLUMN IF NOT EXISTS generation_context jsonb DEFAULT '{}'::jsonb;
