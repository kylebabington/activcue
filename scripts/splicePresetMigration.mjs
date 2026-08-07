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
 * Find the newest migration created with:
 *
 * npx supabase migration new seed_preset_activities
 *
 * The Supabase CLI generates filenames similar to:
 *
 * 20260729184500_seed_preset_activities.sql
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
        "Create it first by running:",
        "",
        "npx supabase migration new seed_preset_activities",
      ].join("\n")
    );
  }

  const newestFileName = matchingFiles.at(-1);

  return path.join(migrationsDirectory, newestFileName);
}

/**
 * Build the opening portion of each INSERT statement.
 */
function buildInsertHeader(label, underline) {
  return `/*
 * ${label}
 * ${underline}
 */

insert into public.preset_activities (
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
values
`;
}

/**
 * Both activity collections use an upsert.
 *
 * This makes the migration safe if the same activity slug already exists.
 * Existing rows are updated instead of duplicated.
 */
const upsertSql = `
on conflict (slug)
do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();
`;

const simpleSqlPath = path.join(
  generatedDirectory,
  "simple-presets.sql"
);

const imaginativeSqlPath = path.join(
  generatedDirectory,
  "imaginative-presets.sql"
);

if (!fs.existsSync(simpleSqlPath)) {
  throw new Error(`Missing generated SQL file: ${simpleSqlPath}`);
}

if (!fs.existsSync(imaginativeSqlPath)) {
  throw new Error(`Missing generated SQL file: ${imaginativeSqlPath}`);
}

const simpleSql = fs.readFileSync(simpleSqlPath, "utf8").trim();
const imaginativeSql = fs
  .readFileSync(imaginativeSqlPath, "utf8")
  .trim();

const seedMigrationPath = findSeedMigration();

const relativeMigrationPath = path
  .relative(projectRoot, seedMigrationPath)
  .replaceAll("\\", "/");

const migrationContents = `-- ${relativeMigrationPath}

/*
 * ACTIVCUE PRESET ACTIVITY SEED
 * =================================
 *
 * This migration installs the application's canonical activity library:
 *
 * - 9 simple preset activities
 * - 9 imaginative preset activities
 *
 * These rows are required application data, not disposable test data.
 *
 * The ON CONFLICT clauses make the migration idempotent by updating
 * an existing activity with the same slug rather than creating a duplicate.
 */

begin;

${buildInsertHeader(
  "SIMPLE PRESET ACTIVITIES",
  "========================"
)}${simpleSql}
${upsertSql}

${buildInsertHeader(
  "IMAGINATIVE PRESET ACTIVITIES",
  "============================="
)}${imaginativeSql}
${upsertSql}

commit;
`;

fs.writeFileSync(seedMigrationPath, migrationContents, "utf8");

console.log("Preset seed migration updated:");
console.log(` - ${relativeMigrationPath}`);
