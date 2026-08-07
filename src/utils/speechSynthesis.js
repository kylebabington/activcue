// src/utils/speechSynthesis.js

const STATUS_IDLE = "idle";
const STATUS_SPEAKING = "speaking";
const STATUS_PAUSED = "paused";

const listeners = new Set();
let currentStatus = STATUS_IDLE;
let currentKey = null;
let activeUtterance = null;

function notify(status, key = currentKey) {
  currentStatus = status;
  currentKey = key;
  listeners.forEach((listener) => {
    listener({ status, key });
  });
}

export function isSpeechSynthesisSupported() {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

export function getSpeechStatus() {
  return { status: currentStatus, key: currentKey };
}

export function subscribeSpeechStatus(listener) {
  listeners.add(listener);
  listener(getSpeechStatus());
  return () => listeners.delete(listener);
}

export function cancelSpeech() {
  if (!isSpeechSynthesisSupported()) {
    notify(STATUS_IDLE, null);
    return;
  }
  activeUtterance = null;
  window.speechSynthesis.cancel();
  notify(STATUS_IDLE, null);
}

export function pauseSpeech() {
  if (!isSpeechSynthesisSupported()) return;
  if (currentStatus !== STATUS_SPEAKING) return;
  window.speechSynthesis.pause();
  notify(STATUS_PAUSED, currentKey);
}

export function resumeSpeech() {
  if (!isSpeechSynthesisSupported()) return;
  if (currentStatus !== STATUS_PAUSED) return;
  window.speechSynthesis.resume();
  notify(STATUS_SPEAKING, currentKey);
}

/**
 * Speak text via the Web Speech API. Cancels any in-progress utterance.
 * @param {string} text
 * @param {{ rate?: number, pitch?: number, key?: string|null, onEnd?: () => void, onError?: (error: Error) => void }} [options]
 */
export function speak(text, options = {}) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed || !isSpeechSynthesisSupported()) {
    options.onError?.(new Error("Speech synthesis unavailable"));
    return;
  }

  const rate = Number(options.rate);
  const pitch = Number(options.pitch);
  const key = options.key ?? trimmed;

  window.speechSynthesis.cancel();

  const utterance = new window.SpeechSynthesisUtterance(trimmed);
  utterance.rate = Number.isFinite(rate) && rate > 0 ? rate : 0.9;
  utterance.pitch = Number.isFinite(pitch) && pitch > 0 ? pitch : 1;
  activeUtterance = utterance;

  utterance.onstart = () => {
    if (activeUtterance !== utterance) return;
    notify(STATUS_SPEAKING, key);
  };

  utterance.onend = () => {
    if (activeUtterance !== utterance) return;
    activeUtterance = null;
    notify(STATUS_IDLE, null);
    options.onEnd?.();
  };

  utterance.onerror = () => {
    if (activeUtterance !== utterance) return;
    activeUtterance = null;
    notify(STATUS_IDLE, null);
    options.onError?.(new Error("Speech synthesis failed"));
  };

  notify(STATUS_SPEAKING, key);
  window.speechSynthesis.speak(utterance);
}
