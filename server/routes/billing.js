// server/routes/billing.js

import { Router } from "express";

import {
  getStripeClient,
  managedPaymentsRequestOptions,
  requireStripeClient,
} from "../lib/stripeClient.js";

import {
  upsertSubscriptionFromCheckout,
  upsertSubscriptionFromStripe,
} from "../lib/subscriptionStore.js";

import { getUserEntitlement } from "../lib/entitlements.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";

const router = Router();

/*
 * The browser sends only "monthly" or "annual".
 *
 * The browser must never send an arbitrary Stripe Price ID.
 */
const PLAN_PRICE_ENVIRONMENT_VARIABLES = {
  monthly: "STRIPE_MONTHLY_PRICE_ID",
  annual: "STRIPE_ANNUAL_PRICE_ID",
};

/*
 * These Stripe statuses indicate that another subscription Checkout should
 * not be created for the same Stripe customer.
 */
const BLOCKING_SUBSCRIPTION_STATUSES =
  new Set([
    "incomplete",
    "trialing",
    "active",
    "past_due",
    "unpaid",
    "paused",
  ]);

function getAppBaseUrl() {
  const configured = (
    process.env.APP_URL || ""
  )
    .trim()
    .replace(/\/+$/, "");

  if (configured) {
    return configured;
  }

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    return "http://localhost:5173";
  }

  return "";
}

function billingNotConfiguredResponse(res) {
  return res.status(503).json({
    error:
      "Billing is not configured. Add Stripe keys and Price IDs to the server environment.",
    code: "STRIPE_NOT_CONFIGURED",
  });
}

function getPriceIdForPlan(plan) {
  const environmentVariableName =
    PLAN_PRICE_ENVIRONMENT_VARIABLES[
    plan
    ];

  if (!environmentVariableName) {
    return null;
  }

  return (
    process.env[
    environmentVariableName
    ] || null
  );
}

async function findBlockingSubscription(
  stripe,
  customerId
) {
  if (!customerId) {
    return null;
  }

  const subscriptionList =
    await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });

  return (
    subscriptionList.data.find(
      (subscription) =>
        BLOCKING_SUBSCRIPTION_STATUSES.has(
          subscription.status
        )
    ) || null
  );
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
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) => {
    if (req.auth.isAnonymous) {
      return res.status(403).json({
        error:
          "Create a free account before starting FamilyFlow Plus checkout.",
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

    if (
      !Object.hasOwn(
        PLAN_PRICE_ENVIRONMENT_VARIABLES,
        plan
      )
    ) {
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
       * First check FamilyFlow's existing server-trusted entitlement.
       */
      const entitlement =
        await getUserEntitlement(
          userId
        );

      if (entitlement.isPaid) {
        return res.status(409).json({
          error:
            "This account already has FamilyFlow Plus.",
          code:
            "ALREADY_SUBSCRIBED",
        });
      }

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

      if (blockingSubscription) {
        return res.status(409).json({
          error:
            "This Stripe customer already has a subscription that must be managed through billing settings.",
          code:
            "EXISTING_SUBSCRIPTION_REQUIRES_PORTAL",
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
          familyflow_plan: plan,
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
            familyflow_plan: plan,
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
        await upsertSubscriptionFromStripe(
          event.data.object
        );

        break;
      }

      default:
        console.log(
          `Ignoring unhandled Stripe event: ${event.type}`
        );
    }

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
      `Checkout Session ${session.id} is missing its FamilyFlow user ID.`
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
}

export default router;