import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  getSubscriptionRecordForUserMock,
  upsertSubscriptionFromCheckoutMock,
  upsertSubscriptionFromStripeMock,
  getUserEntitlementMock,
  requireStripeClientMock,
  getStripeClientMock,
  findBlockingSubscriptionMock,
  getCheckoutConflictMock,
  getPriceIdForPlanMock,
  getAppBaseUrlMock,
  isValidBillingPlanMock,
  getBillingPlansMock,
  reserveLaunchTrialMock,
  shouldApplyLaunchTrialMock,
  getLaunchTrialDaysMock,
  attachCheckoutSessionToClaimMock,
  releaseLaunchTrialReservationMock,
  redeemLaunchTrialClaimMock,
  getLaunchTrialOfferStatusMock,
  hasProcessedStripeEventMock,
  recordProcessedStripeEventMock,
  recordSubscriptionStartedOnceMock,
} = vi.hoisted(() => ({
  getSubscriptionRecordForUserMock: vi.fn(),
  upsertSubscriptionFromCheckoutMock: vi.fn(),
  upsertSubscriptionFromStripeMock: vi.fn(),
  getUserEntitlementMock: vi.fn(),
  requireStripeClientMock: vi.fn(),
  getStripeClientMock: vi.fn(),
  findBlockingSubscriptionMock: vi.fn(),
  getCheckoutConflictMock: vi.fn(),
  getPriceIdForPlanMock: vi.fn(),
  getAppBaseUrlMock: vi.fn(),
  isValidBillingPlanMock: vi.fn(),
  getBillingPlansMock: vi.fn(),
  reserveLaunchTrialMock: vi.fn(),
  shouldApplyLaunchTrialMock: vi.fn(),
  getLaunchTrialDaysMock: vi.fn(),
  attachCheckoutSessionToClaimMock: vi.fn(),
  releaseLaunchTrialReservationMock: vi.fn(),
  redeemLaunchTrialClaimMock: vi.fn(),
  getLaunchTrialOfferStatusMock: vi.fn(),
  hasProcessedStripeEventMock: vi.fn(),
  recordProcessedStripeEventMock: vi.fn(),
  recordSubscriptionStartedOnceMock: vi.fn(),
}));

vi.mock("../lib/subscriptionStore.js", () => ({
  getSubscriptionRecordForUser: getSubscriptionRecordForUserMock,
  upsertSubscriptionFromCheckout: upsertSubscriptionFromCheckoutMock,
  upsertSubscriptionFromStripe: upsertSubscriptionFromStripeMock,
}));

vi.mock("../lib/entitlements.js", () => ({
  getUserEntitlement: getUserEntitlementMock,
}));

vi.mock("../lib/stripeClient.js", () => ({
  getStripeClient: getStripeClientMock,
  managedPaymentsRequestOptions: { stripeAccount: undefined },
  requireStripeClient: requireStripeClientMock,
}));

vi.mock("../lib/billingHelpers.js", () => ({
  findBlockingSubscription: findBlockingSubscriptionMock,
  getAppBaseUrl: getAppBaseUrlMock,
  getCheckoutConflict: getCheckoutConflictMock,
  getPriceIdForPlan: getPriceIdForPlanMock,
  isValidBillingPlan: isValidBillingPlanMock,
}));

vi.mock("../lib/billingPlans.js", () => ({
  getBillingPlans: getBillingPlansMock,
}));

vi.mock("../lib/launchTrial.js", () => ({
  attachCheckoutSessionToClaim: attachCheckoutSessionToClaimMock,
  getLaunchTrialDays: getLaunchTrialDaysMock,
  getLaunchTrialOfferStatus: getLaunchTrialOfferStatusMock,
  redeemLaunchTrialClaim: redeemLaunchTrialClaimMock,
  releaseLaunchTrialReservation: releaseLaunchTrialReservationMock,
  reserveLaunchTrial: reserveLaunchTrialMock,
  shouldApplyLaunchTrial: shouldApplyLaunchTrialMock,
}));

