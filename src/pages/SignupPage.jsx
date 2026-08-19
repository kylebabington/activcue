// src/pages/SignupPage.jsx

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BRAND } from "../config/brand.js";
import { ApiRequestError } from "../api/apiClient";
import { convertAnonymousAccount } from "../api/authApi";
import { redirectToCheckout } from "../api/billingApi";
import { claimDemoFreeUnlock } from "../api/demoApi";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import LegalConsentNote from "../components/LegalConsentNote.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import {
  clearDemoUnlockIntent,
  parseSafeAppRedirect,
  parseSignupCheckoutIntent,
  readDemoUnlockIntent,
  writeDemoActivityHandoff,
} from "../utils/signupUrls";
import { captureAttribution, trackProductEvent } from "../utils/analytics";
import "../styles/landing.css";

async function preserveDemoActivityAfterSignup(searchParams) {
  const intent = readDemoUnlockIntent();
  const slug =
    intent?.slug || searchParams.get("activity") || null;
  const title = intent?.title || null;

  if (!slug) {
    clearDemoUnlockIntent();
    return null;
  }

  try {
    await claimDemoFreeUnlock(slug);
    writeDemoActivityHandoff({ slug, title });
    trackProductEvent("demo_page_unlock_claimed", {
      slug,
      source: "signup",
    });
  } catch {
    // Non-blocking — signup still succeeds without the unlock claim.
    writeDemoActivityHandoff({ slug, title });
  }

  clearDemoUnlockIntent();
  return slug;
}

