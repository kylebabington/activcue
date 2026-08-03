// src/pages/LandingPage.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { redirectToCheckout } from "../api/billingApi";
import { ApiRequestError } from "../api/apiClient";
import { supabase } from "../lib/supabaseClient";
import "../styles/landing.css";

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
            <Link className="landing-topbar-cta" to="/signup">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="landing-hero" id="top" aria-labelledby="landing-hero-title">
        <div className="landing-hero-wash" aria-hidden="true" />
        <div className="landing-hero-inner">
          <p className="landing-hero-brand">FamilyFlow</p>
          <h1 id="landing-hero-title" className="landing-hero-title">
            Right-now activities for the moment you are in
          </h1>
          <p className="landing-hero-support">
            Match a parent moment and your kid’s energy to simple play or pretend
            adventures—without a long planning session.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-btn landing-btn--primary" to="/app">
              Try the free flow
            </Link>
            <Link className="landing-btn landing-btn--ghost" to="/login">
              Log in
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="how-it-works-title">
        <div className="landing-section-inner">
          <h2 id="how-it-works-title">How it works</h2>
          <p className="landing-section-lead">
            Three quick choices, then ideas your family can start right away.
          </p>
          <ol className="landing-steps">
            <li>
              <span className="landing-step-label">Parent moment</span>
              <span className="landing-step-text">
                Quiet call, dinner prep, low mess—set what the house can handle.
              </span>
            </li>
            <li>
              <span className="landing-step-label">Kid energy &amp; style</span>
              <span className="landing-step-text">
                Calm or energetic. Simple play or imaginative pretend.
              </span>
            </li>
            <li>
              <span className="landing-step-label">Guided activity</span>
              <span className="landing-step-text">
                Pick an idea, follow kid-friendly steps, and finish with a win.
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section className="landing-section landing-section--tint" aria-labelledby="try-free-title">
        <div className="landing-section-inner">
          <h2 id="try-free-title">Try free</h2>
          <p className="landing-section-lead">
            No account needed. Open the full app with sample ideas—set a moment,
            pick kid energy, and run a guided activity. Unlock one pretend adventure
            free.
          </p>
          <ul className="landing-perk-list">
            <li>Set a parent moment and kid energy or style</li>
            <li>Get sample Quick ideas and I&apos;m Bored presets</li>
            <li>Unlock one pretend activity free and follow the steps</li>
            <li>
              After that unlock, more pretend needs Plus—simple Quick ideas still
              work
            </li>
          </ul>
          <Link className="landing-btn landing-btn--primary" to="/app">
            Start trying free
          </Link>
        </div>
      </section>

      <section
        className="landing-section"
        id="plus"
        aria-labelledby="plus-title"
      >
        <div className="landing-section-inner">
          <h2 id="plus-title">With FamilyFlow Plus</h2>
          <p className="landing-section-lead">
            Free lets you try the full flow with samples. Plus personalizes
            unlimited AI ideas to your supplies, kid energy, and the moment
            you are in.
          </p>
          <ul className="landing-perk-list landing-perk-list--plus">
            <li>Unlimited AI ideas tailored to inventory and the current moment</li>
            <li>Unlimited imaginative pretend activities</li>
            <li>AI step hints when an activity gets stuck</li>
            <li>AI personalization that learns what works for your kids</li>
            <li>Favorites and history sync when you are signed in</li>
          </ul>
          <p className="landing-plus-note">
            {canSubscribe
              ? "Subscribe to Plus to unlock personalized AI ideas for your family."
              : "Create a free account, then subscribe to Plus when you are ready."}
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
