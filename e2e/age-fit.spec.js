// e2e/age-fit.spec.js
// High-value age-fit flows: age-aware imaginative generation and rescue context.

import { test, expect } from "@playwright/test";
import { waitForAuthSession } from "./helpers/authApi.js";
import { ensurePermanentAppSession } from "./helpers/signupFlow.js";

async function reachParent(page) {
  await ensurePermanentAppSession(page);
  await page.goto("/parent");
  await waitForAuthSession(page);
  await expect(
    page.getByRole("heading", {
      name: /Pick what.s happening/i,
    })
  ).toBeVisible({ timeout: 30000 });
}

async function reachKid(page) {
  await ensurePermanentAppSession(page);
  await page.goto("/kid");
  await waitForAuthSession(page);
  await expect(page).toHaveURL(/\/kid/, { timeout: 20000 });
  await expect(
    page.getByRole("heading", { name: /What sounds good/i })
  ).toBeVisible({ timeout: 30000 });
}

async function setCookingMoment(page) {
  await reachParent(page);

  const cooking = page.getByRole("button", { name: /Cooking/i }).first();
  await expect(cooking).toBeVisible({ timeout: 20000 });
  await cooking.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 10000 });
  const setMoment = dialog.getByRole("button", { name: /^Set moment$/i });
  await expect(setMoment).toBeVisible({ timeout: 10000 });
  await setMoment.click();
  await expect(dialog).toBeHidden({ timeout: 10000 });
}

test.describe("Age fit hardening flows", () => {
  test("Flow A: age-aware imaginative generation surfaces ageFit metadata", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await setCookingMoment(page);
    await reachKid(page);

    const pretend = page
      .getByRole("button", { name: /Pretend|Imaginative/i })
      .first();
    await expect(pretend).toBeVisible({ timeout: 20000 });
    await pretend.click();

    const imBored = page.getByRole("button", { name: /^I'm Bored$/i });
    await expect(imBored).toBeVisible({ timeout: 20000 });
    await expect(imBored).toBeEnabled({ timeout: 30000 });
    // Entitlement hydrate can briefly no-op generation with only a status toast.
    await expect(
      page.getByText(/Still checking your plan/i)
    ).toHaveCount(0);

    function bodyHasAgeContext(body) {
      if (!body || typeof body !== "object") {
        return false;
      }
      if (
        Array.isArray(body.selectedChildProfiles) &&
        body.selectedChildProfiles.some(
          (child) =>
            Number.isFinite(Number(child?.ageYears)) ||
            Number.isFinite(Number(child?.age)) ||
            Boolean(child?.ageRange) ||
            Boolean(child?.birthDate)
        )
      ) {
        return true;
      }
      if (Array.isArray(body.childAges) && body.childAges.length > 0) {
        return true;
      }
      const children = body.requestContext?.participants?.children;
      if (
        Array.isArray(children) &&
        children.some(
          (child) =>
            Number.isFinite(Number(child?.ageYears)) ||
            Number.isFinite(Number(child?.age)) ||
            Boolean(child?.ageRange) ||
            Boolean(child?.birthDate)
        )
      ) {
        return true;
      }
      return false;
    }

    const generationRequestPromise = page.waitForRequest(
      (req) => {
        const url = req.url();
        if (req.method() === "GET" && url.includes("/api/preset-activities")) {
          return /[?&]ages?=/.test(url) || /[?&]age=/.test(url);
        }
        if (req.method() !== "POST") {
          return false;
        }
        if (
          !url.includes("/api/activity-suggestions") &&
          !url.includes("/api/shared-activities/plan-b") &&
          !url.includes("/api/shared-activities/rescue")
        ) {
          return false;
        }
        try {
          const body =
            req.postDataJSON?.() || JSON.parse(req.postData() || "{}");
          return bodyHasAgeContext(body);
        } catch {
          return false;
        }
      },
      { timeout: 60000 }
    );

    const [generationRequest] = await Promise.all([
      generationRequestPromise,
      imBored.click(),
    ]);

    if (generationRequest.method() === "GET") {
      expect(generationRequest.url()).toMatch(/[?&]ages?=|[?&]age=/);
    } else {
      const body =
        generationRequest.postDataJSON?.() ||
        JSON.parse(generationRequest.postData() || "{}");
      expect(bodyHasAgeContext(body)).toBe(true);
    }

    await expect(page).toHaveURL(/\/quest/, { timeout: 60000 });

    const startable = page
      .getByRole("button", { name: /^Unlock free$/i })
      .or(page.getByRole("button", { name: /^Start$/i }))
      .or(
        page.getByRole("button", {
          name: /Enter the story|Start this activity/i,
        })
      );
    const emptyStatus = page.getByText(/No pretend samples available/i);

    await expect(startable.first().or(emptyStatus).first()).toBeVisible({
      timeout: 60000,
    });
  });

  test("Flow C: Rescue mode posts age/style context", async ({ page }) => {
    await ensurePermanentAppSession(page);
    await page.goto("/parent");
    await waitForAuthSession(page);
    await expect(
      page.getByRole("heading", {
        name: /Pick what.s happening/i,
      })
    ).toBeVisible({ timeout: 30000 });

    const rescue = page.getByRole("button", { name: /I need 20 minutes/i });
    await expect(rescue).toBeVisible({ timeout: 20000 });

    const rescueRequestPromise = page.waitForRequest(
      (req) =>
        req.url().includes("/api/shared-activities/rescue") &&
        req.method() === "POST",
      { timeout: 30000 }
    );

    const [rescueRequest] = await Promise.all([
      rescueRequestPromise,
      rescue.click(),
    ]);

    const body =
      rescueRequest.postDataJSON?.() ||
      JSON.parse(rescueRequest.postData() || "{}");

    expect(body).toHaveProperty("activityStyle");
    expect(typeof body.activityStyle).toBe("string");
    expect(body.activityStyle.length).toBeGreaterThan(0);

    const hasChildContext =
      (Array.isArray(body.selectedChildProfiles) &&
        body.selectedChildProfiles.length > 0) ||
      body.activeChildProfile != null ||
      (Array.isArray(body.childAges) && body.childAges.length > 0) ||
      (Array.isArray(body.requestContext?.participants?.children) &&
        body.requestContext.participants.children.length > 0);

    expect(hasChildContext).toBe(true);

    await expect(page).toHaveURL(/\/(kid|quest)/, { timeout: 30000 });
    await expect(
      page
        .getByRole("heading", { name: /What sounds good/i })
        .or(page.getByRole("heading", { level: 1 }))
        .or(page.getByRole("heading", { level: 2 }))
        .first()
    ).toBeVisible({ timeout: 30000 });
  });
});
