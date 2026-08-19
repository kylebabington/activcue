// src/pages/ContactPage.jsx

import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter.jsx";
import { BRAND } from "../config/brand";
import { LEGAL_PATHS } from "../config/legal.js";
import "../styles/landing.css";

function ContactPage() {
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

      <section className="landing-auth" aria-labelledby="contact-title">
        <div className="landing-auth-panel legal-doc-panel">
          <h1 id="contact-title">Contact</h1>
          <p className="landing-auth-lead">
            Questions about {BRAND.name}, billing, or a privacy request? Email
            support and we will get back to you.
          </p>

          <div className="legal-doc-body">
            <h2>Support</h2>
            <p>
              Email{" "}
              <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>
              . Include the account email if your question is about a
              subscription or stored family data.
            </p>

            <h2>Privacy requests</h2>
            <p>
              Use the same address for access, correction, or deletion
              questions. You can also delete a permanent account from Settings.
              Read the{" "}
              <Link to={LEGAL_PATHS.privacy}>Privacy Policy</Link> and{" "}
              <Link to={LEGAL_PATHS.terms}>Terms of Use</Link> for details.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default ContactPage;
