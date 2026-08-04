// src/features/app/useSafetySettings.js

import { useState } from "react";
import { buildDefaultFamilySettings } from "../family";

export function useSafetySettings() {
  const [safetySettings, setSafetySettings] = useState(
    () => buildDefaultFamilySettings().safetySettings
  );

  function updateSafetySetting(settingName, newValue) {
    setSafetySettings({
      ...safetySettings,
      [settingName]: newValue,
    });
  }

  function toggleSafetySetting(settingName) {
    setSafetySettings({
      ...safetySettings,
      [settingName]: !safetySettings[settingName],
    });
  }

  return {
    safetySettings,
    setSafetySettings,
    updateSafetySetting,
    toggleSafetySetting,
  };
}
