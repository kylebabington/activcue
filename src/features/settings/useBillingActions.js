// src/features/settings/useBillingActions.js

import { useCallback, useState } from "react";
import {
  cancelSubscription,
  createCheckoutSession,
  resumeSubscription,
} from "../../api/billingApi";
import { BRAND } from "../../config/brand.js";
import { useCheckoutReturn } from "../billing/useCheckoutReturn";
import { trackProductEvent } from "../../utils/analytics";

export function useBillingActions({
  user,
  isAnonymous,
  refreshEntitlement,
  onOpenAccountTab,
} = {}) {
  const [billingPlanLoading, setBillingPlanLoading] = useState("");
  const [billingMessage, setBillingMessage] = useState("");
  const [billingMessageType, setBillingMessageType] = useState("info");
  const [subscriptionUpdateAction, setSubscriptionUpdateAction] = useState("");
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  const handleCheckoutStatus = useCallback((message, type) => {
    setBillingMessage(message);
    setBillingMessageType(type);
    if (type === "success" && /Plus is active/i.test(message || "")) {
      trackProductEvent("plus_checkout_succeeded");
    }
  }, []);

  useCheckoutReturn({
    refreshEntitlement,
    onStatus: handleCheckoutStatus,
    onOpenAccountTab,
  });

  async function handleStartCheckout(plan) {
    if (isAnonymous || !user?.id) {
      setBillingMessage(
        "Create a permanent account before subscribing."
      );
      setBillingMessageType("error");
      return;
    }

    setBillingPlanLoading(plan);
    setBillingMessage("");
    setBillingMessageType("info");
    trackProductEvent("checkout_started", { plan, source: "settings" });

    try {
      const checkout = await createCheckoutSession(plan, {
        expectedUserId: user.id,
      });
      window.location.assign(checkout.url);
    } catch (error) {
      console.error("Could not start Stripe Checkout:", error);
      setBillingMessage(
        error instanceof Error
          ? error.message
          : "Could not start checkout. Try again."
      );
      setBillingMessageType("error");
      setBillingPlanLoading("");
    }
  }

  async function handleRefreshSubscription() {
    setBillingMessage("Refreshing subscription status…");
    setBillingMessageType("info");

    try {
      const nextEntitlement = await refreshEntitlement();

      if (nextEntitlement.isPaid) {
        setBillingMessage(`${BRAND.plusName} is active.`);
        setBillingMessageType("success");
      } else {
        setBillingMessage(
          `${BRAND.plusName} is not active yet. Stripe may still be processing the subscription.`
        );
        setBillingMessageType("info");
      }
    } catch (error) {
      console.error("Could not refresh subscription status:", error);
      setBillingMessage(
        error instanceof Error
          ? error.message
          : "Could not refresh subscription status."
      );
      setBillingMessageType("error");
    }
  }

  async function handleConfirmCancellation() {
    if (isAnonymous || !user?.id) {
      setBillingMessage(
        "A permanent account is required to manage a subscription."
      );
      setBillingMessageType("error");
      return;
    }

    setSubscriptionUpdateAction("cancel");
    setBillingMessage("");
    setBillingMessageType("info");

    try {
      const result = await cancelSubscription({
        expectedUserId: user.id,
      });

      try {
        await refreshEntitlement();
      } catch (refreshError) {
        console.warn(
          "Cancellation succeeded, but the entitlement refresh failed:",
          refreshError
        );
      }

      setShowCancelConfirmation(false);
      setBillingMessage(
        result.message ||
          `${BRAND.plusName} will remain active through the current billing period and will not renew.`
      );
      setBillingMessageType("success");
      trackProductEvent("subscription_cancelled");
    } catch (error) {
      console.error("Could not cancel subscription renewal:", error);
      setBillingMessage(
        error instanceof Error
          ? error.message
          : "Could not cancel subscription renewal. Try again."
      );
      setBillingMessageType("error");
    } finally {
      setSubscriptionUpdateAction("");
    }
  }

  async function handleResumeSubscription() {
    if (isAnonymous || !user?.id) {
      setBillingMessage(
        "A permanent account is required to manage a subscription."
      );
      setBillingMessageType("error");
      return;
    }

    setSubscriptionUpdateAction("resume");
    setBillingMessage("");
    setBillingMessageType("info");

    try {
      const result = await resumeSubscription({
        expectedUserId: user.id,
      });

      try {
        await refreshEntitlement();
      } catch (refreshError) {
        console.warn(
          "Renewal resumed, but the entitlement refresh failed:",
          refreshError
        );
      }

      setShowCancelConfirmation(false);
      setBillingMessage(
        result.message ||
          `Automatic renewal has been restored for ${BRAND.plusName}.`
      );
      setBillingMessageType("success");
      trackProductEvent("subscription_resumed");
    } catch (error) {
      console.error("Could not resume subscription renewal:", error);
      setBillingMessage(
        error instanceof Error
          ? error.message
          : "Could not resume subscription renewal. Try again."
      );
      setBillingMessageType("error");
    } finally {
      setSubscriptionUpdateAction("");
    }
  }

  return {
    billingPlanLoading,
    billingMessage,
    billingMessageType,
    subscriptionUpdateAction,
    showCancelConfirmation,
    setShowCancelConfirmation,
    setBillingMessage,
    handleStartCheckout,
    handleRefreshSubscription,
    handleConfirmCancellation,
    handleResumeSubscription,
  };
}
