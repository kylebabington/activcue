// src/utils/offlineQueue.js

const QUEUE_KEY = "ff_offline_event_queue";

export function readOfflineQueue() {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineEvent(entry) {
  try {
    const next = [...readOfflineQueue(), entry].slice(-100);
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  } catch {
    // Offline queue must never break the app.
  }
}

export function clearOfflineQueue() {
  try {
    window.localStorage.removeItem(QUEUE_KEY);
  } catch {
    // ignore
  }
}

export function replaceOfflineQueue(entries) {
  try {
    window.localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify(Array.isArray(entries) ? entries.slice(-100) : [])
    );
  } catch {
    // ignore
  }
}
