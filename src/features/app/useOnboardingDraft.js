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
    onboardingVersion: versionOverride = null,
    onboardingCompletedAt: completedOverride = undefined,
    onboardingSkippedAt: skippedOverride = undefined,
  } = {}) {
    const appliedChildren =
      Array.isArray(children) && children.length > 0 ? children : [];

    if (appliedChildren.length > 0) {
      setChildProfiles?.(appliedChildren);
      applyPlayingSelection?.([appliedChildren[0].id], appliedChildren);
    }

    if (Array.isArray(nextInventory) && nextInventory.length > 0) {
      setInventory?.(nextInventory);
    }

    if (moment && typeof moment === "object") {
      applyMomentDraft?.(moment);
    }

    const completedAt = new Date().toISOString();
    const onboardingMeta = {
      onboardingVersion:
        Number.isFinite(Number(versionOverride)) && Number(versionOverride) > 0
          ? Number(versionOverride)
          : 1,
      onboardingCompletedAt:
        completedOverride !== undefined
          ? completedOverride
          : skipped
            ? null
            : completedAt,
      onboardingSkippedAt:
        skippedOverride !== undefined
          ? skippedOverride
          : skipped
            ? completedAt
            : null,
    };

    setOnboardingVersion(onboardingMeta.onboardingVersion);
    setOnboardingCompletedAt(onboardingMeta.onboardingCompletedAt);
    setOnboardingSkippedAt(onboardingMeta.onboardingSkippedAt);

    try {
      window.localStorage.setItem(
        "ff_onboarding_meta",
        JSON.stringify(onboardingMeta)
      );
    } catch {
      // ignore
    }

    return {
      ...onboardingMeta,
      children: appliedChildren,
      inventory: Array.isArray(nextInventory) ? nextInventory : [],
      moment,
      skipped: Boolean(skipped),
    };
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
