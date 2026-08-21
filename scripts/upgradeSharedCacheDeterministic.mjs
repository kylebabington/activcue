#!/usr/bin/env node
/**
 * Apply deterministic legacy→V3 upgrades to shared cache rows that already
 * contain enough real content. Does NOT invent filler.
 *
 * Usage:
 *   node scripts/upgradeSharedCacheDeterministic.mjs --dry-run
 *   node scripts/upgradeSharedCacheDeterministic.mjs --apply
 *
 * For curated preset-import failures, prefer:
 *   node scripts/upgradePresetActivitiesV3.mjs
 *   npm run presets:import-shared
 *
 * Incomplete AI rows should stay inactive (see library:audit-display --apply-quarantine).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { validateActivityForDisplay } from "../server/utils/activityDisplayValidation.js";
import { upgradeLegacyActivityDeterministic } from "../server/utils/upgradeLegacyActivityDeterministic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const apply = process.argv.includes("--apply");

function loadEnvFile() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

async function main() {
  const summary = {
    examined: 0,
    upgraded: 0,
    nowValid: 0,
    stillInvalid: 0,
    skipped: 0,
    samples: [],
  };

  if (!url || !key) {
    console.warn("[upgradeSharedCacheDeterministic] No Supabase credentials.");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("shared_activity_candidates")
    .select("id, source, activity_data, is_active")
    .limit(5000);
  if (error) throw error;

  for (const row of data || []) {
    summary.examined += 1;
    const before = validateActivityForDisplay(row.activity_data, {
      mode: "cached",
    });
    if (before.valid) {
      summary.skipped += 1;
      continue;
    }

    const { activity, upgraded } = upgradeLegacyActivityDeterministic(
      row.activity_data
    );
    if (!upgraded || !activity) {
      summary.skipped += 1;
      continue;
    }

    const after = validateActivityForDisplay(activity, { mode: "cached" });
    summary.upgraded += 1;
    if (after.valid) summary.nowValid += 1;
    else summary.stillInvalid += 1;

    if (summary.samples.length < 20) {
      summary.samples.push({
        id: row.id,
        title: activity.title,
        source: row.source,
        beforeErrors: before.errors,
        afterErrors: after.errors,
        nowValid: after.valid,
      });
    }

    if (apply && after.valid) {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("shared_activity_candidates")
        .update({
          activity_data: activity,
          is_active: true,
          display_validated: true,
          display_validation_status: "valid",
          display_validation_errors: [],
          display_validated_at: now,
          activity_format_version: 3,
          updated_at: now,
        })
        .eq("id", row.id);
      if (updateError) throw updateError;
    }
  }

  const out = path.join(
    root,
    "scripts/generated/shared-cache-deterministic-upgrade.json"
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to write valid upgrades.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
