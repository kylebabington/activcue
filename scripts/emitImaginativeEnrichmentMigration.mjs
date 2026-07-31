/**
 * Emit the enrich_imaginative_setup_stories migration from JSON.
 * Usage: node scripts/emitImaginativeEnrichmentMigration.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const jsonPath = path.join(
  __dirname,
  "generated",
  "imaginative-presets.json"
);
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260730225919_enrich_imaginative_setup_stories.sql"
);

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

function formatJsonbDollar(obj) {
  const pretty = JSON.stringify(obj, null, 2);
  return `$$\n  ${pretty.replace(/\n/g, "\n  ")}\n  $$::jsonb`;
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const updates = data.activities
  .map((activity) => {
    const minutes = Number(activity.estimatedMinutes) || 20;
    return `update public.preset_activities
set
  title = '${escapeSql(activity.title)}',
  summary = '${escapeSql(activity.summary)}',
  theme = '${escapeSql(activity.theme)}',
  estimated_minutes = ${minutes},
  full_content = ${formatJsonbDollar(toFullContent(activity))}
where slug = '${escapeSql(activity.slug)}';`;
  })
  .join("\n\n");

const sql = `-- supabase/migrations/20260730225919_enrich_imaginative_setup_stories.sql

/*
 * Enrich imaginative preset theme, summary, and mission fields with richer
 * setup stories. Idempotent updates by slug.
 */

begin;

${updates}

commit;
`;

fs.writeFileSync(migrationPath, sql);
console.log(
  `Wrote ${path.relative(projectRoot, migrationPath)} for ${data.activities.length} activities`
);
