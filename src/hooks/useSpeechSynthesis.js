// src/hooks/useSpeechSynthesis.js

import { useEffect, useState } from "react";
import {
  cancelSpeech,
  getSpeechStatus,
  isSpeechSynthesisSupported,
  pauseSpeech,
  resumeSpeech,
  speak,
  subscribeSpeechStatus,
} from "../utils/speechSynthesis";

let pageLifecycleBound = false;
let subscriberCount = 0;

function ensurePageLifecycleBound() {
  if (pageLifecycleBound || typeof window === "undefined") return;
  pageLifecycleBound = true;

  function handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
      cancelSpeech();
    }
  }

  function handlePageHide() {
    cancelSpeech();
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", handlePageHide);
}

export function useSpeechSynthesis() {
  const [supported] = useState(() => isSpeechSynthesisSupported());
  const [speechState, setSpeechState] = useState(() => getSpeechStatus());

  useEffect(() => {
    if (!supported) return undefined;

    ensurePageLifecycleBound();
    subscriberCount += 1;
    const unsubscribe = subscribeSpeechStatus(setSpeechState);

    return () => {
      unsubscribe();
      subscriberCount = Math.max(0, subscriberCount - 1);
      // Only cancel when the last consumer leaves (e.g. leaving the quest).
      if (subscriberCount === 0) {
        cancelSpeech();
      }
    };
  }, [supported]);

  return {
    supported,
    status: speechState.status,
    activeKey: speechState.key,
    speak,
    pause: pauseSpeech,
    resume: resumeSpeech,
    cancel: cancelSpeech,
    isSpeaking: speechState.status === "speaking",
    isPaused: speechState.status === "paused",
    isIdle: speechState.status === "idle",
  };
}
