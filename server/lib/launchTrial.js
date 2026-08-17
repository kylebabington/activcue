// server/lib/launchTrial.js

import { getSupabaseAdminClient } from "./supabaseAdminClient.js";

const DEFAULT_LAUNCH_TRIAL_LIMIT = 20;
const DEFAULT_LAUNCH_TRIAL_DAYS = 7;
const DEFAULT_RESERVATION_TTL_MINUTES = 30;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function getLaunchTrialLimit() {
  return parsePositiveInt(
    process.env.LAUNCH_TRIAL_LIMIT,
    DEFAULT_LAUNCH_TRIAL_LIMIT
  );
}

export function getLaunchTrialDays() {
  return parsePositiveInt(
    process.env.LAUNCH_TRIAL_DAYS,
    DEFAULT_LAUNCH_TRIAL_DAYS
  );
}

export function getLaunchTrialReservationTtlMinutes() {
  return parsePositiveInt(
    process.env.LAUNCH_TRIAL_RESERVATION_TTL_MINUTES,
    DEFAULT_RESERVATION_TTL_MINUTES
  );
}

/**
 * Whether this reserve result should attach trial_period_days to Checkout.
 * Redeemed claims stay "eligible" for the program but must not start a second trial.
 */
export function shouldApplyLaunchTrial(reservation) {
  return (
    reservation?.eligible === true && reservation?.status === "reserved"
  );
}

export async function reserveLaunchTrial(userId) {
  if (!userId) {
    return { eligible: false, status: null, created: false };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("reserve_launch_trial", {
    p_user_id: userId,
    p_limit: getLaunchTrialLimit(),
    p_ttl_minutes: getLaunchTrialReservationTtlMinutes(),
  });

  if (error) {
    throw error;
  }

  return {
    eligible: data?.eligible === true,
    status:
      typeof data?.status === "string" ? data.status : null,
    created: data?.created === true,
  };
}

export async function attachCheckoutSessionToClaim(userId, sessionId) {
  if (!userId || !sessionId) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("launch_trial_claims")
    .update({ stripe_session_id: sessionId })
    .eq("user_id", userId)
    .eq("status", "reserved");

  if (error) {
    throw error;
  }
}

/**
 * Expire a reserved claim immediately (e.g. Stripe session create failed).
 * Does not touch redeemed claims.
 */
export async function releaseLaunchTrialReservation(userId) {
  if (!userId) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("launch_trial_claims")
    .update({ expires_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "reserved");

  if (error) {
    throw error;
  }
}

export async function redeemLaunchTrialClaim(userId, sessionId = null) {
  if (!userId) {
    return { redeemed: false, status: null };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("redeem_launch_trial", {
    p_user_id: userId,
    p_stripe_session_id: sessionId,
  });

  if (error) {
    throw error;
  }

  return {
    redeemed: data?.redeemed === true,
    status: typeof data?.status === "string" ? data.status : null,
  };
}

/**
 * Public offer flag for pricing UI. Exposes the cap size, not remaining spots.
 */
export async function getLaunchTrialOfferStatus() {
  const days = getLaunchTrialDays();
  const limit = getLaunchTrialLimit();

  try {
    const supabase = getSupabaseAdminClient();
    const nowIso = new Date().toISOString();

    const { count: redeemedCount, error: redeemedError } = await supabase
      .from("launch_trial_claims")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "redeemed");

    if (redeemedError) {
      throw redeemedError;
    }

    const { count: reservedCount, error: reservedError } = await supabase
      .from("launch_trial_claims")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "reserved")
      .gt("expires_at", nowIso);

    if (reservedError) {
      throw reservedError;
    }

    const validCount = (redeemedCount || 0) + (reservedCount || 0);

    return {
      available: validCount < limit,
      days,
      limit,
    };
  } catch (error) {
    console.error("Could not load launch trial offer status:", error);
    return {
      available: false,
      days,
      limit,
    };
  }
}

/**
 * Live 20-cap snapshot for Admin Growth. Throws on query failure so the
 * dashboard can fail this panel without taking down the funnel.
 */
export async function getLaunchTrialAdminSummary() {
  const limit = getLaunchTrialLimit();
  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: redeemedRows, error: redeemedError } = await supabase
    .from("launch_trial_claims")
    .select("user_id")
    .eq("status", "redeemed");

  if (redeemedError) {
    throw redeemedError;
  }

  const { count: reservedCount, error: reservedError } = await supabase
    .from("launch_trial_claims")
    .select("user_id", { count: "exact", head: true })
    .eq("status", "reserved")
    .gt("expires_at", nowIso);

  if (reservedError) {
    throw reservedError;
  }

  const userIds = (redeemedRows || [])
    .map((row) => row.user_id)
    .filter(Boolean);
  const claimed = userIds.length;
  const inCheckout = reservedCount || 0;
  const remaining = Math.max(0, limit - claimed - inCheckout);

  let convertedToPaid = 0;
  if (userIds.length > 0) {
    const { count: convertedCount, error: convertedError } = await supabase
      .from("subscriptions")
      .select("user_id", { count: "exact", head: true })
      .in("user_id", userIds)
      .in("status", ["active", "past_due"]);

    if (convertedError) {
      throw convertedError;
    }

    convertedToPaid = convertedCount || 0;
  }

  return {
    limit,
    claimed,
    inCheckout,
    remaining,
    convertedToPaid,
  };
}
