// src/pages/SignupPage.jsx

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ApiRequestError,
} from "../api/apiClient";
import { checkEmailAvailability } from "../api/authApi";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import "../styles/landing.css";

const PENDING_SIGNUP_EMAIL_KEY =
  "familyflow.pendingSignupEmail";

function SignupPage() {
  const { user, isAnonymous } = useAuth();

  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");
    setInfoMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage("Enter the email address you want to use.");
      return;
    }

    /*
     * This page converts an anonymous user. It must not create a second Auth
     * user with signUp().
     */
    if (!isAnonymous) {
      setErrorMessage(
        "This session is already connected to a permanent account."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      /*
       * Reject emails that already belong to another Auth user before asking
       * Supabase to send a confirmation message.
       */
      try {
        await checkEmailAvailability(normalizedEmail);
      } catch (availabilityError) {
        if (
          availabilityError instanceof ApiRequestError &&
          availabilityError.code === "EMAIL_ALREADY_REGISTERED"
        ) {
          setErrorMessage(
            "That email may already belong to an account. Log in instead, or use a different email."
          );
          return;
        }

        throw availabilityError;
      }

      const emailRedirectTo =
        `${window.location.origin}/complete-signup`;

      /*
       * Add an email identity to the current anonymous Supabase user.
       *
       * The existing user UUID remains the same. That means:
       *
       * - profiles.user_id stays the same
       * - the free imaginative unlock stays attached
       * - a future Stripe customer stays attached
       */
      const { error } = await supabase.auth.updateUser(
        {
          email: normalizedEmail,
        },
        {
          emailRedirectTo,
        }
      );

      if (error) {
        throw error;
      }

      /*
       * This is only used to display the email on the password-completion
       * page. It is not trusted for authentication or authorization.
       */
      window.sessionStorage.setItem(
        PENDING_SIGNUP_EMAIL_KEY,
        normalizedEmail
      );

      setInfoMessage(
        `We sent a confirmation link to ${normalizedEmail}. Open that email and click the link to finish creating your account.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not connect this email to your account.";

      if (
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("registered") ||
        message.toLowerCase().includes("exists")
      ) {
        setErrorMessage(
          "That email may already belong to an account. Log in instead, or use a different email."
        );
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /*
   * A permanent user does not need to run the conversion flow again.
   */
  if (!isAnonymous) {
    return (
      <div className="landing landing--auth">
        <header className="landing-topbar">
          <div className="landing-topbar-inner">
            <Link
              className="landing-brand"
              to="/"
              aria-label="FamilyFlow home"
            >
              <img
                className="landing-brand-mark"
                src="/logo.svg"
                alt=""
                width="36"
                height="36"
              />
              <span className="landing-brand-name">
                FamilyFlow
              </span>
            </Link>

            <Link className="landing-topbar-link" to="/app">
              Open app
            </Link>
          </div>
        </header>

        <section
          className="landing-auth"
          aria-labelledby="signup-title"
        >
          <div className="landing-auth-panel">
            <h1 id="signup-title">Account connected</h1>

            <p className="landing-auth-lead">
              This session is already connected to{" "}
              <strong>{user?.email || "a permanent account"}</strong>.
            </p>

            <Link
              className="landing-btn landing-btn--primary"
              to="/app"
            >
              Continue to FamilyFlow
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="landing landing--auth">
      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          <Link
            className="landing-brand"
            to="/"
            aria-label="FamilyFlow home"
          >
            <img
              className="landing-brand-mark"
              src="/logo.svg"
              alt=""
              width="36"
              height="36"
            />
            <span className="landing-brand-name">
              FamilyFlow
            </span>
          </Link>

          <Link className="landing-topbar-link" to="/login">
            Log in
          </Link>
        </div>
      </header>

      <section
        className="landing-auth"
        aria-labelledby="signup-title"
      >
        <div className="landing-auth-panel">
          <p className="landing-eyebrow">Step 1 of 2</p>

          <h1 id="signup-title">Save your FamilyFlow account</h1>

          <p className="landing-auth-lead">
            Add an email to keep your free activity unlock and
            protect future Plus access.
          </p>

          <form
            className="landing-auth-form"
            onSubmit={handleSubmit}
          >
            <label className="landing-auth-field">
              <span>Email</span>

              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
              />
            </label>

            {errorMessage ? (
              <p className="landing-auth-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            {infoMessage ? (
              <p className="landing-auth-info" role="status">
                {infoMessage}
              </p>
            ) : null}

            <button
              className="landing-btn landing-btn--primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Sending confirmation…"
                : "Send confirmation email"}
            </button>
          </form>

          <p className="landing-auth-footer">
            Already have an account?{" "}
            <Link to="/login">Log in</Link>
            {" · "}
            <Link to="/app">Return to the app</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default SignupPage;