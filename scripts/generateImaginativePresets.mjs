/**
 * One-off: generate 9 diverse imaginative preset activities via the same
 * OpenAI structured pipeline the app uses, then emit JSON + SQL fragments.
 *
 * Usage: node scripts/generateImaginativePresets.mjs
 * Requires OPENAI_API_KEY in server/.env or the environment.
 *
 * After a successful run, refresh SQL with:
 *   node scripts/emitPresetSql.mjs
 *   node scripts/splicePresetMigration.mjs
 *   node scripts/verifyPresetSeeds.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import {
  createOpenAIClient,
  createStructuredResponse,
} from "../server/lib/openaiClient.js";
import {
  buildActivitySuggestionsInput,
  buildActivitySuggestionsInstructions,
} from "../server/prompts/activitySuggestions.js";
import { activitySuggestionsSchema } from "../server/schemas/activitySuggestionsSchema.js";
import {
  buildSafeCurrentMoment,
  buildSafeSafetySettings,
  normalizeActivity,
} from "../server/utils/normalizeRequest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

dotenv.config({ path: path.join(rootDir, "server", ".env") });
dotenv.config({ path: path.join(rootDir, ".env") });

const OUT_DIR = path.join(__dirname, "generated");
const JSON_OUT = path.join(OUT_DIR, "imaginative-presets.json");
const SQL_OUT = path.join(OUT_DIR, "imaginative-presets.sql");

const THEME_LANES = [
  {
    id: "undersea",
    lane: "Undersea exploration",
    playMode: "movement-with-story",
    energyHint: "medium",
    moment: {
      parentActivity: "On a work call",
      availability: "do-not-interrupt",
      timeNeededMinutes: 25,
      space: "Living room",
      messLevel: "low",
      noiseLevel: "quiet",
      supervisionLevel: "independent",
    },
    inventory: [
      { name: "blankets", category: "Household-safe items" },
      { name: "pillows", category: "Household-safe items" },
      { name: "stuffed animals", category: "Pretend play" },
      { name: "paper", category: "Art supplies" },
      { name: "crayons", category: "Art supplies" },
    ],
  },
  {
    id: "bakery",
    lane: "Bakery / restaurant service",
    playMode: "restaurant/shop",
    energyHint: "low",
    moment: {
      parentActivity: "Cooking dinner",
      availability: "helper-welcome",
      timeNeededMinutes: 25,
      space: "Kitchen table",
      messLevel: "low",
      noiseLevel: "normal",
      supervisionLevel: "nearby",
    },
    inventory: [
      { name: "Play-Doh", category: "Art supplies" },
      { name: "toy dishes", category: "Pretend play" },
      { name: "paper", category: "Art supplies" },
      { name: "markers", category: "Art supplies" },
      { name: "apron or towel", category: "Household-safe items" },
    ],
  },
  {
    id: "detective",
    lane: "Detective mystery using ordinary household objects as clues",
    playMode: "mystery/investigation",
    energyHint: "low",
    moment: {
      parentActivity: "Paying bills",
      availability: "ask-first",
      timeNeededMinutes: 25,
      space: "Living room",
      messLevel: "low",
      noiseLevel: "quiet",
      supervisionLevel: "mostly-independent",
    },
    inventory: [
      { name: "paper", category: "Art supplies" },
      { name: "pencil", category: "Art supplies" },
      { name: "flashlight or phone light", category: "Household-safe items" },
      { name: "magnifying glass or empty toilet paper tube", category: "Household-safe items" },
      { name: "three safe household objects", category: "Household-safe items" },
    ],
  },
  {
    id: "construction",
    lane: "Construction / city planner",
    playMode: "build",
    energyHint: "medium",
    moment: {
      parentActivity: "Cleaning the house",
      availability: "helper-welcome",
      timeNeededMinutes: 30,
      space: "Living room",
      messLevel: "low",
      noiseLevel: "normal",
      supervisionLevel: "nearby",
    },
    inventory: [
      { name: "wooden blocks", category: "Building toys" },
      { name: "magnet tiles", category: "Building toys" },
      { name: "toy cars", category: "Pretend play" },
      { name: "paper", category: "Art supplies" },
      { name: "crayon", category: "Art supplies" },
    ],
  },
  {
    id: "vet",
    lane: "Veterinary / pet care clinic for stuffed animals",
    playMode: "care/nurture",
    energyHint: "low",
    moment: {
      parentActivity: "Resting",
      availability: "do-not-interrupt",
      timeNeededMinutes: 30,
      space: "Bedroom",
      messLevel: "low",
      noiseLevel: "quiet",
      supervisionLevel: "independent",
    },
    inventory: [
      { name: "stuffed animals", category: "Pretend play" },
      { name: "blanket", category: "Household-safe items" },
      { name: "paper", category: "Art supplies" },
      { name: "crayons", category: "Art supplies" },
      { name: "bandaids or stickers", category: "Household-safe items" },
    ],
  },
  {
    id: "museum",
    lane: "Time-travel museum scavenger hunt for lost exhibits",
    playMode: "hunt",
    energyHint: "medium",
    moment: {
      parentActivity: "Handling errands",
      availability: "ask-first",
      timeNeededMinutes: 25,
      space: "Living room",
      messLevel: "low",
      noiseLevel: "normal",
      supervisionLevel: "mostly-independent",
    },
    inventory: [
      { name: "three safe household objects", category: "Household-safe items" },
      { name: "paper", category: "Art supplies" },
      { name: "markers", category: "Art supplies" },
      { name: "books", category: "Books" },
      { name: "chair or table", category: "Household-safe items" },
    ],
  },
  {
    id: "weather",
    lane: "Weather / nature magic lab",
    playMode: "craft-story",
    energyHint: "low",
    moment: {
      parentActivity: "Helping someone else",
      availability: "ask-first",
      timeNeededMinutes: 25,
      space: "Kitchen table",
      messLevel: "low",
      noiseLevel: "quiet",
      supervisionLevel: "mostly-independent",
    },
    inventory: [
      { name: "paper", category: "Art supplies" },
      { name: "crayons", category: "Art supplies" },
      { name: "markers", category: "Art supplies" },
      { name: "cotton balls or tissues", category: "Household-safe items" },
    ],
  },
  {
    id: "circus",
    lane: "Circus / stage performance",
    playMode: "performance/show",
    energyHint: "high",
    moment: {
      parentActivity: "Doing yard work",
      availability: "helper-welcome",
      timeNeededMinutes: 25,
      space: "Living room",
      messLevel: "low",
      noiseLevel: "normal",
      supervisionLevel: "nearby",
    },
    inventory: [
      { name: "blankets", category: "Household-safe items" },
      { name: "pillows", category: "Household-safe items" },
      { name: "dress-up clothes or scarf", category: "Pretend play" },
      { name: "paper", category: "Art supplies" },
      { name: "markers", category: "Art supplies" },
    ],
  },
  {
    id: "courier",
    lane: "Delivery / courier route with an indoor map",
    playMode: "map/navigation",
    energyHint: "medium",
    moment: {
      parentActivity: "Cleaning the house",
      availability: "ask-first",
      timeNeededMinutes: 25,
      space: "Living room",
      messLevel: "low",
      noiseLevel: "normal",
      supervisionLevel: "mostly-independent",
    },
    inventory: [
      { name: "paper", category: "Art supplies" },
      { name: "crayon or pencil", category: "Art supplies" },
      { name: "small box or bag", category: "Household-safe items" },
      { name: "three small safe objects as packages", category: "Household-safe items" },
    ],
  },
];

const GLOBAL_AVOID =
  "Do NOT use space, moon, pirates, dragons, hospitals for humans, secret agents, or kingdom rescue themes.";

function slugify(title) {
  return String(title || "activity")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function escapeSqlString(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function formatJsonbDollar(obj) {
  // Prefer $$ quoting; if content contains $$, fall back to escaped string.
  const pretty = JSON.stringify(obj, null, 2);
  if (pretty.includes("$$")) {
    return `'${pretty.replace(/'/g, "''")}'::jsonb`;
  }
  return `$$\n${pretty}\n$$::jsonb`;
}

function pickBestActivity(activities, lane) {
  const scored = activities.map((activity) => {
    let score = 0;
    const theme = String(activity.theme || "").toLowerCase();
    const title = String(activity.title || "").toLowerCase();
    const mission = String(activity.mission || "").toLowerCase();
    const blob = `${theme} ${title} ${mission}`;

    if (activity.kidRole) score += 2;
    if (activity.mission) score += 2;
    if ((activity.starterPrompts || []).length >= 2) score += 2;
    if ((activity.steps || []).length >= 3) score += 2;
    if ((activity.firstMoves || []).length >= 2) score += 1;

    const laneWords = lane.lane.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
    laneWords.forEach((word) => {
      if (blob.includes(word)) score += 3;
    });

    // Penalize crowded default tropes
    ["space", "moon", "pirate", "dragon", "hospital", "kingdom", "secret agent"].forEach(
      (bad) => {
        if (blob.includes(bad)) score -= 8;
      }
    );

    if (lane.energyHint && activity.energy === lane.energyHint) score += 1;

    return { activity, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.activity || activities[0];
}

function buildFeedback({ lane, previousTitles, themesUsed, attempt }) {
  const avoidTitles =
    previousTitles.length > 0
      ? `Already chosen titles to avoid: ${previousTitles.join("; ")}.`
      : "No previous titles yet.";
  const avoidThemes =
    themesUsed.length > 0
      ? `Themes already used (do not reuse these settings or play modes): ${themesUsed.join("; ")}.`
      : "No previous themes yet.";

  const retryExtra =
    attempt > 1
      ? ` Previous attempt was too similar to another activity. Make this one unmistakably about "${lane.lane}" with play mode "${lane.playMode}". Use a completely different title, role, and mission.`
      : "";

  return [
    `LIBRARY SEED REQUEST: Invent imaginative activities in this theme lane ONLY: "${lane.lane}".`,
    `Primary play mode must be: ${lane.playMode}.`,
    `Prefer energy around: ${lane.energyHint}.`,
    GLOBAL_AVOID,
    avoidTitles,
    avoidThemes,
    "Return three varied options inside this same lane; each must still feel like a full kid-facing quest.",
    "Setup must stay easy with ordinary household items already listed in inventory.",
    retryExtra,
  ]
    .filter(Boolean)
    .join(" ");
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

function toSqlTuple(activity, displayOrder) {
  const slug = slugify(activity.title);
  const fullContent = toFullContent(activity);
  const minutes = Number(activity.estimatedMinutes) || 25;

  return `(
  '${escapeSqlString(slug)}',
  '${escapeSqlString(activity.title)}',
  '${escapeSqlString(activity.summary || "")}',
  '${escapeSqlString(activity.theme || "")}',
  ${minutes},
  'imaginative',
  ${formatJsonbDollar(fullContent)},
  true,
  ${displayOrder}
)`;
}

function diversityIssues(selected) {
  const issues = [];
  const themes = selected.map((a) => String(a.theme || "").toLowerCase());
  const titles = selected.map((a) => String(a.title || "").toLowerCase());
  const missions = selected.map((a) => String(a.mission || "").toLowerCase());

  for (let i = 0; i < selected.length; i += 1) {
    for (let j = i + 1; j < selected.length; j += 1) {
      const sharedThemeWords = themes[i]
        .split(/[^a-z]+/)
        .filter((w) => w.length > 4 && themes[j].includes(w));
      if (sharedThemeWords.length >= 2) {
        issues.push(
          `Themes too similar: "${selected[i].title}" vs "${selected[j].title}" (${sharedThemeWords.join(", ")})`
        );
      }
      if (titles[i] && titles[i] === titles[j]) {
        issues.push(`Duplicate title: ${selected[i].title}`);
      }
      const missionOverlap = missions[i]
        .split(/[^a-z]+/)
        .filter((w) => w.length > 5 && missions[j].includes(w));
      if (missionOverlap.length >= 4) {
        issues.push(
          `Missions too similar: "${selected[i].title}" vs "${selected[j].title}"`
        );
      }
    }
  }

  const energies = selected.map((a) => a.energy);
  const low = energies.filter((e) => e === "low").length;
  const medium = energies.filter((e) => e === "medium").length;
  const high = energies.filter((e) => e === "high").length;
  if (low < 2) issues.push(`Energy mix weak: only ${low} low (want >= 2)`);
  if (medium < 2) issues.push(`Energy mix weak: only ${medium} medium (want >= 2)`);
  if (high < 1) issues.push(`Energy mix weak: only ${high} high (want >= 1)`);

  return issues;
}

async function generateForLane(client, lane, previousTitles, themesUsed, attempt = 1) {
  const safeActivityStyle = "imaginative";
  const safeCurrentMoment = buildSafeCurrentMoment({
    currentMoment: lane.moment,
  });
  const safeSafetySettings = buildSafeSafetySettings(safeCurrentMoment, {
    screenFreeOnly: true,
    noFoodActivities: false,
    noWaterPlay: true,
    noSmallObjects: true,
  });

  const instructions = buildActivitySuggestionsInstructions(safeActivityStyle);
  const input = buildActivitySuggestionsInput({
    safeCurrentMoment,
    kidMood: `I want a pretend ${lane.lane.toLowerCase()} adventure`,
    locationPreference: safeCurrentMoment.space,
    childAgeRange: "5-8",
    activeChildProfile: {
      name: "Alex",
      interests: lane.lane,
      needs: "Independent play, clear steps, imaginative",
    },
    safeActivityStyle,
    activityMode: "single-child",
    safeSelectedChildProfiles: [],
    inventory: lane.inventory,
    safeFeedbackContext: buildFeedback({
      lane,
      previousTitles,
      themesUsed,
      attempt,
    }),
    safePreviousActivityTitles: previousTitles,
    safeSafetySettings,
  });

  const rawText = await createStructuredResponse(client, {
    instructions,
    input,
    schemaName: "activity_suggestions",
    schema: activitySuggestionsSchema,
  });

  const parsed = JSON.parse(rawText);
  const rawActivities = Array.isArray(parsed.activities) ? parsed.activities : [];
  const normalized = rawActivities.map((activity) =>
    normalizeActivity(activity, safeActivityStyle)
  );

  if (normalized.length === 0) {
    throw new Error(`No activities returned for lane ${lane.id}`);
  }

  return {
    all: normalized,
    best: pickBestActivity(normalized, lane),
  };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set. Add it to server/.env or the environment.");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const client = createOpenAIClient();
  const selected = [];
  const previousTitles = [];
  const themesUsed = [];
  const rawByLane = {};

  for (const lane of THEME_LANES) {
    console.log(`Generating lane: ${lane.id} (${lane.lane})...`);
    let result = await generateForLane(client, lane, previousTitles, themesUsed, 1);

    // One retry if the pick looks empty on role/mission
    if (!result.best.kidRole || !result.best.mission) {
      console.log(`  Retrying ${lane.id} (missing role/mission)...`);
      result = await generateForLane(client, lane, previousTitles, themesUsed, 2);
    }

    rawByLane[lane.id] = result.all;
    const activity = {
      ...result.best,
      _laneId: lane.id,
      _playMode: lane.playMode,
      slug: slugify(result.best.title),
    };

    selected.push(activity);
    previousTitles.push(activity.title);
    themesUsed.push(activity.theme || lane.lane);
    console.log(`  Picked: ${activity.title}`);
  }

  let issues = diversityIssues(selected);
  if (issues.length > 0) {
    console.warn("Diversity issues detected:");
    issues.forEach((issue) => console.warn(`  - ${issue}`));

    // Retry the last conflicting lane once with stronger avoid list
    for (let pass = 0; pass < 2 && issues.length > 0; pass += 1) {
      const last = selected[selected.length - 1];
      const lane = THEME_LANES.find((l) => l.id === last._laneId);

      if (!lane) {
        console.warn(
          `Skipping diversity retry: no THEME_LANES entry for "${last?._laneId}".`
        );
        break;
      }

      console.log(`Regenerating ${lane.id} for diversity (pass ${pass + 1})...`);
      // themesUsed stores `activity.theme || lane.lane`, so drop by that value
      // (or by index) — filtering only `last.theme` misses empty themes.
      const lastThemeUsed = last.theme || lane.lane;
      const result = await generateForLane(
        client,
        lane,
        previousTitles.filter((t) => t !== last.title),
        themesUsed.filter((t) => t !== lastThemeUsed),
        pass + 2
      );
      const replacement = {
        ...result.best,
        _laneId: lane.id,
        _playMode: lane.playMode,
        slug: slugify(result.best.title),
      };
      selected[selected.length - 1] = replacement;
      previousTitles[previousTitles.length - 1] = replacement.title;
      themesUsed[themesUsed.length - 1] = replacement.theme || lane.lane;
      issues = diversityIssues(selected);
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    activities: selected,
    rawByLane,
    diversityIssues: issues,
  };

  fs.writeFileSync(JSON_OUT, JSON.stringify(payload, null, 2), "utf8");

  const tuples = selected.map((activity, index) =>
    toSqlTuple(activity, 101 + index)
  );
  const sql = tuples.join(",\n");
  fs.writeFileSync(SQL_OUT, sql, "utf8");

  console.log(`\nWrote ${JSON_OUT}`);
  console.log(`Wrote ${SQL_OUT}`);
  if (issues.length > 0) {
    console.warn("\nRemaining diversity warnings (review before seeding):");
    issues.forEach((issue) => console.warn(`  - ${issue}`));
  } else {
    console.log("\nDiversity checklist passed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
