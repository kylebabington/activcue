import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  maybeSingleMock,
  eqMock,
  selectMock,
  fromMock,
  getSupabaseAdminClientMock,
} = vi.hoisted(() => {
  const maybeSingleMock = vi.fn();
  const eqMock = vi.fn(() => ({
    maybeSingle: maybeSingleMock,
  }));
  const selectMock = vi.fn(() => ({
    eq: eqMock,
  }));
  const fromMock = vi.fn(() => ({
    select: selectMock,
  }));
  const getSupabaseAdminClientMock = vi.fn(() => ({
    from: fromMock,
  }));

  return {
    maybeSingleMock,
    eqMock,
    selectMock,
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
    maybeSingleMock.mockReset();
    eqMock.mockClear();
    selectMock.mockClear();
    fromMock.mockClear();
    getSupabaseAdminClientMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns unpaid defaults when no subscription row exists", async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      getUserEntitlement("user-1")
    ).resolves.toEqual({
      isPaid: false,
      canGenerateWithAi: false,
      canUseAiHints: false,
      subscriptionStatus: "inactive",
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  });

  it("keeps paid access when active and cancel_at_period_end is true", async () => {
    const currentPeriodEnd = daysFromNow(7);

    maybeSingleMock.mockResolvedValue({
      data: {
        status: "active",
        stripe_price_id: "price_monthly",
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: true,
      },
      error: null,
    });

    await expect(
      getUserEntitlement("user-1")
    ).resolves.toEqual({
      isPaid: true,
      canGenerateWithAi: true,
      canUseAiHints: true,
      subscriptionStatus: "active",
      stripePriceId: "price_monthly",
      currentPeriodEnd,
      cancelAtPeriodEnd: true,
    });
  });

  it("throws when the subscriptions query fails", async () => {
    const dbError = new Error("db unavailable");

    maybeSingleMock.mockResolvedValue({
      data: null,
      error: dbError,
    });

    await expect(
      getUserEntitlement("user-1")
    ).rejects.toBe(dbError);
  });
});
