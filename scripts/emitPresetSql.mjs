/**
 * Convert scripts/generated/*-presets.json into SQL value tuples.
 * Usage: node scripts/emitPresetSql.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "generated");

function formatJsonbDollar(obj) {
  const pretty = JSON.stringify(obj, null, 2);
  return `$$\n  ${pretty.replace(/\n/g, "\n  ")}\n  $$::jsonb`;
}

function escapeSql(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function toFullContent(activity) {
  return {
    kidRole: activity.kidRole || "",
    mission: activity.mission || "",
    starterPrompts: activity.starterPrompts || [],
    firstMoves: activity.firstMoves || [],
    steps: activity.steps || [],
    roles: activity.roles || [],
    extensionIdeas: activity.extensionIdeas || [],
    uses: activity.uses || [],
    energy: activity.energy || "medium",
    mess: activity.mess || "low",
    adultHelp: activity.adultHelp || "optional",
    whyItFits: activity.whyItFits || "",
  };
}

function toTuple(activity, style, displayOrder) {
  const minutes = Number(activity.estimatedMinutes) || 20;
  return `(
  '${escapeSql(activity.slug)}',
  '${escapeSql(activity.title)}',
  '${escapeSql(activity.summary || "")}',
  '${escapeSql(activity.theme || "")}',
  ${minutes},
  '${style}',
  ${formatJsonbDollar(toFullContent(activity))},
  true,
  ${displayOrder}
)`;
}

const imaginative = JSON.parse(
  fs.readFileSync(path.join(OUT_DIR, "imaginative-presets.json"), "utf8")
);
const simple = JSON.parse(
  fs.readFileSync(path.join(OUT_DIR, "simple-presets.json"), "utf8")
).map((preset) => ({
  ...preset,
  kidRole: "",
  mission: "",
  starterPrompts: [],
  firstMoves: [preset.steps[0]],
  roles: [],
  extensionIdeas: [],
  theme: "",
}));

const simpleSql = simple
  .map((activity, index) => toTuple(activity, "simple", index + 1))
  .join(",\n");
const imaginativeSql = imaginative.activities
  .map((activity, index) => toTuple(activity, "imaginative", 101 + index))
  .join(",\n");

fs.writeFileSync(path.join(OUT_DIR, "simple-presets.sql"), simpleSql, "utf8");
fs.writeFileSync(
  path.join(OUT_DIR, "imaginative-presets.sql"),
  imaginativeSql,
  "utf8"
);
console.log("Wrote simple-presets.sql and imaginative-presets.sql");
