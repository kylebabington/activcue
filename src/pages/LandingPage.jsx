// src/pages/LandingPage.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { redirectToCheckout } from "../api/billingApi";
import { ApiRequestError } from "../api/apiClient";
import MomentDemo from "../components/landing/MomentDemo";
import { matchDemoActivities } from "../features/demo";
import { supabase } from "../lib/supabaseClient";
import { trackProductEvent } from "../utils/analytics";
import { buildSignupUrl } from "../utils/signupUrls";
import "../styles/landing.css";

function AgeAdaptationPreview() {
  const young = matchDemoActivities({
    momentId: "dinner",
    childId: "leo",
    limit: 1,
  });
  const teen = matchDemoActivities({
    momentId: "dinner",
    childId: "jack",
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
    fetch("/demos/familyflow-demo.webm", { method: "HEAD" })
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
        <h2 id="video-title">See the whole flow in 35 seconds</h2>
        <p className="landing-section-lead">
          Moment in, matched activities out — then Start, Steps, and Stuck?
          help when the first idea stalls.
        </p>
        <video
          className="landing-demo-video"
          controls
          muted
          playsInline
          poster="/demos/familyflow-demo-poster.svg"
          onPlay={() =>
            trackProductEvent("landing_demo_video_played", { source: "landing" })
          }
        >
          <source src="/demos/familyflow-demo.webm" type="video/webm" />
        </video>
      </div>
    </section>
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
            <Link
              className="landing-topbar-cta"
              to="/onboarding"
              onClick={() =>
                trackProductEvent("landing_demo_cta_clicked", {
                  source: "topbar",
                })
              }
            >
              Find something now
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
              Tell FamilyFlow what the house can handle right now — time,
              energy, mess, supervision, age, and supplies — and get activities
              your kids can actually start.
            </p>
            <div className="landing-hero-actions">
              <Link
                className="landing-btn landing-btn--primary"
                to="/onboarding"
                onClick={() =>
                  trackProductEvent("landing_demo_cta_clicked", {
                    source: "hero",
                  })
                }
              >
                Find something now
              </Link>
              <a className="landing-btn landing-btn--ghost" href="#try-demo">
                Try the demo
              </a>
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
              <Link
                className="landing-btn landing-btn--primary"
                to={buildSignupUrl({ next: "checkout", plan: "monthly" })}
              >
                Sign up for Plus
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
