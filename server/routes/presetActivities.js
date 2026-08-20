// server/routes/presetActivities.js

import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import { getUserEntitlement } from "../lib/entitlements.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { enrichActivityForServe } from "../utils/enrichActivityForServe.js";

const router = Router();

const VALID_ACTIVITY_STYLES = new Set([
    "simple",
    "imaginative",
]);

/*
 * Determine whether this specific activity's complete instructions
 * may be returned to the current user.
 */
function activityIsUnlocked(
    activity,
    profile,
    entitlement
) {
    if (entitlement.hasPlusAccess) {
        return true;
    }

    if (activity.activity_style === "simple") {
        return true;
    }

    return (
        profile.free_imaginative_activity_id === activity.id
    );
}

/*
 * Convert a database activity into the frontend activity shape.
 *
 * Locked imaginative activities intentionally omit full_content.
 */
function formatPresetActivity(
    activity,
    profile,
    entitlement
) {
    const isUnlocked = activityIsUnlocked(
        activity,
        profile,
        entitlement
    );

    const safePreview = {
        id: activity.id,
        slug: activity.slug,
        source: "preset",
        title: activity.title,
        summary: activity.summary,
        theme: activity.theme,
        estimatedMinutes: activity.estimated_minutes,
        activityStyle: activity.activity_style,
        isUnlocked,
        isLocked: !isUnlocked,
    };

    if (!isUnlocked) {
        return safePreview;
    }

    const fullContent =
        activity.full_content && typeof activity.full_content === "object"
            ? activity.full_content
            : {};

    const enriched = enrichActivityForServe(
        {
            ...fullContent,
            ...safePreview,
        },
        activity.activity_style || fullContent.activityStyle || "imaginative",
        []
    );

    return {
        ...enriched,
        ...safePreview,
    };
}

function buildEntitlementResponse(
    req,
    entitlement,
    profile = req.profile
) {
    return {
        isAnonymous: req.auth.isAnonymous,
        isPaid: entitlement.isPaid,
        hasPlusAccess: entitlement.hasPlusAccess,
        billingExempt: entitlement.billingExempt,
        role: entitlement.role,
        isAdmin: entitlement.isAdmin,
        canGenerateWithAi:
            entitlement.canGenerateWithAi,
        canUseAiHints: entitlement.canUseAiHints,
        subscriptionStatus:
            entitlement.subscriptionStatus,
        currentPeriodEnd:
            entitlement.currentPeriodEnd,
        cancelAtPeriodEnd:
            entitlement.cancelAtPeriodEnd,
        freeImaginativeActivityId:
            profile.free_imaginative_activity_id,
    };
}

/*
 * GET /api/preset-activities
 *
 * Optional:
 *
 *   /api/preset-activities?style=simple
 *   /api/preset-activities?style=imaginative
 */
router.get(
    "/preset-activities",
    requireAuthenticatedUser,
    ensureUserProfile,
    async (req, res) => {
        const requestedStyle =
            typeof req.query.style === "string"
                ? req.query.style.trim().toLowerCase()
                : "";

        if (
            requestedStyle &&
            !VALID_ACTIVITY_STYLES.has(requestedStyle)
        ) {
            return res.status(400).json({
                error:
                    "Activity style must be simple or imaginative.",
                code: "INVALID_ACTIVITY_STYLE",
            });
        }

        try {
            const supabaseAdmin =
                getSupabaseAdminClient();

            const entitlement =
                await getUserEntitlement(req.auth.userId);

            let activityQuery = supabaseAdmin
                .from("preset_activities")
                .select(
                    [
                        "id",
                        "slug",
                        "title",
                        "summary",
                        "theme",
                        "estimated_minutes",
                        "activity_style",
                        "full_content",
                        "display_order",
                    ].join(",")
                )
                .eq("is_active", true)
                .order("display_order", {
                    ascending: true,
                });

            if (requestedStyle) {
                activityQuery = activityQuery.eq(
                    "activity_style",
                    requestedStyle
                );
            }

            const {
                data: activities,
                error: activitiesError,
            } = await activityQuery;

            if (activitiesError) {
                throw activitiesError;
            }

            const formattedActivities = activities.map(
                (activity) =>
                    formatPresetActivity(
                        activity,
                        req.profile,
                        entitlement
                    )
            );

            // Keep display_order so clients can rotate a stable curated sequence.
            return res.json({
                activities: formattedActivities,
                entitlement: buildEntitlementResponse(
                    req,
                    entitlement
                ),
            });
        } catch (error) {
            console.error(
                "Preset activity library error:",
                error
            );

            return res.status(500).json({
                error:
                    "Could not load the preset activities.",
                code: "PRESET_LIBRARY_LOAD_FAILED",
            });
        }
    }
);

