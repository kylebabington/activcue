/* global process */
// playwright.config.js
import { defineConfig, devices } from "@playwright/test";

function assertE2eUsesLocalSupabaseAndTestStripe() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
  const isCi = process.env.CI === "true";

  if (!supabaseUrl) {
    throw new Error(
      isCi
        ? "CI E2E requires VITE_SUPABASE_URL / SUPABASE_URL from local `supabase start`."
        : "E2E requires VITE_SUPABASE_URL pointing at local Supabase. Run `npx supabase start` and copy credentials to .env."
    );
  }

  let hostname = "";
  try {
    hostname = new URL(supabaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error(`E2E Supabase URL is invalid: ${supabaseUrl}`);
  }

  const isLocalHost = hostname === "127.0.0.1" || hostname === "localhost";
  if (!isLocalHost) {
    throw new Error(
      `E2E must use local Supabase (127.0.0.1/localhost), got host: ${hostname}. ` +
        "Full E2E must not mutate production Supabase data."
    );
  }

  const blockedHosts = String(process.env.ACTIVCUE_BLOCKED_SUPABASE_HOSTS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (blockedHosts.includes(hostname)) {
    throw new Error(
      `E2E refused to use blocked Supabase host: ${hostname}`
    );
  }

  if (process.env.ACTIVCUE_ALLOW_PROD_E2E === "1") {
    throw new Error(
      "ACTIVCUE_ALLOW_PROD_E2E is not supported. Use local Supabase (`supabase start`) only."
    );
  }

  if (stripeSecret && !stripeSecret.startsWith("sk_test_")) {
    throw new Error(
      "E2E requires a Stripe test secret key (sk_test_…). Production Stripe keys are forbidden."
    );
  }

  if (isCi && !stripeSecret.startsWith("sk_test_")) {
    throw new Error(
      "CI E2E requires a Stripe test secret key (sk_test_…). Production Stripe keys are forbidden."
    );
  }
}

assertE2eUsesLocalSupabaseAndTestStripe();

const localSupabaseUrl =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const localSupabasePublishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "";
const localSupabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  outputDir: "test-results",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run start:all",
        url: "http://localhost:5173",
        // Never reuse an existing dev server: .env.local may point at production.
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
        timeout: 120_000,
        env: {
          ...process.env,
          VITE_SUPABASE_URL: localSupabaseUrl,
          VITE_SUPABASE_PUBLISHABLE_KEY: localSupabasePublishableKey,
          SUPABASE_URL: localSupabaseUrl,
          SUPABASE_PUBLISHABLE_KEY: localSupabasePublishableKey,
          SUPABASE_SECRET_KEY: localSupabaseSecretKey,
        },
      },
});
