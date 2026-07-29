// server/lib/supabaseAdminClient.js

import { createClient } from "@supabase/supabase-js";

/*
 * This is the trusted Supabase client used by Express.
 *
 * It uses SUPABASE_SECRET_KEY and therefore bypasses Row Level Security.
 * Never import this module into src/ or any browser-side file.
 */
let supabaseAdminClient = null;

export function getSupabaseAdminClient() {
    if (supabaseAdminClient) {
        return supabaseAdminClient;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl) {
        throw new Error(
            "SUPABASE_URL is missing from the server environment."
        );
    }

    if (!supabaseSecretKey) {
        throw new Error(
            "SUPABASE_SECRET_KEY is missing from the server environment."
        );
    }

    supabaseAdminClient = createClient(
        supabaseUrl,
        supabaseSecretKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        }
    );

    return supabaseAdminClient;
}