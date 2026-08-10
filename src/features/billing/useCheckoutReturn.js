// src/features/billing/useCheckoutReturn.js

import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { BRAND } from "../../config/brand.js";

const MAX_ATTEMPTS = 8;
const RETRY_MS = 750;

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Owns Stripe Checkout return handling for Settings (?billing=...).
 *
 * Flow: read result once → refresh entitlement (with retries) → final message
 * → clear URL only after the result has been fully handled.
 *
 * Captures billing from the URL on first mount so clearing params (or a
 * billingResult dep change) cannot cancel in-flight polling.
 */
export function useCheckoutReturn({
  refreshEntitlement,
  onStatus,
  onOpenAccountTab,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const billingOnMountRef = useRef(searchParams.get("billing"));
  const startedRef = useRef(false);

  useEffect(() => {
    const billingResult = billingOnMountRef.current;

    if (!billingResult || startedRef.current) {
      return;
    }

    startedRef.current = true;

    if (typeof onOpenAccountTab === "function") {
      onOpenAccountTab();
    }

    if (billingResult === "checkout-cancelled") {
      onStatus?.(
        "Checkout was cancelled. You were not charged.",
        "info"
      );
      setSearchParams({}, { replace: true });
      return;
    }

    if (billingResult !== "checkout-success") {
      return;
    }

    let cancelled = false;

    async function confirmSubscription() {
      onStatus?.(
        `Payment completed. Confirming your ${BRAND.plusName} access…`,
        "info"
      );

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        try {
          const nextEntitlement = await refreshEntitlement();

          if (cancelled) {
            return;
          }

          if (nextEntitlement?.isPaid) {
            onStatus?.(
              `${BRAND.plusName} is active. AI activities and hints are now unlocked.`,
              "success"
            );
            setSearchParams({}, { replace: true });
            return;
          }
        } catch (error) {
          console.warn(
            "Could not refresh subscription entitlement:",
            error
          );
        }

        await wait(RETRY_MS);

        if (cancelled) {
          return;
        }
      }

      if (cancelled) {
        return;
      }

      onStatus?.(
        "Your payment completed, but Stripe is still confirming the subscription. Use Refresh subscription status in a moment.",
        "info"
      );
      setSearchParams({}, { replace: true });
    }

    confirmSubscription();

    return () => {
      cancelled = true;
    };
  }, [
    refreshEntitlement,
    onStatus,
    onOpenAccountTab,
    setSearchParams,
  ]);
}
