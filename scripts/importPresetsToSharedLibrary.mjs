/**
 * Import active preset_activities (or expanded JSON) into shared_activity_candidates.
 *
 * Usage:
 *   node scripts/importPresetsToSharedLibrary.mjs
 *   node scripts/importPresetsToSharedLibrary.mjs --from-json
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (server/.env).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { ingestPresetCandidates } from "../server/lib/sharedActivityLibrary.js";
import { getSupabaseAdminClient } from "../server/lib/supabaseAdminClient.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

dotenv.config({ path: path.join(rootDir, "server", ".env") });
dotenv.config({ path: path.join(rootDir, ".env") });

function presetRowToActivity(row) {
  const content =
    row.full_content && typeof row.full_content === "object"
      ? row.full_content
      : {};
  return {
    ...content,
    title: row.title || content.title,
    summary: row.summary || content.summary,
    theme: row.theme || content.theme || "",
    estimatedMinutes:
      Number(row.estimated_minutes) ||
      Number(content.estimatedMinutes) ||
      20,
    activityStyle: row.activity_style || content.activityStyle || "simple",
    slug: row.slug,
  };
}

async function loadFromDatabase() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("preset_activities")
    .select(
      "slug, title, summary, theme, estimated_minutes, activity_style, full_content, is_active"
    )
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to load preset_activities: ${error.message}`);
  }

  return (data || []).map(presetRowToActivity);
}

function loadFromJson() {
  const filePath = path.join(
    __dirname,
    "generated",
    "expanded-presets.json"
  );
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Array.isArray(payload.activities) ? payload.activities : [];
}

async function main() {
  const fromJson = process.argv.includes("--from-json");
  const activities = fromJson
    ? loadFromJson()
    : await loadFromDatabase();

  console.log(
    `Importing ${activities.length} presets (source=${fromJson ? "json" : "db"})…`
  );

  const result = await ingestPresetCandidates({
    activities,
    source: "preset-import",
  });

  console.log(
    JSON.stringify(
      {
        inserted: result.inserted,
        updated: result.updated,
        skipped: result.skipped,
        candidates: result.candidates.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
