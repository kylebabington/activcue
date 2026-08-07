// src/features/app/usePlusCheckout.js

import { useState } from "react";
import { redirectToCheckout } from "../../api/billingApi";
import { ApiRequestError } from "../../api/apiClient";
import { buildSignupUrl } from "../../utils/signupUrls";
import { trackProductEvent } from "../../utils/analytics";

export function usePlusCheckout({
  isAnonymous,
  navigate,
  setStatusMessage,
  setStatusType,
} = {}) {
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  async function handleGetPlus() {
    if (isAnonymous) {
      navigate?.(buildSignupUrl({ next: "checkout", plan: "monthly" }));
      return;
    }

    setCheckoutBusy(true);
    setStatusMessage?.("");
    trackProductEvent("checkout_started", { source: "plus_cta" });

    try {
      await redirectToCheckout();
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.code === "ACCOUNT_REQUIRED"
      ) {
        navigate?.(buildSignupUrl({ next: "checkout", plan: "monthly" }));
        return;
      }

      setStatusMessage?.(
        error?.message ||
          "Could not start checkout. Try again in a moment."
      );
      setStatusType?.("error");
      setCheckoutBusy(false);
    }
  }

  return {
    checkoutBusy,
    handleGetPlus,
  };
}
