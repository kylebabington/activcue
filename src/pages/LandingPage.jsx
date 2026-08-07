// src/pages/LandingPage.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getBillingPlans, redirectToCheckout } from "../api/billingApi";
import { ApiRequestError } from "../api/apiClient";
import BillingPlanCards from "../components/billing/BillingPlanCards";
import MomentDemo from "../components/landing/MomentDemo";
import {
  DEMO_VIDEO_POSTER_SRC,
  DEMO_VIDEO_SRC,
} from "../constants/demoVideo";
import { matchDemoActivities } from "../features/demo";
import { supabase } from "../lib/supabaseClient";
import { trackProductEvent } from "../utils/analytics";
import { buildSignupUrl } from "../utils/signupUrls";
import "../styles/landing.css";
import "../styles/pages.css";

function AgeAdaptationPreview() {
  const young = matchDemoActivities({
    momentId: "dinner",
    childAges: [6],
    limit: 1,
  });
  const teen = matchDemoActivities({
    momentId: "dinner",
    childAges: [13],
    limit: 1,
  });
  const youngTitle = young.results[0]?.activity?.title || "Secret Animal Rescue";
  const teenTitle =
    teen.results[0]?.activity?.title || "Phone Photography Challenge";

  return (
    <div className="landing-age-compare">
      <article>
        <p className="landing-age-kicker">Age 6</p>
        <h3>{youngTitle}</h3>
        <p>Same dinner moment. Younger roles, simpler starters.</p>
      </article>
      <article>
        <p className="landing-age-kicker">Age 13</p>
        <h3>{teenTitle}</h3>
        <p>Same constraints. Different challenge and independence.</p>
      </article>
    </div>
  );
}

function DemoVideoSection() {
  const [hasVideo, setHasVideo] = useState(false);

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

  if (!hasVideo) {
    return null;
  }

  return (
    <section className="landing-section" aria-labelledby="video-title">
      <div className="landing-section-inner">
        <h2 id="video-title">See the FamilyFlow workflow</h2>
        <p className="landing-section-lead">
          A parent sets the moment. A kid chooses who&apos;s playing, energy, and
          style. FamilyFlow matches activities from the demo library, and you can
          unlock one complete activity free.
        </p>
        <video
          key={DEMO_VIDEO_SRC}
          className="landing-demo-video"
          controls
          muted
          playsInline
          poster={DEMO_VIDEO_POSTER_SRC}
          onPlay={() =>
            trackProductEvent("landing_demo_video_played", { source: "landing" })
          }
        >
          <source src={DEMO_VIDEO_SRC} type="video/webm" />
        </video>
      </div>
    </section>
  );
}

