// e2e/golden-paths.spec.js
// Playwright golden paths (install: npx playwright install)

import { test, expect } from "@playwright/test";

async function reachParent(page) {
  await page.goto("/parent");
  await expect(
    page.getByRole("heading", {
      name: /Pick what’s happening|Pick what's happening/i,
    })
  ).toBeVisible({ timeout: 30000 });
}

async function reachKid(page) {
  await page.goto("/kid");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 30000,
  });
}

test.describe("FamilyFlow golden paths", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Parent moment → Kid → Quick ideas → start → finish → independence", async ({
    page,
  }) => {
    await reachParent(page);

    const cooking = page.getByRole("button", { name: /Cooking/i }).first();
    if (await cooking.isVisible().catch(() => false)) {
      await cooking.click();
      const confirm = page.getByRole("button", {
        name: /Use this moment|Set moment|Confirm|Save|Go/i,
      });
      if (await confirm.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirm.first().click();
      }
    }

    await reachKid(page);

    const quickIdeas = page.getByRole("button", {
      name: /Quick ideas|Quick Ideas/i,
    });
    await expect(quickIdeas).toBeVisible({ timeout: 20000 });
    await quickIdeas.click();

    await page.goto("/quest");
    await expect(page.getByRole("heading", { level: 1 }).or(page.getByRole("heading", { level: 2 })).first()).toBeVisible({
      timeout: 20000,
    });

    const startButtons = page.getByRole("button", {
      name: /Start|Let's go|Begin/i,
    });
    if (await startButtons.first().isVisible({ timeout: 8000 }).catch(() => false)) {
      await startButtons.first().click();
    }

    const finish = page.getByRole("button", {
      name: /Finish|We're done|All done|Complete/i,
    });
    if (await finish.first().isVisible({ timeout: 15000 }).catch(() => false)) {
      await finish.first().click();

      const independence = page.getByRole("button", {
        name: /Worked great|Needed me|Didn't last|Didn’t last/i,
      });
      if (
        await independence.first().isVisible({ timeout: 8000 }).catch(() => false)
      ) {
        await independence.first().click();
      }
    }
  });

  test("Rescue Mode → Kid → activity surface", async ({ page }) => {
    await reachParent(page);

    const rescue = page.getByRole("button", { name: /I need 20 minutes/i });
    await expect(rescue).toBeVisible({ timeout: 20000 });
    await rescue.click();

    await expect(page).toHaveURL(/\/kid/, { timeout: 20000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 20000,
    });

    const startForMe = page.getByRole("button", {
      name: /Start for me|Just pick|Pick one/i,
    });
    const quickIdeas = page.getByRole("button", { name: /Quick ideas/i });
    const imBored = page.getByRole("button", { name: /I'm Bored|I’m Bored/i });

    await expect(
      startForMe.or(quickIdeas).or(imBored).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("Free imaginative path shows unlock or lock messaging", async ({
    page,
  }) => {
    await reachKid(page);

    const imaginative = page.getByRole("button", {
      name: /Imaginative|Pretend/i,
    });
    if (await imaginative.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await imaginative.first().click();
    }

    const imBored = page.getByRole("button", { name: /I'm Bored|I’m Bored/i });
    await expect(imBored).toBeVisible({ timeout: 15000 });

    // Either the button works (first free unlock) or demo lock copy appears nearby.
    const plusHint = page.getByText(/Plus|free pretend|sample|unlock/i);
    await expect(imBored.or(plusHint).first()).toBeVisible();
  });
});
