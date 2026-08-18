// src/components/billing/BillingPlanCards.jsx

import { Link } from "react-router-dom";
import { BRAND } from "../../config/brand.js";
import {
  formatStripeAmount,
  intervalLabelForPlan,
} from "../../utils/money";
import {
  isLaunchTrialOfferActive,
  launchTrialCtaLabel,
  launchTrialOfferNote,
} from "../../utils/launchTrialCopy";
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

function defaultPaidCtaLabel(plan) {
  return plan === "annual" ? "Choose annual" : "Start with Plus";
}

/**
 * Shared Free / Monthly / Annual pricing cards (Settings + Landing).
 */
export default function BillingPlanCards({
  monthlyPlan,
  annualPlan,
  plansLoading = false,
  plansError = "",
  onRetryPlans,
  mode = "checkout",
  checkoutBusyPlan = null,
  checkoutDisabled = false,
  onCheckout,
  freeCtaTo = "/signup",
  freeCtaLabel = "Create free account",
  showFreePerks = false,
  launchTrial = null,
}) {
  const plansReady = !plansLoading && !plansError && monthlyPlan && annualPlan;
  const actionsDisabled = checkoutDisabled || !plansReady;
  const trialOfferActive = isLaunchTrialOfferActive(launchTrial);

  function paidAction(plan) {
    const idleLabel = trialOfferActive
      ? launchTrialCtaLabel(launchTrial, plan)
      : defaultPaidCtaLabel(plan);

    if (mode === "signup") {
      return (
        <Link
          className="billing-plan-action"
          to={buildSignupUrl({ next: "checkout", plan })}
        >
          {idleLabel}
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
        {checkoutBusyPlan === plan ? "Opening Checkout…" : idleLabel}
      </button>
    );
  }

  return (
    <div className="billing-plan-grid">
      {plansError ? (
        <div className="billing-notice billing-notice--error" role="alert">
          <p>{plansError}</p>
          {typeof onRetryPlans === "function" ? (
            <button
              type="button"
              className="text-action"
              onClick={onRetryPlans}
            >
              Retry loading prices
            </button>
          ) : null}
        </div>
      ) : null}

      {trialOfferActive ? (
        <p className="billing-launch-trial-note">
          {launchTrialOfferNote(launchTrial)}
        </p>
      ) : null}

      <article className="billing-plan-card">
        <div className="billing-plan-badge-slot" />
        <p className="billing-plan-name">Free</p>
        <p className="billing-plan-price">
          <strong>$0</strong>
          <span>forever</span>
        </p>
        <div className="billing-plan-body">
          {showFreePerks ? (
            <ul className="billing-plan-perks">
              <li>Personalized family setup</li>
              <li>Child profiles</li>
              <li>Favorites and history</li>
              <li>Core {BRAND.name} experience</li>
              <li>Limited personalized activity generation</li>
            </ul>
          ) : (
            <p>
              Try {BRAND.name} and keep your family&apos;s settings. Upgrade for
              AI-powered ideas anytime.
            </p>
          )}
        </div>
        <Link className="billing-plan-action" to={freeCtaTo}>
          {freeCtaLabel}
        </Link>
      </article>

      <article className="billing-plan-card">
        <div className="billing-plan-badge-slot" />
        <p className="billing-plan-name">Plus Monthly</p>
        <PlanPrice plan={monthlyPlan} loading={plansLoading} />
        <div className="billing-plan-body">
          {showFreePerks ? (
            <ul className="billing-plan-perks">
              <li>Unlimited personalized activities</li>
              <li>Unlimited imaginative activities</li>
              <li>AI Rescue hints</li>
              <li>Everything in Free</li>
            </ul>
          ) : (
            <p>
              Unlimited personalized activities, Plan B, Rescue, and AI hints.
            </p>
          )}
        </div>
        {paidAction("monthly")}
      </article>

      <article className="billing-plan-card billing-plan-card--featured">
        <div className="billing-plan-badge-slot">
          <p className="billing-plan-badge">Best value</p>
        </div>
        <p className="billing-plan-name">Plus Annual</p>
        <PlanPrice plan={annualPlan} loading={plansLoading} />
        <div className="billing-plan-body">
          {showFreePerks ? (
            <ul className="billing-plan-perks">
              <li>Everything in Plus</li>
              <li>Lower effective monthly price</li>
            </ul>
          ) : (
            <p>Everything in Plus, billed once a year at a lower monthly rate.</p>
          )}
        </div>
        {paidAction("annual")}
      </article>
    </div>
  );
}

export { PlanPrice };
