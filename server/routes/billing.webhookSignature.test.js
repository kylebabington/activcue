import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

const {
  getStripeClientMock,
  getStripeTestClientMock,
  hasProcessedStripeEventMock,
  recordProcessedStripeEventMock,
  upsertSubscriptionFromStripeMock,
} = vi.hoisted(() => ({
  getStripeClientMock: vi.fn(),
  getStripeTestClientMock: vi.fn(),
  hasProcessedStripeEventMock: vi.fn(),
  recordProcessedStripeEventMock: vi.fn(),
  upsertSubscriptionFromStripeMock: vi.fn(async () => ({})),
}));

vi.mock("../lib/stripeClient.js", () => ({
  getStripeClient: getStripeClientMock,
  getStripeTestClient: getStripeTestClientMock,
  getStripeClientForLivemode: (livemode) => {
    if (livemode === true) {
      const stripe = getStripeClientMock();
      return stripe
        ? { ok: true, stripe, mode: "live" }
        : { ok: false, reason: "missing-live-secret-key", mode: "live" };
    }
    if (livemode === false) {
      const stripe = getStripeTestClientMock();
      return stripe
        ? { ok: true, stripe, mode: "test" }
        : { ok: false, reason: "missing-test-secret-key", mode: "test" };
    }
    return { ok: false, reason: "invalid-livemode", mode: null };
  },
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
  upsertSubscriptionFromStripe: upsertSubscriptionFromStripeMock,
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

function createApiClient(label) {
  return {
    label,
    webhooks: new Stripe("sk_test_placeholder").webhooks,
    subscriptions: {
      retrieve: vi.fn(async () => ({
        id: "sub_handler",
        status: "active",
        customer: "cus_handler",
        metadata: { user_id: "user-1" },
      })),
    },
  };
}

function buildSignedRequest({ secret, livemode }) {
  const signer = new Stripe("sk_test_placeholder");
  const payload = JSON.stringify({
    id: "evt_handler_1",
    object: "event",
    type: "customer.subscription.updated",
    livemode,
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
  const signature = signer.webhooks.generateTestHeaderString({
    payload,
    secret,
  });

  return {
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
  const previousTestKey = process.env.STRIPE_SECRET_KEY_TEST;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_live_123";
    delete process.env.STRIPE_SECRET_KEY_TEST;
    process.env.STRIPE_WEBHOOK_SECRET = LIVE_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    hasProcessedStripeEventMock.mockResolvedValue(false);
    recordProcessedStripeEventMock.mockResolvedValue(undefined);
    upsertSubscriptionFromStripeMock.mockResolvedValue({});
  });

  afterEach(() => {
    if (previousLive === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousLive;
    if (previousTest === undefined) delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    else process.env.STRIPE_WEBHOOK_SECRET_TEST = previousTest;
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousKey;
    if (previousTestKey === undefined) delete process.env.STRIPE_SECRET_KEY_TEST;
    else process.env.STRIPE_SECRET_KEY_TEST = previousTestKey;
  });

  it("accepts events signed with the live webhook secret", async () => {
    const liveClient = createApiClient("live");
    getStripeClientMock.mockReturnValue(liveClient);
    getStripeTestClientMock.mockReturnValue(null);

    const { req } = buildSignedRequest({
      secret: LIVE_SECRET,
      livemode: true,
    });
    const res = createMockRes();
    await handleStripeWebhook(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(Buffer.isBuffer(req.body)).toBe(true);
  });

  it("accepts events signed with the optional test webhook secret", async () => {
    process.env.STRIPE_WEBHOOK_SECRET_TEST = TEST_SECRET;
    process.env.STRIPE_SECRET_KEY_TEST = "sk_test_123";
    const liveClient = createApiClient("live");
    const testClient = createApiClient("test");
    getStripeClientMock.mockReturnValue(liveClient);
    getStripeTestClientMock.mockReturnValue(testClient);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { req } = buildSignedRequest({
      secret: TEST_SECRET,
      livemode: false,
    });
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
    const liveClient = createApiClient("live");
    getStripeClientMock.mockReturnValue(liveClient);

    const { req } = buildSignedRequest({
      secret: LIVE_SECRET,
      livemode: true,
    });
    req.get = () => "t=1,v1=notavalidsignature";

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
    const liveClient = createApiClient("live");
    getStripeClientMock.mockReturnValue(liveClient);
    getStripeTestClientMock.mockReturnValue(null);

    const { req } = buildSignedRequest({
      secret: LIVE_SECRET,
      livemode: true,
    });
    const res = createMockRes();
    await handleStripeWebhook(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});

describe("handleStripeWebhook live/test API client selection", () => {
  const previousLive = process.env.STRIPE_WEBHOOK_SECRET;
  const previousTest = process.env.STRIPE_WEBHOOK_SECRET_TEST;
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousTestKey = process.env.STRIPE_SECRET_KEY_TEST;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_live_123";
    process.env.STRIPE_SECRET_KEY_TEST = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = LIVE_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET_TEST = TEST_SECRET;
    hasProcessedStripeEventMock.mockResolvedValue(false);
    recordProcessedStripeEventMock.mockResolvedValue(undefined);
    upsertSubscriptionFromStripeMock.mockResolvedValue({});
  });

  afterEach(() => {
    if (previousLive === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousLive;
    if (previousTest === undefined) delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    else process.env.STRIPE_WEBHOOK_SECRET_TEST = previousTest;
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousKey;
    if (previousTestKey === undefined) delete process.env.STRIPE_SECRET_KEY_TEST;
    else process.env.STRIPE_SECRET_KEY_TEST = previousTestKey;
  });

  it("uses the live Stripe client for verified livemode true events", async () => {
    const liveClient = createApiClient("live");
    const testClient = createApiClient("test");
    getStripeClientMock.mockReturnValue(liveClient);
    getStripeTestClientMock.mockReturnValue(testClient);

    const { req } = buildSignedRequest({
      secret: LIVE_SECRET,
      livemode: true,
    });
    const res = createMockRes();
    await handleStripeWebhook(req, res);

    expect(res.statusCode).toBe(200);
    expect(liveClient.subscriptions.retrieve).toHaveBeenCalledWith("sub_handler");
    expect(testClient.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(upsertSubscriptionFromStripeMock).toHaveBeenCalled();
  });

  it("uses the test Stripe client for verified sandbox events", async () => {
    const liveClient = createApiClient("live");
    const testClient = createApiClient("test");
    getStripeClientMock.mockReturnValue(liveClient);
    getStripeTestClientMock.mockReturnValue(testClient);

    const { req } = buildSignedRequest({
      secret: TEST_SECRET,
      livemode: false,
    });
    const res = createMockRes();
    await handleStripeWebhook(req, res);

    expect(res.statusCode).toBe(200);
    expect(testClient.subscriptions.retrieve).toHaveBeenCalledWith("sub_handler");
    expect(liveClient.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(upsertSubscriptionFromStripeMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sub_handler" })
    );
  });

  it("never falls back to the live client for sandbox events", async () => {
    delete process.env.STRIPE_SECRET_KEY_TEST;
    const liveClient = createApiClient("live");
    getStripeClientMock.mockReturnValue(liveClient);
    getStripeTestClientMock.mockReturnValue(null);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { req } = buildSignedRequest({
      secret: TEST_SECRET,
      livemode: false,
    });
    const res = createMockRes();
    await handleStripeWebhook(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toBe(
      "Stripe webhook API client is not configured for this event mode."
    );
    expect(liveClient.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(upsertSubscriptionFromStripeMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    const logged = errorSpy.mock.calls.flat().join(" ");
    expect(logged).toMatch(/missing-test-secret-key|test API client/i);
    expect(logged).not.toContain("sk_live_123");
    expect(logged).not.toContain("sk_test_123");
    errorSpy.mockRestore();
  });

  it("never uses the test client for live events", async () => {
    const liveClient = createApiClient("live");
    const testClient = createApiClient("test");
    getStripeClientMock.mockReturnValue(liveClient);
    getStripeTestClientMock.mockReturnValue(testClient);

    const { req } = buildSignedRequest({
      secret: LIVE_SECRET,
      livemode: true,
    });
    await handleStripeWebhook(req, createMockRes());

    expect(testClient.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(liveClient.subscriptions.retrieve).toHaveBeenCalled();
  });
});
