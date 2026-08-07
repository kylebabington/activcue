// server/lib/claimDemoFreeUnlock.js

/**
 * Resolve which preset UUID should record a demo free unlock.
 * Prefers the activity matching the demo slug; otherwise any imaginative preset.
 */
export function resolveDemoUnlockPresetId(activitySlug, presets) {
  const slug = String(activitySlug || "").trim().toLowerCase();
  const list = Array.isArray(presets) ? presets : [];

  if (slug) {
    const exact = list.find(
      (row) => String(row?.slug || "").toLowerCase() === slug
    );
    if (exact?.id) {
      return exact.id;
    }
  }

  const imaginative = list.find(
    (row) => row?.activity_style === "imaginative" && row?.id
  );
  return imaginative?.id || null;
}

/**
 * Pure claim decision used by the route and contract tests.
 *
 * @returns {{ status: 'ok'|'already'|'conflict', freeImaginativeActivityId: string|null }}
 */
export function decideDemoFreeUnlockClaim({
  currentFreeImaginativeActivityId,
  unlockPresetId,
}) {
  if (currentFreeImaginativeActivityId) {
    if (
      unlockPresetId &&
      currentFreeImaginativeActivityId === unlockPresetId
    ) {
      return {
        status: "already",
        freeImaginativeActivityId: currentFreeImaginativeActivityId,
      };
    }

    return {
      status: "conflict",
      freeImaginativeActivityId: currentFreeImaginativeActivityId,
    };
  }

  if (!unlockPresetId) {
    return {
      status: "conflict",
      freeImaginativeActivityId: null,
    };
  }

  return {
    status: "ok",
    freeImaginativeActivityId: unlockPresetId,
  };
}
