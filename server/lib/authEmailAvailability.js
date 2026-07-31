// server/lib/authEmailAvailability.js

import { getSupabaseAdminClient } from "./supabaseAdminClient.js";

export function normalizeAuthEmail(email) {
  if (typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();
}

/*
 * Decide whether an email can be attached to the current Auth user.
 *
 * existingUserId:
 *   null  -> no Auth user currently owns the email
 *   string -> that Auth user id already owns it
 */
export function resolveEmailAvailability({
  currentUserId,
  existingUserId,
}) {
  if (!existingUserId) {
    return {
      available: true,
    };
  }

  if (
    currentUserId &&
    existingUserId === currentUserId
  ) {
    return {
      available: true,
      sameUser: true,
    };
  }

  return {
    available: false,
    code: "EMAIL_ALREADY_REGISTERED",
  };
}

/*
 * Look up an Auth user by exact email via the GoTrue admin API.
 *
 * Uses the `filter` query (email/phone search) then exact-matches locally so
 * substring hits do not produce false collisions.
 */
export async function findAuthUserByEmail(email) {
  const normalizedEmail = normalizeAuthEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "Supabase admin credentials are not configured."
    );
  }

  /*
   * Ensure the admin client can be constructed with the same env vars before
   * calling GoTrue directly.
   */
  getSupabaseAdminClient();

  const url = new URL(
    `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/admin/users`
  );
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", "50");
  url.searchParams.set("filter", normalizedEmail);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      apikey: secretKey,
    },
  });

  if (!response.ok) {
    const bodyText = await response.text();

    throw new Error(
      `Could not look up Auth users by email (${response.status}): ${bodyText}`
    );
  }

  const payload = await response.json();
  const users = Array.isArray(payload?.users)
    ? payload.users
    : [];

  return (
    users.find(
      (user) =>
        normalizeAuthEmail(user?.email) ===
        normalizedEmail
    ) || null
  );
}

export async function checkEmailAvailabilityForUser({
  email,
  currentUserId,
}) {
  const normalizedEmail = normalizeAuthEmail(email);

  if (!normalizedEmail) {
    return {
      available: false,
      code: "INVALID_EMAIL",
      error: "Enter a valid email address.",
    };
  }

  const existingUser =
    await findAuthUserByEmail(normalizedEmail);

  const availability = resolveEmailAvailability({
    currentUserId,
    existingUserId: existingUser?.id || null,
  });

  return {
    email: normalizedEmail,
    ...availability,
  };
}
