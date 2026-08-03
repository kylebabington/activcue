// src/pages/LandingPage.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { redirectToCheckout } from "../api/billingApi";
import { ApiRequestError } from "../api/apiClient";
import { LANDING_ACTIVITY_PREVIEW } from "../constants/landingActivityPreview";
import { supabase } from "../lib/supabaseClient";
import {
  getActivityMissionText,
  getActivityRoleLabel,
  getStarterIdeas,
  getVisualThemeMeta,
} from "../utils/activityVisualTheme";
import "../styles/landing.css";

function ActivityV2Preview() {
  const activity = LANDING_ACTIVITY_PREVIEW;
  const theme = getVisualThemeMeta(activity.visualTheme);
  const role = getActivityRoleLabel(activity);
  const mission = getActivityMissionText(activity);
  const starters = getStarterIdeas(activity).slice(0, 4);

  return (
    <article
      className={`landing-preview-card activity-card--theme-${theme.key}`}
      style={{ "--activity-theme-accent": theme.accent }}
      aria-label="Sample Activity V2 preview"
    >
      <div className="landing-preview-band">
        <span aria-hidden="true">{theme.icon}</span>
        <span>{theme.label} story</span>
      </div>
      <h3>{activity.title}</h3>
      <p className="landing-preview-mission">{mission}</p>
      <p className="landing-preview-role">
        <span>You are</span> <strong>{role}</strong>
      </p>
      <ul className="landing-preview-starters">
        {starters.map((idea) => (
          <li key={idea.title}>{idea.title}</li>
        ))}
      </ul>
      <p className="landing-preview-cta-label">Enter the story →</p>
    </article>
  );
}

function LandingPage() {
  const [canSubscribe, setCanSubscribe] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function detectPermanentSession() {
      try {
        const {
          data: sessionData,
        } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        const isPermanent =
          Boolean(user) && user.is_anonymous !== true;

        if (isMounted) {
          setCanSubscribe(isPermanent);
        }
      } catch {
        if (isMounted) {
          setCanSubscribe(false);
        }
      }
    }

    detectPermanentSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setCanSubscribe(
        Boolean(user) && user.is_anonymous !== true
      );
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleGetPlus() {
    setCheckoutError("");
    setCheckoutBusy(true);

    try {
      await redirectToCheckout();
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.code === "ACCOUNT_REQUIRED"
      ) {
        window.location.assign("/signup");
        return;
      }

      setCheckoutError(
        error?.message ||
          "Could not start checkout. Try again in a moment."
      );
      setCheckoutBusy(false);
    }
  }

  return (
    <div className="landing">
      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          <a className="landing-brand" href="#top" aria-label="FamilyFlow home">
            <img
              className="landing-brand-mark"
              src="/logo.svg"
              alt=""
              width="36"
              height="36"
            />
            <span className="landing-brand-name">FamilyFlow</span>
          </a>

          <div className="landing-topbar-actions">
            <Link className="landing-topbar-link" to="/login">
              Log in
            </Link>
            <Link className="landing-topbar-cta" to="/onboarding">
              Find something to do
            </Link>
          </div>
        </div>
      </header>

      <section className="landing-hero" id="top" aria-labelledby="landing-hero-title">
        <div className="landing-hero-wash" aria-hidden="true" />
        <div className="landing-hero-inner landing-hero-inner--split">
          <div className="landing-hero-copy">
            <p className="landing-hero-brand">FamilyFlow</p>
            <h1 id="landing-hero-title" className="landing-hero-title">
              Need 20 quiet minutes?
            </h1>
            <p className="landing-hero-support">
              Match the moment you are in, then hand your kid a story they can
              start without asking you what to do next.
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-btn landing-btn--primary" to="/onboarding">
                Find something to do
              </Link>
              <Link className="landing-btn landing-btn--ghost" to="/app">
                Open the app
              </Link>
            </div>
          </div>
          <ActivityV2Preview />
        </div>
      </section>

      <section className="landing-section" aria-labelledby="moment-title">
        <div className="landing-section-inner">
          <h2 id="moment-title">Built for the moment, not a plan</h2>
          <p className="landing-section-lead">
            FamilyFlow matches parent availability, kid energy, supplies, and
            mess/noise limits—then opens a guided activity kids can run.
          </p>
          <ol className="landing-steps">
            <li>
              <span className="landing-step-label">Moment matching</span>
              <span className="landing-step-text">
                Quiet call, dinner prep, or low mess—set what the house can handle.
              </span>
            </li>
            <li>
              <span className="landing-step-label">Kid profiles</span>
              <span className="landing-step-text">
                Ages and interests shape roles, starters, and step difficulty.
              </span>
            </li>
            <li>
              <span className="landing-step-label">Independent play</span>
              <span className="landing-step-text">
                World, role, starter doors, and built-in “I’m stuck” help—before any AI hint.
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section className="landing-section landing-section--tint" aria-labelledby="safety-net-title">
        <div className="landing-section-inner">
          <h2 id="safety-net-title">When the first idea stalls</h2>
          <p className="landing-section-lead">
            What Works for Us remembers successes. Plan B offers the next best fit.
            Rescue Mode recovers when everything falls apart—and useful pieces still
            work offline.
          </p>
          <ul className="landing-perk-list">
            <li>What Works for Us — learn from finished activities</li>
            <li>Plan B — try the next best option without regenerating</li>
            <li>Rescue Mode — calm fallback when the house needs a reset</li>
            <li>Offline shell — keep running a started Activity V2 without Wi‑Fi</li>
          </ul>
          <Link className="landing-btn landing-btn--primary" to="/onboarding">
            Get your first activity
          </Link>
        </div>
      </section>

      <section
        className="landing-section"
        id="plus"
        aria-labelledby="plus-title"
      >
        <div className="landing-section-inner">
          <h2 id="plus-title">Free to try. Plus when you want more.</h2>
          <p className="landing-section-lead">
            Start without an account. Create a free account when you want to
            remember what worked. Plus unlocks unlimited personalized ideas.
          </p>
          <ul className="landing-perk-list landing-perk-list--plus">
            <li>Unlimited personalized ideas for your supplies and moment</li>
            <li>Unlimited imaginative pretend activities</li>
            <li>Emergency AI hints only after built-in help</li>
            <li>Favorites and history sync when signed in</li>
          </ul>
          <p className="landing-plus-note">
            {canSubscribe
              ? "Subscribe to Plus when you are ready for unlimited personalized ideas."
              : "Create a free account after your first win, then upgrade when it helps."}
          </p>
          {checkoutError ? (
            <p className="landing-plus-note" role="alert">
              {checkoutError}
            </p>
          ) : null}
          <div className="landing-hero-actions">
            {canSubscribe ? (
              <button
                type="button"
                className="landing-btn landing-btn--primary"
                onClick={handleGetPlus}
                disabled={checkoutBusy}
              >
                {checkoutBusy ? "Starting checkout…" : "Get FamilyFlow Plus"}
              </button>
            ) : (
              <Link className="landing-btn landing-btn--primary" to="/signup">
                Sign up free
              </Link>
            )}
            <a className="landing-btn landing-btn--ghost" href="#top">
              Back to top
            </a>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <img src="/logo.svg" alt="" width="24" height="24" />
          <span>FamilyFlow</span>
          <span className="landing-footer-sep" aria-hidden="true">
            ·
          </span>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a href="mailto:support@familyflow.app">Support</a>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
