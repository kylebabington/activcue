// src/api/apiClient.js

import { supabase } from "../lib/supabaseClient";

/*
 * In production, React and Express share one domain, so this remains empty.
 *
 * During development, Vite proxies /api requests to localhost:3001.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/*
 * Thrown when a request cannot proceed because the Supabase session is
 * missing, unreadable, or rejected by the server.
 *
 * Callers should treat this as an auth problem, not a network outage.
 */
export class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = "AuthenticationError";
    }
}

/*
 * Extract the current access-token JWT from the browser's Supabase session.
 */
async function getAccessToken() {
    const {
        data: sessionData,
        error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
        throw new AuthenticationError(
            `Could not read the current authentication session: ${sessionError.message}`
        );
    }

    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
        throw new AuthenticationError(
            "No authenticated session is available. Refresh the page and try again."
        );
    }

    return accessToken;
}

/*
 * Read a useful error message from an Express JSON response.
 */
async function readErrorMessage(response, fallbackMessage) {
    try {
        const errorBody = await response.json();

        if (typeof errorBody?.error === "string" && errorBody.error.trim()) {
            return errorBody.error;
        }
    } catch {
        /*
         * The server response was not JSON. Use the supplied fallback instead.
         */
    }

    return fallbackMessage;
}

/*
 * Send a request to an API route with the current user's Supabase JWT.
 */
export async function authenticatedRequest(path, options = {}) {
    const accessToken = await getAccessToken();

    /*
     * Headers is used instead of a plain object so callers may provide
     * additional headers without accidentally replacing Authorization.
     */
    const headers = new Headers(options.headers || {});

    headers.set("Authorization", `Bearer ${accessToken}`);

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const fallbackMessage =
            response.status === 401
                ? "Your secure session could not be verified. Refresh and try again."
                : `The request failed with status ${response.status}.`;

        const errorMessage = await readErrorMessage(
            response,
            fallbackMessage
        );

        if (response.status === 401) {
            throw new AuthenticationError(errorMessage);
        }

        throw new Error(errorMessage);
    }

    return response;
}