// src/features/family/useParentMoment.js

import { useState } from "react";
import { buildDefaultFamilySettings } from "../../constants/familySettingsDefaults";

export function parentStatusFromMoment(moment) {
  return {
    activity: moment.parentActivity,
    availability: moment.availability,
  };
}

export function useParentMoment({
  showStatus,
  navigate,
  firstRunCoach,
  setParentStatus,
  lastSuccessfulMoment,
  setLastCompletedQuest,
} = {}) {
  const [currentMoment, setCurrentMoment] = useState(
    () => buildDefaultFamilySettings().currentMoment
  );
  const [customParentPresets, setCustomParentPresets] = useState([]);
  const [activePresetKey, setActivePresetKey] = useState("");

  function applyMomentDraft(draft, options = {}) {
    setCurrentMoment({
      parentActivity: draft.parentActivity,
      availability: draft.availability,
      timeNeededMinutes: draft.timeNeededMinutes,
      space: draft.space,
      messLevel: draft.messLevel,
      noiseLevel: draft.noiseLevel,
      supervisionLevel: draft.supervisionLevel,
    });
    setParentStatus?.(parentStatusFromMoment(draft));
    showStatus?.(
      `Live for kids now: "${draft.parentActivity}".`,
      "success"
    );

    if (options.navigateToKid || firstRunCoach?.active) {
      firstRunCoach?.markMomentSet?.();
      navigate?.("/kid");
    }
  }

  function saveCustomParentPreset(label, draft) {
    const preset = {
      id: crypto.randomUUID(),
      label: label.trim(),
      activity: draft.parentActivity,
      availability: draft.availability,
      timeNeededMinutes: draft.timeNeededMinutes,
      space: draft.space,
      messLevel: draft.messLevel,
      noiseLevel: draft.noiseLevel,
      supervisionLevel: draft.supervisionLevel,
    };

    setCustomParentPresets((current) => [...current, preset]);
    showStatus?.(`Saved "${preset.label}".`, "success");
    return preset;
  }

  function updateCustomParentPreset(presetId, label, draft) {
    setCustomParentPresets((current) =>
      current.map((preset) => {
        if (preset.id !== presetId) {
          return preset;
        }

        return {
          ...preset,
          label: label.trim() || preset.label,
          activity: draft.parentActivity,
          availability: draft.availability,
          timeNeededMinutes: draft.timeNeededMinutes,
          space: draft.space,
          messLevel: draft.messLevel,
          noiseLevel: draft.noiseLevel,
          supervisionLevel: draft.supervisionLevel,
        };
      })
    );
    showStatus?.("Custom moment updated.", "success");
  }

  function deleteCustomParentPreset(presetId) {
    setCustomParentPresets((current) => {
      const preset = current.find((item) => item.id === presetId);
      const confirmed = window.confirm(
        preset
          ? `Delete custom moment "${preset.label}"?`
          : "Delete this custom moment?"
      );

      if (!confirmed) {
        return current;
      }

      showStatus?.(
        preset ? `Deleted "${preset.label}".` : "Custom moment deleted.",
        "success"
      );

      if (activePresetKey === presetId) {
        setActivePresetKey("");
      }

      return current.filter((item) => item.id !== presetId);
    });
  }

  function reapplyLastSuccessfulMoment() {
    if (!lastSuccessfulMoment?.parentActivity) {
      showStatus?.("Finish an activity first to reuse that moment.", "info");
      return;
    }

    applyMomentDraft(
      {
        parentActivity: lastSuccessfulMoment.parentActivity,
        availability:
          lastSuccessfulMoment.availability || "helper-welcome",
        timeNeededMinutes:
          Number(lastSuccessfulMoment.timeNeededMinutes) || 20,
        space: lastSuccessfulMoment.space || "Living room",
        messLevel: lastSuccessfulMoment.messLevel || "low",
        noiseLevel: lastSuccessfulMoment.noiseLevel || "normal",
        supervisionLevel:
          lastSuccessfulMoment.supervisionLevel || "independent",
      },
      { navigateToKid: true }
    );
    setLastCompletedQuest?.(null);
  }

  return {
    currentMoment,
    setCurrentMoment,
    customParentPresets,
    setCustomParentPresets,
    activePresetKey,
    setActivePresetKey,
    applyMomentDraft,
    saveCustomParentPreset,
    updateCustomParentPreset,
    deleteCustomParentPreset,
    reapplyLastSuccessfulMoment,
  };
}
