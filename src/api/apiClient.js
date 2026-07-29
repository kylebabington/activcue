// src/api/apiClient.js

import { supabase } from "../lib/supabaseClient";

const API_BASE_URL =
    import.meta.env.VITE_API_URL || "";

/*
 * General API error with status and server error code.
 */
export class ApiRequestError extends Error {
    constructor(
        message,
        {
            status = 0,
            code = "API_REQUEST_FAILED",
            details = null,
        } = {}
    ) {
        super(message);

        this.name = "ApiRequestError";
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

/*
 * Specialized authentication error.
 */
export class AuthenticationError extends ApiRequestError {
    constructor(
        message,
        {
            status = 401,
            code = "AUTHENTICATION_REQUIRED",
            details = null,
        } = {}
    ) {
        super(message, {
            status,
            code,
            details,
        });

        this.name = "AuthenticationError";
    }
}

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

    const accessToken =
        sessionData.session?.access_token;

    if (!accessToken) {
        throw new AuthenticationError(
            "No authenticated session is available. Refresh the page and try again."
        );
    }

    return accessToken;
}

/*
 * Read the full JSON error response once.
 */
async function readErrorBody(response) {
    try {
        const errorBody = await response.json();

        return {
            message:
                typeof errorBody?.error === "string"
                    ? errorBody.error
                    : "",
            code:
                typeof errorBody?.code === "string"
                    ? errorBody.code
                    : "",
            details: errorBody,
        };
    } catch {
        return {
            message: "",
            code: "",
            details: null,
        };
    }
}

export async function authenticatedRequest(
    path,
    options = {}
) {
    const accessToken = await getAccessToken();

    const headers = new Headers(
        options.headers || {}
    );

    headers.set(
        "Authorization",
        `Bearer ${accessToken}`
    );

    if (
        options.body &&
        !headers.has("Content-Type")
    ) {
        headers.set(
            "Content-Type",
            "application/json"
        );
    }

    const response = await fetch(
        `${API_BASE_URL}${path}`,
        {
            ...options,
            headers,
        }
    );

    if (!response.ok) {
        const errorBody =
            await readErrorBody(response);

        const fallbackMessage =
            response.status === 401
                ? "Your secure session could not be verified. Refresh and try again."
                : `The request failed with status ${response.status}.`;

        const message =
            errorBody.message || fallbackMessage;

        if (response.status === 401) {
            throw new AuthenticationError(
                message,
                {
                    status: response.status,
                    code:
                        errorBody.code ||
                        "AUTHENTICATION_REQUIRED",
                    details: errorBody.details,
                }
            );
        }

        throw new ApiRequestError(
            message,
            {
                status: response.status,
                code:
                    errorBody.code ||
                    "API_REQUEST_FAILED",
                details: errorBody.details,
            }
        );
    }

    return response;
}