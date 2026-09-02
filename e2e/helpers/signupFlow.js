// e2e/helpers/signupFlow.js
// Create a permanent account and finish onboarding for app golden paths.

import { expect } from "@playwright/test";
import {
  waitForAuthSession,
  waitForPermanentAuthSession,
  waitForOnboardingPersisted,
} from "./authApi.js";

export function uniqueTestEmail(prefix = "e2e") {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function onboardingSaveMatcher(childName, { skipped = false } = {}) {
  const expectedName = String(childName || "").trim().toLowerCase();

  return async (response) => {
    if (response.request().method() !== "PUT") {
      return false;
    }
    if (!response.url().includes("/api/family-settings")) {
      return false;
    }

    let requestBody = {};
    try {
      requestBody = response.request().postDataJSON() || {};
    } catch {
      try {
        requestBody = JSON.parse(response.request().postData() || "{}");
      } catch {
        requestBody = {};
      }
    }

    const children = Array.isArray(requestBody.childProfiles)
      ? requestBody.childProfiles
      : [];
    const hasExpectedChild =
      !expectedName ||
      children.some(
        (child) =>
          String(child?.name || "").trim().toLowerCase() === expectedName
      );

    if (!hasExpectedChild) {
      return false;
    }

    if (skipped) {
      if (!requestBody.onboardingSkippedAt) {
        return false;
      }
    } else if (!requestBody.onboardingCompletedAt) {
      return false;
    }

    return true;
  };
}

/**
 * Wait for /onboarding to load and reach the child setup step ("Who's playing?").
 * Clicks through the welcome screen once when it appears.
 */
export async function advanceToOnboardingChildStep(page) {
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 45000 });

  const welcomeButton = page.getByRole("button", { name: /Add first child/i });
  const childFormHeading = page.getByRole("heading", { name: /Who.s playing/i });
  const authBootstrapError = page.getByRole("heading", {
    name: /could not start your session/i,
  });

  await expect(
    welcomeButton.or(childFormHeading).or(authBootstrapError)
  ).toBeVisible({ timeout: 30000 });

  if (await authBootstrapError.isVisible()) {
    const detail =
      (await page.locator('[role="alert"] p').first().textContent()) ||
      "unknown error";
    throw new Error(`Onboarding auth bootstrap failed (${detail}).`);
  }

  if (await childFormHeading.isVisible()) {
    return;
  }

  await welcomeButton.click();
  await expect(childFormHeading).toBeVisible({ timeout: 15000 });
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
  await expect(page.getByText(new RegExp(childName, "i")).first()).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Complete onboarding by adding one child and continuing.
 * Waits for the durable family-settings save before returning.
 */
