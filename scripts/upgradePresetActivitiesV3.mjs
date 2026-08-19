#!/usr/bin/env node
/**
 * Upgrade preset activities to Activity Format V3 via a dedicated upgrade prompt.
 *
 * Usage:
 *   node scripts/upgradePresetActivitiesV3.mjs --dry-run
 *   node scripts/upgradePresetActivitiesV3.mjs --limit 3
 *   node scripts/upgradePresetActivitiesV3.mjs --input path/to/presets.json --output path/to/v3.json
 *
 * Does NOT write to Supabase automatically. Review generated output before production import.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import {
  createOpenAIClient,
  createStructuredResponse,
} from "../server/lib/openaiClient.js";
import { activitySuggestionsSchemaV3 } from "../server/schemas/activitySuggestionsSchemaV3.js";
import { validateActivityClarity } from "../server/utils/activityClarityValidation.js";
import { normalizeActivityV3 } from "../server/utils/normalizeActivityV3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

dotenv.config({ path: path.join(rootDir, "server", ".env") });
dotenv.config({ path: path.join(rootDir, ".env") });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const inputArg = args.indexOf("--input");
const outputArg = args.indexOf("--output");
const limitArg = args.indexOf("--limit");

const inputPath =
  inputArg >= 0 ? args[inputArg + 1] : "scripts/generated/preset-activities-source.json";
const outputPath =
  outputArg >= 0
    ? args[outputArg + 1]
    : "scripts/generated/preset-activities-v3.draft.json";
const limit =
  limitArg >= 0 ? Math.max(1, Number(args[limitArg + 1]) || 1) : null;

const UPGRADE_INSTRUCTIONS = `You upgrade legacy ActivCue activities to Activity Format V3.

SECTION OWNERSHIP (hard requirement):
- story: narrative WHY only — no setup, no step directions, no role repetition
- roleGuide: WHO the child is — 1–2 short sentences max
- setupGuide: EVERYTHING physical before Scene 1 — define invented locations (station, lab, checkpoint, etc.)
- starterIdeas: copyable examples, NOT open-ended questions; title and example must differ
- stepDetails.actions: ONLY in-scene actions; each starts with a concrete verb; 3–7 actions per imaginative scene
- finishGuide: ONE ending action + observable doneWhen; extensions only in finishGuide.extensions

Do NOT emit instruction, theme, mission, kidRole, steps, starterPrompts, firstMoves, roles, or extensionIdeas.
Set activityFormatVersion to 3.

Preserve the activity's intent, supplies, age fit, and visual theme. Improve clarity — do not invent elaborate setup the source did not imply.`;

const upgradeSchema = {
  type: "object",
  properties: {
    activity: activitySuggestionsSchemaV3.properties.activities.items,
  },
  required: ["activity"],
  additionalProperties: false,
};

async function upgradeOne(client, sourceActivity) {
  const input = JSON.stringify(sourceActivity, null, 2);
  const response = await createStructuredResponse(client, {
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    instructions: UPGRADE_INSTRUCTIONS,
    input: `Upgrade this activity to Activity Format V3:\n\n${input}`,
    schema: upgradeSchema,
    schemaName: "activity_v3_upgrade",
  });

  const upgraded = response?.activity;
  if (!upgraded) {
    throw new Error("Missing activity in upgrade response");
  }

  const style = sourceActivity.activityStyle || "imaginative";
  const ages = Array.isArray(sourceActivity?.ageFit?.targetAges)
    ? sourceActivity.ageFit.targetAges
    : [sourceActivity?.ageFit?.minAge || 8];
  const normalized = normalizeActivityV3(upgraded, style, ages);
      const validation = validateActivityClarity(normalized);

  return { normalized, validation };
}

async function main() {
  const raw = await fs.readFile(path.resolve(inputPath), "utf8");
  const presets = JSON.parse(raw);
  const list = Array.isArray(presets) ? presets : presets.activities || [];
  const slice = limit ? list.slice(0, limit) : list;

  console.log(
    dryRun
      ? `[dry-run] Would upgrade ${slice.length} of ${list.length} presets from ${inputPath}`
      : `Upgrading ${slice.length} of ${list.length} presets from ${inputPath}`
  );

  if (dryRun) {
    slice.forEach((activity, index) => {
      console.log(
        `  ${index + 1}. ${activity.title} (v${activity.activityFormatVersion || 1})`
      );
    });
    return;
  }

  const client = createOpenAIClient();
  const results = [];

  for (const [index, sourceActivity] of slice.entries()) {
    const label = sourceActivity.title || `preset-${index}`;
    process.stdout.write(`Upgrading ${index + 1}/${slice.length}: ${label}… `);

    try {
      const { normalized, validation } = await upgradeOne(client, sourceActivity);
      const status = validation.valid ? "valid" : "validation-failed";
      results.push({
        sourceTitle: sourceActivity.title,
        sourceFormatVersion: sourceActivity.activityFormatVersion || 1,
        status,
        errors: validation.errors,
        warnings: validation.warnings,
        activity: normalized,
      });
      console.log(status);
      if (!validation.valid) {
        console.warn("  errors:", validation.errors.join("; "));
      }
    } catch (error) {
      console.log("error");
      results.push({
        sourceTitle: sourceActivity.title,
        sourceFormatVersion: sourceActivity.activityFormatVersion || 1,
        status: "error",
        error: error.message,
        activity: null,
      });
    }
  }

  const validCount = results.filter((entry) => entry.status === "valid").length;
  const payload = {
    generatedAt: new Date().toISOString(),
    inputPath,
    upgradedCount: results.length,
    validCount,
    activities: results,
  };

  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await fs.writeFile(path.resolve(outputPath), JSON.stringify(payload, null, 2));
  console.log(`Wrote ${results.length} results (${validCount} valid) to ${outputPath}`);
  console.log(
    "Review the draft JSON before updating preset_activities.full_content or shared_activity_candidates."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
