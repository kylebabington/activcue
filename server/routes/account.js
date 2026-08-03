// server/routes/account.js

import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { authRateLimiter } from "../middleware/rateLimits.js";

const router = Router();

async function deleteRowsForUser(supabase, table, userId) {
  const { error } = await supabase.from(table).delete().eq("user_id", userId);
  if (error) {
    throw error;
  }
}

/*
 * DELETE /api/account
 *
 * Deletes family data for the authenticated user, then removes the Auth user
 * via the admin API (cascades profiles / subscriptions).
 */
router.delete(
  "/account",
  authRateLimiter,
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) => {
    const userId = req.auth.userId;

    if (req.auth.isAnonymous) {
      return res.status(400).json({
        error: "Create a permanent account before deleting an account.",
        code: "ACCOUNT_DELETE_REQUIRES_PERMANENT",
      });
    }

    try {
      const supabase = getSupabaseAdminClient();

      const memoryTables = [
        "activity_sessions",
        "activity_events",
        "saved_activities",
        "ai_usage_events",
        "product_events",
      ];

      for (const table of memoryTables) {
        await deleteRowsForUser(supabase, table, userId);
      }

      const { error: settingsError } = await supabase
        .from("family_settings")
        .delete()
        .eq("user_id", userId);

      if (settingsError) {
        console.error("Could not delete family settings for account:", settingsError);
        return res.status(500).json({
          error: "Could not delete account data.",
          code: "ACCOUNT_DELETE_FAILED",
        });
      }

      const { error: membersError } = await supabase
        .from("household_members")
        .delete()
        .eq("user_id", userId);

      if (membersError && membersError.code !== "42P01") {
        console.error("Could not delete household memberships:", membersError);
        return res.status(500).json({
          error: "Could not delete account data.",
          code: "ACCOUNT_DELETE_FAILED",
        });
      }

      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) {
        console.error("Could not delete auth user:", authError);
        return res.status(500).json({
          error: "Could not delete the authentication account.",
          code: "ACCOUNT_AUTH_DELETE_FAILED",
        });
      }

      return res.json({ deleted: true });
    } catch (error) {
      console.error("Unexpected account delete failure:", error);
      return res.status(500).json({
        error: "Could not delete account.",
        code: "ACCOUNT_DELETE_FAILED",
      });
    }
  }
);

export default router;
