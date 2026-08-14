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

async function setBodyClass(page, className, enabled) {
  await page.evaluate(
    ({ name, on }) => {
      document.body.classList.toggle(name, on);
    },
    { name: className, on: enabled }
  );
}

async function scrollWindowTo(page, top) {
  await page.evaluate((y) => {
    window.scrollTo(0, y);
  }, top);
}

/**
 * Continuous scroll from current position to the bottom of the quest panel
 * (not the document / signup CTA below it).
 */
async function scrollWindowToQuestBottomOver(page, durationMs = 11500) {
  await page.evaluate(async (duration) => {
    const quest = document.querySelector(
      ".demo-step--activity .active-activity-panel"
    );
    if (!quest) return;

    const desiredBottomPadding = 24;
    const questBottom = window.scrollY + quest.getBoundingClientRect().bottom;
    const targetScroll = Math.max(
      0,
      questBottom - window.innerHeight + desiredBottomPadding
    );
    const startY = window.scrollY;
    const delta = targetScroll - startY;
    if (delta <= 1) {
      window.scrollTo(0, targetScroll);
      return;
    }

    const start = performance.now();
    await new Promise((resolve) => {
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        window.scrollTo(0, startY + delta * t);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          window.scrollTo(0, targetScroll);
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }, durationMs);
}

test("record ActivCue real product walkthrough", async ({ page }, testInfo) => {
  // record=1 keeps the completed parent moment on-screen until Continue.
  await page.goto("/demo?record=1");

  // 1. Parent setup — ~4s total with Cooking selected and visible.
  await expect(
    page.getByRole("heading", {
      name: /What.?s happening right now/i,
    })
  ).toBeVisible();
  await expect(page.getByText(/You.?re trying ActivCue/i)).toBeVisible();
  await pause(page, 900);

  const cookingMoment = page.getByRole("button", { name: /Cooking/i });
  await cookingMoment.click();
  await expect(cookingMoment).toHaveClass(/is-selected/);
  await pause(page, 3100);
  await page.getByRole("button", { name: /^Continue$/i }).click();

  // 2. Who's playing — brief beat (~1.2s).
  await expect(
    page.getByRole("heading", { name: /Ages only/i })
  ).toBeVisible();
  await pause(page, 1200);
  await page.getByRole("button", { name: /^Continue$/i }).click();

  // 3. Kid preferences — select quickly, brief beat (~1.2s).
  await expect(
    page.getByRole("heading", { name: /What sounds good/i })
  ).toBeVisible();

  const bouncy = page.getByRole("button", { name: /^Bouncy/i });
  await bouncy.click();
  await expect(bouncy).toHaveClass(/is-selected/);

  const imaginative = page.getByRole("button", { name: /^Imaginative/i });
  await imaginative.click();
  await expect(imaginative).toHaveClass(/is-selected/);
  await pause(page, 1200);

  // Zoom for results before the screen appears (no mid-shot zoom animation).
  await setBodyClass(page, "demo-recording-fit-results", true);
  await page.getByRole("button", { name: /^I'm Bored$/i }).click();

  // 4. Three activities — already zoomed; hold still ~5.5s.
  await expect(page.locator("#demo-results-title")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator("#demo-results-title")).toHaveText(
    /Pick something to do/i
  );
  const imaginativeCards = page.locator(".activity-card--imaginative");
  await expect(imaginativeCards).toHaveCount(3);
  await expect(page.locator(".activity-card--simple")).toHaveCount(0);
  await scrollWindowTo(page, 0);
  await pause(page, 200);
  await pause(page, 5500);

  // 5. Started activity — mild zoom, top pause, continuous scroll to quest bottom.
  const firstCard = imaginativeCards.first();
  await firstCard.getByRole("button", { name: /Start the story/i }).click();
  await setBodyClass(page, "demo-recording-fit-results", false);

  await expect(page.getByLabel("Active activity")).toBeVisible({
    timeout: 15000,
  });
  await expect(
    page.getByRole("heading", { name: /^Story Path$/i })
  ).toBeVisible();
  await expect(page.locator("#quest-step-0")).toBeVisible();
  await expect(page.locator("#quest-step-0")).toContainText(/Scene\s*1/i);

  await setBodyClass(page, "demo-recording-fit-activity", true);
  await pause(page, 200);
  await scrollWindowTo(page, 0);
  await pause(page, 1300);
  await scrollWindowToQuestBottomOver(page, 12800);
  await pause(page, 1200);

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
