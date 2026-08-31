// e2e/helpers/signupFlow.js
// Create a permanent account and finish onboarding for app golden paths.

import { expect } from "@playwright/test";
import { waitForAuthSession } from "./authApi.js";

export function uniqueTestEmail(prefix = "e2e") {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/**
 * Wait for /onboarding to load and reach the child setup step ("Who's playing?").
 * Clicks through the welcome screen when it appears.
 */
export async function advanceToOnboardingChildStep(page) {
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 45000 });

  const welcomeButton = page.getByRole("button", { name: /Add first child/i });
  const childFormHeading = page.getByRole("heading", { name: /Who.s playing/i });

  await expect(async () => {
    if (await childFormHeading.isVisible()) {
      return;
    }
    if (await welcomeButton.isVisible()) {
      await welcomeButton.click();
    }
    await expect(childFormHeading).toBeVisible();
  }).toPass({ timeout: 30000 });
}

/**
 * Fill the onboarding child form and add one kid.
 * Assumes advanceToOnboardingChildStep() has already run.
 */
export async function fillOnboardingChild(
  page,
  { childName = "Sam", ageYears = "8" } = {}
) {
  await page.getByPlaceholder("Sam").fill(childName);
  await page.getByPlaceholder("12").fill(ageYears);
  await page.getByRole("button", { name: /^Add kid$/i }).click();
}

/**
 * Complete onboarding by adding one child and continuing.
 */
export async function completeOnboardingWithChild(
  page,
  { childName = "Sam", ageYears = "8" } = {}
) {
  await advanceToOnboardingChildStep(page);
  await fillOnboardingChild(page, { childName, ageYears });
  await page.getByRole("button", { name: /Find something to do/i }).click();
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

  const authBootstrapError = page.getByRole("heading", {
    name: /could not start your session/i,
  });
  const signupHeading = page.getByRole("heading", {
    name: /Create your account|Save your activity|account/i,
  });

  await expect(signupHeading.or(authBootstrapError)).toBeVisible({
    timeout: 30000,
  });

  if (await authBootstrapError.isVisible()) {
    const detail =
      (await page.locator('[role="alert"] p').first().textContent()) ||
      "unknown error";
    throw new Error(
      `Signup auth bootstrap failed (${detail}). ` +
        "Ensure local Supabase is running (`npx supabase start`) and E2E is not reusing a dev server pointed at production."
    );
  }

  await waitForAuthSession(page);

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
    if (addChild) {
      await completeOnboardingWithChild(page, { childName });
    } else {
      await advanceToOnboardingChildStep(page);
      await page.getByRole("button", { name: /Skip for now/i }).click();
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
    await completeOnboardingWithChild(page);
  }

  await waitForAuthSession(page);
}
