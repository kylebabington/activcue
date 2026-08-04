/**
 * Validate expanded preset JSON coverage (ageFit, traits, matrix breadth).
 * Usage: node scripts/verifyExpandedPresets.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const expandedPath = path.join(
  __dirname,
  "generated",
  "expanded-presets.json"
);

const payload = JSON.parse(fs.readFileSync(expandedPath, "utf8"));
const activities = payload.activities || [];
const errors = [];

if (activities.length < 75) {
  errors.push(`Expected >= 75 activities, got ${activities.length}`);
}

const slugs = new Set();
for (const activity of activities) {
  if (!activity.slug) {
    errors.push(`Missing slug for ${activity.title}`);
    continue;
  }
  if (slugs.has(activity.slug)) {
    errors.push(`Duplicate slug: ${activity.slug}`);
  }
  slugs.add(activity.slug);

  if (!activity.ageFit?.minAge || !activity.ageFit?.maxAge) {
    errors.push(`${activity.slug}: missing ageFit min/max`);
  }
  if (!Array.isArray(activity.categories) || activity.categories.length === 0) {
    errors.push(`${activity.slug}: missing categories`);
  }
  if (!activity.traits || typeof activity.traits !== "object") {
    errors.push(`${activity.slug}: missing traits`);
  } else if (
    activity.traits.structure &&
    !["guided", "open-ended"].includes(activity.traits.structure)
  ) {
    errors.push(
      `${activity.slug}: invalid traits.structure ${activity.traits.structure}`
    );
  }
}

const agesCovered = { young: 0, mid: 0, tween: 0, teen: 0 };
for (const activity of activities) {
  const min = Number(activity.ageFit?.minAge);
  const max = Number(activity.ageFit?.maxAge);
  if (min <= 6 && max >= 6) agesCovered.young += 1;
  if (min <= 9 && max >= 8) agesCovered.mid += 1;
  if (min <= 12 && max >= 10) agesCovered.tween += 1;
  if (max >= 13) agesCovered.teen += 1;
}

for (const [band, count] of Object.entries(agesCovered)) {
  if (count < 5) {
    errors.push(`Age band ${band} has only ${count} eligible activities`);
  }
}

const energies = { low: 0, calm: 0, medium: 0, high: 0 };
for (const activity of activities) {
  const key = String(activity.energy || "").toLowerCase();
  if (key in energies) energies[key] += 1;
}

if ((energies.low || 0) + (energies.calm || 0) < 10) {
  errors.push("Need more low/calm energy activities for work-call/bedtime");
}
if ((energies.high || 0) < 5) {
  errors.push("Need more high-energy activities for burn-energy moments");
}

if (errors.length) {
  console.error("verifyExpandedPresets failed:\n" + errors.join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      total: activities.length,
      uniqueSlugs: slugs.size,
      agesCovered,
      energies,
    },
    null,
    2
  )
);
