// server/routes/billing.js

import { Router } from "express";

import {
  getStripeClient,
  managedPaymentsRequestOptions,
  requireStripeClient,
} from "../lib/stripeClient.js";

import {
  getSubscriptionRecordForUser,
  upsertSubscriptionFromCheckout,
  upsertSubscriptionFromStripe,
} from "../lib/subscriptionStore.js";

import { getUserEntitlement } from "../lib/entitlements.js";
import {
  findBlockingSubscription,
  getAppBaseUrl,
  getCheckoutConflict,
  getPriceIdForPlan,
  isValidBillingPlan,
} from "../lib/billingHelpers.js";
import { getBillingPlans } from "../lib/billingPlans.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { billingRateLimiter } from "../middleware/rateLimits.js";
import {
  hasProcessedStripeEvent,
  recordProcessedStripeEvent,
} from "../lib/stripeWebhookEvents.js";
import { recordSubscriptionStartedOnce } from "../lib/recordProductEvent.js";

const router = Router();

function billingNotConfiguredResponse(res) {
  return res.status(503).json({
    error:
      "Billing is not configured. Add Stripe keys and Price IDs to the server environment.",
    code: "STRIPE_NOT_CONFIGURED",
  });
}

/*
 * GET /api/billing/plans
 *
 * Public display amounts for monthly/annual Plus, loaded from Stripe Price
 * objects pointed at by STRIPE_MONTHLY_PRICE_ID / STRIPE_ANNUAL_PRICE_ID.
 */
router.get("/billing/plans", billingRateLimiter, async (_req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return billingNotConfiguredResponse(res);
  }

  try {
    const plans = await getBillingPlans();
    return res.json({ plans });
  } catch (error) {
    if (error?.code === "STRIPE_NOT_CONFIGURED") {
      return billingNotConfiguredResponse(res);
    }

    console.error("Could not load billing plans from Stripe:", error);
    return res.status(502).json({
      error: "Could not load subscription prices right now. Try again shortly.",
      code: "PLANS_UNAVAILABLE",
    });
  }
});

/*
 * Update whether the authenticated user's subscription will renew.
 *
 * cancelAtPeriodEnd:
 *
 *   true  -> stop renewal at the end of the paid period
 *   false -> remove the pending cancellation
 */
