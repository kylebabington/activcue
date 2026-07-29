/**
 * Validate seeded presets against the activity suggestion field shape.
 * Usage: node scripts/verifyPresetSeeds.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migration = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "supabase",
    "migrations",
    "20260728_001_create_preset_activity_library.sql"
  ),
  "utf8"
);

const requiredFullContent = [
  "kidRole",
  "mission",
  "starterPrompts",
  "firstMoves",
  "steps",
  "roles",
  "extensionIdeas",
  "uses",
  "energy",
  "mess",
  "adultHelp",
  "whyItFits",
];

const jsonbBlocks = [...migration.matchAll(/\$\$\s*(\{[\s\S]*?\})\s*\$\$::jsonb/g)].map(
  (match) => JSON.parse(match[1])
);

const slugMatches = [
  ...migration.matchAll(/\(\s*'([a-z0-9-]+)',\s*'([^']+)',\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*'(simple|imaginative)'/g),
];

const simple = slugMatches.filter((m) => m[6] === "simple");
const imaginative = slugMatches.filter((m) => m[6] === "imaginative");

const errors = [];

if (simple.length !== 9) errors.push(`Expected 9 simple, got ${simple.length}`);
if (imaginative.length !== 9)
  errors.push(`Expected 9 imaginative, got ${imaginative.length}`);
if (jsonbBlocks.length !== 18)
  errors.push(`Expected 18 full_content blocks, got ${jsonbBlocks.length}`);

jsonbBlocks.forEach((block, index) => {
  requiredFullContent.forEach((key) => {
    if (!(key in block)) {
      errors.push(`Block ${index} missing ${key}`);
    }
  });
});

const simpleTemplates = JSON.parse(
  fs.readFileSync(path.join(__dirname, "generated", "simple-presets.json"), "utf8")
);
simpleTemplates.forEach((template) => {
  const found = simple.find((m) => m[2] === template.title);
  if (!found) errors.push(`Missing simple title from template: ${template.title}`);
});

const imaginativeJson = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "generated", "imaginative-presets.json"),
    "utf8"
  )
);
const playModes = new Set(
  imaginativeJson.activities.map((activity) => activity._playMode)
);
const laneIds = new Set(
  imaginativeJson.activities.map((activity) => activity._laneId)
);
if (playModes.size !== 9) {
  errors.push(`Expected 9 unique play modes, got ${playModes.size}`);
}
if (laneIds.size !== 9) {
  errors.push(`Expected 9 unique lanes, got ${laneIds.size}`);
}

imaginativeJson.activities.forEach((activity) => {
  if (!activity.kidRole) errors.push(`${activity.title} missing kidRole`);
  if (!activity.mission) errors.push(`${activity.title} missing mission`);
  if (!activity.starterPrompts?.length)
    errors.push(`${activity.title} missing starterPrompts`);
});

const energies = imaginativeJson.activities.map((a) => a.energy);
const low = energies.filter((e) => e === "low").length;
const medium = energies.filter((e) => e === "medium").length;
const high = energies.filter((e) => e === "high").length;
if (low < 2) errors.push(`Need >=2 low energy, got ${low}`);
if (medium < 2) errors.push(`Need >=2 medium energy, got ${medium}`);
if (high < 1) errors.push(`Need >=1 high energy, got ${high}`);

if (errors.length) {
  console.error("Verification FAILED:");
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

console.log("Verification passed:");
console.log(` - ${simple.length} simple presets`);
console.log(` - ${imaginative.length} imaginative presets`);
console.log(` - play modes: ${[...playModes].join(", ")}`);
console.log(` - energy mix: low=${low}, medium=${medium}, high=${high}`);
