import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

const {
  getStripeClientMock,
  hasProcessedStripeEventMock,
  recordProcessedStripeEventMock,
} = vi.hoisted(() => ({
  getStripeClientMock: vi.fn(),
  hasProcessedStripeEventMock: vi.fn(),
  recordProcessedStripeEventMock: vi.fn(),
}));

vi.mock("../lib/stripeClient.js", () => ({
  getStripeClient: getStripeClientMock,
  requireStripeClient: vi.fn(),
  managedPaymentsRequestOptions: {},
}));

vi.mock("../lib/stripeWebhookEvents.js", () => ({
  hasProcessedStripeEvent: hasProcessedStripeEventMock,
  recordProcessedStripeEvent: recordProcessedStripeEventMock,
}));

vi.mock("../lib/subscriptionStore.js", () => ({
  getSubscriptionRecordForUser: vi.fn(),
  upsertSubscriptionFromCheckout: vi.fn(),
  upsertSubscriptionFromStripe: vi.fn(async () => ({})),
}));

vi.mock("../lib/recordProductEvent.js", () => ({
  recordSubscriptionStartedOnce: vi.fn(),
}));

vi.mock("../lib/launchTrial.js", () => ({
  attachCheckoutSessionToClaim: vi.fn(),
  getLaunchTrialDays: vi.fn(() => 7),
  getLaunchTrialOfferStatus: vi.fn(),
  redeemLaunchTrialClaim: vi.fn(),
  releaseLaunchTrialReservation: vi.fn(),
  reserveLaunchTrial: vi.fn(),
  shouldApplyLaunchTrial: vi.fn(() => false),
}));

import { handleStripeWebhook } from "../routes/billing.js";

const LIVE_SECRET = "whsec_handler_live_aaaaaaaa";
const TEST_SECRET = "whsec_handler_test_bbbbbbbb";

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function buildSignedRequest(secret) {
  const stripe = new Stripe("sk_test_placeholder");
  const payload = JSON.stringify({
    id: "evt_handler_1",
    object: "event",
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_handler",
        object: "subscription",
        status: "active",
        customer: "cus_handler",
        metadata: { user_id: "user-1" },
      },
    },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });

  return {
    stripe,
    req: {
      body: Buffer.from(payload, "utf8"),
      get(header) {
        return header.toLowerCase() === "stripe-signature"
          ? signature
          : undefined;
      },
    },
  };
}

describe("handleStripeWebhook dual signing secrets", () => {
  const previousLive = process.env.STRIPE_WEBHOOK_SECRET;
  const previousTest = process.env.STRIPE_WEBHOOK_SECRET_TEST;
  const previousKey = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = LIVE_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    hasProcessedStripeEventMock.mockResolvedValue(false);
    recordProcessedStripeEventMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (previousLive === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousLive;
    if (previousTest === undefined) delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    else process.env.STRIPE_WEBHOOK_SECRET_TEST = previousTest;
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousKey;
  });

  it("accepts events signed with the live webhook secret", async () => {
    const { stripe, req } = buildSignedRequest(LIVE_SECRET);
    stripe.subscriptions = {
      retrieve: vi.fn(async () => ({
        id: "sub_handler",
        status: "active",
        customer: "cus_handler",
        metadata: { user_id: "user-1" },
      })),
    };
    getStripeClientMock.mockReturnValue(stripe);

    const res = createMockRes();
    await handleStripeWebhook(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(Buffer.isBuffer(req.body)).toBe(true);
  });

  it("accepts events signed with the optional test webhook secret", async () => {
    process.env.STRIPE_WEBHOOK_SECRET_TEST = TEST_SECRET;
    const { stripe, req } = buildSignedRequest(TEST_SECRET);
    stripe.subscriptions = {
      retrieve: vi.fn(async () => ({
        id: "sub_handler",
        status: "active",
        customer: "cus_handler",
        metadata: { user_id: "user-1" },
      })),
    };
    getStripeClientMock.mockReturnValue(stripe);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = createMockRes();
    await handleStripeWebhook(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(log).toHaveBeenCalledWith(
      "Stripe webhook signature verified with test configuration."
    );
    log.mockRestore();
  });

  it("returns 400 when the signature matches neither secret", async () => {
    process.env.STRIPE_WEBHOOK_SECRET_TEST = TEST_SECRET;
    const { stripe, req } = buildSignedRequest(LIVE_SECRET);
    req.get = () => "t=1,v1=notavalidsignature";
    getStripeClientMock.mockReturnValue(stripe);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = createMockRes();
    await handleStripeWebhook(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toBe("Webhook signature verification failed.");
    expect(errorSpy).toHaveBeenCalled();
    const logged = errorSpy.mock.calls.flat().join(" ");
    expect(logged).not.toContain(LIVE_SECRET);
    expect(logged).not.toContain(TEST_SECRET);
    errorSpy.mockRestore();
  });

  it("remains backward compatible when STRIPE_WEBHOOK_SECRET_TEST is unset", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    const { stripe, req } = buildSignedRequest(LIVE_SECRET);
    stripe.subscriptions = {
      retrieve: vi.fn(async () => ({
        id: "sub_handler",
        status: "active",
        customer: "cus_handler",
        metadata: { user_id: "user-1" },
      })),
    };
    getStripeClientMock.mockReturnValue(stripe);

    const res = createMockRes();
    await handleStripeWebhook(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});
