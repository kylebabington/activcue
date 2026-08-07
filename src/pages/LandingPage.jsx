// src/pages/LandingPage.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getBillingPlans, redirectToCheckout } from "../api/billingApi";
import { ApiRequestError } from "../api/apiClient";
import Modal from "../components/Modal";
import LandingPricingCompare from "../components/landing/LandingPricingCompare";
import MomentDemo from "../components/landing/MomentDemo";
import {
  DEMO_VIDEO_POSTER_SRC,
  DEMO_VIDEO_SRC,
} from "../constants/demoVideo";
import { supabase } from "../lib/supabaseClient";
import {
  captureAttribution,
  trackProductEvent,
} from "../utils/analytics";
import { buildSignupUrl } from "../utils/signupUrls";
import "../styles/landing.css";

const WHY_ITEMS = [
  {
    id: "moment",
    title: "Fits the moment",
    body: "You're making dinner. One kid is restless. Another is tired. You have 20 minutes, low patience, and whatever supplies are already in the house. FamilyFlow matches activities to time, supervision, mess, energy, and the situation you're actually in — not a generic rainy-day list.",
  },
  {
    id: "adapts",
    title: "Adapts to each child",
    body: "An activity that works for a 6-year-old shouldn't just get handed to a 13-year-old with different wording. FamilyFlow considers age, independence, complexity, and who is playing.",
  },
  {
    id: "plan-b",
    title: "Has a Plan B",
    body: "Didn't land? Try the next already-matched option without regenerating from scratch. When the house needs a reset, Rescue Mode gives a calm fallback so you can keep moving.",
  },
  {
    id: "learns",
    title: "Learns what works",
    body: "Finished activities feed What Works for Us — so over time FamilyFlow leans toward the kinds of play that actually succeed for your family, not just what looks good on a list.",
  },
];

const HOW_STEPS = [
  {
    title: "Tell us the moment",
    text: "Cooking, work call, cleaning, resting — the same parent moments you use in the app.",
  },
  {
    title: "Tell us who's playing",
    text: "Ages of the kids in the mix. FamilyFlow adapts roles and challenge.",
  },
  {
    title: "FamilyFlow finds the best fit",
    text: "Activities ranked by fit for your situation — not random suggestions.",
  },
];

