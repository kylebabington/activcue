// src/features/app/useActivityPreferences.js

import { useState } from "react";
import {
  DEFAULT_ACTIVITY_PREFERENCES,
  normalizeActivityPreferences,
} from "../../constants/activityPreferences";

export function useActivityPreferences() {
  const [activityPreferences, setActivityPreferencesRaw] = useState(
    () => ({ ...DEFAULT_ACTIVITY_PREFERENCES })
  );
  const [assumeHouseholdBasics, setAssumeHouseholdBasics] = useState(true);

  function setActivityPreferences(next) {
    setActivityPreferencesRaw(normalizeActivityPreferences(next));
  }

  function updateActivityPreference(key, value) {
    setActivityPreferencesRaw((current) =>
      normalizeActivityPreferences({
        ...current,
        [key]: value,
      })
    );
  }

  return {
    activityPreferences,
    setActivityPreferences,
    updateActivityPreference,
    assumeHouseholdBasics,
    setAssumeHouseholdBasics,
  };
}
