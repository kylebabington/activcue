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
 *
 * Keys distinguish "create anon if missing" vs "restore only" so signup and
 * the permanent-account app shell do not share incompatible init promises.
 */
const authInitializationPromises = new Map();

/*
 * Read the current browser session.
 *
 * When no session exists and createAnonymousIfMissing is true, create one
 * anonymous authenticated user (signup conversion path).
 */
async function restoreOrCreateSession(createAnonymousIfMissing) {
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

    if (!createAnonymousIfMissing) {
        return null;
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
 * Share one initialization request while it is in progress for a given mode.
 */
async function getOrCreateSession(createAnonymousIfMissing) {
    const key = createAnonymousIfMissing ? "create" : "restore";

    if (!authInitializationPromises.has(key)) {
        authInitializationPromises.set(
            key,
            restoreOrCreateSession(createAnonymousIfMissing)
        );
    }

    const pendingInitialization = authInitializationPromises.get(key);

    try {
        return await pendingInitialization;
    } finally {
        if (authInitializationPromises.get(key) === pendingInitialization) {
            authInitializationPromises.delete(key);
        }
    }
}

export function AuthProvider({
    children,
    createAnonymousIfMissing = true,
    allowMissingSession = false,
}) {
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

            if (hasEstablishedSessionRef.current && !allowMissingSession) {
                setAuthError(SESSION_ENDED_MESSAGE);
            }
        });

        async function initializeAuthentication() {
            try {
                const activeSession = await getOrCreateSession(
                    createAnonymousIfMissing
                );

                if (!isMounted) {
                    return;
                }

                if (activeSession) {
                    hasEstablishedSessionRef.current = true;
                    setSession(activeSession);
                    setUser(activeSession.user);
                    setAuthError("");
                } else {
                    setSession(null);
                    setUser(null);
                    setAuthError("");
                }
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
    }, [createAnonymousIfMissing, allowMissingSession]);

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
     * When allowMissingSession is true (permanent-account app shell), render
     * children even without a session so RequirePermanentAccount can redirect.
     * Signup still requires a session (anon or permanent).
     */
    if (authError || (!session && !allowMissingSession)) {
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
