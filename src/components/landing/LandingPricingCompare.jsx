// src/components/landing/LandingPricingCompare.jsx

import { Link } from "react-router-dom";
import { formatStripeAmount } from "../../utils/money";
import { buildSignupUrl } from "../../utils/signupUrls";

function annualSavingsPercent(monthlyPlan, annualPlan) {
  const monthly = Number(monthlyPlan?.unitAmount);
  const annual = Number(annualPlan?.unitAmount);
  if (!Number.isFinite(monthly) || !Number.isFinite(annual) || monthly <= 0) {
    return null;
  }
  const yearlyAtMonthly = monthly * 12;
  if (yearlyAtMonthly <= annual) return null;
  return Math.round(((yearlyAtMonthly - annual) / yearlyAtMonthly) * 100);
}

function priceLabel(plan, loading, error) {
  if (loading) return { amount: "…", interval: "loading" };
  if (plan) {
    return {
      amount: formatStripeAmount(plan.unitAmount, plan.currency),
      interval: plan.interval === "year" ? "per year" : "per month",
    };
  }
  if (error) return { amount: "—", interval: "unavailable" };
  return { amount: "—", interval: "" };
}

/**
 * Free / Plus monthly / Plus annual for the landing page.
 * Paid amounts always come from Stripe via getBillingPlans — never hardcoded.
 */
export default function LandingPricingCompare({
  monthlyPlan,
  annualPlan,
  plansLoading = false,
  plansError = "",
  mode = "signup",
  checkoutBusyPlan = null,
  onCheckout,
}) {
  const savePercent = annualSavingsPercent(monthlyPlan, annualPlan);
  const plansReady =
    !plansLoading && !plansError && monthlyPlan && annualPlan;
  const monthlyLabel = priceLabel(monthlyPlan, plansLoading, plansError);
  const annualLabel = priceLabel(annualPlan, plansLoading, plansError);

  function handlePlusClick(plan) {
    if (mode === "checkout") {
      onCheckout?.(plan);
      return;
    }
    window.location.assign(
      buildSignupUrl({ next: "checkout", plan })
    );
  }

  return (
    <div className="landing-pricing">
      {plansError ? (
        <p className="landing-plus-note" role="alert">
          {plansError}
        </p>
      ) : null}

      <div className="landing-pricing-compare landing-pricing-compare--three">
        <div className="landing-pricing-col">
          <h3>Free</h3>
          <p className="landing-pricing-amount">
            <strong>$0</strong>
          </p>
          <ul className="landing-pricing-perks">
            <li>Try FamilyFlow</li>
            <li>Limited activities</li>
            <li>Create your family profile</li>
            <li>One full demo unlock</li>
          </ul>
          <Link className="landing-btn landing-btn--ghost" to="/demo">
            Try FamilyFlow
          </Link>
        </div>

        <div className="landing-pricing-col landing-pricing-col--plus">
          <h3>FamilyFlow Plus</h3>
          <p className="landing-pricing-amount">
            <strong>{monthlyLabel.amount}</strong>
            {monthlyLabel.interval ? (
              <span>{monthlyLabel.interval}</span>
            ) : null}
          </p>
          <ul className="landing-pricing-perks">
            <li>Unlimited personalized activities</li>
            <li>Plan B and Rescue Mode</li>
            <li>AI step hints when stuck</li>
            <li>Saved history that learns what works</li>
          </ul>
          {mode === "signup" ? (
            <Link
              className="landing-btn landing-btn--primary"
              to={buildSignupUrl({ next: "checkout", plan: "monthly" })}
            >
              Get Plus monthly
            </Link>
          ) : (
            <button
              type="button"
              className="landing-btn landing-btn--primary"
              disabled={!plansReady || Boolean(checkoutBusyPlan)}
              onClick={() => handlePlusClick("monthly")}
            >
              {checkoutBusyPlan === "monthly"
                ? "Opening Checkout…"
                : "Get Plus monthly"}
            </button>
          )}
        </div>

        <div className="landing-pricing-col landing-pricing-col--plus">
          <h3>Plus annual</h3>
          <p className="landing-pricing-amount">
            <strong>{annualLabel.amount}</strong>
            {annualLabel.interval ? (
              <span>{annualLabel.interval}</span>
            ) : null}
          </p>
          {savePercent != null ? (
            <p className="landing-pricing-save-line">Save {savePercent}%</p>
          ) : null}
          <ul className="landing-pricing-perks">
            <li>Everything in Plus</li>
            <li>Lower effective monthly price</li>
            <li>Unlimited personalized generation</li>
            <li>Best value for regular use</li>
          </ul>
          {mode === "signup" ? (
            <Link
              className="landing-btn landing-btn--primary"
              to={buildSignupUrl({ next: "checkout", plan: "annual" })}
            >
              Get Plus annual
            </Link>
          ) : (
            <button
              type="button"
              className="landing-btn landing-btn--primary"
              disabled={!plansReady || Boolean(checkoutBusyPlan)}
              onClick={() => handlePlusClick("annual")}
            >
              {checkoutBusyPlan === "annual"
                ? "Opening Checkout…"
                : "Get Plus annual"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
