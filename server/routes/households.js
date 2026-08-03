// server/routes/households.js

import { randomUUID } from "crypto";
import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import {
  ensureUserHousehold,
} from "../lib/households.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { familyDataRateLimiter } from "../middleware/rateLimits.js";

const router = Router();

router.use(familyDataRateLimiter);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/*
 * GET /api/households/me
 */
router.get(
  "/households/me",
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) => {
    try {
      const householdId = await ensureUserHousehold(req.auth.userId);
      if (!householdId) {
        return res.status(500).json({
          error: "Could not resolve household.",
          code: "HOUSEHOLD_RESOLVE_FAILED",
        });
      }

      const supabase = getSupabaseAdminClient();
      const [{ data: household }, { data: members }] = await Promise.all([
        supabase
          .from("households")
          .select("*")
          .eq("id", householdId)
          .maybeSingle(),
        supabase
          .from("household_members")
          .select("*")
          .eq("household_id", householdId),
      ]);

      return res.json({
        household,
        members: members || [],
      });
    } catch (error) {
      console.error("Household me failed:", error);
      return res.status(500).json({
        error: "Could not load household.",
        code: "HOUSEHOLD_ME_FAILED",
      });
    }
  }
);

/*
 * POST /api/households/invites
 */
router.post(
  "/households/invites",
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {};
      const email =
        typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const role =
        body.role === "viewer" || body.role === "owner" ? body.role : "member";

      if (!email || !email.includes("@")) {
        return res.status(400).json({
          error: "A valid email is required.",
          code: "HOUSEHOLD_INVITE_INVALID",
        });
      }

      const householdId = await ensureUserHousehold(req.auth.userId);
      if (!householdId) {
        return res.status(500).json({
          error: "Could not resolve household.",
          code: "HOUSEHOLD_RESOLVE_FAILED",
        });
      }

      const token = randomUUID();
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("household_invites")
        .insert({
          household_id: householdId,
          email,
          role,
          token,
          invited_by: req.auth.userId,
          status: "pending",
        })
        .select("*")
        .single();

      if (error) {
        console.error("Could not create household invite:", error);
        return res.status(500).json({
          error: "Could not create invite.",
          code: "HOUSEHOLD_INVITE_FAILED",
        });
      }

      return res.status(201).json({
        invite: {
          id: data.id,
          email: data.email,
          role: data.role,
          token: data.token,
          status: data.status,
          createdAt: data.created_at,
        },
      });
    } catch (error) {
      console.error("Household invite failed:", error);
      return res.status(500).json({
        error: "Could not create invite.",
        code: "HOUSEHOLD_INVITE_FAILED",
      });
    }
  }
);

/*
 * POST /api/households/invites/accept
 */
router.post(
  "/households/invites/accept",
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {};
      const token =
        typeof body.token === "string" ? body.token.trim() : "";

      if (!token) {
        return res.status(400).json({
          error: "Invite token is required.",
          code: "HOUSEHOLD_INVITE_TOKEN_REQUIRED",
        });
      }

      const supabase = getSupabaseAdminClient();
      const { data: invite, error } = await supabase
        .from("household_invites")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .maybeSingle();

      if (error || !invite) {
        return res.status(404).json({
          error: "Invite not found.",
          code: "HOUSEHOLD_INVITE_NOT_FOUND",
        });
      }

      const { error: memberError } = await supabase
        .from("household_members")
        .upsert(
          {
            household_id: invite.household_id,
            user_id: req.auth.userId,
            role: invite.role === "owner" ? "member" : invite.role,
          },
          { onConflict: "household_id,user_id" }
        );

      if (memberError) {
        console.error("Could not accept household invite:", memberError);
        return res.status(500).json({
          error: "Could not accept invite.",
          code: "HOUSEHOLD_INVITE_ACCEPT_FAILED",
        });
      }

      await supabase
        .from("household_invites")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      await supabase
        .from("family_settings")
        .update({ household_id: invite.household_id })
        .eq("user_id", req.auth.userId);

      return res.json({
        accepted: true,
        householdId: invite.household_id,
      });
    } catch (error) {
      console.error("Household invite accept failed:", error);
      return res.status(500).json({
        error: "Could not accept invite.",
        code: "HOUSEHOLD_INVITE_ACCEPT_FAILED",
      });
    }
  }
);

export default router;
