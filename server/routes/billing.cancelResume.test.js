import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  getSubscriptionRecordForUserMock,
  upsertSubscriptionFromStripeMock,
  getUserEntitlementMock,
  requireStripeClientMock,
} = vi.hoisted(() => ({
  getSubscriptionRecordForUserMock: vi.fn(),
  upsertSubscriptionFromStripeMock: vi.fn(),
  getUserEntitlementMock: vi.fn(),
  requireStripeClientMock: vi.fn(),
}));

vi.mock("../lib/subscriptionStore.js", () => ({
  getSubscriptionRecordForUser: getSubscriptionRecordForUserMock,
  upsertSubscriptionFromCheckout: vi.fn(),
  upsertSubscriptionFromStripe: upsertSubscriptionFromStripeMock,
}));

vi.mock("../lib/entitlements.js", () => ({
  getUserEntitlement: getUserEntitlementMock,
}));

vi.mock("../lib/stripeClient.js", () => ({
  getStripeClient: vi.fn(),
  managedPaymentsRequestOptions: { stripeAccount: undefined },
  requireStripeClient: requireStripeClientMock,
}));

vi.mock("../middleware/requireAuthenticatedUser.js", () => ({
  requireAuthenticatedUser: (_req, _res, next) => next(),
}));

vi.mock("../middleware/ensureUserProfile.js", () => ({
  ensureUserProfile: (_req, _res, next) => next(),
}));

import { updateSubscriptionRenewal } from "./billing.js";

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
  };

  return res;
}

function createAuthReq({
  isAnonymous = false,
  userId = "user-1",
} = {}) {
  return {
    auth: {
      isAnonymous,
      userId,
      user: { email: "parent@example.com" },
    },
    profile: {
      stripe_customer_id: "cus_123",
    },
  };
}

describe("updateSubscriptionRenewal", () => {
  let stripe;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    stripe = {
      subscriptions: {
        retrieve: vi.fn(),
        update: vi.fn(),
      },
    };

    requireStripeClientMock.mockReturnValue(stripe);
    upsertSubscriptionFromStripeMock.mockResolvedValue({});
    getUserEntitlementMock.mockResolvedValue({
      isPaid: true,
      cancelAtPeriodEnd: true,
      subscriptionStatus: "active",
    });
  });

  it("rejects anonymous accounts", async () => {
    const res = createMockRes();

    await updateSubscriptionRenewal({
      req: createAuthReq({ isAnonymous: true }),
      res,
      cancelAtPeriodEnd: true,
    });

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe("ACCOUNT_REQUIRED");
  });

  it("returns SUBSCRIPTION_NOT_FOUND when no local subscription id exists", async () => {
    getSubscriptionRecordForUserMock.mockResolvedValue({
      stripe_subscription_id: null,
      stripe_customer_id: "cus_123",
    });

    const res = createMockRes();

    await updateSubscriptionRenewal({
      req: createAuthReq(),
      res,
      cancelAtPeriodEnd: true,
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe("SUBSCRIPTION_NOT_FOUND");
  });

  it("cancels renewal and returns entitlement with cancelAtPeriodEnd", async () => {
    getSubscriptionRecordForUserMock.mockResolvedValue({
      stripe_subscription_id: "sub_123",
      stripe_customer_id: "cus_123",
    });

    stripe.subscriptions.retrieve.mockResolvedValue({
      id: "sub_123",
      status: "active",
      customer: "cus_123",
      cancel_at_period_end: false,
    });

    stripe.subscriptions.update.mockResolvedValue({
      id: "sub_123",
      status: "active",
      customer: "cus_123",
      cancel_at_period_end: true,
    });

    getUserEntitlementMock.mockResolvedValue({
      isPaid: true,
      cancelAtPeriodEnd: true,
      subscriptionStatus: "active",
    });

    const res = createMockRes();

    await updateSubscriptionRenewal({
      req: createAuthReq(),
      res,
      cancelAtPeriodEnd: true,
    });

    expect(stripe.subscriptions.update).toHaveBeenCalledWith(
      "sub_123",
      { cancel_at_period_end: true },
      expect.anything()
    );
    expect(upsertSubscriptionFromStripeMock).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.entitlement.cancelAtPeriodEnd).toBe(true);
  });

  it("resumes renewal by clearing cancel_at_period_end", async () => {
    getSubscriptionRecordForUserMock.mockResolvedValue({
      stripe_subscription_id: "sub_123",
      stripe_customer_id: "cus_123",
    });

    stripe.subscriptions.retrieve.mockResolvedValue({
      id: "sub_123",
      status: "active",
      customer: "cus_123",
      cancel_at_period_end: true,
    });

    stripe.subscriptions.update.mockResolvedValue({
      id: "sub_123",
      status: "active",
      customer: "cus_123",
      cancel_at_period_end: false,
    });

    getUserEntitlementMock.mockResolvedValue({
      isPaid: true,
      cancelAtPeriodEnd: false,
      subscriptionStatus: "active",
    });

    const res = createMockRes();

    await updateSubscriptionRenewal({
      req: createAuthReq(),
      res,
      cancelAtPeriodEnd: false,
    });

    expect(stripe.subscriptions.update).toHaveBeenCalledWith(
      "sub_123",
      { cancel_at_period_end: false },
      expect.anything()
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.entitlement.cancelAtPeriodEnd).toBe(false);
  });

  it("skips Stripe update when cancel_at_period_end already matches", async () => {
    getSubscriptionRecordForUserMock.mockResolvedValue({
      stripe_subscription_id: "sub_123",
      stripe_customer_id: "cus_123",
    });

    stripe.subscriptions.retrieve.mockResolvedValue({
      id: "sub_123",
      status: "active",
      customer: "cus_123",
      cancel_at_period_end: true,
    });

    const res = createMockRes();

    await updateSubscriptionRenewal({
      req: createAuthReq(),
      res,
      cancelAtPeriodEnd: true,
    });

    expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    expect(upsertSubscriptionFromStripeMock).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it("returns SUBSCRIPTION_ALREADY_ENDED when Stripe status is canceled", async () => {
    getSubscriptionRecordForUserMock.mockResolvedValue({
      stripe_subscription_id: "sub_123",
      stripe_customer_id: "cus_123",
    });

    stripe.subscriptions.retrieve.mockResolvedValue({
      id: "sub_123",
      status: "canceled",
      customer: "cus_123",
      cancel_at_period_end: false,
    });

    const res = createMockRes();

    await updateSubscriptionRenewal({
      req: createAuthReq(),
      res,
      cancelAtPeriodEnd: false,
    });

    expect(upsertSubscriptionFromStripeMock).toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("SUBSCRIPTION_ALREADY_ENDED");
  });

  it("returns SUBSCRIPTION_CUSTOMER_MISMATCH when customers differ", async () => {
    getSubscriptionRecordForUserMock.mockResolvedValue({
      stripe_subscription_id: "sub_123",
      stripe_customer_id: "cus_stored",
    });

    stripe.subscriptions.retrieve.mockResolvedValue({
      id: "sub_123",
      status: "active",
      customer: "cus_other",
      cancel_at_period_end: false,
    });

    const res = createMockRes();

    await updateSubscriptionRenewal({
      req: createAuthReq(),
      res,
      cancelAtPeriodEnd: true,
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("SUBSCRIPTION_CUSTOMER_MISMATCH");
  });
});
