// src/context/AuthProvider.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { AuthContext } from "./AuthContext";

const SESSION_ENDED_MESSAGE =
    "Your secure session ended. Refresh the page to continue.";

/*
 * React StrictMode intentionally mounts, unmounts, and mounts components
 * again during local development.
 *
 * Without a shared in-flight promise, two AuthProvider instances could both
 * discover that no session exists and create two anonymous users.
 *
 * The promise is shared only while initialization is happening. It is cleared
 * after success or failure so future mounts re-read the current Supabase
 * session rather than reusing an old session object.
 */
let authInitializationPromise = null;

/*
 * Read the current browser session.
 *
 * When no session exists, create one anonymous authenticated user.
 */
async function restoreOrCreateSession() {
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
}

/*
 * Share one initialization request while it is in progress.
 *
 * Once it finishes, clear the shared reference. A later provider mount must
 * inspect Supabase again because the user may have:
 *
 * - converted from anonymous to permanent
 * - logged into another account
 * - refreshed their session
 */
async function getOrCreateSession() {
    if (!authInitializationPromise) {
        authInitializationPromise = restoreOrCreateSession();
    }

    const pendingInitialization = authInitializationPromise;

    try {
        return await pendingInitialization;
    } finally {
        /*
         * Only clear the global reference if it still points at the promise this
         * call used. This protects against accidentally clearing a newer request.
         */
        if (authInitializationPromise === pendingInitialization) {
            authInitializationPromise = null;
        }
    }
}

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [authError, setAuthError] = useState("");

    /*
     * Tracks whether this provider established a valid session at least once.
     *
     * Supabase may emit INITIAL_SESSION with no session while authentication is
     * still bootstrapping. That early event should not be treated like a logout.
     */
    const hasEstablishedSessionRef = useRef(false);

    useEffect(() => {
        let isMounted = true;

        /*
         * Listen for all future Supabase Auth changes:
         *
         * - anonymous sign-in
         * - permanent account conversion
         * - token refresh
         * - login
         * - logout
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
             * A null session after a valid session existed means the session was
             * cleared, expired beyond recovery, or explicitly signed out.
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
                console.error(
                    "Supabase authentication initialization failed:",
                    error
                );

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
     * Memoizing prevents every unrelated render from creating a new context
     * object and rerendering all auth consumers.
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
     * Do not render protected account or app pages until a usable Supabase
     * session has been restored or created.
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
     * Stop rendering protected content when authentication cannot be
     * established. This is safer than letting later API calls fail without an
     * access token.
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

                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                    >
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