// scripts/demo/playwright.demo.config.js
import { defineConfig } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "output");

/**
 * Dedicated Playwright config for marketing demo recording.
 * Default: real-app walkthrough (app-demo.spec.js).
 * Playground: pass landing-demo.spec.js explicitly (npm run demo:record:playground).
 * Do not overload the main e2e playwright.config.js.
 */
export default defineConfig({
  testDir: __dirname,
  testMatch: /(?:app-demo|landing-demo)\.spec\.js$/,
  timeout: 180_000,
  outputDir,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173",
    viewport: { width: 1280, height: 720 },
    video: {
      mode: "on",
      size: { width: 1280, height: 720 },
    },
    trace: "off",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        // Real-app recording needs API + Supabase anon auth (Vite alone is not enough).
        command: "npm run start:all",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
