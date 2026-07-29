// server/middleware/requirePaidSubscription.js

import { getUserEntitlement } from "../lib/entitlements.js";

/*
 * Block every OpenAI-backed route unless the user has an active
 * or trialing subscription.
 */
export async function requirePaidSubscription(req, res, next) {
    if (!req.auth?.userId) {
        return res.status(500).json({
            error: "Authenticated user information is unavailable.",
            code: "AUTH_CONTEXT_MISSING",
        });
    }

    try {
        const entitlement = await getUserEntitlement(
            req.auth.userId
        );

        req.entitlement = entitlement;

        if (!entitlement.isPaid) {
            return res.status(402).json({
                error:
                    "A paid subscription is required to generate personalized activities.",
                code: "SUBSCRIPTION_REQUIRED",
                entitlement,
            });
        }

        return next();
    } catch (error) {
        console.error("Subscription entitlement error:", error);

        return res.status(500).json({
            error: "Could not verify the subscription.",
            code: "SUBSCRIPTION_CHECK_FAILED",
        });
    }
}