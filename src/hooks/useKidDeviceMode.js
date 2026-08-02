// src/hooks/useKidDeviceMode.js

import { useLocalStorage } from "./useLocalStorage";

export function useKidDeviceMode() {
  const [kidDeviceMode, setKidDeviceMode] = useLocalStorage(
    "kidDeviceMode",
    false
  );

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