function LandingPage() {
  const [canSubscribe, setCanSubscribe] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [plansById, setPlansById] = useState({});
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");

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

  async function handleCheckout(plan) {
    setCheckoutError("");
    setCheckoutBusy(plan);

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
            <Link
              className="landing-topbar-cta"
              to="/signup"
              onClick={() =>
                trackProductEvent("landing_signup_cta_clicked", {
                  source: "topbar",
                })
              }
            >
              Create free account
            </Link>
          </div>
        </div>
      </header>

      <section className="landing-hero" id="top" aria-labelledby="landing-hero-title">
        <div className="landing-hero-wash" aria-hidden="true" />
        <div className="landing-hero-inner">
          <div className="landing-hero-copy landing-hero-copy--centered">
            <p className="landing-hero-brand">FamilyFlow</p>
            <h1 id="landing-hero-title" className="landing-hero-title">
              Activities that fit the moment you&apos;re actually in.
            </h1>
            <p className="landing-hero-support">
              Try FamilyFlow free. Tell us what&apos;s happening and the ages of
              up to two kids. We&apos;ll match activities from our demo library,
              and you can unlock the full details of one activity free. No
              account required. FamilyFlow Plus unlocks unlimited personalized
              activities.
            </p>
            <div className="landing-hero-actions">
              <Link
                className="landing-btn landing-btn--primary"
                to="/signup"
                onClick={() =>
                  trackProductEvent("landing_signup_cta_clicked", {
                    source: "hero",
                  })
                }
              >
                Create free account
              </Link>
              <Link
                className="landing-btn landing-btn--ghost"
                to="/demo"
                onClick={() =>
                  trackProductEvent("landing_demo_cta_clicked", {
                    source: "hero",
                  })
                }
              >
                Try the demo
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
          <div className="landing-section-cta">
            <h3>Like what you see?</h3>
            <p>
              Create your free FamilyFlow account and start building activities
              around your actual kids, supplies, schedule, and home.
            </p>
            <Link className="landing-btn landing-btn--primary" to="/signup">
              Create free account
            </Link>
          </div>
        </div>
      </section>

      <DemoVideoSection />

      <section className="landing-section" aria-labelledby="problem-title">
        <div className="landing-section-inner">
          <h2 id="problem-title">Lists give ideas. FamilyFlow answers the moment.</h2>
          <p className="landing-section-lead">
            Pinterest gives you ideas. FamilyFlow answers: what can{" "}
            <em>this</em> kid do, with <em>this</em> amount of time, while{" "}
            <em>you&apos;re</em> making dinner, without destroying the house?
          </p>
        </div>
      </section>

      <section className="landing-section landing-section--tint" aria-labelledby="age-title">
        <div className="landing-section-inner">
          <h2 id="age-title">Same moment. Different child.</h2>
          <p className="landing-section-lead">
            Age is a hard gate and a soft adaptation — roles, starters, and
            challenge change with the kid in front of you.
          </p>
          <AgeAdaptationPreview />
          <div className="landing-section-cta">
            <Link className="landing-btn landing-btn--primary" to="/signup">
              Set up your family
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="safety-net-title">
        <div className="landing-section-inner">
          <h2 id="safety-net-title">When the first idea stalls</h2>
          <p className="landing-section-lead">
            Didn&apos;t land? Try another already-matched candidate. Plan B,
            Rescue Mode, and offline Activity V2 keep the house moving without
            regenerating from scratch.
          </p>
          <ul className="landing-perk-list">
            <li>What Works for Us — learn from finished activities</li>
            <li>Plan B — try the next best option without regenerating</li>
            <li>Rescue Mode — calm fallback when the house needs a reset</li>
            <li>Offline shell — keep running a started Activity V2 without Wi‑Fi</li>
          </ul>
          <Link className="landing-btn landing-btn--primary" to="/demo">
            Start free
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
            Try the demo without an account. Create a free account to
            personalize FamilyFlow for your family. Plus unlocks unlimited
            personalized ideas when you want more.
          </p>
          {checkoutError ? (
            <p className="landing-plus-note" role="alert">
              {checkoutError}
            </p>
          ) : null}
          <BillingPlanCards
            monthlyPlan={plansById.monthly || null}
            annualPlan={plansById.annual || null}
            plansLoading={plansLoading}
            plansError={plansError}
            mode={canSubscribe ? "checkout" : "signup"}
            checkoutBusyPlan={checkoutBusy}
            onCheckout={handleCheckout}
            showFreePerks
            freeCtaTo="/signup"
            freeCtaLabel="Create free account"
          />
        </div>
      </section>

      <section className="landing-section landing-section--tint" aria-labelledby="final-cta-title">
        <div className="landing-section-inner landing-final-cta">
          <h2 id="final-cta-title">Create your FamilyFlow</h2>
          <p>
            See several matches. Unlock one complete activity free. Then make it
            yours with a free account — or go further with Plus.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-btn landing-btn--primary" to="/signup">
              Create your FamilyFlow
            </Link>
            <Link className="landing-btn landing-btn--ghost" to="/demo">
              Try the demo
            </Link>
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
