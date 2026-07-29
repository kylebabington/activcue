import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the single timestamped preset baseline migration.
 * Matches: supabase/migrations/<YYYYMMDDHHmmss>_create_preset_activity_library.sql
 */
export function resolvePresetMigrationPath(rootDir = path.join(__dirname, "..")) {
  const migrationsDir = path.join(rootDir, "supabase", "migrations");
  const matches = fs
    .readdirSync(migrationsDir)
    .filter((name) => /^\d{14}_create_preset_activity_library\.sql$/.test(name))
    .sort();

  if (matches.length === 0) {
    throw new Error(
      `No *_create_preset_activity_library.sql migration found in ${migrationsDir}`
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `Expected one preset baseline migration, found: ${matches.join(", ")}`
    );
  }

  return path.join(migrationsDir, matches[0]);
}
