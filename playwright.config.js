/* global process */
// playwright.config.js
import { defineConfig } from "@playwright/test";

function assertE2eUsesLocalSupabaseAndTestStripe() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const stripeSecret = process.env.STRIPE_SECRET_KEY || "";

  if (process.env.CI !== "true") {
    return;
  }

  if (!supabaseUrl) {
    throw new Error(
      "CI E2E requires VITE_SUPABASE_URL / SUPABASE_URL from local `supabase start`."
    );
  }

  if (!stripeSecret.startsWith("sk_test_")) {
    throw new Error(
      "CI E2E requires a Stripe test secret key (sk_test_…). Production Stripe keys are forbidden."
    );
  }

  let hostname = "";
  try {
    hostname = new URL(supabaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error(`CI E2E Supabase URL is invalid: ${supabaseUrl}`);
  }

  const isLocalHost = hostname === "127.0.0.1" || hostname === "localhost";
  if (!isLocalHost) {
    throw new Error(
      `CI E2E must use local Supabase (127.0.0.1/localhost), got host: ${hostname}`
    );
  }

  const blockedHosts = String(
    process.env.FAMILYFLOW_BLOCKED_SUPABASE_HOSTS || ""
  )
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (blockedHosts.includes(hostname)) {
    throw new Error(
      `CI E2E refused to use blocked production Supabase host: ${hostname}`
    );
  }

  if (process.env.FAMILYFLOW_ALLOW_PROD_E2E === "1") {
    throw new Error(
      "FAMILYFLOW_ALLOW_PROD_E2E is not supported. Use local Supabase (`supabase start`) only."
    );
  }
}

assertE2eUsesLocalSupabaseAndTestStripe();

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run start:all",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
        },
      },
});
