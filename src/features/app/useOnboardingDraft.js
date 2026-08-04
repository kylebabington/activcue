// src/features/app/useOnboardingDraft.js

import { useState } from "react";

export function useOnboardingDraft({
  setChildProfiles,
  applyPlayingSelection,
  setInventory,
  applyMomentDraft,
} = {}) {
  const [onboardingVersion, setOnboardingVersion] = useState(null);
  const [onboardingCompletedAt, setOnboardingCompletedAt] = useState(null);
  const [onboardingSkippedAt, setOnboardingSkippedAt] = useState(null);

  function applyOnboardingDraft({
    children = [],
    inventory: nextInventory = [],
    moment = null,
    skipped = false,
  } = {}) {
    if (Array.isArray(children) && children.length > 0) {
      setChildProfiles?.(children);
      applyPlayingSelection?.([children[0].id], children);
    }

    if (Array.isArray(nextInventory) && nextInventory.length > 0) {
      setInventory?.(nextInventory);
    }

    if (moment && typeof moment === "object") {
      applyMomentDraft?.(moment);
    }

    const completedAt = new Date().toISOString();
    setOnboardingVersion(1);
    if (skipped) {
      setOnboardingSkippedAt(completedAt);
      setOnboardingCompletedAt(null);
    } else {
      setOnboardingCompletedAt(completedAt);
      setOnboardingSkippedAt(null);
    }
    try {
      window.localStorage.setItem(
        "ff_onboarding_meta",
        JSON.stringify({
          onboardingVersion: 1,
          onboardingCompletedAt: skipped ? null : completedAt,
          onboardingSkippedAt: skipped ? completedAt : null,
        })
      );
    } catch {
      // ignore
    }
  }

  return {
    onboardingVersion,
    setOnboardingVersion,
    onboardingCompletedAt,
    setOnboardingCompletedAt,
    onboardingSkippedAt,
    setOnboardingSkippedAt,
    applyOnboardingDraft,
  };
}
