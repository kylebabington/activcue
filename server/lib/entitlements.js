// server/lib/entitlements.js

import { getSupabaseAdminClient } from "./supabaseAdminClient.js";

const PAID_SUBSCRIPTION_STATUSES = new Set([
    "active",
    "trialing",
]);

function periodHasNotExpired(currentPeriodEnd) {
    if (!currentPeriodEnd) {
        return true;
    }

    const expirationTime = new Date(currentPeriodEnd).getTime();

    if (!Number.isFinite(expirationTime)) {
        return false;
    }

    return expirationTime > Date.now();
}

/*
 * Return the current server-trusted subscription entitlement.
 */
export async function getUserEntitlement(userId) {
    const supabaseAdmin = getSupabaseAdminClient();

    const {
        data: subscription,
        error,
    } = await supabaseAdmin
        .from("subscriptions")
        .select(
            [
                "status",
                "stripe_price_id",
                "current_period_end",
            ].join(",")
        )
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    const subscriptionStatus =
        subscription?.status || "inactive";

    const isPaid =
        PAID_SUBSCRIPTION_STATUSES.has(subscriptionStatus) &&
        periodHasNotExpired(subscription?.current_period_end);

    return {
        isPaid,
        canGenerateWithAi: isPaid,
        canUseAiHints: isPaid,
        subscriptionStatus,
        stripePriceId: subscription?.stripe_price_id || null,
        currentPeriodEnd:
            subscription?.current_period_end || null,
    };
}