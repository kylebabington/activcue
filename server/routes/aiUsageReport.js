// server/routes/aiUsageReport.js

import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { familyDataRateLimiter } from "../middleware/rateLimits.js";

const router = Router();

/*
 * GET /api/ai-usage/summary
 * Per-user AI unit economics (cost accounting).
 */
router.get(
  "/ai-usage/summary",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("ai_usage_events")
        .select(
          "estimated_cost, operation, success, created_at, input_tokens, output_tokens, total_tokens"
        )
        .eq("user_id", req.auth.userId)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        console.error("Could not load AI usage:", error);
        return res.status(500).json({
          error: "Could not load AI usage summary.",
          code: "AI_USAGE_SUMMARY_FAILED",
        });
      }

      const rows = data || [];
      const successful = rows.filter((row) => row.success);
      const totalEstimatedCost = successful.reduce(
        (sum, row) => sum + (Number(row.estimated_cost) || 0),
        0
      );
      const totalGenerations = successful.filter(
        (row) => row.operation === "activity-suggestions"
      ).length;
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const costLast30Days = successful
        .filter((row) => Date.parse(row.created_at) >= cutoff)
        .reduce((sum, row) => sum + (Number(row.estimated_cost) || 0), 0);

      // Library hit rate proxy: plan_b / rescue events vs generations (optional)
      const { data: productRows } = await supabase
        .from("product_events")
        .select("event_name")
        .eq("user_id", req.auth.userId)
        .in("event_name", [
          "plan_b_used",
          "rescue_successful",
          "activity_generated",
        ])
        .limit(500);

      const product = productRows || [];
      const libraryServed = product.filter((row) =>
        ["plan_b_used", "rescue_successful"].includes(row.event_name)
      ).length;
      const generated = product.filter(
        (row) => row.event_name === "activity_generated"
      ).length;
      const libraryHitRate =
        libraryServed + generated > 0
          ? libraryServed / (libraryServed + generated)
          : null;

      return res.json({
        totalEstimatedCost: Math.round(totalEstimatedCost * 1_000_000) / 1_000_000,
        totalGenerations,
        avgCostPerGeneration:
          totalGenerations > 0
            ? Math.round((totalEstimatedCost / totalGenerations) * 1_000_000) /
              1_000_000
            : 0,
        costLast30Days: Math.round(costLast30Days * 1_000_000) / 1_000_000,
        libraryHitRate,
        eventCount: rows.length,
      });
    } catch (error) {
      console.error("Unexpected AI usage summary failure:", error);
      return res.status(500).json({
        error: "Could not load AI usage summary.",
        code: "AI_USAGE_SUMMARY_FAILED",
      });
    }
  }
);

export default router;
