/*
 * subscriptions.user_id must reference auth.users, not profiles.
 *
 * Profiles are created lazily on the first authenticated Express request.
 * A trusted writer (e.g. Stripe webhook) may insert a subscription before
 * that profile row exists; the old profiles FK blocked that path.
 *
 * Source migrations already use auth.users for new installs; this alters
 * databases that were created with the previous profiles FK.
 */

alter table public.subscriptions
  drop constraint if exists subscriptions_user_id_fkey;

alter table public.subscriptions
  add constraint subscriptions_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;
