#!/usr/bin/env node
/**
 * Audit shared_activity_candidates for display-ready V3 quality.
 *
 * Validates RAW activity_data (not post-normalize filler).
 *
 * Usage:
 *   node scripts/auditSharedActivityCache.mjs
 *   node scripts/auditSharedActivityCache.mjs --apply-quarantine
 *
 * Buckets:
 *   VALID   — passes validateActivityForDisplay
 *   REBUILD — preset-import that fails (fix source presets, reimport)
 *   DISABLE — AI/other incomplete content (deactivate, do not salvage)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { validateActivityForDisplay } from "../server/utils/activityDisplayValidation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const applyQuarantine = process.argv.includes("--apply-quarantine");

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

function resolveBucket(row, valid) {
  if (valid) return "VALID";
  const source = String(row.source || "").toLowerCase();
  if (source === "preset-import" || source === "preset") return "REBUILD";
  return "DISABLE";
}

function printTable(rows) {
  console.log("\nActivity\tStyle\tVersion\tStatus\tBucket\tFailures");
  for (const row of rows) {
    console.log(
      [
        row.title || "(untitled)",
        row.style || "?",
        row.version ?? "?",
        row.status,
        row.bucket,
        (row.failures || []).join(", ") || "—",
      ].join("\t")
    );
  }
}

async function main() {
  const summary = {
    examined: 0,
    valid: 0,
    invalid: 0,
    buckets: { VALID: 0, REBUILD: 0, DISABLE: 0 },
    failureReasons: {},
    rows: [],
    quarantined: 0,
  };

  if (!url || !key) {
    console.warn(
      "[auditSharedActivityCache] No Supabase credentials; writing empty report."
    );
    const out = path.join(
      root,
      "scripts/generated/shared-activity-display-audit.json"
    );
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("shared_activity_candidates")
    .select(
      "id, source, is_active, activity_style, activity_data, activity_format_version, age_fit_validated"
    )
    .limit(5000);

  if (error) throw error;

  const quarantineIds = [];
  const validUpdates = [];

  for (const row of data || []) {
    summary.examined += 1;
    const activity =
      row.activity_data && typeof row.activity_data === "object"
        ? row.activity_data
        : {};
    const validation = validateActivityForDisplay(activity, { mode: "cached" });
    const bucket = resolveBucket(row, validation.valid);
    summary.buckets[bucket] += 1;

    if (validation.valid) {
      summary.valid += 1;
      validUpdates.push(row.id);
    } else {
      summary.invalid += 1;
      for (const code of validation.errors) {
        summary.failureReasons[code] =
          (summary.failureReasons[code] || 0) + 1;
      }
      if (bucket === "DISABLE" || bucket === "REBUILD") {
        quarantineIds.push({
          id: row.id,
          errors: validation.errors,
          bucket,
        });
      }
    }

    const title =
      typeof activity.title === "string"
        ? activity.title
        : "(untitled)";
    const style =
      row.activity_style ||
      activity.activityStyle ||
      activity.style ||
      "?";
    const version =
      row.activity_format_version ??
      activity.activityFormatVersion ??
      null;

    summary.rows.push({
      id: row.id,
      title,
      style,
      version,
      source: row.source,
      isActive: row.is_active,
      status: validation.valid ? "PASS" : "FAIL",
      bucket,
      failures: validation.errors,
      ageFitValidated: row.age_fit_validated === true,
    });
  }

  printTable(summary.rows);

  console.log("\n--- Totals ---");
  console.log(`${summary.examined} examined`);
  console.log(`${summary.valid} valid`);
  console.log(`${summary.invalid} invalid`);
  console.log(
    `Buckets: VALID=${summary.buckets.VALID} REBUILD=${summary.buckets.REBUILD} DISABLE=${summary.buckets.DISABLE}`
  );
  console.log("\nInvalid reasons:");
  const sortedReasons = Object.entries(summary.failureReasons).sort(
    (a, b) => b[1] - a[1]
  );
  for (const [code, count] of sortedReasons) {
    console.log(`${count} ${code}`);
  }

  if (applyQuarantine) {
    const now = new Date().toISOString();

    for (const item of quarantineIds) {
      const { error: updateError } = await supabase
        .from("shared_activity_candidates")
        .update({
          is_active: false,
          display_validated: false,
          display_validation_status: "invalid",
          display_validation_errors: item.errors,
          display_validated_at: now,
          updated_at: now,
        })
        .eq("id", item.id);
      if (updateError) throw updateError;
      summary.quarantined += 1;
    }

    for (const id of validUpdates) {
      const row = summary.rows.find((r) => r.id === id);
      const patch = {
        display_validated: true,
        display_validation_status: "valid",
        display_validation_errors: [],
        display_validated_at: now,
        activity_format_version: row?.version ?? null,
        updated_at: now,
      };
      // After display audit, VALID rows with age metadata can be trusted for cache pull.
      if (row?.ageFitValidated !== true) {
        patch.age_fit_validated = true;
        patch.age_fit_reviewed_at = now;
      }
      const { error: updateError } = await supabase
        .from("shared_activity_candidates")
        .update(patch)
        .eq("id", id);
      if (updateError) throw updateError;
    }

    console.log(
      `\nQuarantine applied: ${summary.quarantined} deactivated; ${validUpdates.length} marked valid.`
    );
  } else {
    console.log(
      "\nReport only. Re-run with --apply-quarantine to deactivate invalid rows."
    );
  }

  const out = path.join(
    root,
    "scripts/generated/shared-activity-display-audit.json"
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${out}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
