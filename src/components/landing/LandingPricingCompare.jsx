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

/**
 * Compact Demo vs Plus comparison for the landing page.
 */
export default function LandingPricingCompare({
  monthlyPlan,
  annualPlan,
  plansLoading = false,
  plansError = "",
  interval = "monthly",
  onIntervalChange,
  mode = "signup",
  checkoutBusyPlan = null,
  onCheckout,
}) {
  const selectedPlan = interval === "annual" ? annualPlan : monthlyPlan;
  const savePercent = annualSavingsPercent(monthlyPlan, annualPlan);
  const plansReady =
    !plansLoading && !plansError && monthlyPlan && annualPlan;

  let plusPriceLabel = "—";
  let plusIntervalLabel = "";
  if (plansLoading) {
    plusPriceLabel = "…";
    plusIntervalLabel = "loading";
  } else if (selectedPlan) {
    plusPriceLabel = formatStripeAmount(
      selectedPlan.unitAmount,
      selectedPlan.currency
    );
    plusIntervalLabel =
      interval === "annual" ? "per year" : "per month";
  } else if (plansError) {
    plusPriceLabel = "—";
    plusIntervalLabel = "unavailable";
  }

  function handlePlusClick() {
    if (mode === "checkout") {
      onCheckout?.(interval);
      return;
    }
    window.location.assign(
      buildSignupUrl({ next: "checkout", plan: interval })
    );
  }

  return (
    <div className="landing-pricing">
      <div
        className="landing-pricing-toggle"
        role="group"
        aria-label="Billing interval"
      >
        <button
          type="button"
          className={
            interval === "monthly"
              ? "landing-pricing-toggle-btn is-selected"
              : "landing-pricing-toggle-btn"
          }
          aria-pressed={interval === "monthly"}
          onClick={() => onIntervalChange?.("monthly")}
        >
          Monthly
        </button>
        <button
          type="button"
          className={
            interval === "annual"
              ? "landing-pricing-toggle-btn is-selected"
              : "landing-pricing-toggle-btn"
          }
          aria-pressed={interval === "annual"}
          onClick={() => onIntervalChange?.("annual")}
        >
          Annual
          {savePercent != null ? (
            <span className="landing-pricing-save">Save {savePercent}%</span>
          ) : null}
        </button>
      </div>

      {plansError ? (
        <p className="landing-plus-note" role="alert">
          {plansError}
        </p>
      ) : null}

      <div className="landing-pricing-compare">
        <div className="landing-pricing-col">
          <h3>Demo</h3>
          <p className="landing-pricing-amount">
            <strong>$0</strong>
          </p>
          <ul className="landing-pricing-perks">
            <li>No account required</li>
            <li>Match sample activities</li>
            <li>Preview several matches</li>
            <li>Unlock 1 full activity</li>
          </ul>
          <Link className="landing-btn landing-btn--ghost" to="/demo">
            Try the demo
          </Link>
        </div>

        <div className="landing-pricing-col landing-pricing-col--plus">
          <h3>Plus</h3>
          <p className="landing-pricing-amount">
            <strong>{plusPriceLabel}</strong>
            {plusIntervalLabel ? <span>{plusIntervalLabel}</span> : null}
          </p>
          <ul className="landing-pricing-perks">
            <li>Personalized to your family</li>
            <li>Unlimited full activities</li>
            <li>Exact situation + supplies</li>
            <li>Unlimited full details</li>
          </ul>
          {mode === "signup" ? (
            <Link
              className="landing-btn landing-btn--primary"
              to={buildSignupUrl({ next: "checkout", plan: interval })}
            >
              Get FamilyFlow Plus
            </Link>
          ) : (
            <button
              type="button"
              className="landing-btn landing-btn--primary"
              disabled={!plansReady || Boolean(checkoutBusyPlan)}
              onClick={handlePlusClick}
            >
              {checkoutBusyPlan === interval
                ? "Opening Checkout…"
                : "Get FamilyFlow Plus"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
