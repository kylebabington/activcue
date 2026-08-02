/*
 * Optional group/family session metadata.
 * single = one primary child; group = multi-child shared session.
 */
alter table public.activity_sessions
add column if not exists session_scope text
not null
default 'single';

alter table public.activity_sessions
add column if not exists participant_child_ids jsonb
not null
default '[]'::jsonb;

comment on column public.activity_sessions.session_scope is
  'single | group — whether the session was for one child or multiple participants';

comment on column public.activity_sessions.participant_child_ids is
  'JSON array of child ids who participated in a group session';
