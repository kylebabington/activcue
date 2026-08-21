#!/usr/bin/env node
/**
 * Audit shared library candidates for household-specific personalization.
 *
 * Usage:
 *   node scripts/auditSharedLibraryPrivacy.mjs
 *   node scripts/auditSharedLibraryPrivacy.mjs --deactivate-unsafe
 *
 * Without --deactivate-unsafe this is report-only.
 * With --deactivate-unsafe, rows classified unsafe-for-shared-cache are set is_active=false.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import {
  classifySharedLibrarySafety,
  sanitizeForSharedLibrary,
} from "../server/utils/sanitizeForSharedLibrary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const deactivateUnsafe = process.argv.includes("--deactivate-unsafe");

function loadEnvFile() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
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
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

async function main() {
  const summary = {
    examined: 0,
    validated: 0,
    needsReview: 0,
    unsafe: 0,
    deactivated: 0,
    samples: [],
  };

  if (!url || !key) {
    console.warn(
      "[auditSharedLibraryPrivacy] No Supabase credentials; writing empty report."
    );
    const out = path.join(root, "scripts/generated/shared-library-privacy-audit.json");
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
    .select("id, title:activity_data->>title, activity_data, is_active")
    .eq("is_active", true)
    .limit(5000);

  if (error) {
    throw error;
  }

  const unsafeIds = [];

  for (const row of data || []) {
    summary.examined += 1;
    const classification = classifySharedLibrarySafety(row.activity_data);
    if (classification.status === "validated") {
      summary.validated += 1;
    } else if (classification.status === "needs-review") {
      summary.needsReview += 1;
    } else {
      summary.unsafe += 1;
      unsafeIds.push(row.id);
      if (summary.samples.length < 25) {
        summary.samples.push({
          id: row.id,
          title: row.title,
          failures: classification.failures,
          sanitizedPreview: sanitizeForSharedLibrary(row.activity_data)
            ?.roleGuide?.childRoles,
        });
      }
    }
  }

  if (deactivateUnsafe && unsafeIds.length > 0) {
    const { error: updateError } = await supabase
      .from("shared_activity_candidates")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("id", unsafeIds);
    if (updateError) {
      throw updateError;
    }
    summary.deactivated = unsafeIds.length;
  }

  const out = path.join(
    root,
    "scripts/generated/shared-library-privacy-audit.json"
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
