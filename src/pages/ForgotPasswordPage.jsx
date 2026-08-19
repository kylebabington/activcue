// src/pages/ForgotPasswordPage.jsx

import { useState } from "react";
import { Link } from "react-router-dom";
import { BRAND } from "../config/brand.js";
import { supabase } from "../lib/supabaseClient";
import LegalConsentNote from "../components/LegalConsentNote.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import "../styles/landing.css";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo }
      );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "If that email is registered, you will receive a reset link shortly."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not send a reset email. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <Link className="landing-topbar-link" to="/login">
            Log in
          </Link>
        </div>
      </header>

      <section className="landing-auth" aria-labelledby="forgot-title">
        <div className="landing-auth-panel">
          <h1 id="forgot-title">Forgot password</h1>
          <p className="landing-auth-lead">
            Enter your account email and we will send a reset link.
          </p>

          <form className="landing-auth-form" onSubmit={handleSubmit}>
            <label className="landing-auth-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            {errorMessage ? (
              <p className="landing-auth-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="landing-auth-lead" role="status">
                {successMessage}
              </p>
            ) : null}

            <LegalConsentNote action="requesting a reset link" />

            <button
              className="landing-btn landing-btn--primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending…" : "Send reset link"}
            </button>
          </form>

          <p className="landing-auth-footer">
            Remembered it? <Link to="/login">Back to log in</Link>
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

export default ForgotPasswordPage;
