/**
 * One-time cleanup of anonymous accounts likely created by CI/Playwright
 * against a production (or shared) Supabase project.
 *
 * SAFETY:
 * - Dry-run by default (prints candidates + related row counts).
 * - Pass --execute to delete.
 * - Only targets anonymous users (no email / is_anonymous) in a time window.
 * - Never deletes users that have an email address (converted accounts).
 *
 * Usage:
 *   node server/scripts/cleanupCiAnonymousUsers.js \
 *     --since 2026-07-01T00:00:00.000Z \
 *     --until 2026-08-02T23:59:59.999Z
 *
 *   node server/scripts/cleanupCiAnonymousUsers.js \
 *     --since 2026-07-01T00:00:00.000Z \
 *     --until 2026-08-02T23:59:59.999Z \
 *     --execute
 *
 * Requires SUPABASE_URL + SUPABASE_SECRET_KEY for the target project.
 * Run against production only after reviewing the dry-run output.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] || null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function isAnonymousUser(user) {
  const email = typeof user.email === "string" ? user.email.trim() : "";
  if (email) {
    return false;
  }

  if (user.is_anonymous === true) {
    return true;
  }

  // Supabase anonymous users often have empty email and identities marked anonymous.
  const identities = Array.isArray(user.identities) ? user.identities : [];
  return identities.some(
    (identity) =>
      identity?.provider === "anonymous" || identity?.is_anonymous === true
  );
}

async function countForUser(supabase, table, userId) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    // family_settings / profiles use user_id as PK without a separate id.
    if (error.code === "42703" || /column .*id.* does not exist/i.test(error.message || "")) {
      const fallback = await supabase
        .from(table)
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (fallback.error) {
        throw fallback.error;
      }
      return fallback.count || 0;
    }
    throw error;
  }

  return count || 0;
}

async function deleteForUser(supabase, table, userId) {
  const { error } = await supabase.from(table).delete().eq("user_id", userId);
  if (error) {
    throw error;
  }
}

async function listAnonymousUsersInWindow(supabase, sinceIso, untilIso) {
  const matches = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      throw error;
    }

    const users = data?.users || [];
    if (users.length === 0) {
      break;
    }

    for (const user of users) {
      if (!isAnonymousUser(user)) {
        continue;
      }

      const createdAt = user.created_at ? Date.parse(user.created_at) : NaN;
      if (!Number.isFinite(createdAt)) {
        continue;
      }

      const sinceMs = Date.parse(sinceIso);
      const untilMs = Date.parse(untilIso);
      if (createdAt < sinceMs || createdAt > untilMs) {
        continue;
      }

      matches.push(user);
    }

    if (users.length < perPage) {
      break;
    }
    page += 1;
  }

  return matches;
}

async function main() {
  const sinceIso = readArg("--since");
  const untilIso = readArg("--until");
  const execute = hasFlag("--execute");

  if (!sinceIso || !untilIso) {
    console.error(
      "Required: --since <ISO> --until <ISO>  (optional: --execute)"
    );
    process.exit(1);
  }

  if (Number.isNaN(Date.parse(sinceIso)) || Number.isNaN(Date.parse(untilIso))) {
    console.error("--since and --until must be valid ISO timestamps.");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY in the environment.");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(
    execute
      ? "EXECUTE mode — deletions will be applied."
      : "DRY-RUN mode — no deletions. Pass --execute after review."
  );
  console.log(`Window: ${sinceIso} → ${untilIso}`);
  console.log(`Project: ${url}`);

  const candidates = await listAnonymousUsersInWindow(
    supabase,
    sinceIso,
    untilIso
  );

  console.log(`Anonymous candidates: ${candidates.length}`);

  const summary = {
    users: 0,
    activity_sessions: 0,
    activity_events: 0,
    saved_activities: 0,
    family_settings: 0,
    profiles: 0,
    ai_usage_events: 0,
  };

  for (const user of candidates) {
    const counts = {
      activity_sessions: await countForUser(
        supabase,
        "activity_sessions",
        user.id
      ),
      activity_events: await countForUser(supabase, "activity_events", user.id),
      saved_activities: await countForUser(
        supabase,
        "saved_activities",
        user.id
      ),
      family_settings: await countForUser(supabase, "family_settings", user.id),
      profiles: await countForUser(supabase, "profiles", user.id),
      ai_usage_events: await countForUser(supabase, "ai_usage_events", user.id),
    };

    console.log(
      JSON.stringify({
        userId: user.id,
        createdAt: user.created_at,
        isAnonymous: user.is_anonymous === true,
        email: user.email || null,
        counts,
      })
    );

    summary.users += 1;
    summary.activity_sessions += counts.activity_sessions;
    summary.activity_events += counts.activity_events;
    summary.saved_activities += counts.saved_activities;
    summary.family_settings += counts.family_settings;
    summary.profiles += counts.profiles;
    summary.ai_usage_events += counts.ai_usage_events;

    if (!execute) {
      continue;
    }

    // FK-safe order. profiles CASCADE covers many child tables, but delete
    // explicitly first so the dry-run counts match what we remove.
    await deleteForUser(supabase, "activity_sessions", user.id);
    await deleteForUser(supabase, "activity_events", user.id);
    await deleteForUser(supabase, "saved_activities", user.id);
    await deleteForUser(supabase, "ai_usage_events", user.id);
    await deleteForUser(supabase, "family_settings", user.id);
    await deleteForUser(supabase, "profiles", user.id);

    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
    if (authError) {
      throw authError;
    }
  }

  console.log("Summary:", summary);
  if (!execute) {
    console.log("Dry-run complete. Re-run with --execute to apply deletions.");
  } else {
    console.log("Cleanup complete.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
