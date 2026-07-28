// src/context/AuthProvider.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { AuthContext } from "./AuthContext";

const SESSION_ENDED_MESSAGE =
    "Your secure session ended. Refresh the page to continue.";

/*
 * React StrictMode intentionally runs effects more than once during local
 * development.
 *
 * Without this shared promise, two overlapping initialization effects could
 * both try to create an anonymous user.
 *
 * Keeping the promise outside the component ensures all initialization
 * attempts share one Supabase request.
 */
let authInitializationPromise = null;

/*
 * Restore an existing Supabase session or create one anonymous user.
 */
async function getOrCreateSession() {
    if (!authInitializationPromise) {
        authInitializationPromise = (async () => {
            /*
             * First, check whether Supabase already has a saved session for this
             * browser.
             */
            const {
                data: sessionData,
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError) {
                throw sessionError;
            }

            if (sessionData.session) {
                return sessionData.session;
            }

            /*
             * No saved session exists, so create an anonymous authenticated user.
             *
             * Supabase will return:
             * - a user object
             * - an access-token JWT
             * - a refresh token
             */
            const {
                data: anonymousData,
                error: anonymousError,
            } = await supabase.auth.signInAnonymously();

            if (anonymousError) {
                throw anonymousError;
            }

            if (!anonymousData.session) {
                throw new Error(
                    "Supabase created no usable session for the anonymous user."
                );
            }

            return anonymousData.session;
        })().catch((error) => {
            /*
             * Clear a failed promise so a future reload can try initialization
             * again instead of permanently reusing the rejected promise.
             */
            authInitializationPromise = null;
            throw error;
        });
    }

    return authInitializationPromise;
}

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [authError, setAuthError] = useState("");
    /*
     * Tracks whether we have successfully established a session at least once.
     *
     * onAuthStateChange can emit a null session during early bootstrap
     * (INITIAL_SESSION). That must not look like a post-login sign-out.
     */
    const hasEstablishedSessionRef = useRef(false);

    useEffect(() => {
        let isMounted = true;

        /*
         * Listen for future authentication changes:
         *
         * - anonymous sign-in
         * - token refresh
         * - permanent account conversion
         * - sign-out
         */
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!isMounted) {
                return;
            }

            setSession(nextSession);
            setUser(nextSession?.user || null);

            if (nextSession) {
                hasEstablishedSessionRef.current = true;
                setAuthError("");
                return;
            }

            /*
             * Session cleared after we already had one (sign-out, refresh
             * failure, or cleared storage). Block the app instead of letting
             * API calls fail later without a Bearer token.
             */
            if (hasEstablishedSessionRef.current) {
                setAuthError(SESSION_ENDED_MESSAGE);
            }
        });

        async function initializeAuthentication() {
            try {
                const activeSession = await getOrCreateSession();

                if (!isMounted) {
                    return;
                }

                hasEstablishedSessionRef.current = true;
                setSession(activeSession);
                setUser(activeSession.user);
                setAuthError("");
            } catch (error) {
                console.error("Supabase authentication initialization failed:", error);

                if (!isMounted) {
                    return;
                }

                setAuthError(
                    error instanceof Error
                        ? error.message
                        : "Could not establish a secure user session."
                );
            } finally {
                if (isMounted) {
                    setIsAuthReady(true);
                }
            }
        }

        initializeAuthentication();

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    /*
     * Memoizing the context value prevents consumers from receiving a new
     * object on every unrelated render.
     */
    const contextValue = useMemo(
        () => ({
            session,
            user,
            accessToken: session?.access_token || null,
            isAnonymous: user?.is_anonymous === true,
            isAuthReady,
            authError,
        }),
        [session, user, isAuthReady, authError]
    );

    /*
     * Do not render the main application until identity initialization has
     * completed. This prevents the user from clicking Generate before an
     * access token exists.
     */
    if (!isAuthReady) {
        return (
            <main
                role="status"
                aria-live="polite"
                style={{
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    padding: "2rem",
                }}
            >
                <p>Setting up your secure session…</p>
            </main>
        );
    }

    /*
     * Show a visible configuration/authentication failure instead of rendering
     * an application that cannot successfully call its backend.
     *
     * After init, a missing session is also treated as a hard stop even if
     * authError has not been set yet (e.g. a late onAuthStateChange clear).
     */
    if (authError || !session) {
        return (
            <main
                role="alert"
                style={{
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    padding: "2rem",
                    textAlign: "center",
                }}
            >
                <section>
                    <h1>We could not start your session</h1>

                    <p>{authError || SESSION_ENDED_MESSAGE}</p>

                    <button type="button" onClick={() => window.location.reload()}>
                        Try again
                    </button>
                </section>
            </main>
        );
    }

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}