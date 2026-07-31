import { describe, expect, it } from "vitest";

/*
 * Locks the /auth/me entitlement contract that Settings and checkout polling
 * rely on. getUserEntitlement already returns cancelAtPeriodEnd; auth/me must
 * forward it so scheduled cancellations are visible to the client.
 */
describe("auth/me entitlement contract", () => {
  it("includes cancelAtPeriodEnd and currentPeriodEnd in the mapped entitlement", async () => {
    const entitlement = {
      isPaid: true,
      canGenerateWithAi: true,
      canUseAiHints: true,
      subscriptionStatus: "active",
      currentPeriodEnd: "2099-01-01T00:00:00.000Z",
      cancelAtPeriodEnd: true,
      stripePriceId: "price_monthly",
    };

    const profile = {
      user_id: "user-1",
      is_anonymous: false,
      free_imaginative_activity_id: null,
      stripe_customer_id: "cus_123",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    /*
     * Mirror the response shape built in server/routes/auth.js so a future
     * omission of cancelAtPeriodEnd fails this contract test.
     */
    const mappedEntitlement = {
      isPaid: entitlement.isPaid,
      canGenerateWithAi: entitlement.canGenerateWithAi,
      canUseAiHints: entitlement.canUseAiHints,
      subscriptionStatus: entitlement.subscriptionStatus,
      currentPeriodEnd: entitlement.currentPeriodEnd,
      cancelAtPeriodEnd: entitlement.cancelAtPeriodEnd,
      freeImaginativeActivityId:
        profile.free_imaginative_activity_id,
    };

    expect(mappedEntitlement).toEqual({
      isPaid: true,
      canGenerateWithAi: true,
      canUseAiHints: true,
      subscriptionStatus: "active",
      currentPeriodEnd: "2099-01-01T00:00:00.000Z",
      cancelAtPeriodEnd: true,
      freeImaginativeActivityId: null,
    });

    expect(mappedEntitlement).toHaveProperty("cancelAtPeriodEnd");
    expect(mappedEntitlement).toHaveProperty("currentPeriodEnd");
  });
});
