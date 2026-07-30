// src/pages/CompleteSignupPage.jsx

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentAuthenticatedUser } from "../api/authApi";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import "../styles/landing.css";

const PENDING_SIGNUP_EMAIL_KEY =
    "familyflow.pendingSignupEmail";

function CompleteSignupPage() {
    const navigate = useNavigate();
    const { user, isAnonymous } = useAuth();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] =
        useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] =
        useState(false);

    /*
     * Supabase may place an authentication error in either the URL query string
     * or the URL hash. Read both so the page can give a useful explanation.
     */
    const callbackError = useMemo(() => {
        const queryParameters =
            new URLSearchParams(window.location.search);

        const hashParameters =
            new URLSearchParams(
                window.location.hash.replace(/^#/, "")
            );

        return (
            queryParameters.get("error_description") ||
            hashParameters.get("error_description") ||
            ""
        );
    }, []);

    const pendingEmail =
        user?.email ||
        window.sessionStorage.getItem(
            PENDING_SIGNUP_EMAIL_KEY
        ) ||
        "";

    async function handleSubmit(event) {
        event.preventDefault();

        setErrorMessage("");

        if (!user?.id) {
            setErrorMessage(
                "No authenticated user is available. Open the confirmation email again."
            );
            return;
        }

        if (isAnonymous) {
            setErrorMessage(
                "Your email has not been confirmed yet. Open the confirmation link from your email first."
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

        try {
            /*
             * Keep this value so we can prove the identity did not change during
             * conversion.
             */
            const originalUserId = user.id;

            /*
             * Supabase requires the email identity to be verified before an
             * anonymous user can add a password.
             */
            const {
                error: passwordError,
            } = await supabase.auth.updateUser({
                password,
            });

            if (passwordError) {
                throw passwordError;
            }

            /*
             * Refresh the session so the latest JWT contains the permanent-user
             * identity state.
             */
            const {
                data: refreshedAuth,
                error: refreshError,
            } = await supabase.auth.refreshSession();

            if (refreshError) {
                throw refreshError;
            }

            const refreshedUserId =
                refreshedAuth.user?.id ||
                refreshedAuth.session?.user?.id ||
                null;

            if (
                refreshedUserId &&
                refreshedUserId !== originalUserId
            ) {
                throw new Error(
                    "The account identity changed unexpectedly during signup."
                );
            }

            /*
             * Calling /api/auth/me runs ensureUserProfile on the backend.
             *
             * That updates profiles.is_anonymous from true to false while keeping
             * the same profile row and free imaginative unlock.
             */
            const currentUser =
                await getCurrentAuthenticatedUser();

            if (currentUser.user?.id !== originalUserId) {
                throw new Error(
                    "The permanent account did not preserve the original user ID."
                );
            }

            if (
                currentUser.user?.isAnonymous ||
                currentUser.profile?.isAnonymous
            ) {
                throw new Error(
                    "Your email was confirmed, but the permanent account state has not finished updating. Refresh and try again."
                );
            }

            window.sessionStorage.removeItem(
                PENDING_SIGNUP_EMAIL_KEY
            );

            navigate("/app", {
                replace: true,
            });
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not finish creating your account."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    /*
     * The confirmation link failed or expired.
     */
    if (callbackError) {
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
                    </div>
                </header>

                <section
                    className="landing-auth"
                    aria-labelledby="signup-error-title"
                >
                    <div className="landing-auth-panel">
                        <h1 id="signup-error-title">
                            Confirmation link failed
                        </h1>

                        <p className="landing-auth-error" role="alert">
                            {callbackError}
                        </p>

                        <Link
                            className="landing-btn landing-btn--primary"
                            to="/signup"
                        >
                            Send another confirmation
                        </Link>
                    </div>
                </section>
            </div>
        );
    }

    /*
     * The page was opened directly, or the confirmation URL did not establish
     * the converted permanent session.
     */
    if (isAnonymous) {
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
                    </div>
                </header>

                <section
                    className="landing-auth"
                    aria-labelledby="confirmation-needed-title"
                >
                    <div className="landing-auth-panel">
                        <h1 id="confirmation-needed-title">
                            Confirm your email first
                        </h1>

                        <p className="landing-auth-lead">
                            Open the message we sent
                            {pendingEmail
                                ? ` to ${pendingEmail}`
                                : ""}{" "}
                            and click its confirmation link.
                        </p>

                        <Link
                            className="landing-btn landing-btn--primary"
                            to="/signup"
                        >
                            Return to signup
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
                </div>
            </header>

            <section
                className="landing-auth"
                aria-labelledby="complete-signup-title"
            >
                <div className="landing-auth-panel">
                    <p className="landing-eyebrow">Step 2 of 2</p>

                    <h1 id="complete-signup-title">
                        Choose your password
                    </h1>

                    <p className="landing-auth-lead">
                        Email confirmed
                        {pendingEmail ? ` for ${pendingEmail}` : ""}.
                        Now protect your account with a password.
                    </p>

                    <form
                        className="landing-auth-form"
                        onSubmit={handleSubmit}
                    >
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
                                    setConfirmPassword(
                                        event.target.value
                                    )
                                }
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
                            {isSubmitting
                                ? "Securing account…"
                                : "Finish creating account"}
                        </button>
                    </form>
                </div>
            </section>
        </div>
    );
}

export default CompleteSignupPage;