vi.mock("../lib/stripeWebhookEvents.js", () => ({
  hasProcessedStripeEvent: hasProcessedStripeEventMock,
  recordProcessedStripeEvent: recordProcessedStripeEventMock,
}));

vi.mock("../lib/recordProductEvent.js", () => ({
  recordSubscriptionStartedOnce: recordSubscriptionStartedOnceMock,
}));

vi.mock("../middleware/requireAuthenticatedUser.js", () => ({
  requireAuthenticatedUser: (_req, _res, next) => next(),
}));

vi.mock("../middleware/ensureUserProfile.js", () => ({
  ensureUserProfile: (_req, _res, next) => next(),
}));

vi.mock("../middleware/rateLimits.js", () => ({
  billingRateLimiter: (_req, _res, next) => next(),
}));

import billingRouter, { handleStripeWebhook } from "./billing.js";

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };

  return res;
}

function getRouteHandler(method, path) {
  const layer = billingRouter.stack.find(
    (entry) =>
      entry.route &&
      entry.route.path === path &&
      Boolean(entry.route.methods?.[method])
  );

  if (!layer) {
    throw new Error(`Missing route ${method.toUpperCase()} ${path}`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle;
}

describe("GET /billing/plans launch trial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    getBillingPlansMock.mockResolvedValue([
      { plan: "monthly", priceId: "price_m", unitAmount: 900 },
    ]);
    getLaunchTrialOfferStatusMock.mockResolvedValue({
      available: true,
      days: 7,
      limit: 20,
    });
  });

  it("includes launchTrial in the plans response", async () => {
    const handler = getRouteHandler("get", "/billing/plans");
    const res = createMockRes();

    await handler({}, res);

    expect(res.body).toEqual({
      plans: [{ plan: "monthly", priceId: "price_m", unitAmount: 900 }],
      launchTrial: { available: true, days: 7, limit: 20 },
    });
  });
});

describe("POST /billing/create-checkout-session launch trial", () => {
  let stripe;
  let createCheckoutHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    createCheckoutHandler = getRouteHandler(
      "post",
      "/billing/create-checkout-session"
    );

    stripe = {
      checkout: {
        sessions: {
          create: vi.fn(),
        },
      },
    };

    requireStripeClientMock.mockReturnValue(stripe);
    isValidBillingPlanMock.mockReturnValue(true);
    getPriceIdForPlanMock.mockReturnValue("price_monthly");
    getAppBaseUrlMock.mockReturnValue("https://app.example.com");
    getUserEntitlementMock.mockResolvedValue({
      isPaid: false,
      billingExempt: false,
    });
    findBlockingSubscriptionMock.mockResolvedValue(null);
    getCheckoutConflictMock.mockReturnValue(null);
    getLaunchTrialDaysMock.mockReturnValue(7);
    attachCheckoutSessionToClaimMock.mockResolvedValue(undefined);
    releaseLaunchTrialReservationMock.mockResolvedValue(undefined);
  });

  function createReq() {
    return {
      body: { plan: "monthly" },
      auth: {
        isAnonymous: false,
        userId: "user-1",
        user: { email: "parent@example.com" },
      },
      profile: {
        stripe_customer_id: null,
      },
    };
  }

  it("adds trial_period_days when a launch trial is reserved", async () => {
    reserveLaunchTrialMock.mockResolvedValue({
      eligible: true,
      status: "reserved",
      created: true,
    });
    shouldApplyLaunchTrialMock.mockReturnValue(true);
    stripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_trial",
      url: "https://checkout.stripe.com/trial",
    });

    const res = createMockRes();
    await createCheckoutHandler(createReq(), res);

    expect(res.statusCode).toBe(201);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.objectContaining({
          trial_period_days: 7,
          metadata: expect.objectContaining({
            launch_trial: "true",
            activcue_plan: "monthly",
          }),
        }),
        metadata: expect.objectContaining({
          launch_trial: "true",
        }),
      }),
      expect.anything()
    );
    expect(attachCheckoutSessionToClaimMock).toHaveBeenCalledWith(
      "user-1",
      "cs_trial"
    );
  });

  it("omits trial fields when the launch offer is exhausted", async () => {
    reserveLaunchTrialMock.mockResolvedValue({
      eligible: false,
      status: null,
      created: false,
    });
    shouldApplyLaunchTrialMock.mockReturnValue(false);
    stripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_paid",
      url: "https://checkout.stripe.com/paid",
    });

    const res = createMockRes();
    await createCheckoutHandler(createReq(), res);

    expect(res.statusCode).toBe(201);
    const sessionParams = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(sessionParams.subscription_data.trial_period_days).toBeUndefined();
    expect(sessionParams.metadata.launch_trial).toBeUndefined();
    expect(attachCheckoutSessionToClaimMock).not.toHaveBeenCalled();
  });

  it("releases the reservation when Stripe session create fails", async () => {
    reserveLaunchTrialMock.mockResolvedValue({
      eligible: true,
      status: "reserved",
      created: true,
    });
    shouldApplyLaunchTrialMock.mockReturnValue(true);
    stripe.checkout.sessions.create.mockRejectedValue(
      new Error("stripe down")
    );

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const res = createMockRes();
    await createCheckoutHandler(createReq(), res);

    expect(res.statusCode).toBe(502);
    expect(releaseLaunchTrialReservationMock).toHaveBeenCalledWith("user-1");

    consoleError.mockRestore();
  });
});

