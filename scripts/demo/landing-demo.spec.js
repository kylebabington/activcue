// scripts/demo/landing-demo.spec.js
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDemos = path.resolve(__dirname, "../../public/demos");

async function pause(page, ms = 1400) {
  await page.waitForTimeout(ms);
}

test("record FamilyFlow landing demo", async ({ page }, testInfo) => {
  await page.goto("/demo");

  await expect(
    page.getByRole("heading", { name: /Activities that fit the moment/i })
  ).toBeVisible();
  await pause(page, 1800);

  // 1–2. Choose child, then moment (visual story even when defaults match)
  await page
    .locator('[aria-label="Demo children"]')
    .getByRole("link", { name: /Maya/i })
    .click();
  await pause(page, 1800);

  await page
    .locator('[aria-label="Demo moments"]')
    .getByRole("link", { name: /Making dinner/i })
    .click();
  await pause(page, 2200);

  // 3. Three Fit Score matches
  const cards = page.locator(".moment-demo-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.first().locator(".moment-demo-card-fit")).toBeVisible();
  await expect(cards.first().getByText(/% fit/)).toBeVisible();
  await pause(page, 3200);

  const firstTitle = (await cards.first().locator("h4").innerText()).trim();

  // 4–5. Open activity; show Overview / Your Role / Starter Ideas (incl. The world)
  await cards.first().click();
  await pause(page, 2000);

  const detail = page.getByLabel("Activity detail");
  await detail.scrollIntoViewIfNeeded();
  await expect(
    detail.getByRole("heading", { name: firstTitle, exact: true })
  ).toBeVisible();
  await expect(detail.getByRole("heading", { name: /^Overview$/i })).toBeVisible();
  await expect(detail.getByText(/^The world$/i)).toBeVisible();
  await expect(detail.getByRole("heading", { name: /^Your Role$/i })).toBeVisible();
  await expect(
    detail.getByRole("heading", { name: /^Starter Ideas$/i })
  ).toBeVisible();
  await pause(page, 3200);

  // 6. Start activity
  await page.getByRole("button", { name: /Start activity/i }).click();
  await pause(page, 2400);

  // 7. Check one starter idea
  const firstStarter = page.locator("button.quest-v2-starter-door").first();
  await expect(firstStarter).toBeVisible();
  await firstStarter.scrollIntoViewIfNeeded();
  await firstStarter.click();
  await expect(firstStarter).toHaveClass(/is-open/);
  await pause(page, 2200);

  // 8. Complete at least one step
  const stepsHeading = detail.getByRole("heading", { name: /^Steps$/i });
  await stepsHeading.scrollIntoViewIfNeeded();
  const stepsDetails = detail.locator("#quest-section-steps");
  if (!(await stepsDetails.evaluate((el) => el.open))) {
    await stepsDetails.locator("summary").click();
    await pause(page, 1000);
  }
  const doneToggle = detail.locator(".quest-step-complete-toggle").first();
  await expect(doneToggle).toBeVisible();
  await doneToggle.scrollIntoViewIfNeeded();
  await doneToggle.click();
  await pause(page, 2200);

  // 9. Built-in Stuck? help (no AI call)
  await page.getByRole("button", { name: /^Stuck\?$/i }).click();
  await pause(page, 1400);
  const rescue = detail.locator("#quest-section-rescue");
  await rescue.scrollIntoViewIfNeeded();
  await expect(
    page.getByText(/simpler version of the current step/i)
  ).toBeVisible();
  await pause(page, 3200);

  // 10. Return to recommendations
  await page.getByRole("button", { name: /^Close$/i }).click();
  await pause(page, 2000);
  await expect(cards).toHaveCount(3);

  // 11. Plan B
  await page.getByRole("button", { name: /Didn'?t land\? Try another/i }).click();
  await pause(page, 2400);
  const planBFirstTitle = (
    await page.locator(".moment-demo-card").first().locator("h4").innerText()
  ).trim();
  expect(planBFirstTitle).not.toBe(firstTitle);
  await pause(page, 2800);

  // 12. End on Find something now
  const cta = page
    .locator(".demo-page-final-cta")
    .getByRole("link", { name: /Find something now/i });
  await cta.scrollIntoViewIfNeeded();
  await expect(cta).toBeVisible();
  await pause(page, 3000);

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
