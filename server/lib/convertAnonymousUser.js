// server/lib/convertAnonymousUser.js

import { checkEmailAvailabilityForUser } from "./authEmailAvailability.js";
import { getSupabaseAdminClient } from "./supabaseAdminClient.js";

export const MIN_PASSWORD_LENGTH = 8;

export function validateConversionPassword(password, confirmPassword) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `Use a password that is at least ${MIN_PASSWORD_LENGTH} characters long.`,
      code: "PASSWORD_TOO_SHORT",
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      status: 400,
      error: "The two passwords do not match.",
      code: "PASSWORD_MISMATCH",
    };
  }

  return { ok: true };
}

/*
 * Convert the authenticated anonymous Auth user into a permanent email account
 * without requiring an email confirmation click.
 *
 * Preserves the same Auth user UUID so profiles, unlocks, and future Stripe
 * customers stay attached.
 */
export async function convertAnonymousUser({
  userId,
  email,
  password,
  confirmPassword,
}) {
  if (!userId) {
    return {
      ok: false,
      status: 401,
      error: "Authentication required.",
      code: "AUTHENTICATION_REQUIRED",
    };
  }

  const passwordCheck = validateConversionPassword(
    password,
    confirmPassword
  );

  if (!passwordCheck.ok) {
    return passwordCheck;
  }

  const availability = await checkEmailAvailabilityForUser({
    email,
    currentUserId: userId,
  });

  if (availability.code === "INVALID_EMAIL") {
    return {
      ok: false,
      status: 400,
      error: availability.error,
      code: availability.code,
    };
  }

  if (!availability.available) {
    return {
      ok: false,
      status: 409,
      error:
        "That email may already belong to an account. Log in instead, or use a different email.",
      code: "EMAIL_ALREADY_REGISTERED",
    };
  }

  const supabase = getSupabaseAdminClient();
  const normalizedEmail = availability.email;

  const {
    data: updatedAuth,
    error: authError,
  } = await supabase.auth.admin.updateUserById(userId, {
    email: normalizedEmail,
    password,
    email_confirm: true,
  });

  if (authError) {
    const message = authError.message || "";
    const lower = message.toLowerCase();

    if (
      lower.includes("already") ||
      lower.includes("registered") ||
      lower.includes("exists")
    ) {
      return {
        ok: false,
        status: 409,
        error:
          "That email may already belong to an account. Log in instead, or use a different email.",
        code: "EMAIL_ALREADY_REGISTERED",
      };
    }

    throw authError;
  }

  const {
    error: profileError,
  } = await supabase
    .from("profiles")
    .update({ is_anonymous: false })
    .eq("user_id", userId);

  if (profileError) {
    console.error(
      "Converted Auth user but could not update profiles.is_anonymous:",
      profileError
    );
  }

  const authUser = updatedAuth?.user;

  return {
    ok: true,
    user: {
      id: userId,
      email: authUser?.email || normalizedEmail,
      isAnonymous: false,
    },
  };
}
