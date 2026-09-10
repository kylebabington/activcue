#!/usr/bin/env node
/**
 * Report-only (by default) inquiry-quality audit for older shared candidates.
 *
 * Usage:
 *   node scripts/auditSharedInquiryQuality.mjs
 *   node scripts/auditSharedInquiryQuality.mjs --apply-quarantine
 *
 * Does not delete rows. Quarantine sets is_active=false.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import {
  childrenContextFromAgeFit,
  validateOlderChildInquiryQuality,
} from "../server/utils/olderChildInquiryValidation.js";
import { quarantineInvalidCandidate } from "../server/lib/sharedActivityLibrary.js";

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

async function main() {
  const summary = {
    examined: 0,
    olderExamined: 0,
    valid: 0,
    invalid: 0,
    skippedYoung: 0,
    reasons: {},
    domains: {},
    quarantined: 0,
    rows: [],
  };

  const out = path.join(
    root,
    "scripts/generated/shared-activity-inquiry-audit.json"
  );

  if (!url || !key) {
    console.warn(
      "[auditSharedInquiryQuality] No Supabase credentials; writing empty report."
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
    .select("id, source, is_active, activity_data, age_max, target_ages")
    .eq("is_active", true)
    .limit(5000);

  if (error) throw error;

  for (const row of data || []) {
    summary.examined += 1;
    const activity =
      row.activity_data && typeof row.activity_data === "object"
        ? row.activity_data
        : {};
    if (!activity.ageFit) {
      activity.ageFit = {
        maxAge: row.age_max,
        targetAges: row.target_ages,
      };
    }

    const children = childrenContextFromAgeFit(activity);
    if (children.length === 0) {
      summary.skippedYoung += 1;
      continue;
    }

    summary.olderExamined += 1;
    const result = validateOlderChildInquiryQuality(activity, children);
    summary.domains[result.domain] = (summary.domains[result.domain] || 0) + 1;

    if (result.ok) {
      summary.valid += 1;
    } else {
      summary.invalid += 1;
      for (const reason of result.reasons) {
        summary.reasons[reason] = (summary.reasons[reason] || 0) + 1;
      }
      summary.rows.push({
        id: row.id,
        title: activity.title || "(untitled)",
        domain: result.domain,
        oldestAge: result.oldestAge,
        reasons: result.reasons,
      });
      if (applyQuarantine) {
        await quarantineInvalidCandidate(supabase, row.id, result.reasons);
        summary.quarantined += 1;
      }
    }
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
