-- Close the browser INSERT path for user_feedback.
-- Writes now go through POST /api/feedback (service_role).

DROP POLICY IF EXISTS user_feedback_insert_own ON public.user_feedback;

REVOKE INSERT ON TABLE public.user_feedback FROM authenticated;
