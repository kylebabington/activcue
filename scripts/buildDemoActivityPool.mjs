/**
 * Rebuild src/constants/demoActivityPool.js from expanded presets.
 *
 * Usage: node scripts/buildDemoActivityPool.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPANDED_PATH = path.join(__dirname, "generated", "expanded-presets.json");
const OUT_PATH = path.join(
  __dirname,
  "..",
  "src",
  "constants",
  "demoActivityPool.js"
);

const TARGET = 55;
const ageBands = [
  { min: 3, max: 5 },
  { min: 6, max: 8 },
  { min: 9, max: 11 },
  { min: 12, max: 14 },
  { min: 15, max: 17 },
];

function covers(activity, band) {
  const min = activity.ageFit?.minAge ?? 0;
  const max = activity.ageFit?.maxAge ?? 99;
  return min <= band.max && max >= band.min;
}

function pickFields(activity) {
  const out = {
    id: activity.slug,
    slug: activity.slug,
    title: activity.title,
    summary: activity.summary,
    estimatedMinutes: activity.estimatedMinutes,
    steps: activity.steps,
    uses: activity.uses,
    energy: activity.energy,
    mess: activity.mess,
    adultHelp: activity.adultHelp,
    whyItFits: activity.whyItFits,
    activityStyle: activity.activityStyle,
    categories: activity.categories,
    traits: activity.traits,
    ageFit: activity.ageFit,
  };

  for (const key of [
    "role",
    "mission",
    "starters",
    "materials",
    "ifStuck",
    "doneWhen",
    "visualTheme",
    "fullContent",
  ]) {
    if (activity[key] != null) {
      out[key] = activity[key];
    }
  }

  return out;
}

const expanded = JSON.parse(fs.readFileSync(EXPANDED_PATH, "utf8"));
const acts = expanded.activities || expanded;
const selected = [];
const used = new Set();

function take(predicate, limit) {
  let n = 0;
  for (const activity of acts) {
    if (n >= limit) break;
    if (used.has(activity.slug)) continue;
    if (!predicate(activity)) continue;
    used.add(activity.slug);
    selected.push(activity);
    n += 1;
  }
}

for (const band of ageBands) {
  take(
    (activity) =>
      activity.activityStyle === "simple" && covers(activity, band),
    3
  );
  take(
    (activity) =>
      activity.activityStyle === "imaginative" && covers(activity, band),
    5
  );
}

take((activity) => activity.activityStyle === "imaginative", TARGET);
take(() => true, TARGET - selected.length);

const out = selected.slice(0, TARGET).map(pickFields);
const file =
  "// Auto-curated subset of expanded presets for client-side landing/demo matching.\n" +
  "// Rebuild with: node scripts/buildDemoActivityPool.mjs\n\n" +
  `export const DEMO_ACTIVITY_POOL = Object.freeze(${JSON.stringify(out, null, 2)});\n`;

fs.writeFileSync(OUT_PATH, file);

const simple = out.filter((a) => a.activityStyle === "simple").length;
const imag = out.filter((a) => a.activityStyle === "imaginative").length;
console.log(`Wrote ${out.length} demo activities (${simple} simple, ${imag} imaginative)`);