function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAnonymous } = useAuth();
  const checkoutIntent = parseSignupCheckoutIntent(
    searchParams.toString()
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  useEffect(() => {
    captureAttribution();
  }, []);

  async function startCheckout(expectedUserId) {
    setCheckoutBusy(true);
    setErrorMessage("");
    trackProductEvent("checkout_started", {
      plan: checkoutIntent.plan,
      source: "signup",
    });

    try {
      await redirectToCheckout({
        plan: checkoutIntent.plan,
        expectedUserId,
      });
    } catch (error) {
      setCheckoutBusy(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not start checkout. Try again."
      );
    }
  }

  /*
   * Permanent users who arrived with Plus intent skip the form and go to Stripe.
   */
  useEffect(() => {
    if (isAnonymous || !user?.id || !checkoutIntent.shouldCheckout) {
      return undefined;
    }

    let cancelled = false;

    (async () => {
      if (cancelled) {
        return;
      }

      setCheckoutBusy(true);

      try {
        trackProductEvent("checkout_started", {
          plan: checkoutIntent.plan,
          source: "signup_resume",
        });
        await redirectToCheckout({
          plan: checkoutIntent.plan,
          expectedUserId: user.id,
        });
      } catch (error) {
        if (!cancelled) {
          setCheckoutBusy(false);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not start checkout. Try again."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    checkoutIntent.plan,
    checkoutIntent.shouldCheckout,
    isAnonymous,
    user?.id,
  ]);

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage("Enter the email address you want to use.");
      return;
    }

    if (!isAnonymous) {
      setErrorMessage(
        "This session is already connected to a permanent account."
      );
      return;
    }

    if (password.length < 8) {
      setErrorMessage(
        "Use a password that is at least 8 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("The two passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    trackProductEvent("signup_started", {
      hasCheckoutIntent: checkoutIntent.shouldCheckout,
      plan: checkoutIntent.plan || null,
    });

    try {
      /*
       * Convert the current anonymous user in place (same UUID). Do not call
       * signUp() — that would create a second Auth user.
       */
      const conversion = await convertAnonymousAccount({
        email: normalizedEmail,
        password,
        confirmPassword,
      });

      const convertedUserId =
        conversion?.user?.id || user?.id || null;

      /*
       * Replace the anonymous JWT with a permanent email/password session for
       * the same user so billing and /auth/me see a non-anonymous identity.
       */
      const {
        data: signInData,
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      const expectedUserId =
        signInData.user?.id || convertedUserId;

      await preserveDemoActivityAfterSignup(searchParams);

      if (checkoutIntent.shouldCheckout) {
        await startCheckout(expectedUserId);
        return;
      }

      const redirectTo = parseSafeAppRedirect(searchParams.get("redirect"));
      navigate(redirectTo || "/onboarding", { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.code === "EMAIL_ALREADY_REGISTERED") {
          setErrorMessage(
            "That email may already belong to an account. Log in instead, or use a different email."
          );
        } else {
          setErrorMessage(error.message);
        }
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Could not create your account.";

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
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /*
   * A permanent user without checkout intent does not need the conversion form.
   */
  if (!isAnonymous && !checkoutIntent.shouldCheckout) {
    return (
      <div className="landing landing--auth">
        <header className="landing-topbar">
          <div className="landing-topbar-inner">
            <Link
              className="landing-brand"
              to="/"
              aria-label={`${BRAND.name} home`}
            >
              <img
                className="landing-brand-mark"
                src="/logo.svg"
                alt=""
                width="36"
                height="36"
              />
              <span className="landing-brand-name">
                {BRAND.name}
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
              to="/onboarding"
            >
              Continue to {BRAND.name}
            </Link>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  if (!isAnonymous && checkoutIntent.shouldCheckout) {
    return (
      <div className="landing landing--auth">
        <header className="landing-topbar">
          <div className="landing-topbar-inner">
            <Link
              className="landing-brand"
              to="/"
              aria-label={`${BRAND.name} home`}
            >
              <img
                className="landing-brand-mark"
                src="/logo.svg"
                alt=""
                width="36"
                height="36"
              />
              <span className="landing-brand-name">
                {BRAND.name}
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
            <h1 id="signup-title">Starting checkout</h1>

            <p className="landing-auth-lead">
              Taking you to Stripe to finish {BRAND.plusName}.
            </p>

            {errorMessage ? (
              <p className="landing-auth-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <LegalConsentNote action="continuing to checkout" />

            <button
              className="landing-btn landing-btn--primary"
              type="button"
              disabled={checkoutBusy}
              onClick={() => startCheckout(user?.id)}
            >
              {checkoutBusy ? "Starting checkout…" : "Continue to checkout"}
            </button>
          </div>
        </section>
        <SiteFooter />
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
            aria-label={`${BRAND.name} home`}
          >
            <img
              className="landing-brand-mark"
              src="/logo.svg"
              alt=""
              width="36"
              height="36"
            />
            <span className="landing-brand-name">
              {BRAND.name}
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
          <h1 id="signup-title">
            {checkoutIntent.shouldCheckout
              ? "Create your account to get Plus"
              : searchParams.get("from") === "demo"
                ? "Create your free account"
                : `Save your ${BRAND.name} account`}
          </h1>

          <p className="landing-auth-lead">
            {checkoutIntent.shouldCheckout
              ? "Add an email and password, then continue to secure checkout."
              : searchParams.get("from") === "demo"
                ? "Create an account to unlock one free pretend activity — then keep using Simple ideas anytime."
                : "Add an email and password to keep your free unlock and protect future Plus access."}
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

            <label className="landing-auth-field">
              <span>Password</span>

              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
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
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
              />
            </label>

            {errorMessage ? (
              <p className="landing-auth-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <LegalConsentNote />

            <button
              className="landing-btn landing-btn--primary"
              type="submit"
              disabled={isSubmitting || checkoutBusy}
            >
              {isSubmitting || checkoutBusy
                ? checkoutIntent.shouldCheckout
                  ? "Creating account…"
                  : "Saving account…"
                : checkoutIntent.shouldCheckout
                  ? "Create account and continue"
                  : "Create account"}
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
      <SiteFooter />
    </div>
  );
}

export default SignupPage;