export async function updateSubscriptionRenewal({
  req,
  res,
  cancelAtPeriodEnd,
}) {
  /*
   * Anonymous accounts cannot own subscriptions.
   */
  if (req.auth.isAnonymous) {
    return res.status(403).json({
      error:
        "Create a permanent account before managing a subscription.",
      code: "ACCOUNT_REQUIRED",
    });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return billingNotConfiguredResponse(
      res
    );
  }

  const userId = req.auth.userId;

  try {
    /*
     * Look up the subscription using the authenticated user ID.
     *
     * Never accept stripe_subscription_id from req.body.
     */
    const storedSubscription =
      await getSubscriptionRecordForUser(
        userId
      );

    if (
      !storedSubscription
        ?.stripe_subscription_id
    ) {
      return res.status(404).json({
        error:
          "No ActivCue Plus subscription was found for this account.",
        code:
          "SUBSCRIPTION_NOT_FOUND",
      });
    }

    const stripe =
      requireStripeClient();

    /*
     * Retrieve the live Stripe object before modifying it.
     *
     * Supabase is our local subscription cache, but Stripe is authoritative
     * for the subscription's current billing state.
     */
    const currentSubscription =
      await stripe.subscriptions.retrieve(
        storedSubscription
          .stripe_subscription_id,
        {},
        managedPaymentsRequestOptions
      );

    /*
     * A fully ended subscription cannot be resumed.
     *
     * The user would need to purchase a new subscription instead.
     */
    if (
      currentSubscription.status ===
      "canceled"
    ) {
      /*
       * Save Stripe's current state in case Supabase was behind.
       */
      await upsertSubscriptionFromStripe(
        currentSubscription
      );

      return res.status(409).json({
        error:
          "This subscription has already ended and cannot be resumed.",
        code:
          "SUBSCRIPTION_ALREADY_ENDED",
      });
    }

    const currentCustomerId =
      typeof currentSubscription.customer ===
        "string"
        ? currentSubscription.customer
        : currentSubscription.customer
          ?.id || null;

    /*
     * Defense in depth:
     *
     * Refuse to modify the Stripe subscription if its customer does not match
     * the customer stored for this authenticated ActivCue user.
     */
    if (
      storedSubscription
        .stripe_customer_id &&
      currentCustomerId !==
      storedSubscription
        .stripe_customer_id
    ) {
      console.error(
        "Stripe customer mismatch while managing subscription:",
        {
          userId,
          storedCustomerId:
            storedSubscription
              .stripe_customer_id,
          stripeCustomerId:
            currentCustomerId,
        }
      );

      return res.status(409).json({
        error:
          "The subscription could not be verified for this account.",
        code:
          "SUBSCRIPTION_CUSTOMER_MISMATCH",
      });
    }

    /*
     * Avoid an unnecessary Stripe update when the requested state is already
     * active.
     */
    let updatedSubscription =
      currentSubscription;

    if (
      Boolean(
        currentSubscription
          .cancel_at_period_end
      ) !== cancelAtPeriodEnd
    ) {
      updatedSubscription =
        await stripe.subscriptions.update(
          currentSubscription.id,
          {
            cancel_at_period_end:
              cancelAtPeriodEnd,
          },
          managedPaymentsRequestOptions
        );
    }

    /*
     * Save the Stripe response immediately.
     *
     * The customer.subscription.updated webhook will also arrive and confirm
     * the same authoritative state.
     */
    await upsertSubscriptionFromStripe(
      updatedSubscription
    );

    const entitlement =
      await getUserEntitlement(userId);

    return res.status(200).json({
      message: cancelAtPeriodEnd
        ? "ActivCue Plus will remain active through the current billing period and will not renew."
        : "Automatic renewal has been restored for ActivCue Plus.",
      entitlement,
    });
  } catch (error) {
    if (
      error?.code ===
      "STRIPE_NOT_CONFIGURED"
    ) {
      return billingNotConfiguredResponse(
        res
      );
    }

    console.error(
      cancelAtPeriodEnd
        ? "Could not schedule subscription cancellation:"
        : "Could not resume subscription renewal:",
      error
    );

    return res.status(502).json({
      error: cancelAtPeriodEnd
        ? "Could not cancel subscription renewal. Try again in a moment."
        : "Could not resume subscription renewal. Try again in a moment.",
      code: cancelAtPeriodEnd
        ? "SUBSCRIPTION_CANCEL_FAILED"
        : "SUBSCRIPTION_RESUME_FAILED",
    });
  }
}
/*
 * POST /api/billing/create-checkout-session
 *
 * Request body:
 *
 * {
 *   "plan": "monthly"
 * }
 *
 * or:
 *
 * {
 *   "plan": "annual"
 * }
 */
