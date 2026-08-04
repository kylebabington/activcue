// src/hooks/useKidDeviceMode.js

import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

export function useKidDeviceMode() {
  const [kidDeviceMode, setKidDeviceMode] = useLocalStorage(
    "kidDeviceMode",
    false
  );

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("kid") === "1") {
        setKidDeviceMode(true);
      }
    } catch {
      // Ignore malformed search strings.
    }
  }, [setKidDeviceMode]);

  function enableKidDeviceMode() {
    setKidDeviceMode(true);
  }

  function disableKidDeviceMode() {
    setKidDeviceMode(false);
  }

  function toggleKidDeviceMode() {
    setKidDeviceMode((current) => !current);
  }

  return {
    kidDeviceMode: Boolean(kidDeviceMode),
    setKidDeviceMode,
    enableKidDeviceMode,
    disableKidDeviceMode,
    toggleKidDeviceMode,
  };
}
