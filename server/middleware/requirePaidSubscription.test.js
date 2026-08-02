import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { getUserEntitlementMock } = vi.hoisted(() => ({
  getUserEntitlementMock: vi.fn(),
}));

vi.mock("../lib/entitlements.js", () => ({
  getUserEntitlement: getUserEntitlementMock,
}));

import { requirePaidSubscription } from "./requirePaidSubscription.js";

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

describe("requirePaidSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 500 AUTH_CONTEXT_MISSING when auth userId is absent", async () => {
    const req = { auth: {} };
    const res = createMockRes();
    const next = vi.fn();

    await requirePaidSubscription(req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe("AUTH_CONTEXT_MISSING");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 402 with entitlement when the user lacks Plus access", async () => {
    const entitlement = {
      isPaid: false,
      hasPlusAccess: false,
      billingExempt: false,
      subscriptionStatus: "inactive",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    };

    getUserEntitlementMock.mockResolvedValue(entitlement);

    const req = { auth: { userId: "user-1" } };
    const res = createMockRes();
    const next = vi.fn();

    await requirePaidSubscription(req, res, next);

    expect(res.statusCode).toBe(402);
    expect(res.body.code).toBe("SUBSCRIPTION_REQUIRED");
    expect(res.body.error).toBe(
      "FamilyFlow Plus access is required to generate personalized activities."
    );
    expect(res.body.entitlement).toEqual(entitlement);
    expect(req.entitlement).toEqual(entitlement);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when the user is paid", async () => {
    const entitlement = {
      isPaid: true,
      hasPlusAccess: true,
      billingExempt: false,
      subscriptionStatus: "active",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2099-01-01T00:00:00.000Z",
    };

    getUserEntitlementMock.mockResolvedValue(entitlement);

    const req = { auth: { userId: "user-1" } };
    const res = createMockRes();
    const next = vi.fn();

    await requirePaidSubscription(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.entitlement).toEqual(entitlement);
    expect(res.body).toBeNull();
  });

  it("calls next for a billing-exempt user without a paid subscription", async () => {
    const entitlement = {
      isPaid: false,
      hasPlusAccess: true,
      billingExempt: true,
      role: "admin",
      isAdmin: true,
      subscriptionStatus: "inactive",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    };

    getUserEntitlementMock.mockResolvedValue(entitlement);

    const req = { auth: { userId: "user-1" } };
    const res = createMockRes();
    const next = vi.fn();

    await requirePaidSubscription(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.entitlement).toEqual(entitlement);
    expect(res.body).toBeNull();
  });

  it("returns 500 SUBSCRIPTION_CHECK_FAILED when entitlement lookup throws", async () => {
    getUserEntitlementMock.mockRejectedValue(
      new Error("db down")
    );

    const req = { auth: { userId: "user-1" } };
    const res = createMockRes();
    const next = vi.fn();

    await requirePaidSubscription(req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe("SUBSCRIPTION_CHECK_FAILED");
    expect(next).not.toHaveBeenCalled();
  });
});