router.post(
  "/billing/create-checkout-session",
  billingRateLimiter,
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) => {
    if (req.auth.isAnonymous) {
      return res.status(403).json({
        error:
          "Create a free account before starting ActivCue Plus checkout.",
        code: "ACCOUNT_REQUIRED",
      });
    }

    const plan =
      typeof req.body?.plan ===
        "string"
        ? req.body.plan
          .trim()
          .toLowerCase()
        : "";

    if (!isValidBillingPlan(plan)) {
      return res.status(400).json({
        error:
          'Plan must be either "monthly" or "annual".',
        code: "INVALID_BILLING_PLAN",
      });
    }

    const priceId =
      getPriceIdForPlan(plan);

    if (
      !process.env.STRIPE_SECRET_KEY ||
      !priceId
    ) {
      return billingNotConfiguredResponse(
        res
      );
    }

    const appBaseUrl =
      getAppBaseUrl();

    if (!appBaseUrl) {
      return res.status(503).json({
        error:
          "APP_URL is not configured. Set it so Checkout can redirect back to the app.",
        code:
          "APP_URL_NOT_CONFIGURED",
      });
    }

    try {
      const stripe =
        requireStripeClient();

      const userId =
        req.auth.userId;

      const existingCustomerId =
        req.profile
          .stripe_customer_id ||
        null;

      const customerEmail =
        req.auth.user?.email ||
        null;

      /*
       * First check ActivCue's existing server-trusted entitlement.
       */
      const entitlement =
        await getUserEntitlement(
          userId
        );

      /*
       * Also check Stripe directly.
       *
       * This prevents duplicate subscriptions when a webhook has not yet
       * updated Supabase.
       */
      const blockingSubscription =
        await findBlockingSubscription(
          stripe,
          existingCustomerId
        );

      const checkoutConflict =
        getCheckoutConflict({
          entitlement,
          blockingSubscription,
        });

      if (checkoutConflict) {
        return res
          .status(checkoutConflict.status)
          .json({
            error: checkoutConflict.error,
            code: checkoutConflict.code,
          });
      }

      const sessionParams = {
        mode: "subscription",

        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],

        /*
         * Keep Stripe Managed Payments enabled.
         */
        managed_payments: {
          enabled: true,
        },

        /*
         * Include the session ID so the success page can display or verify it
         * later without granting access from the redirect alone.
         */
        success_url:
          `${appBaseUrl}/settings` +
          "?billing=checkout-success" +
          "&session_id={CHECKOUT_SESSION_ID}",

        cancel_url:
          `${appBaseUrl}/settings` +
          "?billing=checkout-cancelled",

        client_reference_id:
          userId,

        /*
         * Metadata on the Checkout Session.
         */
        metadata: {
          user_id: userId,
          supabase_user_id:
            userId,
          activcue_plan: plan,
        },

        /*
         * Copy the same identity onto the Stripe Subscription.
         *
         * This is essential for customer.subscription.updated and
         * customer.subscription.deleted events.
         */
        subscription_data: {
          metadata: {
            user_id: userId,
            supabase_user_id:
              userId,
            activcue_plan: plan,
          },
        },
      };

      if (existingCustomerId) {
        sessionParams.customer =
          existingCustomerId;
      } else if (customerEmail) {
        sessionParams.customer_email =
          customerEmail;
      }

      const session =
        await stripe.checkout.sessions.create(
          sessionParams,
          managedPaymentsRequestOptions
        );

      if (!session.url) {
        return res.status(502).json({
          error:
            "Stripe did not return a Checkout URL.",
          code:
            "CHECKOUT_URL_MISSING",
        });
      }

      return res.status(201).json({
        url: session.url,
        sessionId: session.id,
      });
    } catch (error) {
      if (
        error?.code ===
        "STRIPE_NOT_CONFIGURED"
      ) {
        return billingNotConfiguredResponse(
          res
        );
      }

      console.error(
        "Could not create Checkout Session:",
        error
      );

      return res.status(502).json({
        error:
          "Could not start checkout. Try again in a moment.",
        code:
          "CHECKOUT_SESSION_CREATE_FAILED",
      });
    }
  }
);

/*
 * POST /api/billing/cancel-subscription
 *
 * Schedule the authenticated user's ActivCue Plus subscription to stop
 * renewing after the current paid billing period.
 *
 * This does not remove paid access immediately.
 */
router.post(
  "/billing/cancel-subscription",
  billingRateLimiter,
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) =>
    updateSubscriptionRenewal({
      req,
      res,
      cancelAtPeriodEnd: true,
    })
);

/*
 * POST /api/billing/resume-subscription
 *
 * Remove a scheduled end-of-period cancellation before the subscription has
 * fully ended.
 */
router.post(
  "/billing/resume-subscription",
  billingRateLimiter,
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) =>
    updateSubscriptionRenewal({
      req,
      res,
      cancelAtPeriodEnd: false,
    })
);

/*
 * Stripe webhook handler.
 *
 * This must be mounted with express.raw() before app.use(express.json()).
 */
