// server/routes/auth.js

import { Router } from "express";
import { checkEmailAvailabilityForUser } from "../lib/authEmailAvailability.js";
import { convertAnonymousUser } from "../lib/convertAnonymousUser.js";
import { recordProductEvent } from "../lib/recordProductEvent.js";
import { getUserEntitlement } from "../lib/entitlements.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { authRateLimiter, emailCheckRateLimiter } from "../middleware/rateLimits.js";

const router = Router();

/*
 * GET /api/auth/me
 *
 * Return safe identity, profile, and entitlement information.
 */
router.get(
  "/auth/me",
  authRateLimiter,
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
          role: req.profile.role,
          billingExempt: Boolean(
            req.profile.billing_exempt
          ),
          createdAt: req.profile.created_at,
          updatedAt: req.profile.updated_at,
        },

        entitlement: {
          isPaid: entitlement.isPaid,
          hasPlusAccess:
            entitlement.hasPlusAccess,
          billingExempt:
            entitlement.billingExempt,
          role: entitlement.role,
          isAdmin: entitlement.isAdmin,
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
 * Soft pre-check during anonymous → permanent conversion.
 */
router.post(
  "/auth/check-email",
  emailCheckRateLimiter,
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

      /*
       * Avoid a crisp EMAIL_ALREADY_REGISTERED directory signal.
       * Same shape for taken vs free keeps enumeration harder while still
       * steering the parent toward login when needed.
       */
      if (!result.available) {
        return res.json({
          available: false,
          canContinue: false,
          email: result.email,
          message:
            "If this address can be used, we will continue. Otherwise, try logging in with it.",
          code: "EMAIL_CHECK_COMPLETE",
        });
      }

      return res.json({
        available: true,
        canContinue: true,
        email: result.email,
        message: "That email can be used.",
        code: "EMAIL_CHECK_COMPLETE",
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

/*
 * POST /api/auth/convert-anonymous
 *
 * Body: { email, password, confirmPassword }
 *
 * Converts the current anonymous Auth user into a permanent email account in
 * one step (no confirmation-link gate). Same user UUID is preserved.
 */
router.post(
  "/auth/convert-anonymous",
  authRateLimiter,
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) => {
    if (!req.auth.isAnonymous) {
      return res.status(400).json({
        error:
          "This session is already connected to a permanent account.",
        code: "ALREADY_PERMANENT",
      });
    }

    try {
      const result = await convertAnonymousUser({
        userId: req.auth.userId,
        email: req.body?.email,
        password: req.body?.password,
        confirmPassword: req.body?.confirmPassword,
      });

      if (!result.ok) {
        return res.status(result.status).json({
          error: result.error,
          code: result.code,
        });
      }

      const analyticsSessionId =
        typeof req.body?.analyticsSessionId === "string"
          ? req.body.analyticsSessionId.trim().slice(0, 120)
          : null;
      const attribution =
        req.body?.attribution &&
        typeof req.body.attribution === "object" &&
        !Array.isArray(req.body.attribution)
          ? req.body.attribution
          : {};

      await recordProductEvent({
        userId: req.auth.userId,
        eventName: "signup_completed",
        sessionId: analyticsSessionId,
        properties: {
          ...attribution,
          source: "convert_anonymous",
        },
      });

      return res.json({
        converted: true,
        user: result.user,
      });
    } catch (error) {
      console.error(
        "Could not convert anonymous account:",
        error
      );

      return res.status(500).json({
        error:
          "Could not create your permanent account. Try again.",
        code: "CONVERT_ANONYMOUS_FAILED",
      });
    }
  }
);

export default router;
