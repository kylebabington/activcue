// server/routes/adminGrowth.js

import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
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

/** Ordered conversion funnel shown in Admin Growth (human labels → event names). */
export const GROWTH_FUNNEL_STEPS = Object.freeze([
  {
    id: "landing_page_viewed",
    label: "Landing page viewed",
    eventName: "landing_page_viewed",
    distinct: "session",
  },
  {
    id: "demo_started",
    label: "Demo started",
    eventName: "demo_started",
    distinct: "session",
  },
  {
    id: "demo_completed",
    label: "Demo completed",
    eventName: "demo_completed",
    distinct: "session",
    /** Pre-gap fallback while older traffic only has demo_activity_generated. */
    fallbackEventName: "demo_activity_generated",
  },
  {
    id: "signup_started",
    label: "Signup started",
    eventName: "signup_started",
    distinct: "session",
  },
  {
    id: "signup_completed",
    label: "Signup completed",
    eventName: "signup_completed",
    distinct: "user",
  },
  {
    id: "first_activity_generated",
    label: "First activity generated",
    eventName: "first_activity_generated",
    distinct: "user",
  },
  {
    id: "checkout_started",
    label: "Subscription checkout started",
    eventName: "checkout_started",
    distinct: "count",
  },
  {
    id: "subscription_purchased",
    label: "Subscription purchased",
    eventName: "subscription_started",
    distinct: "user",
  },
]);

