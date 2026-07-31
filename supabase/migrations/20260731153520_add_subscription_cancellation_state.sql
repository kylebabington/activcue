/*
 * Store scheduled Stripe subscription cancellation state.
 *
 * A subscription can remain active while cancel_at_period_end is true.
 * The user keeps paid access until current_period_end, but Stripe will not
 * renew the subscription afterward.
 */

alter table public.subscriptions
add column if not exists cancel_at_period_end boolean
not null
default false;