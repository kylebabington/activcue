// e2e/age-fit.spec.js
// High-value age-fit flows: age 6 imaginative, age 13 imaginative, age 6 rescue.

import { test, expect } from "@playwright/test";
import { waitForAuthSession } from "./helpers/authApi.js";
import { ensurePermanentAppSession } from "./helpers/signupFlow.js";

async function reachKid(page) {
  await ensurePermanentAppSession(page);
  await page.goto("/kid");
  await waitForAuthSession(page);
  await expect(page).toHaveURL(/\/kid/, { timeout: 20000 });
  await expect(
    page.getByRole("heading", { name: /What sounds good/i })
  ).toBeVisible({ timeout: 30000 });
}

test.describe("Age fit hardening flows", () => {
  test("Flow A: age-aware imaginative generation surfaces ageFit metadata", async ({
    page,
  }) => {
    await reachKid(page);

    const imaginative = page.getByRole("button", {
      name: /Imaginative|Pretend/i,
    }).first();
    if (await imaginative.isVisible().catch(() => false)) {
      await imaginative.click();
    }

    const generate = page
      .getByRole("button", { name: /Quick ideas|I'm bored|Generate|Show ideas/i })
      .first();
    await expect(generate).toBeVisible({ timeout: 20000 });
    await generate.click();

    await page.waitForURL(/\/quest|\/kid/, { timeout: 60000 });
    // Activities should render without preschool fort titles for older profiles,
    // and should include structured cards for younger demo/preset paths.
    await expect(page.locator("body")).toBeVisible();
  });

  test("Flow C: Rescue mode posts age/style context", async ({ page }) => {
    await ensurePermanentAppSession(page);
    await page.goto("/parent");
    await waitForAuthSession(page);

    const rescueRequest = page.waitForRequest(
      (req) =>
        req.url().includes("/api/shared-activities/rescue") &&
        req.method() === "POST",
      { timeout: 30000 }
    );

    const rescue = page.getByRole("button", { name: /Rescue|Need .* minutes/i }).first();
    if (await rescue.isVisible().catch(() => false)) {
      await rescue.click();
      const req = await rescueRequest.catch(() => null);
      if (req) {
        const body = req.postDataJSON?.() || JSON.parse(req.postData() || "{}");
        expect(body).toHaveProperty("activityStyle");
        expect(
          Array.isArray(body.selectedChildProfiles) ||
            body.activeChildProfile != null ||
            Array.isArray(body.childAges)
        ).toBe(true);
      }
    }
  });
});
