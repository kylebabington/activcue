// src/components/SpeakButton.jsx

import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { trackProductEvent } from "../utils/analytics";

/**
 * Accessible read-aloud control for a text section.
 */
export default function SpeakButton({
  text,
  label = "Read",
  speechKey,
  rate = 0.9,
  section = "step",
  className = "",
  size = "compact",
  onSpeakStart,
}) {
  const { supported, status, activeKey, speak, pause, resume, cancel } =
    useSpeechSynthesis();

  if (!supported) {
    return null;
  }

  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    return null;
  }

  const key = speechKey || trimmed;
  const isActive = activeKey === key;
  const isSpeaking = isActive && status === "speaking";
  const isPaused = isActive && status === "paused";

  function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (isSpeaking) {
      pause();
      return;
    }

    if (isPaused) {
      resume();
      return;
    }

    trackProductEvent("speech_read_requested", { section });
    onSpeakStart?.({ section, key });
    speak(trimmed, { rate, key });
  }

  function handleStop(event) {
    event.preventDefault();
    event.stopPropagation();
    cancel();
  }

  const buttonLabel = isSpeaking
    ? "Pause"
    : isPaused
      ? "Resume"
      : label;

  return (
    <span
      className={[
        "speak-button-group",
        size === "large" ? "speak-button-group--large" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className={
          size === "large"
            ? "speak-button speak-button--large"
            : "speak-button"
        }
        onClick={handleClick}
        aria-pressed={isSpeaking || isPaused}
        aria-label={buttonLabel}
      >
        {buttonLabel}
      </button>
      {isSpeaking || isPaused ? (
        <button
          type="button"
          className="speak-button speak-button--stop"
          onClick={handleStop}
          aria-label="Stop reading"
        >
          Stop
        </button>
      ) : null}
    </span>
  );
}
