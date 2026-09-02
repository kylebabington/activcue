// e2e/helpers/authApi.js
// Helpers for asserting cloud persistence from Playwright without soft-skipping UI.

/**
 * Reads the Supabase access token from the browser's localStorage.
 */
export async function getAccessToken(page) {
  const token = await page.evaluate(() => {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.includes("auth-token")) {
        continue;
      }
      try {
        const raw = window.localStorage.getItem(key);
        const parsed = JSON.parse(raw);
        const accessToken =
          parsed?.access_token ||
          parsed?.currentSession?.access_token ||
          null;
        if (accessToken) {
          return accessToken;
        }
      } catch {
        // Ignore non-JSON storage entries.
      }
    }
    return null;
  });

  if (!token) {
    throw new Error("Could not find Supabase access token in localStorage.");
  }

  return token;
}

function readAuthSessionFromStorage() {
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.includes("auth-token")) {
      continue;
    }
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key));
      const session =
        parsed?.currentSession ||
        parsed?.session ||
        (parsed?.access_token ? parsed : null);
      const accessToken =
        session?.access_token || parsed?.access_token || null;
      if (!accessToken) {
        continue;
      }
      const user = session?.user || parsed?.user || null;
      return {
        accessToken,
        user,
        isAnonymous:
          user?.is_anonymous === true ||
          user?.app_metadata?.provider === "anonymous",
      };
    } catch {
      // Ignore.
    }
  }
  return null;
}

/**
 * Waits until anonymous or permanent auth has established a session.
 */
export async function waitForAuthSession(page, timeoutMs = 30000) {
  await page.waitForFunction(
    () => {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key || !key.includes("auth-token")) {
          continue;
        }
        try {
          const parsed = JSON.parse(window.localStorage.getItem(key));
          if (
            parsed?.access_token ||
            parsed?.currentSession?.access_token
          ) {
            return true;
          }
        } catch {
          // Ignore.
        }
      }
      return false;
    },
    undefined,
    { timeout: timeoutMs }
  );
}

/**
 * Waits until a permanent (non-anonymous) Supabase session is present.
 */
export async function waitForPermanentAuthSession(page, timeoutMs = 30000) {
  await page.waitForFunction(
    () => {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key || !key.includes("auth-token")) {
          continue;
        }
        try {
          const parsed = JSON.parse(window.localStorage.getItem(key));
          const session =
            parsed?.currentSession ||
            parsed?.session ||
            (parsed?.access_token ? parsed : null);
          const accessToken =
            session?.access_token || parsed?.access_token || null;
          if (!accessToken) {
            continue;
          }
          const user = session?.user || parsed?.user || null;
          if (!user) {
            continue;
          }
          const isAnonymous =
            user.is_anonymous === true ||
            user.app_metadata?.provider === "anonymous";
          if (!isAnonymous) {
            return true;
          }
        } catch {
          // Ignore.
        }
      }
      return false;
    },
    undefined,
    { timeout: timeoutMs }
  );
}

export async function getAuthSessionInfo(page) {
  return page.evaluate(readAuthSessionFromStorage);
}

async function apiGet(page, path) {
  const token = await getAccessToken(page);
  const response = await page.request.get(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok()) {
    throw new Error(
      `GET ${path} failed: ${response.status()} ${await response.text()}`
    );
  }
  return response.json();
}

export async function getFamilySettings(page) {
  return apiGet(page, "/api/family-settings");
}

export async function waitForOnboardingPersisted(
  page,
  {
    childName = null,
    requireCompleted = true,
    timeoutMs = 30000,
    intervalMs = 500,
  } = {}
) {
  const startedAt = Date.now();
  let lastBody = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      lastBody = await getFamilySettings(page);
      const settings = lastBody?.settings || null;
      const children = Array.isArray(settings?.childProfiles)
        ? settings.childProfiles
        : [];
      const hasChild = childName
        ? children.some(
            (child) =>
              String(child?.name || "").toLowerCase() ===
              String(childName).toLowerCase()
          )
        : children.length > 0;
      const completed = Boolean(settings?.onboardingCompletedAt);
      const skipped = Boolean(settings?.onboardingSkippedAt);

      if (hasChild && (!requireCompleted || completed || skipped)) {
        return lastBody;
      }
    } catch {
      // Retry until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timed out waiting for onboarding persistence. Last payload=${JSON.stringify(lastBody)}`
  );
}

