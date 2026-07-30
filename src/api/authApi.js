// src/api/authApi.js

import { authenticatedRequest } from "./apiClient";
import { supabase } from "../lib/supabaseClient";

export async function getCurrentAuthenticatedUser() {
    const response = await authenticatedRequest("/api/auth/me", {
        method: "GET",
    });

    return response.json();
}

/*
 * End the current browser session only.
 *
 * scope: "local" keeps other devices signed in. After this returns, leave the
 * AuthProvider tree (e.g. window.location.assign("/login")) so the app does
 * not treat the empty session as a fatal auth error.
 */
export async function signOutCurrentUser() {
    const { error } = await supabase.auth.signOut({
        scope: "local",
    });

    if (error) {
        throw error;
    }
}