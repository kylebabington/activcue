// src/pages/SignupPage.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../styles/landing.css";

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setInfoMessage("");
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        navigate("/app", { replace: true });
        return;
      }

      setInfoMessage(
        "Check your email to confirm your account, then log in."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not create your account. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <Link className="landing-topbar-link" to="/login">
            Log in
          </Link>
        </div>
      </header>

      <section className="landing-auth" aria-labelledby="signup-title">
        <div className="landing-auth-panel">
          <h1 id="signup-title">Sign up</h1>
          <p className="landing-auth-lead">
            Create a family account to save progress and unlock Plus later.
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

            <label className="landing-auth-field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="landing-auth-footer">
            Already have an account? <Link to="/login">Log in</Link>
            {" · "}
            <Link to="/demo">Try without signing up</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default SignupPage;
