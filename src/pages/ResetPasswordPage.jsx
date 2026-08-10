// src/pages/ResetPasswordPage.jsx

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BRAND } from "../config/brand.js";
import { supabase } from "../lib/supabaseClient";
import "../styles/landing.css";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    function markReady() {
      if (isMounted) {
        setReady(true);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        markReady();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session &&
        (event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION")
      ) {
        markReady();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 8) {
      setErrorMessage("Use a password that is at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("The two passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      setSuccessMessage("Your password has been updated.");
      window.setTimeout(() => {
        navigate("/app", { replace: true });
      }, 900);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not update your password. Request a new reset link."
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

      <section className="landing-auth" aria-labelledby="reset-title">
        <div className="landing-auth-panel">
          <h1 id="reset-title">Choose a new password</h1>
          <p className="landing-auth-lead">
            {ready
              ? `Enter a new password for your ${BRAND.name} account.`
              : "Open this page from the email reset link so we can verify your session."}
          </p>

          <form className="landing-auth-form" onSubmit={handleSubmit}>
            <label className="landing-auth-field">
              <span>New password</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
                disabled={!ready}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <label className="landing-auth-field">
              <span>Confirm password</span>
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                minLength={8}
                disabled={!ready}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
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

            <button
              className="landing-btn landing-btn--primary"
              type="submit"
              disabled={!ready || isSubmitting}
            >
              {isSubmitting ? "Updating…" : "Update password"}
            </button>
          </form>

          <p className="landing-auth-footer">
            Need a new link? <Link to="/forgot-password">Request reset</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default ResetPasswordPage;
