// src/pages/TermsPage.jsx

import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter.jsx";
import { BRAND } from "../config/brand";
import { LEGAL_PATHS } from "../config/legal.js";
import "../styles/landing.css";

function TermsPage() {
  return (
    <div className="landing landing--auth">
      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          <Link className="landing-brand" to="/" aria-label={`${BRAND.name} home`}>
            <img
              className="landing-brand-mark"
              src="/logo.svg"
              alt=""
              width="36"
              height="36"
            />
            <span className="landing-brand-name">{BRAND.name}</span>
          </Link>
          <Link className="landing-topbar-link" to="/">
            Home
          </Link>
        </div>
      </header>

      <section className="landing-auth" aria-labelledby="terms-title">
        <div className="landing-auth-panel legal-doc-panel">
          <h1 id="terms-title">Terms of Use</h1>
          <p className="landing-auth-lead">
            Last updated: August 2, 2026. By using {BRAND.name} you agree to these
            basic terms.
          </p>

          <div className="legal-doc-body">
            <h2>The service</h2>
            <p>
              {BRAND.name} provides activity ideas and guided play for families.
              Suggestions are helpers, not professional childcare, medical, or
              educational advice. A parent or caregiver remains responsible for
              safety and supervision.
            </p>

            <h2>Accounts</h2>
            <p>
              Keep your login credentials private. You may try features with a
              temporary session and upgrade to a permanent account. Paid{" "}
              {BRAND.plusName} features are billed through Stripe under the plan
              you choose.
            </p>

            <h2>Acceptable use</h2>
            <p>
              Do not misuse the service, attempt to access other families&apos;
              data, abuse AI endpoints, or use {BRAND.name} for unlawful activity.
              We may suspend accounts that harm the service or other users.
            </p>

            <h2>Availability</h2>
            <p>
              We aim for reliable uptime but do not guarantee uninterrupted
              access. Features may change as the product evolves.
            </p>

            <h2>Contact</h2>
            <p>
              Support:{" "}
              <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>
              .
            </p>
          </div>

          <p className="landing-auth-footer">
            <Link to={LEGAL_PATHS.privacy}>Privacy Policy</Link>
            {" · "}
            <Link to={LEGAL_PATHS.contact}>Contact</Link>
            {" · "}
            <Link to="/">Back home</Link>
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default TermsPage;