export async function completeOnboardingWithChild(
  page,
  { childName = "Sam", ageYears = "8" } = {}
) {
  await advanceToOnboardingChildStep(page);
  await fillOnboardingChild(page, { childName, ageYears });

  const saveResponsePromise = page.waitForResponse(
    onboardingSaveMatcher(childName, { skipped: false }),
    { timeout: 45000 }
  );

  await page.getByRole("button", { name: /Find something to do/i }).click();

  const saveResponse = await saveResponsePromise;
  if (!saveResponse.ok()) {
    const bodyText = await saveResponse.text().catch(() => "");
    throw new Error(
      `Onboarding save failed: HTTP ${saveResponse.status()} ${bodyText}`
    );
  }

  const body = await saveResponse.json().catch(() => null);
  const settings = body?.settings || body || {};
  const children = Array.isArray(settings.childProfiles)
    ? settings.childProfiles
    : [];
  const savedChild = children.find(
    (child) =>
      String(child?.name || "").trim().toLowerCase() ===
      String(childName).trim().toLowerCase()
  );

  if (!savedChild) {
    throw new Error(
      `Onboarding save response missing child "${childName}": ${JSON.stringify(body)}`
    );
  }
  if (!settings.onboardingCompletedAt) {
    throw new Error(
      `Onboarding save response missing onboardingCompletedAt: ${JSON.stringify(body)}`
    );
  }

  await waitForOnboardingPersisted(page, {
    childName,
    requireCompleted: true,
    timeoutMs: 20000,
  });

  await expect(page).toHaveURL(/\/(quest|app|parent|kid)/, { timeout: 30000 });
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
    ageYears = "8",
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

  try {
    await expect(page).toHaveURL(/\/(onboarding|parent|kid|quest|app)/, {
      timeout: 45000,
    });
  } catch (error) {
    const alertText =
      (await page.locator('[role="alert"]').first().textContent().catch(() => null)) ||
      (await page.locator("form").innerText().catch(() => null)) ||
      "";
    throw new Error(
      `Signup did not leave /signup (url=${page.url()}). UI says: ${alertText || "(no alert)"}. ` +
        `Original error: ${error instanceof Error ? error.message : error}`
    );
  }
  await waitForPermanentAuthSession(page);

  if (/\/onboarding/.test(page.url())) {
    if (addChild) {
      await completeOnboardingWithChild(page, { childName, ageYears });
    } else {
      await advanceToOnboardingChildStep(page);
      const skipSavePromise = page.waitForResponse(
        onboardingSaveMatcher("", { skipped: true }),
        { timeout: 45000 }
      );
      await page.getByRole("button", { name: /Skip for now/i }).click();
      const skipResponse = await skipSavePromise;
      if (!skipResponse.ok()) {
        throw new Error(
          `Onboarding skip save failed: HTTP ${skipResponse.status()}`
        );
      }
    }
  }

  await waitForPermanentAuthSession(page);
  return { email, password };
}

/**
 * Ensure the browser has a permanent session with onboarding done.
 */
export async function ensurePermanentAppSession(page) {
  await page.goto("/app");
  await page.waitForLoadState("domcontentloaded");

  await page.waitForURL(/\/(signup|onboarding|parent|kid|quest|app|settings)/, {
    timeout: 45000,
  });

  const signupHeading = page.getByRole("heading", {
    name: /Create your account|Save your activity|account/i,
  });
  const welcomeButton = page.getByRole("button", { name: /Add first child/i });
  const childFormHeading = page.getByRole("heading", {
    name: /Who.s playing/i,
  });
  const parentNav = page.getByRole("link", { name: /^Parent$/i });
  const kidNav = page.getByRole("link", { name: /^Kid$/i });
  const parentHeading = page.getByRole("heading", {
    name: /Pick what.s happening/i,
  });
  const kidHeading = page.getByRole("heading", { name: /What sounds good/i });

  // Do not treat transient auth alerts as terminal — recover via signup.
  await expect(
    signupHeading
      .or(welcomeButton)
      .or(childFormHeading)
      .or(parentNav)
      .or(kidNav)
      .or(parentHeading)
      .or(kidHeading)
      .first()
  ).toBeVisible({ timeout: 45000 });

  const onSignup =
    /\/signup/.test(page.url()) || (await signupHeading.isVisible());
  const onOnboarding =
    /\/onboarding/.test(page.url()) ||
    (await welcomeButton.isVisible()) ||
    (await childFormHeading.isVisible());

  if (onSignup) {
    await signupAndOnboard(page);
  } else if (onOnboarding) {
    await completeOnboardingWithChild(page);
  } else {
    try {
      await waitForPermanentAuthSession(page, 10000);
    } catch {
      await signupAndOnboard(page);
    }
  }

  await waitForPermanentAuthSession(page);
  await waitForOnboardingPersisted(page, {
    requireCompleted: true,
    timeoutMs: 30000,
  });

  const appReady =
    (await parentNav.isVisible().catch(() => false)) ||
    (await kidNav.isVisible().catch(() => false)) ||
    (await parentHeading.isVisible().catch(() => false)) ||
    (await kidHeading.isVisible().catch(() => false)) ||
    /\/(parent|kid|quest|settings|app)/.test(page.url());

  if (!appReady) {
    await page.goto("/parent");
    await expect(
      page.getByRole("heading", {
        name: /Pick what.s happening/i,
      })
    ).toBeVisible({ timeout: 30000 });
  }
}