/*
 * POST /api/preset-activities/:activityId/unlock
 *
 * For an unpaid user:
 *
 * - simple presets are already unlocked
 * - the first imaginative selection succeeds
 * - later attempts for a different imaginative activity fail
 *
 * The UPDATE is atomic because it only succeeds while
 * free_imaginative_activity_id IS NULL.
 */
router.post(
    "/preset-activities/:activityId/unlock",
    requireAuthenticatedUser,
    ensureUserProfile,
    async (req, res) => {
        const activityId = req.params.activityId;

        try {
            const supabaseAdmin =
                getSupabaseAdminClient();

            const entitlement =
                await getUserEntitlement(req.auth.userId);

            const {
                data: activity,
                error: activityError,
            } = await supabaseAdmin
                .from("preset_activities")
                .select(
                    [
                        "id",
                        "slug",
                        "title",
                        "summary",
                        "theme",
                        "estimated_minutes",
                        "activity_style",
                        "full_content",
                        "display_order",
                    ].join(",")
                )
                .eq("id", activityId)
                .eq("is_active", true)
                .maybeSingle();

            if (activityError) {
                throw activityError;
            }

            if (!activity) {
                return res.status(404).json({
                    error: "Preset activity not found.",
                    code: "PRESET_ACTIVITY_NOT_FOUND",
                });
            }

            /*
             * Simple activities and all paid activities are already available.
             */
            if (
                activity.activity_style === "simple" ||
                entitlement.hasPlusAccess
            ) {
                return res.json({
                    activity: formatPresetActivity(
                        activity,
                        req.profile,
                        entitlement
                    ),
                    entitlement:
                        buildEntitlementResponse(
                            req,
                            entitlement
                        ),
                });
            }

            const currentFreeActivityId =
                req.profile.free_imaginative_activity_id;

            /*
             * The user already selected this exact imaginative activity.
             */
            if (currentFreeActivityId === activity.id) {
                return res.json({
                    activity: formatPresetActivity(
                        activity,
                        req.profile,
                        entitlement
                    ),
                    entitlement:
                        buildEntitlementResponse(
                            req,
                            entitlement
                        ),
                });
            }

            /*
             * The user selected a different free imaginative activity previously.
             */
            if (currentFreeActivityId) {
                return res.status(403).json({
                    error:
                        "Your free imaginative activity has already been selected.",
                    code: "FREE_IMAGINATIVE_UNLOCK_USED",
                    entitlement:
                        buildEntitlementResponse(
                            req,
                            entitlement
                        ),
                });
            }

            /*
             * Atomic first-selection update.
             *
             * Two simultaneous requests cannot both succeed because the WHERE
             * condition requires the field to still be null.
             */
            const {
                data: updatedProfile,
                error: updateError,
            } = await supabaseAdmin
                .from("profiles")
                .update({
                    free_imaginative_activity_id:
                        activity.id,
                })
                .eq("user_id", req.auth.userId)
                .is(
                    "free_imaginative_activity_id",
                    null
                )
                .select(
                    [
                        "user_id",
                        "is_anonymous",
                        "free_imaginative_activity_id",
                        "stripe_customer_id",
                        "created_at",
                        "updated_at",
                    ].join(",")
                )
                .maybeSingle();

            if (updateError) {
                throw updateError;
            }

            /*
             * If another request won the race, reload the profile and determine
             * which activity was actually selected.
             */
            let finalProfile = updatedProfile;

            if (!finalProfile) {
                const {
                    data: reloadedProfile,
                    error: reloadError,
                } = await supabaseAdmin
                    .from("profiles")
                    .select(
                        [
                            "user_id",
                            "is_anonymous",
                            "free_imaginative_activity_id",
                            "stripe_customer_id",
                            "created_at",
                            "updated_at",
                        ].join(",")
                    )
                    .eq("user_id", req.auth.userId)
                    .single();

                if (reloadError) {
                    throw reloadError;
                }

                finalProfile = reloadedProfile;
            }

            if (
                finalProfile
                    .free_imaginative_activity_id !==
                activity.id
            ) {
                return res.status(403).json({
                    error:
                        "Your free imaginative activity has already been selected.",
                    code: "FREE_IMAGINATIVE_UNLOCK_USED",
                    entitlement:
                        buildEntitlementResponse(
                            req,
                            entitlement,
                            finalProfile
                        ),
                });
            }

            return res.json({
                activity: formatPresetActivity(
                    activity,
                    finalProfile,
                    entitlement
                ),
                entitlement:
                    buildEntitlementResponse(
                        req,
                        entitlement,
                        finalProfile
                    ),
            });
        } catch (error) {
            console.error(
                "Preset activity unlock error:",
                error
            );

            return res.status(500).json({
                error:
                    "Could not unlock the preset activity.",
                code: "PRESET_UNLOCK_FAILED",
            });
        }
    }
);

export default router;