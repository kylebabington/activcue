-- Launch offer: first N ActivCue Plus checkouts get a card-required free trial.
-- Reservations are server-only (service_role). Clients never set trial eligibility.

CREATE TABLE IF NOT EXISTS public.launch_trial_claims (
  user_id uuid NOT NULL,
  status text NOT NULL,
  stripe_session_id text,
  reserved_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  redeemed_at timestamp with time zone,
  CONSTRAINT launch_trial_claims_pkey PRIMARY KEY (user_id),
  CONSTRAINT launch_trial_claims_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT launch_trial_claims_status_check CHECK (
    status = ANY (ARRAY['reserved'::text, 'redeemed'::text])
  )
);

ALTER TABLE public.launch_trial_claims OWNER TO postgres;

ALTER TABLE public.launch_trial_claims ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.launch_trial_claims TO service_role;

REVOKE ALL ON TABLE public.launch_trial_claims FROM anon;
REVOKE ALL ON TABLE public.launch_trial_claims FROM authenticated;

CREATE INDEX IF NOT EXISTS launch_trial_claims_valid_idx
  ON public.launch_trial_claims (status, expires_at);

/*
 * Atomically reserve one of the launch-trial spots for a user.
 *
 * Returns jsonb:
 *   { "eligible": true,  "status": "reserved"|"redeemed", "created": boolean }
 *   { "eligible": false, "status": null, "created": false }
 */
CREATE OR REPLACE FUNCTION public.reserve_launch_trial(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_ttl_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing public.launch_trial_claims%ROWTYPE;
  valid_count integer;
  new_expires timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'p_limit must be at least 1';
  END IF;

  IF p_ttl_minutes IS NULL OR p_ttl_minutes < 1 THEN
    RAISE EXCEPTION 'p_ttl_minutes must be at least 1';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('launch_trial_claims'));

  SELECT *
  INTO existing
  FROM public.launch_trial_claims
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF FOUND THEN
    IF existing.status = 'redeemed' THEN
      RETURN jsonb_build_object(
        'eligible', true,
        'status', 'redeemed',
        'created', false
      );
    END IF;

    IF existing.status = 'reserved' AND existing.expires_at > now() THEN
      RETURN jsonb_build_object(
        'eligible', true,
        'status', 'reserved',
        'created', false
      );
    END IF;
  END IF;

  SELECT count(*)::integer
  INTO valid_count
  FROM public.launch_trial_claims
  WHERE status = 'redeemed'
     OR (status = 'reserved' AND expires_at > now());

  IF valid_count >= p_limit THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'status', NULL,
      'created', false
    );
  END IF;

  new_expires := now() + make_interval(mins => p_ttl_minutes);

  INSERT INTO public.launch_trial_claims AS claim (
    user_id,
    status,
    stripe_session_id,
    reserved_at,
    expires_at,
    redeemed_at
  )
  VALUES (
    p_user_id,
    'reserved',
    NULL,
    now(),
    new_expires,
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    status = 'reserved',
    stripe_session_id = NULL,
    reserved_at = now(),
    expires_at = EXCLUDED.expires_at,
    redeemed_at = NULL
  WHERE claim.status = 'reserved'
    AND claim.expires_at <= now();

  RETURN jsonb_build_object(
    'eligible', true,
    'status', 'reserved',
    'created', true
  );
END;
$$;

ALTER FUNCTION public.reserve_launch_trial(uuid, integer, integer) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.reserve_launch_trial(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_launch_trial(uuid, integer, integer) TO service_role;

/*
 * Mark a reserved launch trial as redeemed after Checkout completes.
 * Idempotent when already redeemed.
 */
CREATE OR REPLACE FUNCTION public.redeem_launch_trial(
  p_user_id uuid,
  p_stripe_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row public.launch_trial_claims%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  UPDATE public.launch_trial_claims
  SET
    status = 'redeemed',
    redeemed_at = coalesce(redeemed_at, now()),
    stripe_session_id = coalesce(
      nullif(p_stripe_session_id, ''),
      stripe_session_id
    ),
    expires_at = greatest(expires_at, now())
  WHERE user_id = p_user_id
    AND status IN ('reserved', 'redeemed')
  RETURNING * INTO updated_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'redeemed', false,
      'status', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'redeemed', true,
    'status', updated_row.status
  );
END;
$$;

ALTER FUNCTION public.redeem_launch_trial(uuid, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.redeem_launch_trial(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_launch_trial(uuid, text) TO service_role;
