// src/lib/supabaseClient.js

import { createClient } from "@supabase/supabase-js";

/*
 * Vite makes variables beginning with VITE_ available to browser code.
 *
 * These values come from:
 *
 *   family-activity-helper/.env.local
 *
 * The publishable key is designed for browser applications. It identifies
 * this frontend as an allowed Supabase client, but it does not grant
 * administrator access to the database.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/*
 * Fail immediately with a useful message when local or production
 * environment variables have not been configured.
 */
if (!supabaseUrl) {
    throw new Error(
        "VITE_SUPABASE_URL is missing. Add it to the root .env.local file."
    );
}

if (!supabasePublishableKey) {
    throw new Error(
        "VITE_SUPABASE_PUBLISHABLE_KEY is missing. Add it to the root .env.local file."
    );
}

/*
 * Create one shared browser client.
 *
 * persistSession:
 * Saves the session in browser storage so the visitor keeps the same
 * anonymous user ID after refreshing.
 *
 * autoRefreshToken:
 * Refreshes the access token before it expires.
 *
 * detectSessionInUrl:
 * Allows future email and OAuth authentication redirects to be detected.
 */
export const supabase = createClient(
    supabaseUrl,
    supabasePublishableKey,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    }
);