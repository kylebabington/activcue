// src/pages/PrivacyPolicyPage.jsx

import { Link } from "react-router-dom";
import "../styles/landing.css";

function PrivacyPolicyPage() {
  return (
    <div className="landing landing--auth">
      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          <Link className="landing-brand" to="/" aria-label="FamilyFlow home">
            <img
              className="landing-brand-mark"
              src="/logo.svg"
              alt=""
              width="36"
              height="36"
            />
            <span className="landing-brand-name">FamilyFlow</span>
          </Link>
          <Link className="landing-topbar-link" to="/">
            Home
          </Link>
        </div>
      </header>

      <section className="landing-auth" aria-labelledby="privacy-title">
        <div className="landing-auth-panel legal-doc-panel">
          <h1 id="privacy-title">Privacy Policy</h1>
          <p className="landing-auth-lead">
            Last updated: August 2, 2026. FamilyFlow helps parents find quick,
            kid-friendly activities. This summary explains what we collect and
            why.
          </p>

          <div className="legal-doc-body">
            <h2>What we collect</h2>
            <p>
              Account email and authentication details; family settings you
              enter (child profiles, inventory, safety preferences, parent
              moment context); activity history and favorites; subscription and
              billing status via Stripe; and sparse product analytics events
              (for example activity started or subscription cancelled).
            </p>

            <h2>What we do not collect on purpose</h2>
            <p>
              We do not sell personal data. Product analytics intentionally
              avoids storing free-text child notes or AI prompts. Do not put
              sensitive medical or school records into FamilyFlow fields.
            </p>

            <h2>How we use data</h2>
            <p>
              To run the app, sync your family settings across devices, generate
              activity suggestions when you use Plus, process subscriptions, and
              improve reliability. AI features send only the structured context
              needed for a suggestion to our model provider.
            </p>

            <h2>Your choices</h2>
            <p>
              You can update or reset family data in Settings, change or reset
              your password, and delete your permanent account. Deleting an
              account removes family data and the authentication user.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about privacy:{" "}
              <a href="mailto:support@familyflow.app">support@familyflow.app</a>
              .
            </p>
          </div>

          <p className="landing-auth-footer">
            <Link to="/terms">Terms of Use</Link>
            {" · "}
            <Link to="/">Back home</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default PrivacyPolicyPage;
