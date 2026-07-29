-- supabase/migrations/20260728_001_create_core_tables.sql

/*
 * FAMILY ACTIVITY HELPER — CORE DATABASE TABLES
 * =============================================
 *
 * This migration creates:
 *
 * 1. profiles
 *    One row per Supabase Auth user.
 *
 * 2. activity_batches
 *    One row for each set of generated activity suggestions.
 *
 * 3. activity_ideas
 *    The individual activities generated inside a batch.
 *
 * 4. subscriptions
 *    Trusted subscription status written by the Express server and,
 *    later, verified Stripe webhooks.
 *
 * 5. usage_events
 *    Server-controlled audit and usage records.
 */

begin;

/*
 * PROFILES
 * --------
 *
 * user_id is the same UUID stored in auth.users.
 *
 * The browser is never trusted to change:
 *
 * - free_batch_used
 * - free_activity_id
 * - stripe_customer_id
 */
create table if not exists public.profiles (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  is_anonymous boolean not null default true,

  free_batch_used boolean not null default false,

  /*
   * The foreign-key constraint is added later because activity_ideas
   * has not been created yet.
   */
  free_activity_id uuid null,

  stripe_customer_id text unique null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

/*
 * ACTIVITY BATCHES
 * ----------------
 *
 * One activity generation request creates one batch.
 *
 * A batch will generally contain three activity ideas.
 */
create table if not exists public.activity_batches (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.profiles(user_id)
    on delete cascade,

  created_at timestamptz not null default now()
);

/*
 * ACTIVITY IDEAS
 * --------------
 *
 * Preview fields are stored separately from full_content so Express can
 * intentionally choose which values it returns to the browser.
 *
 * The browser will not receive direct SELECT permission for this table.
 */
create table if not exists public.activity_ideas (
  id uuid primary key default gen_random_uuid(),

  batch_id uuid not null
    references public.activity_batches(id)
    on delete cascade,

  user_id uuid not null
    references public.profiles(user_id)
    on delete cascade,

  title text not null,

  summary text not null,

  estimated_minutes integer not null
    check (
      estimated_minutes >= 1
      and estimated_minutes <= 480
    ),

  activity_style text not null
    check (
      activity_style in ('simple', 'imaginative')
    ),

  /*
   * This JSON contains the complete generated activity:
   *
   * - supplies
   * - instructions
   * - steps
   * - mission
   * - roles
   * - starter prompts
   * - extensions
   * - safety details
   *
   * Express controls whether this content may be returned.
   */
  full_content jsonb not null,

  created_at timestamptz not null default now()
);

/*
 * Add the free activity foreign key after activity_ideas exists.
 *
 * The DO block prevents this constraint from being added twice when the
 * migration is accidentally rerun.
 */
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_free_activity_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_free_activity_id_fkey
      foreign key (free_activity_id)
      references public.activity_ideas(id)
      on delete set null;
  end if;
end
$$;

/*
 * SUBSCRIPTIONS
 * -------------
 *
 * This table will eventually be updated only by verified Stripe webhooks.
 *
 * user_id references auth.users (not profiles) so a trusted writer can
 * record paid status before the lazy profiles row is created on first
 * Express request.
 *
 * The browser must never be allowed to mark itself as paid.
 */
create table if not exists public.subscriptions (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  stripe_customer_id text unique null,

  stripe_subscription_id text unique null,

  stripe_price_id text null,

  status text not null default 'inactive',

  current_period_end timestamptz null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

/*
 * USAGE EVENTS
 * ------------
 *
 * user_id is nullable because some future abuse events may happen before
 * authentication succeeds.
 *
 * ip_hash stores a one-way HMAC hash later. Raw IP addresses should not be
 * stored here.
 */
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),

  user_id uuid null
    references public.profiles(user_id)
    on delete set null,

  ip_hash text null,

  event_type text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

/*
 * INDEXES
 * -------
 *
 * These support common authorization and usage queries.
 */
create index if not exists activity_batches_user_id_created_at_idx
  on public.activity_batches(user_id, created_at desc);

create index if not exists activity_ideas_user_id_created_at_idx
  on public.activity_ideas(user_id, created_at desc);

create index if not exists activity_ideas_batch_id_idx
  on public.activity_ideas(batch_id);

create index if not exists usage_events_user_id_created_at_idx
  on public.usage_events(user_id, created_at desc);

create index if not exists usage_events_ip_hash_created_at_idx
  on public.usage_events(ip_hash, created_at desc);

create index if not exists usage_events_event_type_created_at_idx
  on public.usage_events(event_type, created_at desc);

/*
 * UPDATED_AT TRIGGER
 * ------------------
 *
 * This reusable trigger function updates updated_at whenever a row changes.
 */
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at
  on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at
  on public.subscriptions;

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

/*
 * ROW LEVEL SECURITY
 * ------------------
 *
 * RLS is enabled on every public table.
 */
alter table public.profiles
  enable row level security;

alter table public.activity_batches
  enable row level security;

alter table public.activity_ideas
  enable row level security;

alter table public.subscriptions
  enable row level security;

alter table public.usage_events
  enable row level security;

/*
 * PROFILES POLICY
 * ---------------
 *
 * Authenticated users may read only their own profile.
 *
 * There is intentionally no INSERT, UPDATE, or DELETE policy for users.
 * Express performs trusted writes with the server-only Supabase secret key.
 */
drop policy if exists "Users can read their own profile"
  on public.profiles;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

/*
 * ACTIVITY BATCH POLICY
 * ---------------------
 *
 * Users may see that their own batches exist.
 *
 * Express still controls activity generation and batch creation.
 */
drop policy if exists "Users can read their own activity batches"
  on public.activity_batches;

create policy "Users can read their own activity batches"
on public.activity_batches
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

/*
 * SUBSCRIPTION POLICY
 * -------------------
 *
 * Users may read their own subscription state.
 *
 * They receive no INSERT, UPDATE, or DELETE policy.
 */
drop policy if exists "Users can read their own subscription"
  on public.subscriptions;

create policy "Users can read their own subscription"
on public.subscriptions
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

/*
 * ACTIVITY IDEAS
 * --------------
 *
 * There is intentionally no browser SELECT policy.
 *
 * The table contains full_content. Allowing a normal row SELECT policy would
 * expose the complete locked activity through Supabase's Data API.
 *
 * Express will use the server-only secret key and return either:
 *
 * - preview fields only
 * - or an authorized complete activity
 */

/*
 * USAGE EVENTS
 * ------------
 *
 * There is intentionally no browser policy.
 *
 * These records are server-controlled.
 */

/*
 * TABLE PRIVILEGES
 * ----------------
 *
 * Explicitly establish least-privilege browser access.
 */

/* Anonymous users have no direct table access. */
revoke all on table public.profiles
  from anon;

revoke all on table public.activity_batches
  from anon;

revoke all on table public.activity_ideas
  from anon;

revoke all on table public.subscriptions
  from anon;

revoke all on table public.usage_events
  from anon;

/* Authenticated users receive read-only access to safe tables. */
revoke all on table public.profiles
  from authenticated;

grant select on table public.profiles
  to authenticated;

revoke all on table public.activity_batches
  from authenticated;

grant select on table public.activity_batches
  to authenticated;

revoke all on table public.subscriptions
  from authenticated;

grant select on table public.subscriptions
  to authenticated;

/*
 * The browser receives no privileges for activity_ideas or usage_events.
 */
revoke all on table public.activity_ideas
  from authenticated;

revoke all on table public.usage_events
  from authenticated;

/*
 * The server role receives complete access.
 */
grant all on table public.profiles
  to service_role;

grant all on table public.activity_batches
  to service_role;

grant all on table public.activity_ideas
  to service_role;

grant all on table public.subscriptions
  to service_role;

grant all on table public.usage_events
  to service_role;

commit;