// src/pages/LandingPage.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getBillingPlans, redirectToCheckout } from "../api/billingApi";
import { ApiRequestError } from "../api/apiClient";
import Modal from "../components/Modal";
import SiteFooter from "../components/SiteFooter.jsx";
import LandingPricingCompare from "../components/landing/LandingPricingCompare";
import LandingProductShowcase from "../components/landing/LandingProductShowcase";
import LandingSituations from "../components/landing/LandingSituations";
import { BRAND } from "../config/brand.js";
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
import { isLaunchTrialOfferActive, launchTrialHeroKicker, launchTrialOfferNote } from "../utils/launchTrialCopy";
import "../styles/landing.css";

const WHY_ITEMS = [
  {
    id: "moment",
    title: "Fits the moment",
    body: `You're making dinner. One kid is restless. Another is tired. You have 20 minutes, low patience, and whatever supplies are already in the house. ${BRAND.name} matches activities to time, supervision, mess, energy, and the situation you're actually in — not a generic rainy-day list.`,
  },
  {
    id: "adapts",
    title: "Adapts to each child",
    body: `An activity that works for a 6-year-old shouldn't just get handed to a 13-year-old with different wording. ${BRAND.name} considers age, independence, complexity, and who is playing.`,
  },
  {
    id: "plan-b",
    title: "Has a Plan B",
    body: "Didn't land? Try the next already-matched option without regenerating from scratch. When the house needs a reset, Rescue Mode gives a calm fallback so you can keep moving.",
  },
  {
    id: "learns",
    title: "Learns what works",
    body: `Finished activities feed What Works for Us — so over time ${BRAND.name} leans toward the kinds of play that actually succeed for your family, not just what looks good on a list.`,
  },
];

const HOW_STEPS = [
  {
    title: "Tell us the moment",
    text: "Time, mess, inside or outside, and how independent kids need to be.",
  },
  {
    title: "Tell us who's playing",
    text: `Ages of the kids in the mix. ${BRAND.name} adapts roles and challenge.`,
  },
  {
    title: `${BRAND.name} finds the best fit`,
    text: "One strong activity for right now — with Plan B if you need it.",
  },
];

