import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  rpcMock,
  fromMock,
  getSupabaseAdminClientMock,
} = vi.hoisted(() => {
  const rpcMock = vi.fn();
  const fromMock = vi.fn();
  const getSupabaseAdminClientMock = vi.fn(() => ({
    rpc: rpcMock,
    from: fromMock,
  }));

  return {
    rpcMock,
    fromMock,
    getSupabaseAdminClientMock,
  };
});

vi.mock("./supabaseAdminClient.js", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}));

import {
  attachCheckoutSessionToClaim,
  getLaunchTrialAdminSummary,
  getLaunchTrialOfferStatus,
  redeemLaunchTrialClaim,
  releaseLaunchTrialReservation,
  reserveLaunchTrial,
  shouldApplyLaunchTrial,
} from "./launchTrial.js";

describe("shouldApplyLaunchTrial", () => {
  it("applies only for reserved eligible claims", () => {
    expect(
      shouldApplyLaunchTrial({
        eligible: true,
        status: "reserved",
      })
    ).toBe(true);
    expect(
      shouldApplyLaunchTrial({
        eligible: true,
        status: "redeemed",
      })
    ).toBe(false);
    expect(
      shouldApplyLaunchTrial({
        eligible: false,
        status: null,
      })
    ).toBe(false);
  });
});

describe("reserveLaunchTrial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.LAUNCH_TRIAL_LIMIT;
    delete process.env.LAUNCH_TRIAL_DAYS;
    delete process.env.LAUNCH_TRIAL_RESERVATION_TTL_MINUTES;
  });

  afterEach(() => {
    delete process.env.LAUNCH_TRIAL_LIMIT;
    delete process.env.LAUNCH_TRIAL_DAYS;
    delete process.env.LAUNCH_TRIAL_RESERVATION_TTL_MINUTES;
  });

  it("returns ineligible when user id is missing", async () => {
    await expect(reserveLaunchTrial("")).resolves.toEqual({
      eligible: false,
      status: null,
      created: false,
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("maps an eligible reserved RPC response", async () => {
    rpcMock.mockResolvedValue({
      data: { eligible: true, status: "reserved", created: true },
      error: null,
    });

    await expect(reserveLaunchTrial("user-1")).resolves.toEqual({
      eligible: true,
      status: "reserved",
      created: true,
    });

    expect(rpcMock).toHaveBeenCalledWith("reserve_launch_trial", {
      p_user_id: "user-1",
      p_limit: 20,
      p_ttl_minutes: 30,
    });
  });

  it("maps an ineligible RPC response", async () => {
    rpcMock.mockResolvedValue({
      data: { eligible: false, status: null, created: false },
      error: null,
    });

    await expect(reserveLaunchTrial("user-1")).resolves.toEqual({
      eligible: false,
      status: null,
      created: false,
    });
  });

  it("reuses a reserved claim without treating it as newly created", async () => {
    rpcMock.mockResolvedValue({
      data: { eligible: true, status: "reserved", created: false },
      error: null,
    });

    await expect(reserveLaunchTrial("user-1")).resolves.toEqual({
      eligible: true,
      status: "reserved",
      created: false,
    });
  });

  it("honors env overrides for limit and ttl", async () => {
    process.env.LAUNCH_TRIAL_LIMIT = "5";
    process.env.LAUNCH_TRIAL_RESERVATION_TTL_MINUTES = "15";
    rpcMock.mockResolvedValue({
      data: { eligible: true, status: "reserved", created: true },
      error: null,
    });

    await reserveLaunchTrial("user-1");

    expect(rpcMock).toHaveBeenCalledWith("reserve_launch_trial", {
      p_user_id: "user-1",
      p_limit: 5,
      p_ttl_minutes: 15,
    });
  });
});

describe("attachCheckoutSessionToClaim / releaseLaunchTrialReservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates stripe_session_id on reserved claims", async () => {
    const eqStatus = vi.fn(async () => ({ error: null }));
    const eqUser = vi.fn(() => ({ eq: eqStatus }));
    const update = vi.fn(() => ({ eq: eqUser }));

    fromMock.mockReturnValue({ update });

    await attachCheckoutSessionToClaim("user-1", "cs_123");

    expect(fromMock).toHaveBeenCalledWith("launch_trial_claims");
    expect(update).toHaveBeenCalledWith({ stripe_session_id: "cs_123" });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqStatus).toHaveBeenCalledWith("status", "reserved");
  });

  it("expires reserved claims on release", async () => {
    const eqStatus = vi.fn(async () => ({ error: null }));
    const eqUser = vi.fn(() => ({ eq: eqStatus }));
    const update = vi.fn(() => ({ eq: eqUser }));

    fromMock.mockReturnValue({ update });

    await releaseLaunchTrialReservation("user-1");

    expect(update).toHaveBeenCalledWith({
      expires_at: expect.any(String),
    });
    expect(eqStatus).toHaveBeenCalledWith("status", "reserved");
  });
});

