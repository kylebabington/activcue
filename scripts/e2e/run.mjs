// scripts/e2e/run.mjs
// Run Playwright with credentials from local `supabase start` (never .env.local production).

import { spawnSync } from "node:child_process";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readLocalSupabaseStatus() {
  const result = spawnSync("npx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
    shell: true,
  });

  if (result.status !== 0) {
    fail(
      "Local Supabase is not running. Start it with `npx supabase start`, then retry."
    );
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    fail("Could not parse `supabase status -o json` output.");
  }
}

const status = readLocalSupabaseStatus();
const apiUrl = status.API_URL || status.api_url;
const publishableKey =
  status.PUBLISHABLE_KEY ||
  status.ANON_KEY ||
  status.anon_key ||
  "";
const secretKey =
  status.SECRET_KEY ||
  status.SERVICE_ROLE_KEY ||
  status.service_role_key ||
  "";

if (!apiUrl || !publishableKey || !secretKey) {
  fail("Local Supabase status is missing API URL or keys.");
}

let hostname = "";
try {
  hostname = new URL(apiUrl).hostname.toLowerCase();
} catch {
  fail(`Local Supabase API URL is invalid: ${apiUrl}`);
}

if (hostname !== "127.0.0.1" && hostname !== "localhost") {
  fail(`Refusing to run E2E against non-local Supabase host: ${hostname}`);
}

const env = {
  ...process.env,
  VITE_SUPABASE_URL: apiUrl,
  VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  SUPABASE_URL: apiUrl,
  SUPABASE_PUBLISHABLE_KEY: publishableKey,
  SUPABASE_SECRET_KEY: secretKey,
};

const playwrightArgs = ["playwright", "test", ...process.argv.slice(2)];
const run = spawnSync("npx", playwrightArgs, {
  stdio: "inherit",
  env,
  shell: true,
});

process.exit(run.status ?? 1);
