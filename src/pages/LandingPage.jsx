// src/pages/LandingPage.jsx

import { Link } from "react-router-dom";
import "../styles/landing.css";

function LandingPage() {
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
            quests—without a long planning session.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-btn landing-btn--primary" to="/app">
              Try sample activities
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
              <span className="landing-step-label">Guided quest</span>
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
            No account needed. Browse sample simple and pretend ideas, then unlock
            one pretend quest to feel a guided adventure.
          </p>
          <ul className="landing-perk-list">
            <li>Browse preset simple activities</li>
            <li>Browse preset imaginative quests</li>
            <li>Start one pretend quest free</li>
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
            When the presets are not enough, Plus keeps ideas fresh for your
            supplies and your moment.
          </p>
          <ul className="landing-perk-list landing-perk-list--plus">
            <li>Unlimited AI ideas tailored to inventory and the current moment</li>
            <li>Unlimited imaginative quests</li>
            <li>AI step hints when a quest gets stuck</li>
            <li>Favorites and history that grow with your family</li>
          </ul>
          <p className="landing-plus-note">
            Checkout is coming soon. Create a free account today so you are ready.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-btn landing-btn--primary" to="/signup">
              Sign up free
            </Link>
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
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
