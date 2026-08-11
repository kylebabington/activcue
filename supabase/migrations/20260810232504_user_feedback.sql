-- In-app product feedback (separate from support email).
-- Authenticated users insert/select their own rows; admins manage all via is_admin().

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (user_id) ON DELETE CASCADE,
  category text NOT NULL,
  message text NOT NULL,
  page text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_feedback_category_check CHECK (
    category = ANY (
      ARRAY[
        'bug'::text,
        'idea'::text,
        'liked'::text,
        'other'::text
      ]
    )
  ),
  CONSTRAINT user_feedback_status_check CHECK (
    status = ANY (
      ARRAY[
        'new'::text,
        'reviewed'::text,
        'planned'::text,
        'resolved'::text
      ]
    )
  ),
  CONSTRAINT user_feedback_message_length CHECK (
    char_length(message) BETWEEN 1 AND 4000
  )
);

CREATE INDEX IF NOT EXISTS user_feedback_created_idx
  ON public.user_feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS user_feedback_status_created_idx
  ON public.user_feedback (status, created_at DESC);

CREATE INDEX IF NOT EXISTS user_feedback_user_created_idx
  ON public.user_feedback (user_id, created_at DESC);

ALTER TABLE public.user_feedback OWNER TO postgres;

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.user_feedback TO authenticated;
GRANT ALL ON TABLE public.user_feedback TO service_role;

REVOKE ALL ON TABLE public.user_feedback FROM anon;

CREATE POLICY user_feedback_insert_own
  ON public.user_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_feedback_select_own_or_admin
  ON public.user_feedback
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY user_feedback_update_admin
  ON public.user_feedback
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