export async function handleStripeWebhook(
  req,
  res
) {
  const webhookSecret =
    process.env
      .STRIPE_WEBHOOK_SECRET;

  const stripe =
    getStripeClient();

  if (!stripe || !webhookSecret) {
    console.error(
      "Stripe webhook received but STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is missing."
    );

    return res
      .status(503)
      .send(
        "Stripe webhook is not configured."
      );
  }

  const signature =
    req.get("stripe-signature");

  if (!signature) {
    return res
      .status(400)
      .send(
        "Missing stripe-signature header."
      );
  }

  let event;

  try {
    event =
      stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed:",
      error instanceof Error
        ? error.message
        : error
    );

    return res
      .status(400)
      .send(
        "Webhook signature verification failed."
      );
  }

  try {
    if (await hasProcessedStripeEvent(event.id)) {
      return res.json({
        received: true,
        duplicate: true,
      });
    }

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.async_payment_failed": {
        await handleCheckoutSessionEvent(
          stripe,
          event.data.object
        );

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await handleSubscriptionLifecycleEvent(
          stripe,
          event.data.object
        );

        break;
      }

      default:
        console.log(
          `Ignoring unhandled Stripe event: ${event.type}`
        );
    }

    await recordProcessedStripeEvent({
      stripeEventId: event.id,
      eventType: event.type,
    });

    return res.json({
      received: true,
    });
  } catch (error) {
    /*
     * Return 500 so Stripe retries this event.
     */
    console.error(
      `Failed to process Stripe event ${event.id}:`,
      error
    );

    return res
      .status(500)
      .send(
        "Webhook handler failed."
      );
  }
}

async function handleSubscriptionLifecycleEvent(
  stripe,
  subscriptionSnapshot
) {
  const subscriptionId =
    typeof subscriptionSnapshot?.id === "string"
      ? subscriptionSnapshot.id
      : null;

  if (!subscriptionId) {
    throw new Error(
      "Subscription webhook is missing a subscription id."
    );
  }

  /*
   * Always retrieve the authoritative current subscription so out-of-order
   * webhook delivery cannot overwrite newer Stripe state with a stale snapshot.
   */
  const subscription =
    await stripe.subscriptions.retrieve(subscriptionId);

  await upsertSubscriptionFromStripe(subscription);

  const status =
    typeof subscription?.status === "string" ? subscription.status : "";
  if (status === "active" || status === "trialing") {
    const userId =
      subscription.metadata?.user_id ||
      subscription.metadata?.supabase_user_id ||
      null;
    if (typeof userId === "string" && userId) {
      await recordSubscriptionStartedOnce(userId, {
        source: "subscription_lifecycle",
        stripeStatus: status,
      });
    }
  }
}

async function handleCheckoutSessionEvent(
  stripe,
  session
) {
  if (
    session.mode !==
    "subscription"
  ) {
    return;
  }

  const userId =
    session.client_reference_id ||
    session.metadata?.user_id ||
    session.metadata
      ?.supabase_user_id ||
    null;

  if (!userId) {
    throw new Error(
      `Checkout Session ${session.id} is missing its ActivCue user ID.`
    );
  }

  const customerId =
    typeof session.customer ===
      "string"
      ? session.customer
      : session.customer?.id ||
      null;

  const subscriptionReference =
    session.subscription;

  const subscriptionId =
    typeof subscriptionReference ===
      "string"
      ? subscriptionReference
      : subscriptionReference?.id ||
      null;

  if (
    !customerId ||
    !subscriptionId
  ) {
    throw new Error(
      `Checkout Session ${session.id} is missing its customer or subscription.`
    );
  }

  /*
   * Retrieve the current Subscription state instead of relying on an older
   * event snapshot.
   */
  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId
    );

  await upsertSubscriptionFromCheckout({
    userId,
    customerId,
    subscription,
  });

  const status =
    typeof subscription?.status === "string" ? subscription.status : "";
  if (status === "active" || status === "trialing") {
    await recordSubscriptionStartedOnce(userId, {
      source: "checkout_session",
      stripeStatus: status,
      plan:
        typeof session.metadata?.plan === "string"
          ? session.metadata.plan
          : null,
    });
  }
}

export default router;