// src/features/billing/useEntitlement.js

import { useCallback, useEffect, useState } from "react";
import {
  getCurrentAuthenticatedUser,
} from "../../api/authApi";
import { getPresetActivities } from "../../api/activityApi";

const DEFAULT_ENTITLEMENT = {
  isPaid: false,
  hasPlusAccess: false,
  billingExempt: false,
  role: "user",
  isAdmin: false,
  canGenerateWithAi: false,
  canUseAiHints: false,
  subscriptionStatus: "inactive",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  freeImaginativeActivityId: null,
};

function mergeBooleanField(nextEntitlement, current, field) {
  if (!(field in nextEntitlement)) {
    return current[field];
  }

  return nextEntitlement[field] === true;
}

export function useEntitlement({ userId } = {}) {
  const [entitlement, setEntitlement] = useState(DEFAULT_ENTITLEMENT);
  const [entitlementHydrated, setEntitlementHydrated] = useState(false);

  const mergePresetEntitlement = useCallback((nextEntitlement) => {
    if (!nextEntitlement || typeof nextEntitlement !== "object") {
      return;
    }

    setEntitlement((current) => ({
      ...current,
      isPaid: Boolean(nextEntitlement.isPaid),
      hasPlusAccess: mergeBooleanField(
        nextEntitlement,
        current,
        "hasPlusAccess"
      ),
      billingExempt: mergeBooleanField(
        nextEntitlement,
        current,
        "billingExempt"
      ),
      isAdmin: mergeBooleanField(
        nextEntitlement,
        current,
        "isAdmin"
      ),
      role:
        "role" in nextEntitlement
          ? nextEntitlement.role === "admin"
            ? "admin"
            : "user"
          : current.role,
      canGenerateWithAi: Boolean(nextEntitlement.canGenerateWithAi),
      canUseAiHints: Boolean(nextEntitlement.canUseAiHints),
      subscriptionStatus:
        nextEntitlement.subscriptionStatus || current.subscriptionStatus,
      currentPeriodEnd:
        "currentPeriodEnd" in nextEntitlement
          ? nextEntitlement.currentPeriodEnd ?? null
          : current.currentPeriodEnd,
      cancelAtPeriodEnd:
        "cancelAtPeriodEnd" in nextEntitlement
          ? Boolean(nextEntitlement.cancelAtPeriodEnd)
          : current.cancelAtPeriodEnd,
      freeImaginativeActivityId:
        "freeImaginativeActivityId" in nextEntitlement
          ? nextEntitlement.freeImaginativeActivityId ?? null
          : current.freeImaginativeActivityId,
    }));
  }, []);

  const refreshEntitlement = useCallback(async () => {
    const me = await getCurrentAuthenticatedUser();
    const nextEntitlement = {
      ...me.entitlement,
      freeImaginativeActivityId:
        me.entitlement?.freeImaginativeActivityId ??
        me.profile?.freeImaginativeActivityId ??
        null,
    };

    mergePresetEntitlement(nextEntitlement);
    setEntitlementHydrated(true);
    return nextEntitlement;
  }, [mergePresetEntitlement]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateEntitlement() {
      setEntitlementHydrated(false);

      try {
        const me = await getCurrentAuthenticatedUser();
        if (!isMounted) {
          return;
        }

        mergePresetEntitlement({
          ...me.entitlement,
          freeImaginativeActivityId:
            me.entitlement?.freeImaginativeActivityId ??
            me.profile?.freeImaginativeActivityId ??
            null,
        });
        setEntitlementHydrated(true);
      } catch (error) {
        console.warn("Could not hydrate entitlement from /api/auth/me:", error);

        try {
          const payload = await getPresetActivities();
          if (!isMounted) {
            return;
          }
          mergePresetEntitlement(payload.entitlement);
          setEntitlementHydrated(true);
        } catch (fallbackError) {
          console.warn(
            "Could not hydrate entitlement from presets either:",
            fallbackError
          );
          if (isMounted) {
            mergePresetEntitlement(DEFAULT_ENTITLEMENT);
            setEntitlementHydrated(true);
          }
        }
      }
    }

    if (userId) {
      hydrateEntitlement();
    }

    return () => {
      isMounted = false;
    };
  }, [userId, mergePresetEntitlement]);

  return {
    entitlement,
    entitlementHydrated,
    mergePresetEntitlement,
    refreshEntitlement,
    setEntitlement,
    setEntitlementHydrated,
  };
}
