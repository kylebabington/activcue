// server/routes/adminAiUsage.js

import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import { buildAiUsageAdminSummary } from "../lib/aiUsageAdminSummary.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { familyDataRateLimiter } from "../middleware/rateLimits.js";

const router = Router();

const RANGE_MS = {
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function parseRange(query) {
  const rangeKey =
    typeof query?.range === "string" && RANGE_MS[query.range]
      ? query.range
      : "7d";

  const now = new Date();
  const from = new Date(now.getTime() - RANGE_MS[rangeKey]);

  return {
    rangeKey,
    from: from.toISOString(),
    to: now.toISOString(),
  };
}

/*
 * GET /api/admin/ai-usage?range=7d|1d|30d
 * Platform-wide OpenAI spend snapshot from ai_usage_events.
 */
router.get(
  "/admin/ai-usage",
  requireAuthenticatedUser,
  ensureUserProfile,
  requireAdmin,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const window = parseRange(req.query);
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("ai_usage_events")
        .select(
          "estimated_cost, operation, success, failure_type, created_at, model"
        )
        .gte("created_at", window.from)
        .lte("created_at", window.to)
        .order("created_at", { ascending: true })
        .limit(20000);

      if (error) {
        console.error("Could not load admin AI usage:", error);
        return res.status(500).json({
          error: "Could not load AI usage.",
          code: "AI_USAGE_QUERY_FAILED",
        });
      }

      const rows = Array.isArray(data) ? data : [];
      const summary = buildAiUsageAdminSummary(rows);

      return res.json({
        range: window.rangeKey,
        from: window.from,
        to: window.to,
        eventCount: rows.length,
        ...summary,
      });
    } catch (error) {
      console.error("Unexpected admin AI usage failure:", error);
      return res.status(500).json({
        error: "Could not load AI usage.",
        code: "AI_USAGE_FAILED",
      });
    }
  }
);

export default router;
