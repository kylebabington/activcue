#!/usr/bin/env node
/**
 * Report-only age-fit audit for presets and shared library candidates.
 * Does not write production changes.
 *
 * Usage:
 *   node scripts/auditActivityAgeFit.mjs
 *   node scripts/auditActivityAgeFit.mjs --source=presets
 *   node scripts/auditActivityAgeFit.mjs --source=shared
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  getExpectedMaturityLevel,
  getPolicyAgeBand,
  validateDevelopmentalComplexity,
} from "../server/utils/activityAgePolicy.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadExpandedPresets() {
  const file = path.join(root, "scripts/generated/expanded-presets.json");
  if (!fs.existsSync(file)) {
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(raw) ? raw : Array.isArray(raw.activities) ? raw.activities : [];
}

function suggestRange(activity) {
  const ageFit = activity?.ageFit || {};
  const minAge = Number(ageFit.minAge);
  const maxAge = Number(ageFit.maxAge);
  const span = Number.isFinite(minAge) && Number.isFinite(maxAge) ? maxAge - minAge : null;
  const maturity = String(ageFit.maturityLevel || "");
  const text = [
    activity?.title,
    activity?.summary,
    activity?.theme,
    ...(Array.isArray(activity?.stepDetails)
      ? activity.stepDetails.map((s) => s?.instruction)
      : []),
  ]
    .filter(Boolean)
    .join(" ");

  const problems = [];
  if (span != null && span >= 5) {
    problems.push("age-span-gte-5");
  }
  if (maturity === "mixed-age") {
    problems.push("mixed-age-activity");
  }
  if (
    Number.isFinite(maxAge) &&
    maxAge >= 13 &&
    /\b(stuffed animal|fairy|fort|tea party|princess)\b/i.test(text)
  ) {
    problems.push("young-framing-teen-inclusive");
  }

  const mid = Number.isFinite(minAge) && Number.isFinite(maxAge)
    ? Math.round((minAge + maxAge) / 2)
    : 7;
  const suggestedMaturity = getExpectedMaturityLevel(mid, "single-child", [mid]);
  let suggestedMin = Number.isFinite(minAge) ? minAge : 5;
  let suggestedMax = Number.isFinite(maxAge) ? maxAge : 9;
  if (span != null && span >= 5) {
    suggestedMax = suggestedMin + 3;
  }

  const complexity = validateDevelopmentalComplexity(activity, [
    Number.isFinite(minAge) ? minAge : 6,
  ]);
  if (!complexity.ok) {
    problems.push("complex-for-young-end");
  }

  const targetAges = Array.isArray(ageFit.targetAges) ? ageFit.targetAges : [];
  const suggestedTargets = [];
  for (let age = suggestedMin; age <= suggestedMax; age += 1) {
    suggestedTargets.push(age);
  }

  return {
    title: activity?.title || "(untitled)",
    slug: activity?.slug || "",
    currentMin: minAge,
    currentMax: maxAge,
    currentTargetAges: targetAges,
    currentMaturity: maturity,
    suggestedMin,
    suggestedMax,
    suggestedTargetAges: suggestedTargets,
    suggestedMaturity,
    bandAtMid: getPolicyAgeBand(mid),
    problems,
  };
}

function printReport(rows, label) {
  console.log(`\n=== Age fit audit: ${label} (${rows.length} activities) ===\n`);
  const flagged = rows.filter((row) => row.problems.length > 0);
  console.log(`Flagged: ${flagged.length}`);
  for (const row of flagged.slice(0, 80)) {
    console.log(
      [
        `- ${row.title}`,
        `  current: ${row.currentMin}-${row.currentMax} targets=${JSON.stringify(row.currentTargetAges)} maturity=${row.currentMaturity}`,
        `  suggested: ${row.suggestedMin}-${row.suggestedMax} targets=${JSON.stringify(row.suggestedTargetAges)} maturity=${row.suggestedMaturity}`,
        `  problems: ${row.problems.join(", ")}`,
      ].join("\n")
    );
  }
  if (flagged.length > 80) {
    console.log(`… and ${flagged.length - 80} more`);
  }
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--source="));
  const source = arg ? arg.split("=")[1] : "presets";

  if (source === "presets" || source === "all") {
    const presets = loadExpandedPresets();
    const rows = presets.map(suggestRange);
    printReport(rows, "expanded presets");
    const out = path.join(root, "scripts/generated/age-fit-audit-presets.json");
    fs.writeFileSync(out, JSON.stringify(rows, null, 2));
    console.log(`\nWrote ${out}`);
  }

  if (source === "shared" || source === "all") {
    console.log(
      "\nShared-library audit requires DB access. Export candidates to JSON and re-run, or use Supabase MCP.\nClassifications: Validated | Needs review | Clearly wrong | Legacy/no age metadata.\nFor clearly wrong rows: set is_active = false until upgraded."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
