// server/routes/familyInsights.js

import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { familyDataRateLimiter } from "../middleware/rateLimits.js";

const router = Router();
const MIN_SAMPLE = 3;

function average(numbers) {
  if (!numbers.length) {
    return null;
  }
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function timeToStartMs(session) {
  const presented = Date.parse(session.presented_at || "");
  const started = Date.parse(session.started_at || "");
  if (!Number.isFinite(presented) || !Number.isFinite(started) || started < presented) {
    return null;
  }
  return started - presented;
}

function primaryCategory(session) {
  const cats = Array.isArray(session.activity_categories)
    ? session.activity_categories
    : [];
  return typeof cats[0] === "string" ? cats[0] : null;
}

function structureOf(session) {
  const traits =
    session.activity_traits && typeof session.activity_traits === "object"
      ? session.activity_traits
      : {};
  return traits.structure || null;
}

/*
 * GET /api/family-insights
 * Non-AI insights from sessions. Requires min sample size.
 */
router.get(
  "/family-insights",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("activity_sessions")
        .select("*")
        .eq("user_id", req.auth.userId)
        .order("started_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("Could not load sessions for insights:", error);
        return res.status(500).json({
          error: "Could not load insights.",
          code: "FAMILY_INSIGHTS_FAILED",
        });
      }

      const sessions = data || [];
      const insights = [];

      if (sessions.length < MIN_SAMPLE) {
        return res.json({
          insights: [
            {
              id: "still-learning",
              status: "still-learning",
              statement: "Still learning",
              detail: `Need at least ${MIN_SAMPLE} completed sessions before patterns appear.`,
            },
          ],
          sampleSize: sessions.length,
          minSample: MIN_SAMPLE,
        });
      }

      // Category start-speed comparison
      const byCategory = new Map();
      for (const session of sessions) {
        const category = primaryCategory(session);
        const tts = timeToStartMs(session);
        if (!category || tts == null) {
          continue;
        }
        const list = byCategory.get(category) || [];
        list.push(tts);
        byCategory.set(category, list);
      }

      const categoryAvgs = [...byCategory.entries()]
        .filter(([, list]) => list.length >= MIN_SAMPLE)
        .map(([category, list]) => ({
          category,
          avgMs: average(list),
          count: list.length,
        }))
        .sort((a, b) => a.avgMs - b.avgMs);

      if (categoryAvgs.length >= 2) {
        const fastest = categoryAvgs[0];
        const slowest = categoryAvgs[categoryAvgs.length - 1];
        if (slowest.avgMs > 0) {
          const pctFaster = Math.round(
            (1 - fastest.avgMs / slowest.avgMs) * 100
          );
          if (pctFaster > 5) {
            insights.push({
              id: "category-start-speed",
              status: "ready",
              statement: `${fastest.category} activities start ${pctFaster}% faster than ${slowest.category} activities.`,
              detail: `Based on ${fastest.count + slowest.count} timed starts.`,
            });
          }
        }
      }

      // Quiet + cooking independent minutes
      const cookingQuiet = sessions.filter((session) => {
        const parent = String(session.parent_activity || "").toLowerCase();
        const noise = String(session.noise_limit || "").toLowerCase();
        const mins = Number(session.actual_minutes);
        return (
          parent.includes("cook") &&
          noise === "quiet" &&
          Number.isFinite(mins) &&
          mins > 0
        );
      });

      if (cookingQuiet.length >= MIN_SAMPLE) {
        const avgMins = Math.round(
          average(cookingQuiet.map((s) => Number(s.actual_minutes)))
        );
        insights.push({
          id: "cooking-quiet-minutes",
          status: "ready",
          statement: `Quiet activities during Cooking average ${avgMins} minutes of play.`,
          detail: `From ${cookingQuiet.length} matching sessions.`,
        });
      }

      // Open-ended creative preference
      const openEndedCreative = sessions.filter((session) => {
        const cats = Array.isArray(session.activity_categories)
          ? session.activity_categories
          : [];
        return (
          structureOf(session) === "open-ended" &&
          cats.includes("creative") &&
          session.independence_rating === "worked-great"
        );
      });

      if (openEndedCreative.length >= MIN_SAMPLE) {
        insights.push({
          id: "open-ended-creative",
          status: "ready",
          statement:
            "Open-ended creative activities are among your strongest independent wins.",
          detail: `${openEndedCreative.length} “worked great” sessions matched.`,
        });
      }

      // Group + few supplies
      const groupSessions = sessions.filter(
        (session) =>
          session.session_scope === "group" ||
          (Array.isArray(session.participant_child_ids) &&
            session.participant_child_ids.length > 1)
      );
      const lowSupplyWins = groupSessions.filter((session) => {
        const supplies = Array.isArray(session.activity_supplies)
          ? session.activity_supplies
          : [];
        return (
          supplies.length > 0 &&
          supplies.length < 3 &&
          session.independence_rating === "worked-great"
        );
      });

      if (lowSupplyWins.length >= MIN_SAMPLE) {
        insights.push({
          id: "group-few-supplies",
          status: "ready",
          statement:
            "Group activities work best when they require fewer than three supplies.",
          detail: `${lowSupplyWins.length} successful group sessions with light supply lists.`,
        });
      }

      if (insights.length === 0) {
        insights.push({
          id: "still-learning-patterns",
          status: "still-learning",
          statement: "Still learning",
          detail:
            "You have sessions, but not enough matching samples for a clear pattern yet.",
        });
      }

      return res.json({
        insights,
        sampleSize: sessions.length,
        minSample: MIN_SAMPLE,
      });
    } catch (error) {
      console.error("Unexpected family insights failure:", error);
      return res.status(500).json({
        error: "Could not load insights.",
        code: "FAMILY_INSIGHTS_FAILED",
      });
    }
  }
);

export default router;
