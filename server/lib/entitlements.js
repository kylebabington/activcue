// server/lib/entitlements.js

import { getSupabaseAdminClient } from "./supabaseAdminClient.js";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
    "active",
    "trialing",
]);

function periodHasNotExpired(currentPeriodEnd) {
    /*
     * No recorded end date: trust subscription status alone.
     * Stripe-backed rows always include current_period_end; when a date is
     * present it must still be in the future.
     */
    if (!currentPeriodEnd) {
        return true;
    }

    const expirationTime = new Date(currentPeriodEnd).getTime();

    if (!Number.isFinite(expirationTime)) {
        return false;
    }

    return expirationTime > Date.now();
}

function isPaidSubscription(subscription) {
    const status = subscription?.status || "inactive";
    const currentPeriodEnd = subscription?.current_period_end;

    if (ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
        return periodHasNotExpired(currentPeriodEnd);
    }

    /*
     * Stripe often stores status as "canceled" while access continues until
     * current_period_end. Require a future end date so a canceled row with
     * no period does not grant open-ended access.
     */
    if (status === "canceled") {
        return Boolean(currentPeriodEnd) && periodHasNotExpired(currentPeriodEnd);
    }

    return false;
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

    const isPaid = isPaidSubscription(subscription);

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
