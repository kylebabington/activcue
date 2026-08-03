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
    recommendationBatchId: null,
    candidateId: null,
  });
}

export function markSuggestionsShownAt(
  at = nowIso(),
  { recommendationBatchId = null, candidateIds = [] } = {}
) {
  const current = readTiming();
  writeTiming({
    ...current,
    suggestionsShownAt: at,
    recommendationBatchId:
      recommendationBatchId || current.recommendationBatchId || null,
    candidateIds: Array.isArray(candidateIds) ? candidateIds : [],
  });

  trackProductEvent("recommendations_shown", {
    recommendationBatchId: recommendationBatchId || null,
    candidateCount: Array.isArray(candidateIds) ? candidateIds.length : 0,
  });
}

export function markActivitySelectedAt(
  at = nowIso(),
  { candidateId = null, recommendationBatchId = null } = {}
) {
  const current = readTiming();
  writeTiming({
    ...current,
    activitySelectedAt: at,
    candidateId: candidateId || current.candidateId || null,
    recommendationBatchId:
      recommendationBatchId || current.recommendationBatchId || null,
  });

  trackProductEvent("activity_selected", {
    candidateId: candidateId || null,
    recommendationBatchId: recommendationBatchId || null,
  });
}

export function markActivityStartedAt(
  at = nowIso(),
  { candidateId = null, recommendationBatchId = null } = {}
) {
  const current = readTiming();
  const next = {
    ...current,
    activityStartedAt: at,
    candidateId: candidateId || current.candidateId || null,
    recommendationBatchId:
      recommendationBatchId || current.recommendationBatchId || null,
  };
  writeTiming(next);

  const momentMs = toMs(next.momentCreatedAt);
  const suggestionsMs = toMs(next.suggestionsShownAt);
  const startedMs = toMs(at);
  const selectedMs = toMs(next.activitySelectedAt);

  const payload = {
    momentCreatedAt: next.momentCreatedAt || null,
    suggestionsShownAt: next.suggestionsShownAt || null,
    activityStartedAt: at,
    candidateId: next.candidateId || null,
    recommendationBatchId: next.recommendationBatchId || null,
  };

  if (momentMs != null && startedMs != null) {
    payload.msMomentToStart = startedMs - momentMs;
  }
  if (suggestionsMs != null && startedMs != null) {
    payload.msSuggestionsToStart = startedMs - suggestionsMs;
    payload.timeToStartMs = startedMs - suggestionsMs;
  }
  if (selectedMs != null && startedMs != null) {
    payload.msSelectedToStart = startedMs - selectedMs;
  }
  if (momentMs != null && suggestionsMs != null) {
    payload.msMomentToSuggestions = suggestionsMs - momentMs;
  }

  trackProductEvent("time_to_start", payload);
  return payload;
}
