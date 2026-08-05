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

test("record FamilyFlow real product walkthrough", async ({ page }, testInfo) => {
  await page.goto("/demo");

  // 1. Parent screen with a real moment visibly selected.
  await expect(
    page.getByRole("heading", { name: /Pick what’s happening/i })
  ).toBeVisible();
  const cookingMoment = page.getByRole("button", { name: /Cooking/i });
  await expect(cookingMoment).toHaveClass(/active/);
  await expect(page.getByText(/Current moment: Cooking dinner/i)).toBeVisible();
  await pause(page, 3200);

  await page.getByRole("button", { name: /Go to Kid/i }).click();

  // 2. Kid screen: child selection, energy, and Pretend mode.
  await expect(
    page.getByRole("heading", { name: /What sounds good/i })
  ).toBeVisible();
  const maya = page.getByRole("button", { name: /^Maya$/i });
  await expect(maya).toHaveClass(/active/);

  const bouncy = page.getByRole("button", { name: /^Bouncy$/i });
  await bouncy.click();
  await expect(bouncy).toHaveClass(/active/);

  const pretend = page.getByRole("button", { name: /Pretend/i });
  await pretend.click();
  await expect(pretend).toHaveClass(/active/);
  await pause(page, 3200);

  await page.getByRole("button", { name: /^I'm Bored$/i }).click();

  // 3. Activity screen with exactly three imaginative suggestions.
  await expect(
    page.getByRole("heading", { name: /What should happen next/i })
  ).toBeVisible();
  const imaginativeCards = page.locator(".activity-card--imaginative");
  await expect(imaginativeCards).toHaveCount(3);
  await expect(page.locator(".activity-card--simple")).toHaveCount(0);
  await pause(page, 3600);

  // 4. Open the real full-page activity details UI.
  const firstCard = imaginativeCards.first();
  const firstTitle = (await firstCard.locator("h3").innerText()).trim();
  await firstCard.getByRole("button", { name: /^Details$/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: firstTitle, exact: true })
  ).toBeVisible();
  await pause(page, 4200);

  // 5. Start from Details and finish the movie on the first activity step.
  await dialog.getByRole("button", { name: /Enter the story/i }).click();
  await expect(
    page.getByLabel("First activity step demo screen")
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Steps$/i })).toBeVisible();
  await expect(page.locator("#quest-step-0")).toBeVisible();
  await expect(page.locator("#quest-step-0")).toContainText(/Step 1/i);
  await expect(page.locator("#quest-step-1")).toBeHidden();
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
