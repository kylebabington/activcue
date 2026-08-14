// e2e/helpers/signupFlow.js
// Create a permanent account and finish onboarding for app golden paths.

import { expect } from "@playwright/test";
import { waitForAuthSession } from "./authApi.js";

export function uniqueTestEmail(prefix = "e2e") {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/**
 * Signup as a brand-new permanent user, then add one kid (or skip).
 */
export async function signupAndOnboard(
  page,
  {
    email = uniqueTestEmail(),
    password = "TestPass123!",
    addChild = true,
    childName = "Sam",
  } = {}
) {
  await page.goto("/signup");
  await waitForAuthSession(page);

  await expect(
    page.getByRole("heading", { name: /Create your account|Save your activity|account/i })
  ).toBeVisible({ timeout: 30000 });

  await page.locator('input[type="email"]').fill(email);
  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.nth(0).fill(password);
  await passwordInputs.nth(1).fill(password);

  await page.getByRole("button", { name: /^Create account/i }).click();

  await expect(page).toHaveURL(/\/(onboarding|parent|kid|quest|app)/, {
    timeout: 45000,
  });
  await waitForAuthSession(page);

  if (/\/onboarding/.test(page.url())) {
    const welcomeContinue = page.getByRole("button", { name: /Add first child/i });
    if (await welcomeContinue.isVisible().catch(() => false)) {
      await welcomeContinue.click();
    }

    if (addChild) {
      await expect(
        page.getByRole("heading", { name: /Who.s playing/i })
      ).toBeVisible({ timeout: 15000 });

      await page.getByPlaceholder("Sam").fill(childName);
      await page.getByPlaceholder("12").fill("8");
      await page.getByRole("button", { name: /^Add kid$/i }).click();
      await page.getByRole("button", { name: /Find something to do/i }).click();
    } else {
      const skip = page.getByRole("button", { name: /Skip for now/i });
      if (await skip.isVisible().catch(() => false)) {
        await skip.click();
      }
    }
  }

  await waitForAuthSession(page);
  return { email, password };
}

/**
 * Ensure the browser has a permanent session with onboarding done.
 */
export async function ensurePermanentAppSession(page) {
  await page.goto("/app");
  await page.waitForLoadState("domcontentloaded");

  if (/\/signup/.test(page.url())) {
    await signupAndOnboard(page);
  }

  if (/\/onboarding/.test(page.url())) {
    const skip = page.getByRole("button", { name: /Skip for now/i });
    const addFirst = page.getByRole("button", { name: /Add first child/i });
    if (await addFirst.isVisible().catch(() => false)) {
      await addFirst.click();
      await page.getByPlaceholder("Sam").fill("Sam");
      await page.getByPlaceholder("12").fill("8");
      await page.getByRole("button", { name: /^Add kid$/i }).click();
      await page.getByRole("button", { name: /Find something to do|Skip for now/i }).click();
    } else if (await skip.isVisible().catch(() => false)) {
      await skip.click();
    }
  }

  await waitForAuthSession(page);
}
