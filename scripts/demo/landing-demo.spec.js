// scripts/demo/landing-demo.spec.js
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDemos = path.resolve(__dirname, "../../public/demos");

test("record FamilyFlow landing demo", async ({ page }, testInfo) => {
  await page.goto("/demo?moment=dinner&child=maya");

  await expect(
    page.getByRole("heading", { name: /Activities that fit the moment/i })
  ).toBeVisible();

  await page.waitForTimeout(1200);

  const firstCard = page.locator(".moment-demo-card").first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();
  await page.waitForTimeout(1200);

  await page.getByRole("button", { name: /Start activity/i }).click();
  await page.waitForTimeout(1800);

  const stepsSummary = page.locator("summary", { hasText: /^Steps$/i }).first();
  if (await stepsSummary.isVisible().catch(() => false)) {
    await stepsSummary.click();
    await page.waitForTimeout(1200);
  }

  await page.getByRole("button", { name: /Stuck\?/i }).click();
  await page.waitForTimeout(1500);

  await expect(
    page.getByRole("heading", { name: /something that works right now/i })
  ).toBeVisible();
  await page.waitForTimeout(1800);

  // Copy recorded video into public/demos after the test finishes.
  testInfo.attachments.push({
    name: "demo-note",
    contentType: "text/plain",
    body: Buffer.from(
      "Video is saved by Playwright under scripts/demo/output; run publish-demo-video.mjs"
    ),
  });
});

test.afterAll(async () => {
  // Best-effort publish if a video already exists in output.
  if (!fs.existsSync(publicDemos)) {
    fs.mkdirSync(publicDemos, { recursive: true });
  }
});
