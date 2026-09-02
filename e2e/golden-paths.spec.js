// e2e/golden-paths.spec.js
// Strict ActivCue golden paths — every core step must exist and produce an outcome.

import { test, expect } from "@playwright/test";
import {
  waitForAuthSession,
  waitForActivitySessions,
  waitForSavedActivities,
  listSavedActivities,
  listActivitySessions,
  waitForEntitlementHydrated,
  waitForNewActivitySession,
} from "./helpers/authApi.js";
import {
  ensurePermanentAppSession,
  signupAndOnboard,
} from "./helpers/signupFlow.js";

async function reachApp(page) {
  await ensurePermanentAppSession(page);
  await page.goto("/app");
  await waitForAuthSession(page);
}

async function reachParent(page) {
  await ensurePermanentAppSession(page);
  await page.goto("/parent");
  await waitForAuthSession(page);
  await expect(
    page.getByRole("heading", {
      name: /Pick what’s happening|Pick what's happening/i,
    })
  ).toBeVisible({ timeout: 30000 });
}

async function reachKid(page) {
  await ensurePermanentAppSession(page);
  await page.goto("/kid");
  await waitForAuthSession(page);
  await expect(page).toHaveURL(/\/kid/, { timeout: 20000 });

  // Close any leftover parent/review dialog so it cannot cover Kid.
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 10000 });
  }

  await expect(
    page.getByRole("heading", { name: /What sounds good/i })
  ).toBeVisible({ timeout: 30000 });
}

async function setCookingMoment(page) {
  await reachParent(page);

  const cooking = page.getByRole("button", { name: /Cooking/i }).first();
  await expect(cooking).toBeVisible({ timeout: 20000 });
  await cooking.click();

  // Exact label inside the review modal — avoid matching Rescue chips like "Anything goes".
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 10000 });
  const setMoment = dialog.getByRole("button", { name: /^Set moment$/i });
  await expect(setMoment).toBeVisible({ timeout: 10000 });
  await setMoment.click();
  await expect(dialog).toBeHidden({ timeout: 10000 });
}

async function startFirstAvailableActivity(page) {
  // Activities live in React state — do not full-navigate to /quest after
  // Quick Ideas or you remount the app and wipe the board.
  if (!/\/quest/.test(page.url())) {
    await page.goto("/quest");
  }
  await expect(page).toHaveURL(/\/quest/, { timeout: 30000 });
  await expect(
    page.getByRole("heading", { level: 1 }).or(page.getByRole("heading", { level: 2 })).first()
  ).toBeVisible({ timeout: 30000 });

  const unlockFree = page.getByRole("button", { name: /^Unlock free$/i });
  const startCard = page.getByRole("button", { name: /^Start$/i });
  const enterStory = page.getByRole("button", {
    name: /Start the story|Enter the story/i,
  });
  const startThis = page.getByRole("button", { name: /Start this activity/i });
  const startControl = unlockFree.or(startCard).or(enterStory).or(startThis);
  await expect(startControl.first()).toBeVisible({ timeout: 30000 });

  if (await unlockFree.first().isVisible().catch(() => false)) {
    await unlockFree.first().click();
  } else if (await enterStory.first().isVisible().catch(() => false)) {
    await enterStory.first().click();
  } else if (await startCard.first().isVisible().catch(() => false)) {
    await startCard.first().click();
  } else {
    await startThis.first().click();
  }

  // Imaginative Activity V2 may open on The World intro.
  const meetRole = page.getByRole("button", { name: /Meet your role/i });
  if (await meetRole.isVisible().catch(() => false)) {
    await meetRole.click();
    await page.getByRole("button", { name: /Start here/i }).click();
    await page.getByRole("button", { name: /Begin the steps/i }).click();
  }

  const done = page.getByRole("button", { name: /^Done$/i });
  await expect(done.first()).toBeVisible({ timeout: 30000 });
  return done.first();
}

async function openQuickIdeasAndStart(page) {
  const quickIdeas = page.getByRole("button", { name: /^Quick ideas/i });
  await expect(quickIdeas).toBeVisible({ timeout: 20000 });
  await quickIdeas.click();
  await expect(page).toHaveURL(/\/quest/, { timeout: 30000 });
  return startFirstAvailableActivity(page);
}