describe("redeemLaunchTrialClaim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls redeem_launch_trial RPC", async () => {
    rpcMock.mockResolvedValue({
      data: { redeemed: true, status: "redeemed" },
      error: null,
    });

    await expect(
      redeemLaunchTrialClaim("user-1", "cs_123")
    ).resolves.toEqual({
      redeemed: true,
      status: "redeemed",
    });

    expect(rpcMock).toHaveBeenCalledWith("redeem_launch_trial", {
      p_user_id: "user-1",
      p_stripe_session_id: "cs_123",
    });
  });
});

describe("getLaunchTrialOfferStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.LAUNCH_TRIAL_LIMIT;
    delete process.env.LAUNCH_TRIAL_DAYS;
  });

  function mockCountQueries({ redeemed = 0, reserved = 0 } = {}) {
    fromMock.mockImplementation(() => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        gt: vi.fn(async () => ({ count: reserved, error: null })),
      };

      query.eq.mockImplementation((_column, value) => {
        if (value === "redeemed") {
          return Promise.resolve({ count: redeemed, error: null });
        }
        return query;
      });

      return query;
    });
  }

  it("reports available when under the limit", async () => {
    mockCountQueries({ redeemed: 3, reserved: 2 });

    await expect(getLaunchTrialOfferStatus()).resolves.toEqual({
      available: true,
      days: 7,
      limit: 20,
    });
  });

  it("reports unavailable when valid claims reach the limit", async () => {
    mockCountQueries({ redeemed: 18, reserved: 2 });

    await expect(getLaunchTrialOfferStatus()).resolves.toEqual({
      available: false,
      days: 7,
      limit: 20,
    });
  });

  it("fails closed when the count query errors", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: async () => ({ count: null, error: new Error("boom") }),
      }),
    });

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(getLaunchTrialOfferStatus()).resolves.toEqual({
      available: false,
      days: 7,
      limit: 20,
    });

    consoleError.mockRestore();
  });
});

describe("getLaunchTrialAdminSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.LAUNCH_TRIAL_LIMIT;
  });

  afterEach(() => {
    delete process.env.LAUNCH_TRIAL_LIMIT;
  });

  function mockAdminSummaryQueries({
    redeemedUserIds = [],
    reserved = 0,
    converted = 0,
  } = {}) {
    fromMock.mockImplementation((table) => {
      if (table === "subscriptions") {
        const query = {
          select: vi.fn(() => query),
          in: vi.fn((column) => {
            if (column === "status") {
              return Promise.resolve({ count: converted, error: null });
            }
            return query;
          }),
        };
        return query;
      }

      const query = {
        select: vi.fn(() => query),
        eq: vi.fn((_column, value) => {
          if (value === "redeemed") {
            return Promise.resolve({
              data: redeemedUserIds.map((user_id) => ({ user_id })),
              error: null,
            });
          }
          return query;
        }),
        gt: vi.fn(async () => ({ count: reserved, error: null })),
      };
      return query;
    });
  }

  it("computes remaining as limit minus claimed minus in-checkout", async () => {
    mockAdminSummaryQueries({
      redeemedUserIds: ["user-1", "user-2", "user-3"],
      reserved: 2,
      converted: 1,
    });

    await expect(getLaunchTrialAdminSummary()).resolves.toEqual({
      limit: 20,
      claimed: 3,
      inCheckout: 2,
      remaining: 15,
      convertedToPaid: 1,
    });
  });

  it("skips the subscriptions query when nothing is claimed", async () => {
    mockAdminSummaryQueries({ reserved: 1, converted: 99 });

    await expect(getLaunchTrialAdminSummary()).resolves.toEqual({
      limit: 20,
      claimed: 0,
      inCheckout: 1,
      remaining: 19,
      convertedToPaid: 0,
    });

    expect(fromMock).not.toHaveBeenCalledWith("subscriptions");
  });

  it("honors LAUNCH_TRIAL_LIMIT and clamps remaining at zero", async () => {
    process.env.LAUNCH_TRIAL_LIMIT = "5";
    mockAdminSummaryQueries({
      redeemedUserIds: ["user-1", "user-2", "user-3", "user-4"],
      reserved: 3,
      converted: 2,
    });

    await expect(getLaunchTrialAdminSummary()).resolves.toEqual({
      limit: 5,
      claimed: 4,
      inCheckout: 3,
      remaining: 0,
      convertedToPaid: 2,
    });
  });

  it("throws when the claims query errors", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: async () => ({ data: null, error: new Error("boom") }),
      }),
    });

    await expect(getLaunchTrialAdminSummary()).rejects.toThrow("boom");
  });
});
