/**
 * Validate the canonical preset activity seed migration.
 *
 * Usage:
 *
 * node scripts/verifyPresetSeeds.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");

const migrationsDirectory = path.join(
  projectRoot,
  "supabase",
  "migrations"
);

const generatedDirectory = path.join(
  projectRoot,
  "scripts",
  "generated"
);

/**
 * Locate the newest generated preset seed migration.
 */
function findSeedMigration() {
  if (!fs.existsSync(migrationsDirectory)) {
    throw new Error(
      `Migrations directory does not exist: ${migrationsDirectory}`
    );
  }

  const matchingFiles = fs
    .readdirSync(migrationsDirectory)
    .filter((fileName) =>
      /^\d+_seed_preset_activities\.sql$/.test(fileName)
    )
    .sort();

  if (matchingFiles.length === 0) {
    throw new Error(
      [
        "No seed_preset_activities migration was found.",
        "",
        "Create and populate it first:",
        "",
        "npx supabase migration new seed_preset_activities",
        "node scripts/splicePresetMigration.mjs",
      ].join("\n")
    );
  }

  return path.join(
    migrationsDirectory,
    matchingFiles.at(-1)
  );
}

const seedMigrationPath = findSeedMigration();

const migration = fs.readFileSync(
  seedMigrationPath,
  "utf8"
);

const requiredFullContentFields = [
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

/** Optional V2 fields — if present, validate structure. */
function assertActivityFormatV2(content, label) {
  if (content.activityFormatVersion !== 2) {
    return;
  }
  if (!content.roleGuide || typeof content.roleGuide !== "object") {
    throw new Error(`${label}: activityFormatVersion 2 requires roleGuide`);
  }
  if (!Array.isArray(content.starterIdeas)) {
    throw new Error(`${label}: activityFormatVersion 2 requires starterIdeas[]`);
  }
  if (!Array.isArray(content.stepDetails) || content.stepDetails.length === 0) {
    throw new Error(`${label}: activityFormatVersion 2 requires stepDetails[]`);
  }
}

/**
 * Extract every JSON object surrounded by:
 *
 * $$ { ... } $$::jsonb
 */
const jsonbBlocks = [
  ...migration.matchAll(
    /\$\$\s*(\{[\s\S]*?\})\s*\$\$::jsonb/g
  ),
].map((match) => JSON.parse(match[1]));

/**
 * Extract activity metadata from each SQL value tuple.
 *
 * Capture groups:
 *
 * 1. slug
 * 2. title
 * 3. summary
 * 4. theme
 * 5. estimated minutes
 * 6. activity style
 */
const activityMatches = [
  ...migration.matchAll(
    /\(\s*'([a-z0-9-]+)',\s*'((?:[^']|'')+)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(\d+),\s*'(simple|imaginative)'/g
  ),
];

const simpleActivities = activityMatches.filter(
  (match) => match[6] === "simple"
);

const imaginativeActivities = activityMatches.filter(
  (match) => match[6] === "imaginative"
);

const errors = [];

if (simpleActivities.length !== 9) {
  errors.push(
    `Expected 9 simple activities, got ${simpleActivities.length}`
  );
}

if (imaginativeActivities.length !== 9) {
  errors.push(
    `Expected 9 imaginative activities, got ${imaginativeActivities.length}`
  );
}

if (jsonbBlocks.length !== 18) {
  errors.push(
    `Expected 18 full_content JSON blocks, got ${jsonbBlocks.length}`
  );
}

const slugs = activityMatches.map((match) => match[1]);
const uniqueSlugs = new Set(slugs);

if (uniqueSlugs.size !== 18) {
  errors.push(
    `Expected 18 unique slugs, got ${uniqueSlugs.size}`
  );
}

jsonbBlocks.forEach((block, index) => {
  requiredFullContentFields.forEach((field) => {
    if (!(field in block)) {
      errors.push(
        `Activity JSON block ${index + 1} is missing ${field}`
      );
    }
  });
  try {
    assertActivityFormatV2(block, `Activity JSON block ${index + 1}`);
  } catch (error) {
    errors.push(error.message);
  }
});

const simpleTemplatesPath = path.join(
  generatedDirectory,
  "simple-presets.json"
);

const simpleTemplates = JSON.parse(
  fs.readFileSync(simpleTemplatesPath, "utf8")
);

simpleTemplates.forEach((template) => {
  const matchingActivity = simpleActivities.find(
    (match) => match[2] === template.title
  );

  if (!matchingActivity) {
    errors.push(
      `Missing simple activity title: ${template.title}`
    );
  }
});

const imaginativePresetsPath = path.join(
  generatedDirectory,
  "imaginative-presets.json"
);

const imaginativeJson = JSON.parse(
  fs.readFileSync(imaginativePresetsPath, "utf8")
);

const playModes = new Set(
  imaginativeJson.activities.map(
    (activity) => activity._playMode
  )
);

const laneIds = new Set(
  imaginativeJson.activities.map(
    (activity) => activity._laneId
  )
);

if (playModes.size !== 9) {
  errors.push(
    `Expected 9 unique play modes, got ${playModes.size}`
  );
}

if (laneIds.size !== 9) {
  errors.push(
    `Expected 9 unique imaginative lanes, got ${laneIds.size}`
  );
}

imaginativeJson.activities.forEach((activity) => {
  if (!activity.kidRole) {
    errors.push(`${activity.title} is missing kidRole`);
  }

  if (!activity.mission) {
    errors.push(`${activity.title} is missing mission`);
  }

  if (!activity.starterPrompts?.length) {
    errors.push(
      `${activity.title} is missing starterPrompts`
    );
  }
});

const energies = imaginativeJson.activities.map(
  (activity) => activity.energy
);

const lowEnergyCount = energies.filter(
  (energy) => energy === "low"
).length;

const mediumEnergyCount = energies.filter(
  (energy) => energy === "medium"
).length;

const highEnergyCount = energies.filter(
  (energy) => energy === "high"
).length;

if (lowEnergyCount < 2) {
  errors.push(
    `Need at least 2 low-energy activities, got ${lowEnergyCount}`
  );
}

if (mediumEnergyCount < 2) {
  errors.push(
    `Need at least 2 medium-energy activities, got ${mediumEnergyCount}`
  );
}

if (highEnergyCount < 1) {
  errors.push(
    `Need at least 1 high-energy activity, got ${highEnergyCount}`
  );
}

if (errors.length > 0) {
  console.error("Preset verification FAILED:");

  errors.forEach((error) => {
    console.error(` - ${error}`);
  });

  process.exit(1);
}

const relativeMigrationPath = path
  .relative(projectRoot, seedMigrationPath)
  .replaceAll("\\", "/");

console.log("Preset verification passed:");
console.log(` - migration: ${relativeMigrationPath}`);
console.log(` - simple activities: ${simpleActivities.length}`);
console.log(
  ` - imaginative activities: ${imaginativeActivities.length}`
);
console.log(` - full_content blocks: ${jsonbBlocks.length}`);
console.log(` - unique slugs: ${uniqueSlugs.size}`);
console.log(
  ` - play modes: ${[...playModes].join(", ")}`
);
console.log(
  ` - energy mix: low=${lowEnergyCount}, medium=${mediumEnergyCount}, high=${highEnergyCount}`
);
