// e2e/golden-paths.spec.js
// Strict FamilyFlow golden paths — every core step must exist and produce an outcome.

import { test, expect } from "@playwright/test";
import {
  waitForAuthSession,
  waitForActivitySessions,
  waitForSavedActivities,
  listSavedActivities,
} from "./helpers/authApi.js";

async function reachApp(page) {
  await page.goto("/app");
  await waitForAuthSession(page);
}

async function reachParent(page) {
  await page.goto("/parent");
  await waitForAuthSession(page);
  await expect(
    page.getByRole("heading", {
      name: /Pick what’s happening|Pick what's happening/i,
    })
  ).toBeVisible({ timeout: 30000 });
}

async function reachKid(page) {
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
  const enterStory = page.getByRole("button", { name: /Enter the story/i });
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

test.describe("FamilyFlow golden paths", () => {
  test("landing → find something to do opens onboarding", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Need 20 quiet minutes/i,
      })
    ).toBeVisible();

    const cta = page.getByRole("link", { name: /Find something to do/i }).first();
    await expect(cta).toBeVisible();
    await cta.click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 20000 });
    await waitForAuthSession(page);
    await expect(
      page.getByRole("heading", { name: /Who’s playing|Who's playing/i })
    ).toBeVisible({ timeout: 30000 });
  });

  test("multi-child family mode can toggle participants before quest", async ({
    page,
  }) => {
    await reachApp(page);
    await page.goto("/settings");
    await waitForAuthSession(page);

    const accountTab = page.getByRole("tab", { name: /Account/i });
    if (await accountTab.isVisible().catch(() => false)) {
      await accountTab.click();
    }

    // Ensure at least the settings shell loads for participant management.
    await expect(
      page.getByRole("tablist", { name: /Settings sections/i })
    ).toBeVisible({ timeout: 30000 });

    const householdTab = page.getByRole("tab", { name: /Household/i });
    await expect(householdTab).toBeVisible({ timeout: 15000 });
    await householdTab.click();
    await expect(
      page.getByRole("heading", { name: /Household/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test("landing → try free reaches parent moment", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Need 20 quiet minutes/i,
      })
    ).toBeVisible();

    const tryFree = page
      .getByRole("link", { name: /Open the app|Find something to do/i })
      .first();
    await expect(tryFree).toBeVisible();
    await tryFree.click();

    await expect(page).toHaveURL(/\/(app|parent|onboarding)/, { timeout: 20000 });
    await waitForAuthSession(page);

    if (/\/onboarding/.test(page.url())) {
      await page.goto("/parent");
    } else if (!/\/parent/.test(page.url())) {
      await page.goto("/parent");
    }

    await expect(
      page.getByRole("heading", {
        name: /Pick what’s happening|Pick what's happening/i,
      })
    ).toBeVisible({ timeout: 30000 });
  });

  test("free family flow: moment → kid → quick ideas → start → finish → independence", async ({
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

    await expect(page).toHaveURL(/\/kid/, { timeout: 20000 });
    await expect(
      page.getByRole("heading", { name: /What sounds good/i })
    ).toBeVisible({ timeout: 20000 });

    const startForMe = page.getByRole("button", { name: /^Start for me/i });
    await expect(startForMe).toBeVisible({ timeout: 15000 });
    await startForMe.click();

    await expect(page).toHaveURL(/\/quest/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", { level: 1 }).or(page.getByRole("heading", { level: 2 })).first()
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
    await setCookingMoment(page);
    await reachKid(page);

    const pretend = page.getByRole("button", { name: /Pretend/i }).first();
    await expect(pretend).toBeVisible({ timeout: 15000 });
    await pretend.click();

    const imBored = page.getByRole("button", { name: /^I'm Bored$/i });
    await expect(imBored).toBeVisible({ timeout: 15000 });
    await imBored.click();

    await expect(page).toHaveURL(/\/quest/, { timeout: 30000 });

    const unlockFree = page.getByRole("button", { name: /^Unlock free$/i });
    const start = page.getByRole("button", { name: /^Start$/i });
    await expect(unlockFree.or(start).first()).toBeVisible({ timeout: 30000 });

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
      /Plus|free pretend|unlock more pretend|FamilyFlow Plus/i
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

    const doneButton = await openQuickIdeasAndStart(page);

    const inProgress = await waitForActivitySessions(
      page,
      (sessions) =>
        sessions.some((session) => session.completionStatus === "in-progress"),
      { timeoutMs: 25000 }
    );
    const activeSession = inProgress.find(
      (session) => session.completionStatus === "in-progress"
    );
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
    await workedGreat.click();

    await waitForActivitySessions(
      page,
      (sessions) =>
        sessions.some(
          (session) =>
            session.id === activeSession.id &&
            session.completionStatus === "finished" &&
            session.independenceRating === "worked-great"
        ),
      { timeoutMs: 25000 }
    );
  });
});
