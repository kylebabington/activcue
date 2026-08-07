// src/components/billing/BillingPlanCards.jsx

import { Link } from "react-router-dom";
import {
  formatStripeAmount,
  intervalLabelForPlan,
} from "../../utils/money";
import { buildSignupUrl } from "../../utils/signupUrls";

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

/**
 * Shared Free / Monthly / Annual pricing cards (Settings + Landing).
 */
export default function BillingPlanCards({
  monthlyPlan,
  annualPlan,
  plansLoading = false,
  plansError = "",
  mode = "checkout",
  checkoutBusyPlan = null,
  checkoutDisabled = false,
  onCheckout,
  freeCtaTo = "/signup",
  freeCtaLabel = "Create free account",
  showFreePerks = false,
}) {
  const plansReady = !plansLoading && !plansError && monthlyPlan && annualPlan;
  const actionsDisabled = checkoutDisabled || !plansReady;

  function paidAction(plan) {
    if (mode === "signup") {
      return (
        <Link
          className="billing-plan-action"
          to={buildSignupUrl({ next: "checkout", plan })}
        >
          {plan === "annual" ? "Choose annual" : "Start with Plus"}
        </Link>
      );
    }

    return (
      <button
        type="button"
        className="billing-plan-action"
        disabled={actionsDisabled}
        onClick={() => onCheckout?.(plan)}
      >
        {checkoutBusyPlan === plan
          ? "Opening Checkout…"
          : plan === "annual"
            ? "Choose annual"
            : "Start with Plus"}
      </button>
    );
  }

  return (
    <div className="billing-plan-grid">
      {plansError ? (
        <div className="billing-notice billing-notice--error" role="alert">
          {plansError}
        </div>
      ) : null}

      <article className="billing-plan-card">
        <p className="billing-plan-name">Free</p>
        <p className="billing-plan-price">
          <strong>$0</strong>
          <span>forever</span>
        </p>
        {showFreePerks ? (
          <ul className="billing-plan-perks">
            <li>Personalized family setup</li>
            <li>Child profiles</li>
            <li>Favorites and history</li>
            <li>Core FamilyFlow experience</li>
            <li>Limited personalized activity generation</li>
          </ul>
        ) : (
          <p>
            Try FamilyFlow and keep your family&apos;s settings. Upgrade for
            AI-powered ideas anytime.
          </p>
        )}
        <Link className="billing-plan-action" to={freeCtaTo}>
          {freeCtaLabel}
        </Link>
      </article>

      <article className="billing-plan-card">
        <p className="billing-plan-name">Plus Monthly</p>
        <PlanPrice plan={monthlyPlan} loading={plansLoading} />
        {showFreePerks ? (
          <ul className="billing-plan-perks">
            <li>Unlimited personalized activities</li>
            <li>Unlimited imaginative activities</li>
            <li>AI Rescue hints</li>
            <li>Everything in Free</li>
          </ul>
        ) : null}
        {paidAction("monthly")}
      </article>

      <article className="billing-plan-card billing-plan-card--featured">
        <p className="billing-plan-badge">Best value</p>
        <p className="billing-plan-name">Plus Annual</p>
        <PlanPrice plan={annualPlan} loading={plansLoading} />
        {showFreePerks ? (
          <ul className="billing-plan-perks">
            <li>Everything in Plus</li>
            <li>Lower effective monthly price</li>
          </ul>
        ) : null}
        {paidAction("annual")}
      </article>
    </div>
  );
}

export { PlanPrice };
