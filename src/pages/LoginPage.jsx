// src/pages/LoginPage.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BRAND } from "../config/brand.js";
import { supabase } from "../lib/supabaseClient";
import "../styles/landing.css";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      navigate("/app", { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not log in. Check your email and password."
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
          <Link className="landing-topbar-link" to="/signup">
            Sign up
          </Link>
        </div>
      </header>

      <section className="landing-auth" aria-labelledby="login-title">
        <div className="landing-auth-panel">
          <h1 id="login-title">Log in</h1>
          <p className="landing-auth-lead">
            Welcome back. Pick up where your family left off.
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
                autoComplete="current-password"
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

            <button
              className="landing-btn landing-btn--primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="landing-auth-footer">
            New here? <Link to="/signup">Create an account</Link>
            {" · "}
            <Link to="/forgot-password">Forgot password</Link>
            {" · "}
            <Link to="/demo">Try the demo</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
