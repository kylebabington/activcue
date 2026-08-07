// src/api/authApi.js

import {
  ApiRequestError,
  authenticatedRequest,
} from "./apiClient";
import { supabase } from "../lib/supabaseClient";
import {
  getAnalyticsSessionId,
  getAttribution,
} from "../utils/analytics";

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

/*
 * Ask the server whether an email can be attached to the current anonymous
 * session without colliding with another Auth user.
 */
export async function checkEmailAvailability(email) {
  const response = await authenticatedRequest("/api/auth/check-email", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  return response.json();
}

/*
 * Convert the current anonymous Supabase user into a permanent email account
 * in one step (email + password; no confirmation-link gate).
 */
export async function convertAnonymousAccount({
  email,
  password,
  confirmPassword,
}) {
  const response = await authenticatedRequest(
    "/api/auth/convert-anonymous",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        confirmPassword,
        analyticsSessionId: getAnalyticsSessionId(),
        attribution: getAttribution(),
      }),
    }
  );

  return response.json();
}

/*
 * Re-authenticate with the current password, then set a new password.
 */
export async function changePassword({
  email,
  currentPassword,
  newPassword,
}) {
  if (!email) {
    throw new ApiRequestError(
      "A permanent account email is required to change the password.",
      {
        status: 400,
        code: "EMAIL_REQUIRED",
      }
    );
  }

  const {
    error: reauthError,
  } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (reauthError) {
    throw new ApiRequestError(
      "Current password is incorrect.",
      {
        status: 401,
        code: "CURRENT_PASSWORD_INVALID",
        details: reauthError,
      }
    );
  }

  const {
    error: updateError,
  } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    throw updateError;
  }
}

/*
 * Permanently delete the signed-in account and server-side family data.
 */
export async function deleteAccount() {
  const response = await authenticatedRequest("/api/account", {
    method: "DELETE",
  });

  return response.json();
}
