import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { resolvePresetMigrationPath } from "./resolvePresetMigrationPath.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const migrationPath = resolvePresetMigrationPath(root);

const simpleSql = fs.readFileSync(
  path.join(__dirname, "generated", "simple-presets.sql"),
  "utf8"
);
const imaginativeSql = fs.readFileSync(
  path.join(__dirname, "generated", "imaginative-presets.sql"),
  "utf8"
);

const migration = fs.readFileSync(migrationPath, "utf8");
const marker = "SIMPLE PRESET ACTIVITIES";
const idx = migration.indexOf(marker);
if (idx < 0) {
  throw new Error("simple marker not found");
}

// Back up to the start of the comment block that contains the marker.
const commentStart = migration.lastIndexOf("/*", idx);
if (commentStart < 0) {
  throw new Error("comment start not found");
}

const header = migration.slice(0, commentStart);

function insertHeader(label, underline) {
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

const upsert = `
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

const body =
  insertHeader("SIMPLE PRESET ACTIVITIES", "========================") +
  simpleSql +
  upsert +
  "\n" +
  insertHeader(
    "IMAGINATIVE PRESET ACTIVITIES",
    "============================="
  ) +
  imaginativeSql +
  upsert +
  "\n";

fs.writeFileSync(migrationPath, header + body, "utf8");
console.log("Updated", migrationPath);
