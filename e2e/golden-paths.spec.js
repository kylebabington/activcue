// e2e/golden-paths.spec.js
// Playwright golden-path smoke specs (install with: npx playwright install)

import { test, expect } from "@playwright/test";

test.describe("FamilyFlow golden paths", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("anonymous app shell reaches Parent", async ({ page }) => {
    await page.goto("/parent");
    await expect(
      page.getByRole("heading", { name: /Pick what’s happening|Pick what's happening/i })
    ).toBeVisible({ timeout: 20000 });
  });

  test("Rescue Mode CTA is present", async ({ page }) => {
    await page.goto("/parent");
    await expect(
      page.getByRole("button", { name: /I need 20 minutes/i })
    ).toBeVisible({ timeout: 20000 });
  });
});
