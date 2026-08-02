import { describe, expect, it } from "vitest";

/*
 * Mirrors unlock and entitlement-response rules in presetActivities.js so
 * billing-exempt accounts keep complete preset content without a Stripe sub.
 */
function activityIsUnlocked(activity, profile, entitlement) {
  if (entitlement.hasPlusAccess) {
    return true;
  }

  if (activity.activity_style === "simple") {
    return true;
  }

  return profile.free_imaginative_activity_id === activity.id;
}

function buildEntitlementResponse(req, entitlement, profile = req.profile) {
  return {
    isAnonymous: req.auth.isAnonymous,
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
    freeImaginativeActivityId: profile.free_imaginative_activity_id,
  };
}

describe("preset activity Plus access contract", () => {
  const imaginativeActivity = {
    id: "act-imaginative-1",
    activity_style: "imaginative",
  };

  const profile = {
    free_imaginative_activity_id: null,
  };

  it("unlocks complete imaginative content for billing-exempt users", () => {
    const entitlement = {
      isPaid: false,
      hasPlusAccess: true,
      billingExempt: true,
    };

    expect(
      activityIsUnlocked(imaginativeActivity, profile, entitlement)
    ).toBe(true);
  });

  it("keeps imaginative content locked for ordinary free users", () => {
    const entitlement = {
      isPaid: false,
      hasPlusAccess: false,
      billingExempt: false,
    };

    expect(
      activityIsUnlocked(imaginativeActivity, profile, entitlement)
    ).toBe(false);
  });

  it("unlocks imaginative content for paid subscribers", () => {
    const entitlement = {
      isPaid: true,
      hasPlusAccess: true,
      billingExempt: false,
    };

    expect(
      activityIsUnlocked(imaginativeActivity, profile, entitlement)
    ).toBe(true);
  });

  it("includes Plus access fields in the entitlement response", () => {
    const entitlement = {
      isPaid: false,
      hasPlusAccess: true,
      billingExempt: true,
      role: "admin",
      isAdmin: true,
      canGenerateWithAi: true,
      canUseAiHints: true,
      subscriptionStatus: "inactive",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };

    const req = {
      auth: { isAnonymous: false },
      profile: {
        free_imaginative_activity_id: null,
      },
    };

    expect(buildEntitlementResponse(req, entitlement)).toEqual({
      isAnonymous: false,
      isPaid: false,
      hasPlusAccess: true,
      billingExempt: true,
      role: "admin",
      isAdmin: true,
      canGenerateWithAi: true,
      canUseAiHints: true,
      subscriptionStatus: "inactive",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      freeImaginativeActivityId: null,
    });
  });
});