function LandingPage() {
  const [canSubscribe, setCanSubscribe] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [plansById, setPlansById] = useState({});
  const [launchTrial, setLaunchTrial] = useState(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [plansReloadKey, setPlansReloadKey] = useState(0);
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
          setLaunchTrial(result.launchTrial || null);
        }
      } catch (error) {
        if (!cancelled) {
          setPlansById({});
          setLaunchTrial(null);
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
  }, [plansReloadKey]);

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

  const trialOfferActive = isLaunchTrialOfferActive(launchTrial);

  return (
    <div className="landing">
      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          <a className="landing-brand" href="#top" aria-label={`${BRAND.name} home`}>
            <img
              className="landing-brand-mark"
              src="/logo.svg"
              alt=""
              width="36"
              height="36"
            />
            <span className="landing-brand-name">{BRAND.name}</span>
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
              to="/privacy"
              onClick={() => setNavOpen(false)}
            >
              Privacy
            </Link>
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
            <Link
              className="landing-topbar-cta"
              to="/demo"
              onClick={() => {
                setNavOpen(false);
                trackTryFree("topbar");
              }}
            >
              Try free
            </Link>
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
            to="/privacy"
            onClick={() => setNavOpen(false)}
          >
            Privacy
          </Link>
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
            {trialOfferActive ? (
              <a className="landing-hero-offer" href="#plus">
                {launchTrialHeroKicker(launchTrial)}
              </a>
            ) : null}
            <p className="landing-hero-brand">{BRAND.name}</p>
            <h1 id="landing-hero-title" className="landing-hero-title">
              {BRAND.tagline}
            </h1>
            <p className="landing-hero-secondary">{BRAND.secondaryHeadline}</p>
            <p className="landing-hero-support">
              Tell {BRAND.name} how much time you have, who&apos;s playing,
              what you have available, and how much chaos you&apos;re willing
              to tolerate.
            </p>

            <div className="landing-hero-actions">
              <Link
                className="landing-btn landing-btn--primary"
                to="/demo"
                onClick={() => trackTryFree("hero")}
              >
                Try {BRAND.name}
              </Link>
              <Link
                className="landing-btn landing-btn--ghost"
                to="/signup"
                onClick={() =>
                  trackProductEvent("landing_signup_cta_clicked", {
                    source: "hero",
                  })
                }
              >
                Create your family
              </Link>
            </div>
            <p className="landing-hero-note">
              {trialOfferActive
                ? "Card required — $0 today. No account required for the demo."
                : "No account required for the demo."}
            </p>
          </div>
        </div>
      </section>

      <LandingSituations />

      <LandingProductShowcase
        hasVideo={hasVideo}
        onOpenVideo={() => setVideoOpen(true)}
      />

      <section
        className="landing-section"
        id="why"
        aria-labelledby="why-title"
      >
        <div className="landing-section-inner">
          <h2 id="why-title">Why {BRAND.name} gets better results</h2>
          <p className="landing-section-lead">
            Built for the next twenty minutes — not another rainy-day list.
          </p>
          <div className="landing-why">
            {WHY_ITEMS.map((item) => (
              <details key={item.id} className="landing-why-item">
                <summary>{item.title}</summary>
                <p>{item.body}</p>
              </details>
            ))}
          </div>
          <div className="landing-section-cta">
            <Link
              className="landing-btn landing-btn--primary"
              to="/demo"
              onClick={() => trackTryFree("why")}
            >
              Find something to do
            </Link>
            <Link
              className="landing-btn landing-btn--ghost"
              to="/signup"
              onClick={() =>
                trackProductEvent("landing_signup_cta_clicked", {
                  source: "why",
                })
              }
            >
              Create your family
            </Link>
          </div>
        </div>
      </section>

      <section
        className="landing-section landing-section--tint"
        id="plus"
        aria-labelledby="plus-title"
      >
        <div className="landing-section-inner">
          <h2 id="plus-title">Simple pricing</h2>
          <p className="landing-section-lead">
            {trialOfferActive
              ? launchTrialOfferNote(launchTrial)
              : "Start free. Upgrade when you want unlimited activities personalized to your family."}
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
            mode={canSubscribe ? "checkout" : "signup"}
            checkoutBusyPlan={checkoutBusy}
            onCheckout={handleCheckout}
            onRetryPlans={() => setPlansReloadKey((key) => key + 1)}
            launchTrial={launchTrial}
          />
        </div>
      </section>

      <section
        className="landing-section"
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
          <div className="landing-section-cta">
            <Link
              className="landing-btn landing-btn--primary"
              to="/demo"
              onClick={() => trackTryFree("how")}
            >
              Try the demo
            </Link>
          </div>
        </div>
      </section>

      <section
        className="landing-section landing-section--tint"
        aria-labelledby="final-cta-title"
      >
        <div className="landing-section-inner landing-final-cta">
          <h2 id="final-cta-title">Stop searching. Find something that fits.</h2>
          <p>
            Try {BRAND.name} with your current situation — no account required.
            Create a free account when you want {BRAND.name} to remember your
            kids.
            {trialOfferActive ? ` ${launchTrialOfferNote(launchTrial)}` : ""}
          </p>
          <div className="landing-hero-actions">
            <Link
              className="landing-btn landing-btn--primary"
              to="/demo"
              onClick={() => trackTryFree("final")}
            >
              Try {BRAND.name}
            </Link>
            <Link
              className="landing-btn landing-btn--ghost"
              to="/signup"
              onClick={() =>
                trackProductEvent("landing_signup_cta_clicked", {
                  source: "final",
                })
              }
            >
              Create your family
            </Link>
          </div>
          <p className="landing-final-login">
            Already have an account?{" "}
            <Link to="/login">Log in</Link>
          </p>
        </div>
      </section>

      <SiteFooter />

      <Modal
        title={`${BRAND.name} walkthrough`}
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
