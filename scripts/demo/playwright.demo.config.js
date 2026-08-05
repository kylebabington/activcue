// scripts/demo/playwright.demo.config.js
import { defineConfig } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "output");

/**
 * Dedicated Playwright config for marketing demo recording.
 * Default: deterministic /demo product walkthrough (landing-demo.spec.js).
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
        // /demo is client-only, but start:all matches local app boot and is harmless.
        command: "npm run start:all",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
