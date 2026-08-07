// src/pages/settings/SettingsPlusSection.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatStripeAmount,
  getBillingPlans,
  intervalLabelForPlan,
} from "../../api/billingApi";
import { buildSignupUrl } from "../../utils/signupUrls";

function formatSubscriptionStatus(status) {
  if (typeof status !== "string" || !status) {
    return "Inactive";
  }
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatBillingDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date);
}

function PlanPrice({ plan, loading }) {
  if (loading) {
    return (
      <p className="billing-plan-price">
        <strong>…</strong>
        <span>loading</span>
      </p>
    );
  }

  if (!plan) {
    return (
      <p className="billing-plan-price">
        <strong>—</strong>
        <span>unavailable</span>
      </p>
    );
  }

  return (
    <p className="billing-plan-price">
      <strong>{formatStripeAmount(plan.unitAmount, plan.currency)}</strong>
      <span>{intervalLabelForPlan(plan.interval)}</span>
    </p>
  );
}

export default function SettingsPlusSection({
  isAnonymous,
  entitlement,
  entitlementHydrated,
  billing,
}) {
  const {
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
  } = billing;

  const [plansById, setPlansById] = useState({});
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      setPlansLoading(true);
      setPlansError("");
      try {
        const result = await getBillingPlans();
        if (!cancelled) {
          setPlansById(result.byPlan || {});
        }
      } catch (error) {
        if (!cancelled) {
          setPlansById({});
          setPlansError(
            error?.message ||
              "Could not load subscription prices. Try again shortly."
          );
        }
      } finally {
        if (!cancelled) {
          setPlansLoading(false);
        }
      }
    }

    void loadPlans();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthlyPlan = plansById.monthly || null;
  const annualPlan = plansById.annual || null;
  const plansReady = !plansLoading && !plansError && monthlyPlan && annualPlan;
  const checkoutDisabled = Boolean(billingPlanLoading) || !plansReady;

  return (
    <section className="panel billing-panel">
      <div className="panel-header">
        <div>
          <h2>FamilyFlow Plus</h2>
          <p>
            Unlimited personalized activities, AI-generated ideas, and AI Rescue
            hints. Favorites and history stay free.
          </p>
        </div>
      </div>

      {billingMessage ? (
        <div
          className={`billing-notice billing-notice--${billingMessageType}`}
          role={billingMessageType === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {billingMessage}
        </div>
      ) : null}

      {!entitlementHydrated ? (
        <p className="billing-loading">Checking your subscription…</p>
      ) : entitlement.billingExempt ? (
        <div className="billing-active-summary">
          <div className="billing-active-details">
            <strong>FamilyFlow Plus is included</strong>
            <p>
              {entitlement.isAdmin
                ? "Administrator account"
                : "Complimentary access"}
            </p>
            <p>
              This account has full Plus access and is not billed through Stripe.
            </p>
          </div>
        </div>
      ) : entitlement.isPaid ? (
        <div className="billing-active-summary">
          <div className="billing-active-details">
            <strong>Your plan</strong>
            <p>
              Status: {formatSubscriptionStatus(entitlement.subscriptionStatus)}
            </p>
            {entitlement.currentPeriodEnd ? (
              <p>
                {entitlement.cancelAtPeriodEnd
                  ? "Plus remains active until "
                  : "Renews "}
                {formatBillingDate(entitlement.currentPeriodEnd)}.
              </p>
            ) : null}
            {entitlement.cancelAtPeriodEnd ? (
              <p className="billing-renewal-status billing-renewal-status--ending">
                Automatic renewal is canceled.
              </p>
            ) : (
              <p className="billing-renewal-status">
                Your subscription will renew automatically.
              </p>
            )}
          </div>

          <div className="billing-management-controls">
            {entitlement.cancelAtPeriodEnd ? (
              <button
                type="button"
                className="billing-resume-button"
                onClick={handleResumeSubscription}
                disabled={Boolean(subscriptionUpdateAction)}
              >
                {subscriptionUpdateAction === "resume"
                  ? "Restoring renewal…"
                  : "Resume renewal"}
              </button>
            ) : !showCancelConfirmation ? (
              <button
                type="button"
                className="billing-cancel-button"
                onClick={() => {
                  setShowCancelConfirmation(true);
                  setBillingMessage("");
                }}
                disabled={Boolean(subscriptionUpdateAction)}
              >
                Manage renewal
              </button>
            ) : (
              <div className="billing-cancel-confirmation">
                <strong>Cancel FamilyFlow Plus renewal?</strong>
                {entitlement.currentPeriodEnd ? (
                  <p>
                    You will keep Plus access through{" "}
                    {formatBillingDate(entitlement.currentPeriodEnd)}. Your
                    subscription will not renew after that date.
                  </p>
                ) : (
                  <p>
                    You will keep Plus access through the current paid billing
                    period. Your subscription will not renew afterward.
                  </p>
                )}
                <div className="billing-management-actions">
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => setShowCancelConfirmation(false)}
                    disabled={Boolean(subscriptionUpdateAction)}
                  >
                    Keep subscription
                  </button>
                  <button
                    type="button"
                    className="billing-confirm-cancel-button"
                    onClick={handleConfirmCancellation}
                    disabled={Boolean(subscriptionUpdateAction)}
                  >
                    {subscriptionUpdateAction === "cancel"
                      ? "Canceling renewal…"
                      : "Confirm cancellation"}
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              className="secondary-action"
              onClick={handleRefreshSubscription}
              disabled={Boolean(subscriptionUpdateAction)}
            >
              Refresh subscription status
            </button>
          </div>
        </div>
      ) : isAnonymous ? (
        <div className="billing-account-required">
          <p>
            Create a free permanent account before adding a paid subscription.
          </p>
          <Link
            className="billing-account-link"
            to={buildSignupUrl({ next: "checkout", plan: "monthly" })}
          >
            Create account to subscribe
          </Link>
        </div>
      ) : (
        <>
          {plansError ? (
            <div className="billing-notice billing-notice--error" role="alert">
              {plansError}
            </div>
          ) : null}

          <div className="billing-plan-grid">
            <article className="billing-plan-card">
              <p className="billing-plan-name">Free plan</p>
              <p>
                Try FamilyFlow and keep your family&apos;s settings. Upgrade for
                AI-powered ideas anytime.
              </p>
            </article>

            <article className="billing-plan-card">
              <p className="billing-plan-name">Monthly</p>
              <PlanPrice plan={monthlyPlan} loading={plansLoading} />
              <button
                type="button"
                className="billing-plan-action"
                disabled={checkoutDisabled}
                onClick={() => handleStartCheckout("monthly")}
              >
                {billingPlanLoading === "monthly"
                  ? "Opening Checkout…"
                  : "Upgrade"}
              </button>
            </article>

            <article className="billing-plan-card billing-plan-card--featured">
              <p className="billing-plan-badge">Best value</p>
              <p className="billing-plan-name">Annual</p>
              <PlanPrice plan={annualPlan} loading={plansLoading} />
              <button
                type="button"
                className="billing-plan-action"
                disabled={checkoutDisabled}
                onClick={() => handleStartCheckout("annual")}
              >
                {billingPlanLoading === "annual"
                  ? "Opening Checkout…"
                  : "Upgrade"}
              </button>
            </article>
          </div>

          <button
            type="button"
            className="billing-refresh-button"
            onClick={handleRefreshSubscription}
          >
            Refresh subscription status
          </button>
        </>
      )}
    </section>
  );
}
