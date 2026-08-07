// src/api/demoApi.js

import { authenticatedRequest } from "./apiClient";
import { supabase } from "../lib/supabaseClient";

const DEMO_UNLOCK_STORAGE_KEY = "familyflow.demo.fullUnlock";

/**
 * Ensure a Supabase session exists for claiming the demo unlock.
 * Creates an anonymous user only when needed (not on mere /demo browse).
 */
export async function ensureSessionForDemoUnlock() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (sessionData.session) {
    return sessionData.session;
  }

  const { data: anonymousData, error: anonymousError } =
    await supabase.auth.signInAnonymously();

  if (anonymousError) {
    throw anonymousError;
  }

  if (!anonymousData.session) {
    throw new Error("Could not create a session for the demo unlock.");
  }

  return anonymousData.session;
}

/**
 * Claim the one free full-activity unlock for the current (anon) session.
 */
export async function claimDemoFreeUnlock(activitySlug) {
  await ensureSessionForDemoUnlock();

  const response = await authenticatedRequest("/api/demo/claim-free-unlock", {
    method: "POST",
    body: JSON.stringify({ activitySlug: activitySlug || "" }),
  });

  const data = await response.json();

  try {
    window.localStorage.setItem(
      DEMO_UNLOCK_STORAGE_KEY,
      JSON.stringify({
        used: true,
        activitySlug: activitySlug || null,
        freeImaginativeActivityId: data.freeImaginativeActivityId || null,
        at: Date.now(),
      })
    );
  } catch {
    // localStorage is best-effort UX cache only
  }

  return data;
}

export function readDemoUnlockCache() {
  try {
    const raw = window.localStorage.getItem(DEMO_UNLOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.used ? parsed : null;
  } catch {
    return null;
  }
}

export { DEMO_UNLOCK_STORAGE_KEY };
