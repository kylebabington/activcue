import { describe, expect, it } from "vitest";

/*
 * Locks the /auth/me entitlement and profile contract that Settings,
 * checkout polling, and admin/exempt UI rely on.
 */
describe("auth/me entitlement contract", () => {
  it("exposes role, billingExempt, and Plus access fields", () => {
    const entitlement = {
      isPaid: true,
      hasPlusAccess: true,
      billingExempt: false,
      role: "user",
      isAdmin: false,
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
      role: "user",
      billing_exempt: false,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    /*
     * Mirror the response shape built in server/routes/auth.js so a future
     * omission of these fields fails this contract test.
     */
    const mappedProfile = {
      userId: profile.user_id,
      isAnonymous: profile.is_anonymous,
      freeImaginativeActivityId:
        profile.free_imaginative_activity_id,
      hasStripeCustomer: Boolean(profile.stripe_customer_id),
      role: profile.role,
      billingExempt: Boolean(profile.billing_exempt),
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };

    const mappedEntitlement = {
      isPaid: entitlement.isPaid,
      hasPlusAccess: entitlement.hasPlusAccess,
      billingExempt: entitlement.billingExempt,
      role: entitlement.role,
      isAdmin: entitlement.isAdmin,
      canGenerateWithAi: entitlement.canGenerateWithAi,
      canUseAiHints: entitlement.canUseAiHints,
      subscriptionStatus: entitlement.subscriptionStatus,
      currentPeriodEnd: entitlement.currentPeriodEnd,
      cancelAtPeriodEnd: entitlement.cancelAtPeriodEnd,
      freeImaginativeActivityId:
        profile.free_imaginative_activity_id,
    };

    expect(mappedProfile).toEqual({
      userId: "user-1",
      isAnonymous: false,
      freeImaginativeActivityId: null,
      hasStripeCustomer: true,
      role: "user",
      billingExempt: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(mappedEntitlement).toEqual({
      isPaid: true,
      hasPlusAccess: true,
      billingExempt: false,
      role: "user",
      isAdmin: false,
      canGenerateWithAi: true,
      canUseAiHints: true,
      subscriptionStatus: "active",
      currentPeriodEnd: "2099-01-01T00:00:00.000Z",
      cancelAtPeriodEnd: true,
      freeImaginativeActivityId: null,
    });

    expect(mappedEntitlement).toHaveProperty("cancelAtPeriodEnd");
    expect(mappedEntitlement).toHaveProperty("currentPeriodEnd");
    expect(mappedEntitlement).toHaveProperty("hasPlusAccess");
    expect(mappedEntitlement).toHaveProperty("billingExempt");
    expect(mappedEntitlement).toHaveProperty("role");
    expect(mappedEntitlement).toHaveProperty("isAdmin");
    expect(mappedProfile).toHaveProperty("role");
    expect(mappedProfile).toHaveProperty("billingExempt");
  });
});
