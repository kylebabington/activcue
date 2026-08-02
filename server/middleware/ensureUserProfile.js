// server/middleware/ensureUserProfile.js

import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";

const PROFILE_SELECT_FIELDS = [
  "user_id",
  "is_anonymous",
  "free_imaginative_activity_id",
  "stripe_customer_id",
  "role",
  "billing_exempt",
  "created_at",
  "updated_at",
].join(",");

/*
 * Load the application profile for the authenticated user.
 *
 * Creates a profiles row on first request so anonymous and signed-in
 * users both get entitlement and preset unlock state.
 *
 * Requires requireAuthenticatedUser to have set req.auth first.
 */
export async function ensureUserProfile(req, res, next) {
  if (!req.auth?.userId) {
    return res.status(500).json({
      error: "Authenticated user information is unavailable.",
      code: "AUTH_CONTEXT_MISSING",
    });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const userId = req.auth.userId;
    const isAnonymous = req.auth.isAnonymous === true;

    const {
      data: existingProfile,
      error: selectError,
    } = await supabaseAdmin
      .from("profiles")
      .select(PROFILE_SELECT_FIELDS)
      .eq("user_id", userId)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    if (existingProfile) {
      /*
       * Keep is_anonymous in sync if the auth identity changed
       * (for example after linking an anonymous session to email).
       */
      if (existingProfile.is_anonymous !== isAnonymous) {
        const {
          data: updatedProfile,
          error: updateError,
        } = await supabaseAdmin
          .from("profiles")
          .update({ is_anonymous: isAnonymous })
          .eq("user_id", userId)
          .select(PROFILE_SELECT_FIELDS)
          .single();

        if (updateError) {
          throw updateError;
        }

        req.profile = updatedProfile;
        return next();
      }

      req.profile = existingProfile;
      return next();
    }

    const {
      data: createdProfile,
      error: insertError,
    } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        is_anonymous: isAnonymous,
      })
      .select(PROFILE_SELECT_FIELDS)
      .single();

    if (insertError) {
      /*
       * A concurrent first request may have created the row already.
       * Re-select in that case instead of failing.
       */
      if (insertError.code === "23505") {
        const {
          data: racedProfile,
          error: raceSelectError,
        } = await supabaseAdmin
          .from("profiles")
          .select(PROFILE_SELECT_FIELDS)
          .eq("user_id", userId)
          .single();

        if (raceSelectError) {
          throw raceSelectError;
        }

        req.profile = racedProfile;
        return next();
      }

      throw insertError;
    }

    req.profile = createdProfile;
    return next();
  } catch (error) {
    console.error("Could not ensure user profile:", error);

    return res.status(500).json({
      error: "Could not load the user profile.",
      code: "PROFILE_ENSURE_FAILED",
    });
  }
}
