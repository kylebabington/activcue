// scripts/demo/app-demo.spec.js
// Marketing recording of the REAL FamilyFlow app (anon auth + Quick ideas, no OpenAI).
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { waitForAuthSession } from "../../e2e/helpers/authApi.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDemos = path.resolve(__dirname, "../../public/demos");

async function pause(page, ms = 1600) {
  await page.waitForTimeout(ms);
}

async function dismissDialogIfOpen(page) {
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 10000 });
  }
}

/** Open Details on a card that has real steps (skip thin/empty presets). */
async function openRichActivityDetails(page) {
  const detailsButtons = page.getByRole("button", { name: /^Details$/i });
  await expect(detailsButtons.first()).toBeVisible({ timeout: 30000 });
  const count = await detailsButtons.count();

  for (let index = 0; index < count; index += 1) {
    await detailsButtons.nth(index).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await pause(page, 800);

    const emptySteps = await dialog
      .getByText(/No steps listed/i)
      .isVisible()
      .catch(() => false);
    const hasStarters = await dialog
      .getByRole("heading", { name: /^Starter Ideas$/i })
      .isVisible()
      .catch(() => false);
    const hasWorld = await dialog
      .getByText(/^The world$/i)
      .isVisible()
      .catch(() => false);

    if (!emptySteps && (hasStarters || hasWorld)) {
      return { dialog, hasStarters, hasWorld };
    }

    await dialog.getByLabel("Close").click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    await pause(page, 400);
  }

  // Fallback: first card
  await detailsButtons.first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15000 });
  return {
    dialog,
    hasStarters: await dialog
      .getByRole("heading", { name: /^Starter Ideas$/i })
      .isVisible()
      .catch(() => false),
    hasWorld: await dialog
      .getByText(/^The world$/i)
      .isVisible()
      .catch(() => false),
  };
}

