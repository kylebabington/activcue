// src/hooks/useReadingMode.js

import { useLocalStorage } from "./useLocalStorage";
import {
  buildReadingModePreference,
  getYoungestPlayingAgeYears,
  resolveReadingMode,
} from "../utils/readingMode";

export function useReadingMode() {
  const [readingModePreference, setReadingModePreference] = useLocalStorage(
    "readingMode",
    null
  );

  function getResolvedReadingMode(children) {
    return resolveReadingMode({
      preference: readingModePreference,
      youngestAgeYears: getYoungestPlayingAgeYears(children),
    });
  }

  function updateReadingModeSettings(values) {
    setReadingModePreference(buildReadingModePreference(values));
  }

  function clearReadingModePreference() {
    setReadingModePreference(null);
  }

  return {
    readingModePreference,
    setReadingModePreference,
    getResolvedReadingMode,
    updateReadingModeSettings,
    clearReadingModePreference,
  };
}
