// server/lib/subscriptionStore.js

import { getSupabaseAdminClient } from "./supabaseAdminClient.js";

/*
 * These values match the subscriptions_status_check constraint in Supabase.
 *
 * Keeping the allowed values here prevents a future or preview Stripe status
 * from causing every webhook retry to fail at the database layer.
 */
const VALID_SUBSCRIPTION_STATUSES = new Set([
  "inactive",
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
]);

export function normalizeSubscriptionStatus(status) {
  if (
    typeof status === "string" &&
    VALID_SUBSCRIPTION_STATUSES.has(status)
  ) {
    return status;
  }

  return "inactive";
}

function asUnixSecondsToIso(value) {
  if (value == null) {
    return null;
  }

  const seconds = Number(value);

  if (!Number.isFinite(seconds)) {
    return null;
  }

  return new Date(seconds * 1000).toISOString();
}

/*
 * Prefer subscription.current_period_end; fall back to the first item when the
 * API version places the period on subscription items instead.
 */
export function getSubscriptionPeriodEnd(
  subscription
) {
  if (
    !subscription ||
    typeof subscription !== "object"
  ) {
    return null;
  }

  const subscriptionItems = Array.isArray(
    subscription.items?.data
  )
    ? subscription.items.data
    : [];

  /*
   * Current Stripe API versions place the billing period on subscription
   * items. ActivCue currently creates one item, but using the latest item
   * end also remains safe if another recurring item is introduced later.
   */
  const itemPeriodEnds = subscriptionItems
    .map(
      (item) =>
        item?.current_period_end
    )
    .map(Number)
    .filter(Number.isFinite);

  if (itemPeriodEnds.length > 0) {
    return asUnixSecondsToIso(
      Math.max(...itemPeriodEnds)
    );
  }

  /*
   * Compatibility fallback for older Stripe API responses.
   */
  if (
    subscription.current_period_end !=
    null
  ) {
    return asUnixSecondsToIso(
      subscription.current_period_end
    );
  }

  return null;
}

export function getSubscriptionPriceId(subscription) {
  const price = subscription?.items?.data?.[0]?.price;

  if (!price) {
    return null;
  }

  return typeof price === "string" ? price : price.id || null;
}

/*
 * Retrieve the billing record that belongs to one ActivCue user.
 *
 * Routes use this server-side lookup instead of accepting a Stripe
 * subscription ID from the browser.
 */
export async function getSubscriptionRecordForUser(
  userId
) {
  if (!userId) {
    throw new Error(
      "Cannot retrieve a subscription without a user id."
    );
  }

  const supabaseAdmin =
    getSupabaseAdminClient();

  const {
    data: subscription,
    error,
  } = await supabaseAdmin
    .from("subscriptions")
    .select(
      [
        "user_id",
        "stripe_customer_id",
        "stripe_subscription_id",
        "stripe_price_id",
        "status",
        "current_period_end",
        "cancel_at_period_end",
      ].join(",")
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return subscription || null;
}

/*
 * Persist Stripe customer + subscription identifiers for a ActivCue user.
 */
export async function upsertSubscriptionFromCheckout({
  userId,
  customerId,
  subscription,
}) {
  if (!userId) {
    throw new Error(
      "Cannot upsert subscription without a user id."
    );
  }

  if (!customerId) {
    throw new Error(
      "Cannot upsert subscription without a Stripe customer id."
    );
  }

  if (!subscription?.id) {
    throw new Error(
      "Cannot upsert subscription without a Stripe subscription."
    );
  }

  return persistSubscriptionRow({
    userId,
    customerId,
    subscription,
  });
}

/*
 * Sync subscription state from Stripe subscription.* webhook events.
 *
 * Resolves the ActivCue user via metadata, an existing subscriptions row,
 * or profiles.stripe_customer_id.
 */
export async function upsertSubscriptionFromStripe(subscription) {
  if (!subscription?.id) {
    throw new Error(
      "Cannot upsert subscription without a Stripe subscription."
    );
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id || null;

  if (!customerId) {
    throw new Error(
      `Stripe subscription ${subscription.id} is missing a customer id.`
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const metadataUserId =
    subscription.metadata?.user_id ||
    subscription.metadata?.supabase_user_id ||
    null;

  let userId = metadataUserId || null;

  if (!userId) {
    const {
      data: existingSubscription,
      error: subscriptionLookupError,
    } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    if (subscriptionLookupError) {
      throw subscriptionLookupError;
    }

    userId = existingSubscription?.user_id || null;
  }

  if (!userId) {
    const {
      data: existingByCustomer,
      error: customerSubscriptionLookupError,
    } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (customerSubscriptionLookupError) {
      throw customerSubscriptionLookupError;
    }

    userId = existingByCustomer?.user_id || null;
  }

  if (!userId) {
    const {
      data: profile,
      error: profileLookupError,
    } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    userId = profile?.user_id || null;
  }

  if (!userId) {
    throw new Error(
      `Could not resolve ActivCue user for Stripe subscription ${subscription.id}.`
    );
  }

  return persistSubscriptionRow({
    userId,
    customerId,
    subscription,
  });
}

async function persistSubscriptionRow({
  userId,
  customerId,
  subscription,
}) {
  const supabaseAdmin = getSupabaseAdminClient();
  const stripePriceId =
    getSubscriptionPriceId(
      subscription
    );

  const currentPeriodEnd =
    getSubscriptionPeriodEnd(
      subscription
    );

  const status =
    normalizeSubscriptionStatus(
      subscription.status
    );

  /*
   * Stripe keeps the subscription active while this is true.
   *
   * The customer retains paid access until currentPeriodEnd, but Stripe will
   * not renew the subscription after that date.
   */
  const cancelAtPeriodEnd =
    Boolean(
      subscription.cancel_at_period_end
    );

  const {
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
    })
    .eq("user_id", userId);

  if (profileError) {
    throw profileError;
  }

  const {
    error: subscriptionError,
  } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: stripePriceId,
        status,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
      },
      {
        onConflict: "user_id",
      }
    );

  if (subscriptionError) {
    throw subscriptionError;
  }

  return {
    userId,
    customerId,
    subscriptionId: subscription.id,
    stripePriceId,
    status,
    currentPeriodEnd,
    cancelAtPeriodEnd,
  };
}
