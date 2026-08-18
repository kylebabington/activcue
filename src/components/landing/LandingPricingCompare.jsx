// src/components/landing/LandingPricingCompare.jsx

import { Link } from "react-router-dom";
import LegalConsentNote from "../LegalConsentNote.jsx";
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

function PriceAmount({ plan, loading, error }) {
  if (loading) {
    return (
      <p className="landing-pricing-amount">
        <strong>…</strong>
        <span>loading</span>
      </p>
    );
  }

  if (plan && Number.isFinite(Number(plan.unitAmount))) {
    return (
      <p className="landing-pricing-amount">
        <strong>
          {formatStripeAmount(plan.unitAmount, plan.currency)}
        </strong>
        <span>{intervalLabelForPlan(plan.interval)}</span>
      </p>
    );
  }

  return (
    <p className="landing-pricing-amount">
      <strong>—</strong>
      <span>{error ? "unavailable" : ""}</span>
    </p>
  );
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
  onRetryPlans,
  launchTrial = null,
}) {
  const savePercent = annualSavingsPercent(monthlyPlan, annualPlan);
  const plansReady =
    !plansLoading && !plansError && monthlyPlan && annualPlan;
  const trialOfferActive = isLaunchTrialOfferActive(launchTrial);
  const monthlyCta = trialOfferActive
    ? launchTrialCtaLabel(launchTrial, "monthly")
    : "Get Plus monthly";
  const annualCta = trialOfferActive
    ? launchTrialCtaLabel(launchTrial, "annual")
    : "Get Plus annual";

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
        <div className="landing-pricing-error" role="alert">
          <p>
            {plansError}{" "}
            Prices load from Stripe when the API is running.
          </p>
          {typeof onRetryPlans === "function" ? (
            <button
              type="button"
              className="landing-btn landing-btn--ghost"
              onClick={onRetryPlans}
            >
              Retry loading prices
            </button>
          ) : null}
        </div>
      ) : null}

      {trialOfferActive ? (
        <p className="landing-launch-trial-note">
          {launchTrialOfferNote(launchTrial)}
        </p>
      ) : null}

      <div className="landing-pricing-compare landing-pricing-compare--three">
        <div className="landing-pricing-col">
          <h3>Free</h3>
          <p className="landing-pricing-amount">
            <strong>$0</strong>
            <span>forever</span>
          </p>
          <ul className="landing-pricing-perks">
            <li>Try {BRAND.name}</li>
            <li>Limited activities</li>
            <li>Create your family profile</li>
            <li>One full demo unlock</li>
          </ul>
          <Link className="landing-btn landing-btn--ghost" to="/demo">
            Try {BRAND.name}
          </Link>
        </div>

        <div className="landing-pricing-col landing-pricing-col--plus">
          <h3>{BRAND.plusName}</h3>
          <PriceAmount
            plan={monthlyPlan}
            loading={plansLoading}
            error={plansError}
          />
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
              {monthlyCta}
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
                : monthlyCta}
            </button>
          )}
        </div>

        <div className="landing-pricing-col landing-pricing-col--plus">
          <h3>Plus annual</h3>
          <PriceAmount
            plan={annualPlan}
            loading={plansLoading}
            error={plansError}
          />
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
              {annualCta}
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
                : annualCta}
            </button>
          )}
        </div>
      </div>

      <LegalConsentNote action="subscribing" />
    </div>
  );
}
