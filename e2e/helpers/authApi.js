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

/**
 * Waits until anonymous auth has established a session.
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
    { timeout: timeoutMs }
  );
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

export async function listActivitySessions(page) {
  const body = await apiGet(page, "/api/family-memory/activity-sessions");
  return Array.isArray(body.activitySessions) ? body.activitySessions : [];
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
