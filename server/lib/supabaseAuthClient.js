// server/lib/supabaseAuthClient.js

import { createClient } from "@supabase/supabase-js";

/*
 * Hold one shared client after the first request initializes it.
 */
let supabaseAuthClient = null;

export function getSupabaseAuthClient() {
    if (supabaseAuthClient) {
        return supabaseAuthClient;
    }

    /*
     * These variables are read lazily so server/index.js has time to load
     * server/.env through dotenv before the client is created.
     */
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabasePublishableKey =
        process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl) {
        throw new Error(
            "SUPABASE_URL is missing from the server environment."
        );
    }

    if (!supabasePublishableKey) {
        throw new Error(
            "SUPABASE_PUBLISHABLE_KEY is missing from the server environment."
        );
    }

    /*
     * This server client is used only to verify user access tokens.
     *
     * It does not persist sessions because Express handles many unrelated
     * requests from many different users.
     */
    supabaseAuthClient = createClient(
        supabaseUrl,
        supabasePublishableKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        }
    );

    return supabaseAuthClient;
}