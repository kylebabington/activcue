/**
 * One-off: regenerate museum lane as hunt + depersonalize bakery title.
 * Usage: node scripts/fixImaginativePresets.mjs
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, "server", ".env") });

const JSON_PATH = path.join(__dirname, "generated", "imaginative-presets.json");

function slugify(title) {
  return String(title || "activity")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function depersonalize(text) {
  return String(text || "")
    .replace(/Alex['’]s/g, "the child's")
    .replace(/\bAlex\b/g, "the child");
}

function scoreMuseum(activity) {
  const blob = [
    activity.theme,
    activity.title,
    activity.mission,
    ...(activity.steps || []),
  ]
    .join(" ")
    .toLowerCase();
  let score = 0;
  ["hunt", "find", "search", "scavenger", "lost", "hide", "exhibit"].forEach(
    (word) => {
      if (blob.includes(word)) score += 3;
    }
  );
  ["ticket", "desk", "bakery", "circus", "courier", "clinic"].forEach(
    (word) => {
      if (blob.includes(word)) score -= 5;
    }
  );
  if (activity.kidRole && activity.mission) score += 2;
  if ((activity.starterPrompts || []).length >= 2) score += 1;
  return score;
}

const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));

const bakery = data.activities.find((activity) => activity._laneId === "bakery");
if (bakery) {
  bakery.title = bakery.title
    .replace(/^Alex['’]s\s+/i, "")
    .replace(/^Alex\s+/i, "");
  if (!/bakery/i.test(bakery.title)) {
    bakery.title = "Tiny Bakery Counter";
  }
  bakery.slug = slugify(bakery.title);
  bakery.summary = depersonalize(bakery.summary).replace(
    /^the child are /i,
    "You are "
  );
  bakery.whyItFits = depersonalize(bakery.whyItFits);
  console.log("Bakery retitled to:", bakery.title);
}

const museumLane = {
  lane: "Time-travel museum scavenger hunt for lost exhibits",
  playMode: "hunt",
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
};

const previousTitles = data.activities
  .filter((activity) => activity._laneId !== "museum")
  .map((activity) => activity.title);

const client = createOpenAIClient();
const safeActivityStyle = "imaginative";
const safeCurrentMoment = buildSafeCurrentMoment({
  currentMoment: museumLane.moment,
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
  kidMood: "I want a pretend time-travel museum scavenger hunt",
  locationPreference: safeCurrentMoment.space,
  childAgeRange: "5-8",
  activeChildProfile: {
    name: "Kid",
    interests: museumLane.lane,
    needs: "Independent play",
  },
  safeActivityStyle,
  activityMode: "single-child",
  safeSelectedChildProfiles: [],
  inventory: museumLane.inventory,
  safeFeedbackContext: [
    `LIBRARY SEED REQUEST: Invent imaginative activities in this theme lane ONLY: "${museumLane.lane}".`,
    "Primary play mode MUST be a scavenger hunt for lost exhibits — not a ticket desk or quiet craft-only activity.",
    "Do NOT make a ticket desk, bakery, circus, courier, clinic, weather map, or city planner activity.",
    `Avoid these titles: ${previousTitles.join("; ")}.`,
    "Do NOT use space, moon, pirates, dragons, hospitals, or kingdom rescue themes.",
    "The child hides or finds three exhibits around the room and returns them to a museum shelf.",
  ].join(" "),
  safePreviousActivityTitles: previousTitles,
  safeSafetySettings,
});

console.log("Regenerating museum hunt lane...");
const rawText = await createStructuredResponse(client, {
  instructions,
  input,
  schemaName: "activity_suggestions",
  schema: activitySuggestionsSchema,
});

const parsed = JSON.parse(rawText);
const normalized = (Array.isArray(parsed.activities) ? parsed.activities : []).map(
  (activity) => normalizeActivity(activity, safeActivityStyle)
);

if (normalized.length === 0) {
  throw new Error("No museum activities returned");
}

normalized.sort((a, b) => scoreMuseum(b) - scoreMuseum(a));
const best = {
  ...normalized[0],
  _laneId: "museum",
  _playMode: "hunt",
  slug: slugify(normalized[0].title),
  whyItFits: depersonalize(normalized[0].whyItFits),
  summary: depersonalize(normalized[0].summary),
};

console.log("Museum candidates:");
normalized.forEach((activity) => {
  console.log(` - ${activity.title} (score ${scoreMuseum(activity)})`);
});
console.log("Picked:", best.title);

const museumIndex = data.activities.findIndex(
  (activity) => activity._laneId === "museum"
);
data.activities[museumIndex] = best;
data.rawByLane.museum = normalized;

for (const activity of data.activities) {
  activity.whyItFits = depersonalize(activity.whyItFits);
  activity.summary = depersonalize(activity.summary).replace(
    /^the child are /i,
    "You are "
  );
}

data.generatedAt = new Date().toISOString();
data.source = "openai-live";
data.diversityIssues = [];

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), "utf8");

const modes = new Set(data.activities.map((activity) => activity._playMode));
console.log("\nFinal set:");
data.activities.forEach((activity) => {
  console.log(
    `${activity._laneId} | ${activity._playMode} | ${activity.energy} | ${activity.title}`
  );
});
console.log(`Unique play modes: ${modes.size}`);
