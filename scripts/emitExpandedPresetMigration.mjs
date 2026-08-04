/**
 * Emit a SQL migration from scripts/generated/expanded-presets.json.
 *
 * - Existing 18 slugs: UPDATE full_content with ageFit/categories/traits merge
 * - New slugs: INSERT ... ON CONFLICT (slug) DO UPDATE
 *
 * Usage: node scripts/emitExpandedPresetMigration.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const expandedPath = path.join(__dirname, "generated", "expanded-presets.json");
const migrationName = "20260804000000_expand_preset_activities_with_agefit.sql";
const migrationPath = path.join(projectRoot, "supabase", "migrations", migrationName);

/** Original seed slugs (9 simple + 9 imaginative). */
const EXISTING_SLUGS = new Set([
  "draw-a-picture",
  "color-a-page",
  "build-a-tower",
  "do-a-puzzle",
  "make-a-reading-nook",
  "play-a-simple-card-game",
  "build-a-cozy-fort",
  "make-play-doh-shapes",
  "ball-play-outside",
  "the-lost-shell-signal",
  "tiny-bakery-counter",
  "the-quiet-clue-room",
  "downtown-map-maker",
  "stuffed-pet-clinic",
  "museum-of-lost-exhibits",
  "nature-magic-weather-map",
  "living-room-circus-show",
  "hallway-map-courier",
]);

function escapeSql(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function formatJsonbDollar(obj) {
  const pretty = JSON.stringify(obj, null, 2);
  if (pretty.includes("$$")) {
    return `'${pretty.replace(/'/g, "''")}'::jsonb`;
  }
  return `$$\n  ${pretty.replace(/\n/g, "\n  ")}\n  $$::jsonb`;
}

/**
 * Mirrors emitPresetSql.toFullContent, plus ageFit/categories/traits and
 * optional imaginative V2 fields when present.
 */
function toFullContent(activity) {
  const content = {
    kidRole: activity.kidRole || "",
    mission: activity.mission || "",
    starterPrompts: activity.starterPrompts || [],
    firstMoves:
      activity.firstMoves ||
      (Array.isArray(activity.steps) && activity.steps[0]
        ? [activity.steps[0]]
        : []),
    steps: activity.steps || [],
    roles: activity.roles || [],
    extensionIdeas: activity.extensionIdeas || [],
    uses: activity.uses || [],
    energy: activity.energy || "medium",
    mess: activity.mess || "low",
    adultHelp: activity.adultHelp || "optional",
    whyItFits: activity.whyItFits || "",
  };

  if (activity.ageFit && typeof activity.ageFit === "object") {
    content.ageFit = activity.ageFit;
  }
  if (Array.isArray(activity.categories)) {
    content.categories = activity.categories;
  }
  if (activity.traits && typeof activity.traits === "object") {
    content.traits = activity.traits;
  }

  if (activity.activityStyle === "imaginative" || activity.visualTheme) {
    if (activity.visualTheme) content.visualTheme = activity.visualTheme;
  }

  if (activity.activityFormatVersion === 2) {
    content.activityFormatVersion = 2;
    if (activity.roleGuide) content.roleGuide = activity.roleGuide;
    if (Array.isArray(activity.starterIdeas)) {
      content.starterIdeas = activity.starterIdeas;
    }
    if (Array.isArray(activity.stepDetails)) {
      content.stepDetails = activity.stepDetails;
    }
  }

  return content;
}

/** Patch object for existing rows: only ageFit / categories / traits. */
function toEnrichmentPatch(activity) {
  const patch = {};
  if (activity.ageFit) patch.ageFit = activity.ageFit;
  if (Array.isArray(activity.categories)) patch.categories = activity.categories;
  if (activity.traits) patch.traits = activity.traits;
  if (activity.visualTheme) patch.visualTheme = activity.visualTheme;
  return patch;
}

function emitExistingUpdate(activity) {
  const patch = toEnrichmentPatch(activity);
  return `update public.preset_activities
set
  full_content = full_content || ${formatJsonbDollar(patch)},
  updated_at = now()
where slug = '${escapeSql(activity.slug)}';`;
}

function emitInsert(activity, displayOrder) {
  const style = activity.activityStyle === "imaginative" ? "imaginative" : "simple";
  const minutes = Number(activity.estimatedMinutes) || 20;
  const theme =
    style === "imaginative" ? activity.theme || "" : activity.theme || "";

  return `insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  '${escapeSql(activity.slug)}',
  '${escapeSql(activity.title)}',
  '${escapeSql(activity.summary || "")}',
  '${escapeSql(theme)}',
  ${minutes},
  '${style}',
  ${formatJsonbDollar(toFullContent(activity))},
  true,
  ${displayOrder}
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();`;
}

function main() {
  if (!fs.existsSync(expandedPath)) {
    throw new Error(
      `Missing ${expandedPath}. Run: node scripts/buildExpandedPresets.mjs`
    );
  }

  const data = JSON.parse(fs.readFileSync(expandedPath, "utf8"));
  const activities = data.activities || [];
  if (activities.length === 0) {
    throw new Error("expanded-presets.json has no activities");
  }

  const existing = activities.filter((a) => EXISTING_SLUGS.has(a.slug));
  const created = activities.filter((a) => !EXISTING_SLUGS.has(a.slug));

  const existingUpdates = existing.map(emitExistingUpdate).join("\n\n");

  // display_order: simples continue from 10+, imaginatives from 110+
  let simpleOrder = 10;
  let imaginativeOrder = 110;
  const inserts = created
    .map((activity) => {
      const style =
        activity.activityStyle === "imaginative" ? "imaginative" : "simple";
      const order =
        style === "simple" ? simpleOrder++ : imaginativeOrder++;
      return emitInsert(activity, order);
    })
    .join("\n\n");

  const sql = `-- supabase/migrations/${migrationName}

/*
 * Expand preset_activities with ageFit / categories / traits metadata and
 * many new curated simple + imaginative presets (~80–90 total library).
 *
 * - Existing 18 slugs: jsonb-merge enrichment onto full_content
 * - New slugs: insert with full content (idempotent via ON CONFLICT)
 */

begin;

/*
 * EXISTING PRESETS — merge ageFit / categories / traits
 * =====================================================
 */

${existingUpdates}

/*
 * NEW PRESETS — insert or update by slug
 * ======================================
 */

${inserts}

commit;
`;

  fs.mkdirSync(path.dirname(migrationPath), { recursive: true });
  fs.writeFileSync(migrationPath, sql, "utf8");

  console.log(
    JSON.stringify(
      {
        migration: path.relative(projectRoot, migrationPath),
        existingUpdated: existing.length,
        newUpserted: created.length,
        totalInSource: activities.length,
      },
      null,
      2
    )
  );
}

main();
