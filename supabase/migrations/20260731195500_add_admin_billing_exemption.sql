/*
 * Separate account permissions from Stripe billing.
 *
 * role:
 *   user  -> normal FamilyFlow account
 *   admin -> may access future administrator-only routes
 *
 * billing_exempt:
 *   true  -> receives FamilyFlow Plus without a Stripe subscription
 *   false -> requires a valid Stripe subscription for Plus
 */

alter table public.profiles
add column if not exists role text
not null
default 'user';

alter table public.profiles
add column if not exists billing_exempt boolean
not null
default false;

/*
 * Prevent unexpected or misspelled role values.
 */
do $$
begin
  alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin'));
exception
  when duplicate_object then null;
end
$$;

/*
 * Useful if administrator accounts are queried later.
 */
create index if not exists profiles_role_idx
on public.profiles (role);