test("record FamilyFlow real-app demo", async ({ page }, testInfo) => {
  // 0. Landing → Find something now
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1 }).first()
  ).toBeVisible({ timeout: 30000 });
  await pause(page, 2000);

  const findCta = page.getByRole("link", { name: /Find something now/i }).first();
  await expect(findCta).toBeVisible();
  await findCta.scrollIntoViewIfNeeded();
  await pause(page, 1200);
  await findCta.click();

  await expect(page).toHaveURL(/\/onboarding/, { timeout: 20000 });
  await waitForAuthSession(page);
  await expect(
    page.getByRole("heading", { name: /Who’s playing|Who's playing/i })
  ).toBeVisible({ timeout: 30000 });
  await pause(page, 1600);

  // 1–2. Choose child Maya (age 8), then continue setup
  await page.getByLabel(/^Name$/i).fill("Maya");
  await page.getByLabel(/Or exact age/i).fill("8");
  await page.getByLabel(/^Interests$/i).fill("drawing, animals, pretend");
  await pause(page, 1200);
  await page.getByRole("button", { name: /^Add kid$/i }).click();
  await expect(page.getByText(/Maya · age 8/i)).toBeVisible({ timeout: 10000 });
  await pause(page, 1400);
  await page.getByRole("button", { name: /Next: supplies/i }).click();

  await expect(
    page.getByRole("heading", { name: /What do you already have/i })
  ).toBeVisible({ timeout: 15000 });
  // Pick a couple of supplies for “why it fits” chips, then continue
  const paper = page.getByRole("button", { name: /^paper$/i });
  if (await paper.isVisible().catch(() => false)) {
    await paper.click();
  }
  const markers = page.getByRole("button", { name: /^markers$/i });
  if (await markers.isVisible().catch(() => false)) {
    await markers.click();
  }
  await pause(page, 1000);

  // Skip remaining onboarding so Quest shows a real 3-card board (not canned preview)
  await page.getByRole("button", { name: /^Skip$/i }).click();
  await expect(page).toHaveURL(/\/(app|parent|kid|quest)/, { timeout: 20000 });
  await pause(page, 1200);

  // 1. Parent real-life problem → Cooking / Cooking dinner
  await page.goto("/parent");
  await waitForAuthSession(page);
  await expect(
    page.getByRole("heading", {
      name: /Pick what’s happening|Pick what's happening/i,
    })
  ).toBeVisible({ timeout: 30000 });
  await pause(page, 1600);

  const cooking = page.getByRole("button", { name: /Cooking/i }).first();
  await expect(cooking).toBeVisible({ timeout: 20000 });
  await cooking.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await expect(
    dialog.getByRole("textbox", { name: /What are you doing/i })
  ).toHaveValue(/Cooking dinner/i);
  await pause(page, 1600);
  await dialog.getByRole("button", { name: /^Set moment$/i }).click();
  await expect(dialog).toBeHidden({ timeout: 10000 });
  await pause(page, 1400);

  // First-run coach may auto-navigate to Kid; otherwise go there
  if (!/\/kid/.test(page.url())) {
    await page.goto("/kid");
  }
  await waitForAuthSession(page);
  await dismissDialogIfOpen(page);
  await expect(
    page.getByRole("heading", { name: /What sounds good/i })
  ).toBeVisible({ timeout: 30000 });
  await pause(page, 1400);

  // Show Maya is playing when chip exists
  const mayaChip = page.getByRole("button", { name: /^Maya$/i });
  if (await mayaChip.isVisible().catch(() => false)) {
    await mayaChip.click();
    await pause(page, 1000);
  }

  // 3. Simple → Quick ideas for reliable steps/starters (AI-free)
  //    Prefer Pretend board only when cards include full Activity V2 content.
  const pretend = page.getByRole("button", { name: /Pretend/i }).first();
  const simple = page.getByRole("button", { name: /Simple/i }).first();
  await expect(simple).toBeVisible({ timeout: 15000 });

  let usedPretend = false;
  await pretend.click();
  await pause(page, 800);
  const imBored = page.getByRole("button", { name: /^I'm Bored$/i });
  if (await imBored.isVisible().catch(() => false)) {
    await imBored.click();
    await expect(page).toHaveURL(/\/quest/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: /Pick something to do/i })
    ).toBeVisible({ timeout: 30000 });
    await pause(page, 2000);

    // Peek first Details — if thin (0 steps), fall back to Quick ideas
    await page.getByRole("button", { name: /^Details$/i }).first().click();
    const peek = page.getByRole("dialog");
    await expect(peek).toBeVisible({ timeout: 15000 });
    const thin = await peek.getByText(/No steps listed/i).isVisible().catch(() => false);
    await peek.getByLabel("Close").click();
    await expect(peek).toBeHidden({ timeout: 10000 });

    if (!thin) {
      usedPretend = true;
    } else {
      await page.goto("/kid");
      await waitForAuthSession(page);
      await dismissDialogIfOpen(page);
      await expect(
        page.getByRole("heading", { name: /What sounds good/i })
      ).toBeVisible({ timeout: 30000 });
    }
  }

  if (!usedPretend) {
    await simple.click();
    await pause(page, 1000);
    const quickIdeas = page.getByRole("button", { name: /^Quick ideas/i });
    await expect(quickIdeas).toBeVisible({ timeout: 20000 });
    await quickIdeas.click();
    await expect(page).toHaveURL(/\/quest/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: /Pick something to do/i })
    ).toBeVisible({ timeout: 30000 });
  }

  await pause(page, 2800);
  const detailsButtons = page.getByRole("button", { name: /^Details$/i });
  await expect(detailsButtons.first()).toBeVisible({ timeout: 30000 });
  expect(await detailsButtons.count()).toBeGreaterThanOrEqual(2);
  await expect(page.getByText(/Best fit|You are|why this fits|Fits /i).first()).toBeVisible();
  await pause(page, 2200);

  // 4–5. Open a rich activity → Overview / The world (when present) / Your Role / Starter Ideas
  const { dialog: detailsDialog, hasStarters, hasWorld } =
    await openRichActivityDetails(page);
  await pause(page, 1600);
  await expect(
    detailsDialog.getByRole("heading", { name: /^Overview$/i })
  ).toBeVisible();
  await expect(
    detailsDialog.getByRole("heading", { name: /^Your Role$/i })
  ).toBeVisible();
  if (hasWorld) {
    await expect(detailsDialog.getByText(/^The world$/i)).toBeVisible();
  }
  if (hasStarters) {
    await expect(
      detailsDialog.getByRole("heading", { name: /^Starter Ideas$/i })
    ).toBeVisible();
  }
  await pause(page, 3000);

  // 6. Enter the story / Start this activity
  await detailsDialog
    .getByRole("button", { name: /Enter the story|Start this activity/i })
    .click();
  await expect(page.locator("#active-activity-panel")).toBeVisible({
    timeout: 20000,
  });
  await pause(page, 2200);

  // 7. Check one starter idea when available
  const firstStarter = page.locator("button.quest-v2-starter-door").first();
  if (await firstStarter.isVisible().catch(() => false)) {
    await firstStarter.scrollIntoViewIfNeeded();
    await firstStarter.click();
    await expect(firstStarter).toHaveClass(/is-open/);
    await pause(page, 2000);
  }

  // 8. Complete at least one step
  const stepsDetails = page.locator("#quest-section-steps");
  await stepsDetails.scrollIntoViewIfNeeded();
  if (!(await stepsDetails.evaluate((el) => el.open))) {
    await stepsDetails.locator("summary").click();
    await pause(page, 800);
  }
  const doneToggle = page.locator(".quest-step-complete-toggle").first();
  await expect(doneToggle).toBeVisible({ timeout: 15000 });
  await doneToggle.scrollIntoViewIfNeeded();
  await doneToggle.click();
  await pause(page, 2000);

  // 9. Built-in Stuck? help (no AI)
  const imStuck = page.getByRole("button", { name: /I.?m stuck/i }).first();
  if (await imStuck.isVisible().catch(() => false)) {
    await imStuck.click();
  } else {
    const rescue = page.locator("#quest-section-rescue");
    await rescue.scrollIntoViewIfNeeded();
    if (!(await rescue.evaluate((el) => el.open))) {
      await rescue.locator("summary").click();
    }
  }
  await expect(
    page.getByText(/simpler version of the current step/i)
  ).toBeVisible({ timeout: 15000 });
  await pause(page, 2800);

  // 10. Return to recommendations
  await page.getByRole("button", { name: /^Stop$/i }).click();
  await expect(
    page.getByRole("heading", { name: /Pick something to do/i })
  ).toBeVisible({ timeout: 20000 });
  await pause(page, 2000);

  // 11. Plan B — Try the next best one
  const planB = page.getByRole("button", { name: /Try the next best one/i });
  await expect(planB).toBeVisible({ timeout: 15000 });
  await planB.scrollIntoViewIfNeeded();
  await pause(page, 1200);
  await planB.click();
  // Plan B may auto-start the next activity or refresh the board
  await pause(page, 2800);
  const activeAgain = page.locator("#active-activity-panel");
  const boardAgain = page.getByRole("heading", { name: /Pick something to do/i });
  await expect(activeAgain.or(boardAgain).first()).toBeVisible({
    timeout: 20000,
  });
  await pause(page, 2200);

  // 12. End on Find something now (landing CTA)
  if (await activeAgain.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^Stop$/i }).click();
    await pause(page, 1000);
  }
  await page.goto("/");
  const endCta = page.getByRole("link", { name: /Find something now/i }).first();
  await endCta.scrollIntoViewIfNeeded();
  await expect(endCta).toBeVisible();
  await pause(page, 3000);

  testInfo.attachments.push({
    name: "demo-note",
    contentType: "text/plain",
    body: Buffer.from(
      "Real-app video saved under scripts/demo/output; run npm run demo:publish"
    ),
  });
});

test.afterAll(async () => {
  if (!fs.existsSync(publicDemos)) {
    fs.mkdirSync(publicDemos, { recursive: true });
  }
});
