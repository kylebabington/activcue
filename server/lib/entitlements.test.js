import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  profileMaybeSingleMock,
  subscriptionMaybeSingleMock,
  fromMock,
  getSupabaseAdminClientMock,
} = vi.hoisted(() => {
  const profileMaybeSingleMock = vi.fn();
  const subscriptionMaybeSingleMock = vi.fn();
  const fromMock = vi.fn((table) => {
    const maybeSingle =
      table === "profiles"
        ? profileMaybeSingleMock
        : subscriptionMaybeSingleMock;

    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle,
        })),
      })),
    };
  });
  const getSupabaseAdminClientMock = vi.fn(() => ({
    from: fromMock,
  }));

  return {
    profileMaybeSingleMock,
    subscriptionMaybeSingleMock,
    fromMock,
    getSupabaseAdminClientMock,
  };
});

vi.mock("./supabaseAdminClient.js", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}));

import {
  getUserEntitlement,
  isPaidSubscription,
} from "./entitlements.js";

function daysFromNow(days) {
  return new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toISOString();
}

function daysAgo(days) {
  return new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();
}

function mockProfile(overrides = {}) {
  profileMaybeSingleMock.mockResolvedValue({
    data: {
      role: "user",
      billing_exempt: false,
      ...overrides,
    },
    error: null,
  });
}

function mockSubscription(data) {
  subscriptionMaybeSingleMock.mockResolvedValue({
    data,
    error: null,
  });
}

describe("isPaidSubscription", () => {
  const futureEnd = daysFromNow(14);
  const expiredEnd = daysAgo(1);

  it.each([
    ["active", futureEnd, true],
    ["trialing", futureEnd, true],
    ["active", null, true],
    ["trialing", null, true],
    ["active", expiredEnd, false],
    ["trialing", expiredEnd, false],
    ["active", "not-a-date", false],
    ["canceled", futureEnd, true],
    ["canceled", null, false],
    ["canceled", expiredEnd, false],
    ["past_due", futureEnd, false],
    ["unpaid", futureEnd, false],
    ["paused", futureEnd, false],
    ["incomplete", futureEnd, false],
    ["incomplete_expired", futureEnd, false],
    ["inactive", futureEnd, false],
  ])(
    "status %s with period end %s => paid=%s",
    (status, currentPeriodEnd, expected) => {
      expect(
        isPaidSubscription({
          status,
          current_period_end: currentPeriodEnd,
        })
      ).toBe(expected);
    }
  );

  it("treats a missing subscription as unpaid", () => {
    expect(isPaidSubscription(null)).toBe(false);
    expect(isPaidSubscription(undefined)).toBe(false);
    expect(isPaidSubscription({})).toBe(false);
  });

  it("ignores cancel_at_period_end when deciding paid access", () => {
    expect(
      isPaidSubscription({
        status: "active",
        current_period_end: futureEnd,
        cancel_at_period_end: true,
      })
    ).toBe(true);

    expect(
      isPaidSubscription({
        status: "past_due",
        current_period_end: futureEnd,
        cancel_at_period_end: false,
      })
    ).toBe(false);
  });
});

describe("getUserEntitlement", () => {
  beforeEach(() => {
    profileMaybeSingleMock.mockReset();
    subscriptionMaybeSingleMock.mockReset();
    fromMock.mockClear();
    getSupabaseAdminClientMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns unpaid defaults for an ordinary free user", async () => {
    mockProfile();
    mockSubscription(null);

    await expect(
      getUserEntitlement("user-1")
    ).resolves.toEqual({
      isPaid: false,
      billingExempt: false,
      role: "user",
      isAdmin: false,
      hasPlusAccess: false,
      canGenerateWithAi: false,
      canUseAiHints: false,
      subscriptionStatus: "inactive",
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  });

  it("keeps isPaid and hasPlusAccess true for a paid subscription", async () => {
    const currentPeriodEnd = daysFromNow(7);

    mockProfile();
    mockSubscription({
      status: "active",
      stripe_price_id: "price_monthly",
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: true,
    });

    await expect(
      getUserEntitlement("user-1")
    ).resolves.toEqual({
      isPaid: true,
      billingExempt: false,
      role: "user",
      isAdmin: false,
      hasPlusAccess: true,
      canGenerateWithAi: true,
      canUseAiHints: true,
      subscriptionStatus: "active",
      stripePriceId: "price_monthly",
      currentPeriodEnd,
      cancelAtPeriodEnd: true,
    });
  });

  it("grants hasPlusAccess without isPaid for billing-exempt accounts", async () => {
    mockProfile({
      role: "admin",
      billing_exempt: true,
    });
    mockSubscription(null);

    await expect(
      getUserEntitlement("user-1")
    ).resolves.toEqual({
      isPaid: false,
      billingExempt: true,
      role: "admin",
      isAdmin: true,
      hasPlusAccess: true,
      canGenerateWithAi: true,
      canUseAiHints: true,
      subscriptionStatus: "inactive",
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  });

  it("does not treat unknown roles as admin", async () => {
    mockProfile({
      role: "moderator",
      billing_exempt: false,
    });
    mockSubscription(null);

    const entitlement = await getUserEntitlement("user-1");

    expect(entitlement.role).toBe("user");
    expect(entitlement.isAdmin).toBe(false);
    expect(entitlement.hasPlusAccess).toBe(false);
  });

  it("throws when the profiles query fails", async () => {
    const dbError = new Error("profile unavailable");

    profileMaybeSingleMock.mockResolvedValue({
      data: null,
      error: dbError,
    });
    mockSubscription(null);

    await expect(
      getUserEntitlement("user-1")
    ).rejects.toBe(dbError);
  });

  it("throws when the subscriptions query fails", async () => {
    const dbError = new Error("db unavailable");

    mockProfile();
    subscriptionMaybeSingleMock.mockResolvedValue({
      data: null,
      error: dbError,
    });

    await expect(
      getUserEntitlement("user-1")
    ).rejects.toBe(dbError);
  });
});
