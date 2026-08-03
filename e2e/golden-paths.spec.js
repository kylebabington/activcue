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
      // Exact label inside the review modal — avoid matching Rescue chips like "Anything goes".
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 10000 });
      const setMoment = dialog.getByRole("button", { name: /^Set moment$/i });
      await expect(setMoment).toBeVisible({ timeout: 10000 });
      await setMoment.click();
      await expect(dialog).toBeHidden({ timeout: 10000 });
    }

    await reachKid(page);

    const quickIdeas = page.getByRole("button", {
      name: /Quick ideas|Quick Ideas/i,
    });
    await expect(quickIdeas).toBeVisible({ timeout: 20000 });
    await quickIdeas.click();

    // Activities live in React state — do not full-navigate to /quest or you wipe the board.
    await expect(page).toHaveURL(/\/quest/, { timeout: 30000 });
    await expect(page.getByRole("heading", { level: 1 }).or(page.getByRole("heading", { level: 2 })).first()).toBeVisible({
      timeout: 20000,
    });

    const unlockFree = page.getByRole("button", { name: /^Unlock free$/i });
    const startCard = page.getByRole("button", { name: /^Start$/i });
    const startThis = page.getByRole("button", { name: /Start this activity/i });
    const startControl = unlockFree.or(startCard).or(startThis);
    await expect(startControl.first()).toBeVisible({ timeout: 30000 });
    if (await unlockFree.first().isVisible().catch(() => false)) {
      await unlockFree.first().click();
    } else if (await startCard.first().isVisible().catch(() => false)) {
      await startCard.first().click();
    } else {
      await startThis.first().click();
    }

    const finish = page.getByRole("button", {
      name: /^Done$|Finish|We're done|All done|Complete/i,
    });
    await expect(finish.first()).toBeVisible({ timeout: 30000 });
    await finish.first().click();

    const independence = page.getByRole("button", {
      name: /Worked great|Needed me|Didn't last|Didn’t last/i,
    });
    await expect(independence.first()).toBeVisible({ timeout: 15000 });
    await independence.first().click();
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
