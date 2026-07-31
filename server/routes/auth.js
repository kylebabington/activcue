// server/routes/auth.js

import { Router } from "express";
import { checkEmailAvailabilityForUser } from "../lib/authEmailAvailability.js";
import { getUserEntitlement } from "../lib/entitlements.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";

const router = Router();

/*
 * GET /api/auth/me
 *
 * Return safe identity, profile, and entitlement information.
 */
router.get(
  "/auth/me",
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) => {
    try {
      const entitlement =
        await getUserEntitlement(req.auth.userId);

      return res.json({
        user: {
          id: req.auth.userId,
          isAnonymous: req.auth.isAnonymous,
          email: req.auth.user.email || null,
        },

        profile: {
          userId: req.profile.user_id,
          isAnonymous:
            req.profile.is_anonymous,
          freeImaginativeActivityId:
            req.profile
              .free_imaginative_activity_id,
          hasStripeCustomer: Boolean(
            req.profile.stripe_customer_id
          ),
          createdAt: req.profile.created_at,
          updatedAt: req.profile.updated_at,
        },

        entitlement: {
          isPaid: entitlement.isPaid,
          canGenerateWithAi:
            entitlement.canGenerateWithAi,
          canUseAiHints:
            entitlement.canUseAiHints,
          subscriptionStatus:
            entitlement.subscriptionStatus,
          currentPeriodEnd:
            entitlement.currentPeriodEnd,
          cancelAtPeriodEnd:
            entitlement.cancelAtPeriodEnd,
          freeImaginativeActivityId:
            req.profile
              .free_imaginative_activity_id,
        },
      });
    } catch (error) {
      console.error(
        "Could not load current user entitlement:",
        error
      );

      return res.status(500).json({
        error:
          "Could not load the current user.",
        code: "CURRENT_USER_LOAD_FAILED",
      });
    }
  }
);

/*
 * POST /api/auth/check-email
 *
 * Body: { "email": "parent@example.com" }
 *
 * Used during anonymous → permanent conversion so we do not send a
 * confirmation email for an address that already belongs to another account.
 */
router.post(
  "/auth/check-email",
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) => {
    try {
      const result =
        await checkEmailAvailabilityForUser({
          email: req.body?.email,
          currentUserId: req.auth.userId,
        });

      if (result.code === "INVALID_EMAIL") {
        return res.status(400).json({
          error: result.error,
          code: result.code,
          available: false,
        });
      }

      if (!result.available) {
        return res.status(409).json({
          error:
            "That email may already belong to an account. Log in instead, or use a different email.",
          code: "EMAIL_ALREADY_REGISTERED",
          available: false,
          email: result.email,
        });
      }

      return res.json({
        available: true,
        email: result.email,
      });
    } catch (error) {
      console.error(
        "Could not check email availability:",
        error
      );

      return res.status(500).json({
        error:
          "Could not verify whether that email is available.",
        code: "EMAIL_CHECK_FAILED",
      });
    }
  }
);

export default router;
