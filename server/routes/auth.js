// server/routes/auth.js

import { Router } from "express";
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

export default router;