describe("checkout.session.completed launch trial redeem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    hasProcessedStripeEventMock.mockResolvedValue(false);
    recordProcessedStripeEventMock.mockResolvedValue(undefined);
    upsertSubscriptionFromCheckoutMock.mockResolvedValue({});
    redeemLaunchTrialClaimMock.mockResolvedValue({
      redeemed: true,
      status: "redeemed",
    });
    recordSubscriptionStartedOnceMock.mockResolvedValue(undefined);
  });

  it("redeems the launch trial claim after checkout completes", async () => {
    const stripe = {
      webhooks: {
        constructEvent: vi.fn(() => ({
          id: "evt_1",
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_123",
              mode: "subscription",
              client_reference_id: "user-1",
              customer: "cus_1",
              subscription: "sub_1",
              metadata: {
                launch_trial: "true",
                activcue_plan: "monthly",
              },
            },
          },
        })),
      },
      subscriptions: {
        retrieve: vi.fn(async () => ({
          id: "sub_1",
          status: "trialing",
          metadata: {
            launch_trial: "true",
            user_id: "user-1",
          },
        })),
      },
    };

    getStripeClientMock.mockReturnValue(stripe);

    const res = createMockRes();
    await handleStripeWebhook(
      {
        body: Buffer.from("{}"),
        get: () => "sig_test",
      },
      res
    );

    expect(upsertSubscriptionFromCheckoutMock).toHaveBeenCalled();
    expect(redeemLaunchTrialClaimMock).toHaveBeenCalledWith(
      "user-1",
      "cs_123"
    );
    expect(recordSubscriptionStartedOnceMock).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        stripeStatus: "trialing",
        plan: "monthly",
      })
    );
    expect(res.body).toEqual({ received: true });
  });

  it("does not redeem when launch_trial metadata is absent", async () => {
    const stripe = {
      webhooks: {
        constructEvent: vi.fn(() => ({
          id: "evt_2",
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_456",
              mode: "subscription",
              client_reference_id: "user-2",
              customer: "cus_2",
              subscription: "sub_2",
              metadata: {
                activcue_plan: "annual",
              },
            },
          },
        })),
      },
      subscriptions: {
        retrieve: vi.fn(async () => ({
          id: "sub_2",
          status: "active",
          metadata: {
            user_id: "user-2",
          },
        })),
      },
    };

    getStripeClientMock.mockReturnValue(stripe);

    const res = createMockRes();
    await handleStripeWebhook(
      {
        body: Buffer.from("{}"),
        get: () => "sig_test",
      },
      res
    );

    expect(redeemLaunchTrialClaimMock).not.toHaveBeenCalled();
    expect(res.body).toEqual({ received: true });
  });
});
