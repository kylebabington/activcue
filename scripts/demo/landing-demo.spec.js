// scripts/demo/landing-demo.spec.js
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDemos = path.resolve(__dirname, "../../public/demos");

async function pause(page, ms = 1600) {
  await page.waitForTimeout(ms);
}

test("record ActivCue real product walkthrough", async ({ page }, testInfo) => {
  await page.goto("/demo");

  // 1. Parent screen — select Cooking as the current moment.
  await expect(
    page.getByRole("heading", {
      name: /What.?s happening right now/i,
    })
  ).toBeVisible();
  await expect(page.getByText(/You.?re trying ActivCue/i)).toBeVisible();
  const cookingMoment = page.getByRole("button", { name: /Cooking/i });
  await cookingMoment.click();
  await pause(page, 2800);

  // 2. Ages step (demo collects ages only).
  await expect(
    page.getByRole("heading", { name: /Ages only/i })
  ).toBeVisible();
  await pause(page, 2000);
  await page.getByRole("button", { name: /^Continue$/i }).click();

  // 3. Kid screen: energy + Imaginative style, then I'm Bored.
  await expect(
    page.getByRole("heading", { name: /What sounds good/i })
  ).toBeVisible();

  const bouncy = page.getByRole("button", { name: /^Bouncy/i });
  await bouncy.click();
  await expect(bouncy).toHaveClass(/is-selected/);

  const imaginative = page.getByRole("button", { name: /^Imaginative/i });
  await imaginative.click();
  await expect(imaginative).toHaveClass(/is-selected/);
  await pause(page, 3200);

  await page.getByRole("button", { name: /^I'm Bored$/i }).click();

  // 4. Activity screen with exactly three imaginative suggestions.
  await expect(page.locator("#demo-results-title")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator("#demo-results-title")).toHaveText(
    /Pick something to do/i
  );
  const imaginativeCards = page.locator(".activity-card--imaginative");
  await expect(imaginativeCards).toHaveCount(3);
  await expect(page.locator(".activity-card--simple")).toHaveCount(0);
  await pause(page, 3600);

  // 5. Start the story from the card (playbook opens after choose).
  const firstCard = imaginativeCards.first();
  await firstCard.getByRole("button", { name: /Start the story/i }).click();
  await expect(
    page.getByLabel("Active activity")
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("heading", { name: /^Story Path$/i })
  ).toBeVisible();
  await expect(page.locator("#quest-step-0")).toBeVisible();
  await expect(page.locator("#quest-step-0")).toContainText(/Scene 1/i);
  await page.locator("#quest-step-0").scrollIntoViewIfNeeded();
  await pause(page, 5200);

  testInfo.attachments.push({
    name: "demo-note",
    contentType: "text/plain",
    body: Buffer.from(
      "Video is saved by Playwright under scripts/demo/output; run publish-demo-video.mjs"
    ),
  });
});

test.afterAll(async () => {
  if (!fs.existsSync(publicDemos)) {
    fs.mkdirSync(publicDemos, { recursive: true });
  }
});
