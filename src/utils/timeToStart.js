// src/utils/timeToStart.js

import { trackProductEvent } from "./analytics";

const STORAGE_KEY = "ff_time_to_start";

function readTiming() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeTiming(next) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Timing must never break the app.
  }
}

function nowIso() {
  return new Date().toISOString();
}

function toMs(iso) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function getTimeToStartTiming() {
  return readTiming();
}

export function markMomentCreatedAt(at = nowIso()) {
  const current = readTiming();
  writeTiming({
    ...current,
    momentCreatedAt: at,
    suggestionsShownAt: null,
    activityStartedAt: null,
  });
}

export function markSuggestionsShownAt(at = nowIso()) {
  const current = readTiming();
  writeTiming({
    ...current,
    suggestionsShownAt: at,
  });
}

export function markActivityStartedAt(at = nowIso()) {
  const current = readTiming();
  const next = {
    ...current,
    activityStartedAt: at,
  };
  writeTiming(next);

  const momentMs = toMs(next.momentCreatedAt);
  const suggestionsMs = toMs(next.suggestionsShownAt);
  const startedMs = toMs(at);

  const payload = {
    momentCreatedAt: next.momentCreatedAt || null,
    suggestionsShownAt: next.suggestionsShownAt || null,
    activityStartedAt: at,
  };

  if (momentMs != null && startedMs != null) {
    payload.msMomentToStart = startedMs - momentMs;
  }
  if (suggestionsMs != null && startedMs != null) {
    payload.msSuggestionsToStart = startedMs - suggestionsMs;
  }
  if (momentMs != null && suggestionsMs != null) {
    payload.msMomentToSuggestions = suggestionsMs - momentMs;
  }

  trackProductEvent("time_to_start", payload);
  return payload;
}
