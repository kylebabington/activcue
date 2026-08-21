#!/usr/bin/env node
/**
 * Walk relative ESM imports reachable from the Node server entry and fail if
 * any omit a resolvable file extension (.js / .mjs / .cjs / .json).
 *
 * Node ESM does not resolve extensionless relative imports the way Vite does.
 *
 * Usage:
 *   node scripts/checkServerEsmImports.mjs
 *   node scripts/checkServerEsmImports.mjs --entry=server/index.js
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY_ARG = process.argv.find((arg) => arg.startsWith("--entry="));
const ENTRY = path.resolve(
  ROOT,
  ENTRY_ARG ? ENTRY_ARG.slice("--entry=".length) : "server/index.js"
);

const IMPORT_RE =
  /(?:import|export)\s+(?:[^'"\n]+?\s+from\s+)?["'](\.[^"']+)["']|import\s*\(\s*["'](\.[^"']+)["']\s*\)/g;

const ALLOWED_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".node",
]);

/** @type {Map<string, string[]>} */
const graph = new Map();
/** @type {string[]} */
const violations = [];
/** @type {Set<string>} */
const visited = new Set();

function isJsLike(filePath) {
  return /\.(m?js|cjs)$/i.test(filePath);
}

function resolveRelativeImport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) {
    return base;
  }
  for (const ext of [".js", ".mjs", ".cjs", ".json"]) {
    const candidate = `${base}${ext}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  for (const ext of [".js", ".mjs", ".cjs"]) {
    const candidate = path.join(base, `index${ext}`);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function hasExplicitExtension(specifier) {
  const ext = path.extname(specifier);
  return ALLOWED_EXTENSIONS.has(ext);
}

function collectImports(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const specs = [];
  IMPORT_RE.lastIndex = 0;
  let match;
  while ((match = IMPORT_RE.exec(source)) !== null) {
    const specifier = match[1] || match[2];
    if (specifier) {
      specs.push(specifier);
    }
  }
  return specs;
}

function walk(filePath) {
  const normalized = path.normalize(filePath);
  if (visited.has(normalized)) {
    return;
  }
  visited.add(normalized);

  if (!isJsLike(normalized) || !fs.existsSync(normalized)) {
    return;
  }

  const specs = collectImports(normalized);
  graph.set(normalized, specs);

  for (const specifier of specs) {
    if (!hasExplicitExtension(specifier)) {
      violations.push({
        file: path.relative(ROOT, normalized).replaceAll("\\", "/"),
        specifier,
      });
    }

    const resolved = resolveRelativeImport(normalized, specifier);
    if (resolved) {
      walk(resolved);
    }
  }
}

if (!fs.existsSync(ENTRY)) {
  console.error(`Entry not found: ${path.relative(ROOT, ENTRY)}`);
  process.exit(1);
}

walk(ENTRY);

if (violations.length > 0) {
  console.error(
    `Found ${violations.length} extensionless relative ESM import(s) on the Node server graph:\n`
  );
  for (const { file, specifier } of violations) {
    console.error(`  ${file}`);
    console.error(`    -> ${specifier}`);
  }
  console.error(
    "\nNode requires an explicit extension (.js) for relative ESM imports."
  );
  process.exit(1);
}

console.log(
  `OK: ${visited.size} module(s) reachable from ${path.relative(ROOT, ENTRY).replaceAll("\\", "/")} use explicit relative extensions.`
);
console.log(`Checked entry: ${pathToFileURL(ENTRY).href}`);