function parseRange(query) {
  const rangeKey =
    typeof query?.range === "string" && RANGE_MS[query.range]
      ? query.range
      : "7d";

  const now = new Date();
  let from;
  let to = now;

  if (typeof query?.from === "string" && query.from) {
    from = new Date(query.from);
  } else {
    from = new Date(now.getTime() - RANGE_MS[rangeKey]);
  }

  if (typeof query?.to === "string" && query.to) {
    to = new Date(query.to);
  }

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return null;
  }

  return {
    rangeKey,
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function dayKey(iso) {
  return iso.slice(0, 10);
}

function ratio(numerator, denominator) {
  if (!denominator) {
    return null;
  }
  return Math.round((numerator / denominator) * 1000) / 1000;
}

function countDistinct(values) {
  return new Set(values.filter(Boolean)).size;
}

function countEvent(rows, eventName) {
  return rows.filter((row) => row.event_name === eventName).length;
}

function distinctSessionsFor(rows, eventName) {
  return countDistinct(
    rows
      .filter((row) => row.event_name === eventName)
      .map((row) => row.session_id)
  );
}

function distinctUsersFor(rows, eventName) {
  return countDistinct(
    rows
      .filter((row) => row.event_name === eventName)
      .map((row) => row.user_id)
  );
}

function measureStep(rows, step) {
  if (step.distinct === "session") {
    const primary = distinctSessionsFor(rows, step.eventName);
    if (primary > 0 || !step.fallbackEventName) {
      return primary;
    }
    return distinctSessionsFor(rows, step.fallbackEventName);
  }

  if (step.distinct === "user") {
    const byUser = distinctUsersFor(rows, step.eventName);
    if (byUser > 0) {
      return byUser;
    }
    return countEvent(rows, step.eventName);
  }

  return countEvent(rows, step.eventName);
}

function buildFunnel(rows) {
  const steps = GROWTH_FUNNEL_STEPS.map((step, index) => {
    const count = measureStep(rows, step);
    const previousCount =
      index === 0 ? null : measureStep(rows, GROWTH_FUNNEL_STEPS[index - 1]);
    return {
      id: step.id,
      label: step.label,
      eventName: step.eventName,
      count,
      stepConversion: index === 0 ? null : ratio(count, previousCount),
    };
  });

  return steps;
}

function buildUtmBreakdown(rows) {
  const bySource = new Map();

  for (const row of rows) {
    const props =
      row.properties && typeof row.properties === "object"
        ? row.properties
        : {};
    const source =
      typeof props.utm_source === "string" && props.utm_source
        ? props.utm_source
        : "(none)";
    const campaign =
      typeof props.utm_campaign === "string" && props.utm_campaign
        ? props.utm_campaign
        : "(none)";
    const key = `${source}::${campaign}`;

    if (!bySource.has(key)) {
      bySource.set(key, {
        utm_source: source,
        utm_campaign: campaign,
        landing: new Set(),
        demoStarts: new Set(),
        demoCompleted: new Set(),
        signupStarted: new Set(),
        signups: new Set(),
        firstActivity: new Set(),
        checkouts: 0,
        paid: new Set(),
      });
    }

    const bucket = bySource.get(key);
    if (row.event_name === "landing_page_viewed" && row.session_id) {
      bucket.landing.add(row.session_id);
    }
    if (row.event_name === "demo_started" && row.session_id) {
      bucket.demoStarts.add(row.session_id);
    }
    if (
      (row.event_name === "demo_completed" ||
        row.event_name === "demo_activity_generated") &&
      row.session_id
    ) {
      bucket.demoCompleted.add(row.session_id);
    }
    if (row.event_name === "signup_started" && row.session_id) {
      bucket.signupStarted.add(row.session_id);
    }
    if (row.event_name === "signup_completed") {
      bucket.signups.add(row.user_id || row.session_id || row.id);
    }
    if (row.event_name === "first_activity_generated") {
      bucket.firstActivity.add(row.user_id || row.session_id || row.id);
    }
    if (row.event_name === "checkout_started") {
      bucket.checkouts += 1;
    }
    if (row.event_name === "subscription_started") {
      bucket.paid.add(row.user_id || row.session_id || row.id);
    }
  }

  return [...bySource.values()]
    .map((bucket) => ({
      utm_source: bucket.utm_source,
      utm_campaign: bucket.utm_campaign,
      landingPageViewed: bucket.landing.size,
      demoStarted: bucket.demoStarts.size,
      demoCompleted: bucket.demoCompleted.size,
      signupStarted: bucket.signupStarted.size,
      signupCompleted: bucket.signups.size,
      firstActivityGenerated: bucket.firstActivity.size,
      checkoutStarted: bucket.checkouts,
      subscriptionPurchased: bucket.paid.size,
      // Legacy keys for any older clients
      visitors: bucket.landing.size,
      demoStarts: bucket.demoStarts.size,
      accountsCreated: bucket.signups.size,
      paidSubscribers: bucket.paid.size,
    }))
    .sort(
      (a, b) =>
        b.landingPageViewed - a.landingPageViewed ||
        b.signupCompleted - a.signupCompleted
    );
}

function countReturningUsers(rows) {
  const daysByUser = new Map();
  for (const row of rows) {
    if (!row.user_id || !row.created_at) {
      continue;
    }
    const key = dayKey(row.created_at);
    if (!daysByUser.has(row.user_id)) {
      daysByUser.set(row.user_id, new Set());
    }
    daysByUser.get(row.user_id).add(key);
  }

  let returning = 0;
  for (const days of daysByUser.values()) {
    if (days.size >= 2) {
      returning += 1;
    }
  }
  return returning;
}

function buildMetrics(rows) {
  const funnel = buildFunnel(rows);
  const byId = Object.fromEntries(funnel.map((step) => [step.id, step.count]));

  const visitors = byId.landing_page_viewed || 0;
  const demoStarts = byId.demo_started || 0;
  const demoCompleted = byId.demo_completed || 0;
  const signupStarted = byId.signup_started || 0;
  const accountsCreated = byId.signup_completed || 0;
  const firstActivityGenerated = byId.first_activity_generated || 0;
  const checkoutStarted = byId.checkout_started || 0;
  const paidSubscribers = byId.subscription_purchased || 0;
  const returningUsers = countReturningUsers(rows);
  const fullActivities = countEvent(rows, "activity_generated");

  return {
    funnel,
    visitors,
    demoStarts,
    demoCompleted,
    demoActivitiesGenerated: demoCompleted,
    signupStarted,
    accountsCreated,
    firstActivityGenerated,
    returningUsers,
    checkoutStarted,
    paidSubscribers,
    activitiesGenerated: fullActivities,
    conversions: {
      demoConversion: ratio(demoStarts, visitors),
      demoCompletionConversion: ratio(demoCompleted, demoStarts),
      signupStartConversion: ratio(signupStarted, demoCompleted),
      signupConversion: ratio(accountsCreated, demoStarts),
      firstActivityConversion: ratio(firstActivityGenerated, accountsCreated),
      checkoutConversion: ratio(checkoutStarted, firstActivityGenerated || accountsCreated),
      paidConversion: ratio(paidSubscribers, accountsCreated),
    },
  };
}

/*
 * GET /api/admin/growth?range=7d|1d|30d
 * Also supports ?from=&to= ISO timestamps.
 */
router.get(
  "/admin/growth",
  requireAuthenticatedUser,
  ensureUserProfile,
  requireAdmin,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const window = parseRange(req.query);
      if (!window) {
        return res.status(400).json({
          error: "Invalid growth range.",
          code: "INVALID_GROWTH_RANGE",
        });
      }

      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("product_events")
        .select("id, user_id, event_name, properties, session_id, created_at")
        .gte("created_at", window.from)
        .lte("created_at", window.to)
        .order("created_at", { ascending: true })
        .limit(20000);

      if (error) {
        console.error("Could not load growth events:", error);
        return res.status(500).json({
          error: "Could not load growth metrics.",
          code: "GROWTH_QUERY_FAILED",
        });
      }

      const rows = Array.isArray(data) ? data : [];
      const metrics = buildMetrics(rows);
      const bySource = buildUtmBreakdown(rows);

      // Yesterday strip (calendar day in UTC) for the Phase 1 question.
      const yesterdayStart = new Date();
      yesterdayStart.setUTCHours(0, 0, 0, 0);
      yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
      const yesterdayEnd = new Date(yesterdayStart);
      yesterdayEnd.setUTCDate(yesterdayEnd.getUTCDate() + 1);

      const yesterdayRows = rows.filter((row) => {
        const created = new Date(row.created_at).getTime();
        return (
          created >= yesterdayStart.getTime() &&
          created < yesterdayEnd.getTime()
        );
      });

      return res.json({
        range: window.rangeKey,
        from: window.from,
        to: window.to,
        metrics,
        yesterday: {
          from: yesterdayStart.toISOString(),
          to: yesterdayEnd.toISOString(),
          ...buildMetrics(yesterdayRows),
        },
        bySource,
        eventCount: rows.length,
      });
    } catch (error) {
      console.error("Unexpected growth metrics failure:", error);
      return res.status(500).json({
        error: "Could not load growth metrics.",
        code: "GROWTH_FAILED",
      });
    }
  }
);

export default router;