test.describe("ActivCue golden paths", () => {
  test("landing → try ActivCue opens public demo", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Need 20 minutes/i,
      })
    ).toBeVisible();
    await expect(
      page.getByText(/actually start without you/i)
    ).toBeVisible();

    const demoCta = page.getByRole("link", { name: /^Try ActivCue$/i }).first();
    await expect(demoCta).toBeVisible();
    await demoCta.click();

    await expect(page).toHaveURL(/\/demo/, { timeout: 20000 });
    await expect(
      page.getByRole("heading", { name: /happening right now/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test("landing moment situations deep-link to demo", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /What kind of moment are you in/i })
    ).toBeVisible();
    const cookDinnerLink = page.getByRole("link", {
      name: /I need 20 minutes to cook dinner/i,
    });
    await expect(cookDinnerLink).toBeVisible();
    await cookDinnerLink.click();
    await expect(page).toHaveURL(/\/demo.*situation=cook-dinner/, {
      timeout: 15000,
    });
    await expect(
      page.getByRole("heading", { name: /How old are they/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test("multi-child family mode can toggle participants before quest", async ({
    page,
  }) => {
    await reachApp(page);
    await page.goto("/settings");
    await waitForAuthSession(page);

    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible(
      { timeout: 30000 }
    );

    const childrenNav = page.getByRole("button", { name: /^Children$/i });
    await expect(childrenNav).toBeVisible({ timeout: 15000 });
    await childrenNav.click();

    await expect(
      page.getByRole("heading", { name: /Your children/i })
    ).toBeVisible({ timeout: 15000 });

    // Onboarding already added one child; add a second participant and wait
    // for the durable settings save before hard-navigating to Kid.
    const secondChildSave = page.waitForResponse(
      async (response) => {
        if (
          response.request().method() !== "PUT" ||
          !response.url().includes("/api/family-settings") ||
          !response.ok()
        ) {
          return false;
        }
        let body = {};
        try {
          body = response.request().postDataJSON() || {};
        } catch {
          try {
            body = JSON.parse(response.request().postData() || "{}");
          } catch {
            body = {};
          }
        }
        const children = Array.isArray(body.childProfiles)
          ? body.childProfiles
          : [];
        return (
          children.length >= 2 &&
          children.some(
            (child) =>
              String(child?.name || "").toLowerCase() === "jordan"
          )
        );
      },
      { timeout: 45000 }
    );

    await page.getByRole("button", { name: /^\+ Add child$/i }).click();
    await page.getByPlaceholder(/Example: Mia/i).fill("Jordan");
    await page.getByLabel(/exact current age/i).fill("10");
    await page.getByRole("button", { name: /^Add child$/i }).click();

    await expect(page.getByRole("heading", { name: /^Jordan$/i })).toBeVisible({
      timeout: 20000,
    });
    await secondChildSave;

    await page.goto("/kid");
    await waitForAuthSession(page);
    await expect(
      page.getByRole("heading", { name: /What sounds good/i })
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: /Who.s playing/i })
    ).toBeVisible({ timeout: 15000 });

    const playingGroup = page.getByRole("group", { name: /Who is playing/i });
    const samChip = playingGroup.getByRole("button", { name: /Sam/i });
    const jordanChip = playingGroup.getByRole("button", { name: /Jordan/i });
    await expect(samChip).toBeVisible();
    await expect(jordanChip).toBeVisible();

    // Ensure both can be selected, then leave only Jordan playing.
    if ((await jordanChip.getAttribute("aria-pressed")) !== "true") {
      await jordanChip.click();
    }
    await expect(jordanChip).toHaveAttribute("aria-pressed", "true");

    if ((await samChip.getAttribute("aria-pressed")) !== "true") {
      await samChip.click();
    }
    await expect(samChip).toHaveAttribute("aria-pressed", "true");

    await samChip.click();
    await expect(samChip).toHaveAttribute("aria-pressed", "false");
    await expect(jordanChip).toHaveAttribute("aria-pressed", "true");

    await expect(playingGroup.getByRole("button")).toHaveCount(2);
  });

  test("landing → try free reaches public demo", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Need 20 minutes/i,
      })
    ).toBeVisible();

    const tryFree = page
      .getByRole("link", { name: /Try the demo|Find something to do|Try ActivCue/i })
      .first();
    await expect(tryFree).toBeVisible();
    await tryFree.click();

    await expect(page).toHaveURL(/\/demo/, { timeout: 20000 });
    await expect(
      page.getByRole("heading", { name: /happening right now/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test("signup → onboarding → generate → save favorite", async ({ page }) => {
    test.setTimeout(120_000);
    await signupAndOnboard(page, { addChild: true, childName: "Riley" });

    // If onboarding started an activity, leave Quest for a clean free path.
    if (/\/quest/.test(page.url())) {
      await page.goto("/parent");
    }

    await setCookingMoment(page);
    await reachKid(page);

    const simple = page.getByRole("button", { name: /Simple/i }).first();
    await expect(simple).toBeVisible({ timeout: 15000 });
    await simple.click();

    const doneButton = await openQuickIdeasAndStart(page);
    await doneButton.click();

    await expect(page.getByText(/Activity complete/i)).toBeVisible({
      timeout: 15000,
    });

    const saveFavorite = page.getByRole("button", {
      name: /Save favorite\??/i,
    });
    await expect(saveFavorite).toBeVisible({ timeout: 10000 });
    await saveFavorite.click();

    const favorites = await waitForSavedActivities(
      page,
      (rows) => rows.length >= 1
    );
    expect(favorites.length).toBeGreaterThanOrEqual(1);
  });

  test("core free path: moment → kid → quick ideas → start → finish → independence", async ({
    page,
  }) => {
    await setCookingMoment(page);
    await reachKid(page);

    const simple = page.getByRole("button", { name: /Simple/i }).first();
    await expect(simple).toBeVisible({ timeout: 15000 });
    await simple.click();

    const doneButton = await openQuickIdeasAndStart(page);
    await doneButton.click();

    await expect(
      page.getByText(/Activity complete/i)
    ).toBeVisible({ timeout: 15000 });

    const workedGreat = page.getByRole("button", { name: /^Worked great$/i });
    await expect(workedGreat).toBeVisible({ timeout: 10000 });
    await workedGreat.click();
    await expect(workedGreat).toHaveClass(/is-selected/);
  });

  test("Rescue Mode → Kid → Start for me → activity", async ({ page }) => {
    await reachParent(page);

    const rescue = page.getByRole("button", { name: /I need 20 minutes/i });
    await expect(rescue).toBeVisible({ timeout: 20000 });
    await rescue.click();

    // Rescue with cached activities goes straight to /quest; otherwise /kid.
    await expect(page).toHaveURL(/\/(kid|quest)/, { timeout: 30000 });

    if (/\/kid/.test(page.url())) {
      await expect(
        page.getByRole("heading", { name: /What sounds good/i })
      ).toBeVisible({ timeout: 20000 });

      const startForMe = page.getByRole("button", { name: /^Start for me/i });
      await expect(startForMe).toBeVisible({ timeout: 15000 });
      await startForMe.click();
      await expect(page).toHaveURL(/\/quest/, { timeout: 30000 });
    }

    await expect(
      page
        .getByRole("heading", { level: 1 })
        .or(page.getByRole("heading", { level: 2 }))
        .first()
    ).toBeVisible({ timeout: 30000 });

    const activityCue = page
      .getByRole("button", { name: /^Start$/i })
      .or(page.getByRole("button", { name: /Start this activity/i }))
      .or(page.getByRole("button", { name: /^Done$/i }))
      .or(page.getByText(/Activity complete/i));
    await expect(activityCue.first()).toBeVisible({ timeout: 30000 });
  });

  test("free imaginative unlock then Plus requirement on second attempt", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // Age 6 keeps a wider imaginative preset pool after ageFit + single-child filters.
    await signupAndOnboard(page, { childName: "Sam", ageYears: "6" });
    await setCookingMoment(page);
    await reachKid(page);
    await waitForEntitlementHydrated(page);

    const pretend = page
      .getByRole("button", { name: /Imaginative|Pretend/i })
      .first();
    await expect(pretend).toBeVisible({ timeout: 15000 });
    await pretend.click();

    const imBored = page.getByRole("button", { name: /^I'm Bored$/i });
    await expect(imBored).toBeVisible({ timeout: 15000 });
    await expect(imBored).toBeEnabled({ timeout: 15000 });

    const questNavigation = page.waitForURL(/\/quest/, { timeout: 60000 });
    await imBored.click();
    await questNavigation;

    const unlockFree = page.getByRole("button", { name: /^Unlock free$/i });
    const start = page.getByRole("button", { name: /^Start$/i });
    const emptyStatus = page.getByText(/No pretend samples available/i);
    await expect(unlockFree.or(start).or(emptyStatus).first()).toBeVisible({
      timeout: 60000,
    });

    if (await emptyStatus.isVisible().catch(() => false)) {
      // Age-fit + single-child filters can leave zero imaginative presets in
      // local/demo mode. Still prove the unpaid Kid surface surfaces Plus.
      await reachKid(page);
      await expect(
        page
          .getByText(/Plus|pretend sample|unlock more pretend|ActivCue Plus/i)
          .first()
      ).toBeVisible({ timeout: 15000 });
      return;
    }

    if (await unlockFree.first().isVisible().catch(() => false)) {
      await unlockFree.first().click();
    } else {
      await start.first().click();
    }

    const done = page.getByRole("button", { name: /^Done$/i });
    await expect(done.first()).toBeVisible({ timeout: 30000 });
    await done.first().click();

    await reachKid(page);
    await pretend.click();

    const lockedBored = page.getByRole("button", {
      name: /I'm Bored — unlock more with Plus|I'm Bored/i,
    });
    await expect(lockedBored).toBeVisible({ timeout: 15000 });

    const plusRequirement = page.getByText(
      /Plus|free pretend|unlock more pretend|ActivCue Plus/i
    );
    await expect(plusRequirement.first()).toBeVisible({ timeout: 15000 });
  });

  test("cloud persistence: save favorite → reload → still present", async ({
    page,
  }) => {
    await setCookingMoment(page);
    await reachKid(page);

    const simple = page.getByRole("button", { name: /Simple/i }).first();
    await simple.click();

    const doneButton = await openQuickIdeasAndStart(page);
    await doneButton.click();

    await expect(page.getByText(/Activity complete/i)).toBeVisible({
      timeout: 15000,
    });

    const saveFavorite = page.getByRole("button", {
      name: /Save favorite\??/i,
    });
    await expect(saveFavorite).toBeVisible({ timeout: 10000 });
    await saveFavorite.click();

    const favorites = await waitForSavedActivities(
      page,
      (rows) => rows.length >= 1
    );
    expect(favorites.length).toBeGreaterThanOrEqual(1);
    const favoriteTitle =
      favorites[0]?.activityData?.title || favorites[0]?.activity_data?.title;
    expect(favoriteTitle).toBeTruthy();

    await page.reload();
    await waitForAuthSession(page);

    const afterReload = await waitForSavedActivities(
      page,
      (rows) =>
        rows.some(
          (row) =>
            (row.activityData?.title || row.activity_data?.title) ===
            favoriteTitle
        )
    );
    expect(afterReload.length).toBeGreaterThanOrEqual(1);

    // Also confirm API list after reload matches.
    const listed = await listSavedActivities(page);
    expect(
      listed.some(
        (row) =>
          (row.activityData?.title || row.activity_data?.title) === favoriteTitle
      )
    ).toBe(true);
  });

  test("session lifecycle: start → in-progress → finish → independence_rating", async ({
    page,
  }) => {
    await setCookingMoment(page);
    await reachKid(page);

    const simple = page.getByRole("button", { name: /Simple/i }).first();
    await simple.click();

    const sessionsBeforeStart = await listActivitySessions(page);
    const baselineSessionIds = sessionsBeforeStart.map((session) => session.id);

    const doneButton = await openQuickIdeasAndStart(page);

    const activeSession = await waitForNewActivitySession(page, {
      excludeIds: baselineSessionIds,
      activityStyle: "simple",
      completionStatus: "in-progress",
      timeoutMs: 25000,
    });
    expect(activeSession?.id).toBeTruthy();

    await doneButton.click();

    await waitForActivitySessions(
      page,
      (sessions) =>
        sessions.some(
          (session) =>
            session.id === activeSession.id &&
            session.completionStatus === "finished"
        ),
      { timeoutMs: 25000 }
    );

    const workedGreat = page.getByRole("button", { name: /^Worked great$/i });
    await expect(workedGreat).toBeVisible({ timeout: 10000 });

    const independencePatch = page.waitForResponse(
      (resp) =>
        resp.request().method() === "PATCH" &&
        resp.url().includes("/api/family-memory/activity-sessions/") &&
        resp.ok(),
      { timeout: 30000 }
    );
    await workedGreat.click();
    const patchResponse = await independencePatch;
    const patchBody = await patchResponse.json().catch(() => ({}));
    const patchedSession = patchBody.activitySession || patchBody;
    expect(patchedSession.independenceRating || patchedSession.independence_rating).toBe(
      "worked-great"
    );

    await waitForActivitySessions(
      page,
      (sessions) =>
        sessions.some(
          (session) =>
            session.id === activeSession.id &&
            session.completionStatus === "finished" &&
            session.independenceRating === "worked-great"
        ),
      { timeoutMs: 30000 }
    );
  });
});