export async function waitForEntitlementHydrated(page, { timeoutMs = 30000 } = {}) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const body = await apiGet(page, "/api/auth/me");
      if (body?.entitlement && typeof body.entitlement === "object") {
        return body.entitlement;
      }
      lastError = new Error(
        `GET /api/auth/me missing entitlement: ${JSON.stringify(body)}`
      );
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error(
    `Timed out waiting for entitlement hydration. ${lastError instanceof Error ? lastError.message : lastError}`
  );
}

export async function listActivitySessions(page) {
  const body = await apiGet(page, "/api/family-memory/activity-sessions");
  return Array.isArray(body.activitySessions) ? body.activitySessions : [];
}

export function pickNewestMatchingSession(
  sessions,
  {
    excludeIds = [],
    activityStyle = null,
    completionStatus = null,
  } = {}
) {
  const excluded = new Set(excludeIds.filter(Boolean));
  const matches = sessions.filter((session) => {
    if (!session?.id || excluded.has(session.id)) {
      return false;
    }
    if (activityStyle && session.activityStyle !== activityStyle) {
      return false;
    }
    if (completionStatus && session.completionStatus !== completionStatus) {
      return false;
    }
    return true;
  });

  return matches.sort((left, right) => {
    const leftTime = Date.parse(left.startedAt || left.createdAt || 0);
    const rightTime = Date.parse(right.startedAt || right.createdAt || 0);
    return rightTime - leftTime;
  })[0];
}

export async function waitForNewActivitySession(
  page,
  {
    excludeIds = [],
    activityStyle = null,
    completionStatus = "in-progress",
    timeoutMs = 25000,
    intervalMs = 500,
  } = {}
) {
  const startedAt = Date.now();
  let lastSessions = [];

  while (Date.now() - startedAt < timeoutMs) {
    lastSessions = await listActivitySessions(page);
    const match = pickNewestMatchingSession(lastSessions, {
      excludeIds,
      activityStyle,
      completionStatus,
    });
    if (match) {
      return match;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timed out waiting for new activity session. excludeIds=${JSON.stringify(excludeIds)} activityStyle=${activityStyle || "any"} completionStatus=${completionStatus || "any"} last=${JSON.stringify(lastSessions)}`
  );
}

export async function listSavedActivities(page) {
  const body = await apiGet(page, "/api/family-memory/saved-activities");
  return Array.isArray(body.savedActivities) ? body.savedActivities : [];
}

/**
 * Poll until a predicate matches the sessions list.
 */
export async function waitForActivitySessions(
  page,
  predicate,
  { timeoutMs = 20000, intervalMs = 500 } = {}
) {
  const startedAt = Date.now();
  let lastSessions = [];

  while (Date.now() - startedAt < timeoutMs) {
    lastSessions = await listActivitySessions(page);
    if (predicate(lastSessions)) {
      return lastSessions;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timed out waiting for activity sessions. Last count=${lastSessions.length} payload=${JSON.stringify(lastSessions)}`
  );
}

export async function waitForSavedActivities(
  page,
  predicate,
  { timeoutMs = 20000, intervalMs = 500 } = {}
) {
  const startedAt = Date.now();
  let lastFavorites = [];

  while (Date.now() - startedAt < timeoutMs) {
    lastFavorites = await listSavedActivities(page);
    if (predicate(lastFavorites)) {
      return lastFavorites;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timed out waiting for saved activities. Last count=${lastFavorites.length}`
  );
}