function LandingPage() {
  const [canSubscribe, setCanSubscribe] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [plansById, setPlansById] = useState({});
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [navOpen, setNavOpen] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    captureAttribution();
    trackProductEvent("landing_page_viewed");
  }, []);

  useEffect(() => {
    const pricingEl = document.getElementById("plus");
    if (!pricingEl || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    let fired = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (fired) return;
        if (entries.some((entry) => entry.isIntersecting)) {
          fired = true;
          trackProductEvent("pricing_viewed", { source: "landing" });
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(pricingEl);
    return () => observer.disconnect();
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    fetch(DEMO_VIDEO_SRC, { method: "HEAD" })
      .then((response) => {
        if (!cancelled) setHasVideo(response.ok);
      })
      .catch(() => {
        if (!cancelled) setHasVideo(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCheckout(plan) {
    setCheckoutError("");
    setCheckoutBusy(plan);
    trackProductEvent("checkout_started", { plan, source: "landing" });

    try {
      await redirectToCheckout({ plan });
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.code === "ACCOUNT_REQUIRED"
      ) {
        window.location.assign(
          buildSignupUrl({ next: "checkout", plan })
        );
        return;
      }

      setCheckoutError(
        error?.message ||
          "Could not start checkout. Try again in a moment."
      );
      setCheckoutBusy(null);
    }
  }

  function trackTryFree(source) {
    trackProductEvent("demo_started", { source });
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

          <nav
            className={
              navOpen
                ? "landing-topbar-nav is-open"
                : "landing-topbar-nav"
            }
            aria-label="Landing"
          >
            <a
              className="landing-topbar-link"
              href="#how-it-works"
              onClick={() => setNavOpen(false)}
            >
              How it works
            </a>
            <a
              className="landing-topbar-link"
              href="#plus"
              onClick={() => setNavOpen(false)}
            >
              Pricing
            </a>
            <Link
              className="landing-topbar-link"
              to="/login"
              onClick={() => setNavOpen(false)}
            >
              Log in
            </Link>
          </nav>

          <div className="landing-topbar-actions">
            <button
              type="button"
              className="landing-topbar-menu"
              aria-expanded={navOpen}
              aria-controls="landing-mobile-nav"
              aria-label={navOpen ? "Close menu" : "Open menu"}
              onClick={() => setNavOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
            <a
              className="landing-topbar-cta"
              href="#try-demo"
              onClick={() => {
                setNavOpen(false);
                trackTryFree("topbar");
              }}
            >
              Try free
            </a>
          </div>
        </div>

        <div
          id="landing-mobile-nav"
          className={
            navOpen
              ? "landing-topbar-drawer is-open"
              : "landing-topbar-drawer"
          }
        >
          <a
            className="landing-topbar-link"
            href="#how-it-works"
            onClick={() => setNavOpen(false)}
          >
            How it works
          </a>
          <a
            className="landing-topbar-link"
            href="#plus"
            onClick={() => setNavOpen(false)}
          >
            Pricing
          </a>
          <Link
            className="landing-topbar-link"
            to="/login"
            onClick={() => setNavOpen(false)}
          >
            Log in
          </Link>
        </div>
      </header>

      <section className="landing-hero" id="top" aria-labelledby="landing-hero-title">
        <div className="landing-hero-wash" aria-hidden="true" />
        <div className="landing-hero-inner">
          <div className="landing-hero-copy landing-hero-copy--centered">
            <p className="landing-hero-brand">FamilyFlow</p>
            <h1 id="landing-hero-title" className="landing-hero-title">
              Finding an activity isn&apos;t the hard part.
              <br />
              Finding one that works right now is.
            </h1>
            <p className="landing-hero-support">
              You&apos;re making dinner. One kid is restless. Another is tired.
              You have 20 minutes, low patience, and whatever supplies are
              already in the house. FamilyFlow matches activities to the moment
              you&apos;re actually in.
            </p>

            <div className="landing-contrast" role="table" aria-label="Typical lists versus FamilyFlow">
              <div className="landing-contrast-row landing-contrast-row--head" role="row">
                <span role="columnheader">Typical activity lists</span>
                <span role="columnheader">FamilyFlow</span>
              </div>
              <div className="landing-contrast-row" role="row">
                <span role="cell">&ldquo;50 rainy-day activities&rdquo;</span>
                <span role="cell">What works for your situation right now</span>
              </div>
              <div className="landing-contrast-row" role="row">
                <span role="cell">Same ideas for every age</span>
                <span role="cell">Adapts to the ages playing</span>
              </div>
              <div className="landing-contrast-row" role="row">
                <span role="cell">Ignore parent availability</span>
                <span role="cell">Accounts for time and supervision</span>
              </div>
              <div className="landing-contrast-row" role="row">
                <span role="cell">Random suggestions</span>
                <span role="cell">Ranks activities by fit</span>
              </div>
            </div>

            <div className="landing-hero-actions">
              <a
                className="landing-btn landing-btn--primary"
                href="#try-demo"
                onClick={() => trackTryFree("hero")}
              >
                Try FamilyFlow free
              </a>
              <Link
                className="landing-btn landing-btn--ghost"
                to="/signup"
                onClick={() =>
                  trackProductEvent("landing_signup_cta_clicked", {
                    source: "hero",
                  })
                }
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        className="landing-section landing-section--demo"
        id="try-demo"
        aria-labelledby="try-demo-title"
      >
        <div className="landing-section-inner landing-section-inner--wide">
          <MomentDemo />
          {hasVideo ? (
            <p className="landing-video-link-row">
              <button
                type="button"
                className="landing-text-link"
                onClick={() => {
                  setVideoOpen(true);
                  trackProductEvent("landing_demo_video_opened", {
                    source: "landing",
                  });
                }}
              >
                Watch 45-second walkthrough
              </button>
            </p>
          ) : null}
        </div>
      </section>

      <section
        className="landing-section landing-section--tint"
        id="why"
        aria-labelledby="why-title"
      >
        <div className="landing-section-inner">
          <h2 id="why-title">Why FamilyFlow gets better results</h2>
          <p className="landing-section-lead">
            Substance without another wall of marketing sections.
          </p>
          <div className="landing-why">
            {WHY_ITEMS.map((item) => (
              <details key={item.id} className="landing-why-item">
                <summary>{item.title}</summary>
                <p>{item.body}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        className="landing-section"
        id="plus"
        aria-labelledby="plus-title"
      >
        <div className="landing-section-inner">
          <h2 id="plus-title">Demo vs Plus</h2>
          <p className="landing-section-lead">
            Try free with sample matches. Upgrade when you want unlimited
            activities personalized to your family.
          </p>
          {checkoutError ? (
            <p className="landing-plus-note" role="alert">
              {checkoutError}
            </p>
          ) : null}
          <LandingPricingCompare
            monthlyPlan={plansById.monthly || null}
            annualPlan={plansById.annual || null}
            plansLoading={plansLoading}
            plansError={plansError}
            interval={billingInterval}
            onIntervalChange={setBillingInterval}
            mode={canSubscribe ? "checkout" : "signup"}
            checkoutBusyPlan={checkoutBusy}
            onCheckout={handleCheckout}
          />
        </div>
      </section>

      <section
        className="landing-section landing-section--tint"
        id="how-it-works"
        aria-labelledby="how-title"
      >
        <div className="landing-section-inner landing-section-inner--wide">
          <h2 id="how-title">How it works</h2>
          <ol className="landing-how">
            {HOW_STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="landing-how-num" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <p className="landing-how-title">{step.title}</p>
                  <p className="landing-how-text">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className="landing-section"
        aria-labelledby="final-cta-title"
      >
        <div className="landing-section-inner landing-final-cta">
          <h2 id="final-cta-title">Stop searching. Find something that fits.</h2>
          <p>
            Try FamilyFlow with your current situation and unlock one complete
            activity free.
          </p>
          <div className="landing-hero-actions">
            <Link
              className="landing-btn landing-btn--primary"
              to="/demo"
              onClick={() => trackTryFree("final")}
            >
              Try the demo
            </Link>
          </div>
          <p className="landing-final-login">
            Already have an account?{" "}
            <Link to="/login">Log in</Link>
          </p>
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

      <Modal
        title="FamilyFlow walkthrough"
        isOpen={videoOpen}
        onClose={() => setVideoOpen(false)}
      >
        <video
          key={DEMO_VIDEO_SRC}
          className="landing-demo-video"
          controls
          muted
          playsInline
          poster={DEMO_VIDEO_POSTER_SRC}
          onPlay={() =>
            trackProductEvent("landing_demo_video_played", {
              source: "landing_modal",
            })
          }
        >
          <source src={DEMO_VIDEO_SRC} type="video/webm" />
        </video>
      </Modal>
    </div>
  );
}

export default LandingPage;
