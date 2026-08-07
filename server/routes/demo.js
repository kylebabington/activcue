// server/routes/demo.js

import { Router } from "express";
import {
  decideDemoFreeUnlockClaim,
  resolveDemoUnlockPresetId,
} from "../lib/claimDemoFreeUnlock.js";
import { getUserEntitlement } from "../lib/entitlements.js";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { authRateLimiter } from "../middleware/rateLimits.js";

const router = Router();

const PROFILE_SELECT = [
  "user_id",
  "is_anonymous",
  "free_imaginative_activity_id",
  "stripe_customer_id",
  "role",
  "billing_exempt",
  "created_at",
  "updated_at",
].join(",");

function buildEntitlementPayload(req, entitlement, profile) {
  return {
    isAnonymous: req.auth.isAnonymous,
    isPaid: entitlement.isPaid,
    hasPlusAccess: entitlement.hasPlusAccess,
    billingExempt: entitlement.billingExempt,
    role: entitlement.role,
    isAdmin: entitlement.isAdmin,
    canGenerateWithAi: entitlement.canGenerateWithAi,
    canUseAiHints: entitlement.canUseAiHints,
    subscriptionStatus: entitlement.subscriptionStatus,
    currentPeriodEnd: entitlement.currentPeriodEnd,
    cancelAtPeriodEnd: entitlement.cancelAtPeriodEnd,
    freeImaginativeActivityId: profile?.free_imaginative_activity_id ?? null,
  };
}

/*
 * POST /api/demo/claim-free-unlock
 *
 * Consumes the visitor's one free imaginative unlock while they are in the
 * public /demo experience. Requires a Supabase session (anonymous is OK).
 * Sets profiles.free_imaginative_activity_id so signup conversion keeps it.
 */
router.post(
  "/demo/claim-free-unlock",
  authRateLimiter,
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) => {
    const activitySlug =
      typeof req.body?.activitySlug === "string"
        ? req.body.activitySlug.trim()
        : "";

    try {
      const supabaseAdmin = getSupabaseAdminClient();
      const entitlement = await getUserEntitlement(req.auth.userId);

      if (entitlement.hasPlusAccess) {
        return res.json({
          claimed: true,
          alreadyClaimed: true,
          entitlement: buildEntitlementPayload(
            req,
            entitlement,
            req.profile
          ),
        });
      }

      const currentId = req.profile.free_imaginative_activity_id;

      const { data: presets, error: presetError } = await supabaseAdmin
        .from("preset_activities")
        .select("id, slug, activity_style")
        .eq("is_active", true);

      if (presetError) {
        throw presetError;
      }

      const unlockPresetId = resolveDemoUnlockPresetId(
        activitySlug,
        presets
      );

      const decision = decideDemoFreeUnlockClaim({
        currentFreeImaginativeActivityId: currentId,
        unlockPresetId,
      });

      if (decision.status === "already") {
        return res.json({
          claimed: true,
          alreadyClaimed: true,
          freeImaginativeActivityId: decision.freeImaginativeActivityId,
          entitlement: buildEntitlementPayload(
            req,
            entitlement,
            req.profile
          ),
        });
      }

      if (decision.status === "conflict") {
        return res.status(403).json({
          error:
            decision.freeImaginativeActivityId
              ? "Your free full-activity unlock has already been used."
              : "Could not claim a free unlock for this demo activity.",
          code: "FREE_IMAGINATIVE_UNLOCK_USED",
          entitlement: buildEntitlementPayload(
            req,
            entitlement,
            req.profile
          ),
        });
      }

      const {
        data: updatedProfile,
        error: updateError,
      } = await supabaseAdmin
        .from("profiles")
        .update({
          free_imaginative_activity_id: unlockPresetId,
        })
        .eq("user_id", req.auth.userId)
        .is("free_imaginative_activity_id", null)
        .select(PROFILE_SELECT)
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      let finalProfile = updatedProfile;

      if (!finalProfile) {
        const {
          data: reloadedProfile,
          error: reloadError,
        } = await supabaseAdmin
          .from("profiles")
          .select(PROFILE_SELECT)
          .eq("user_id", req.auth.userId)
          .maybeSingle();

        if (reloadError) {
          throw reloadError;
        }

        finalProfile = reloadedProfile;

        if (
          finalProfile?.free_imaginative_activity_id &&
          finalProfile.free_imaginative_activity_id !== unlockPresetId
        ) {
          return res.status(403).json({
            error: "Your free full-activity unlock has already been used.",
            code: "FREE_IMAGINATIVE_UNLOCK_USED",
            entitlement: buildEntitlementPayload(
              req,
              entitlement,
              finalProfile
            ),
          });
        }
      }

      req.profile = finalProfile || req.profile;

      return res.json({
        claimed: true,
        alreadyClaimed: false,
        freeImaginativeActivityId:
          req.profile.free_imaginative_activity_id,
        entitlement: buildEntitlementPayload(
          req,
          entitlement,
          req.profile
        ),
      });
    } catch (error) {
      console.error("Demo free unlock claim failed:", error);
      return res.status(500).json({
        error: "Could not claim the free demo unlock.",
        code: "DEMO_UNLOCK_CLAIM_FAILED",
      });
    }
  }
);

export default router;
