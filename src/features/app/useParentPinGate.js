// src/features/app/useParentPinGate.js

import { useState } from "react";
import { saveParentPin as saveParentPinRemote } from "../family";
import { useLocalStorage } from "../../hooks/useLocalStorage";

export function useParentPinGate({ userId, showStatus } = {}) {
  const [parentPin, setParentPin] = useLocalStorage("parentPin", "");
  const [parentPinSet, setParentPinSet] = useState(Boolean(parentPin));
  const [parentAreaUnlocked, setParentAreaUnlocked] = useState(false);

  const parentAreasLocked =
    (parentPinSet || Boolean(parentPin)) && !parentAreaUnlocked;

  async function saveParentPin(newPin) {
    const cleanedPin = newPin.trim();

    if (cleanedPin.length < 4) {
      showStatus?.("PIN must be at least 4 digits.", "error");
      return;
    }

    try {
      await saveParentPinRemote(cleanedPin, {
        expectedUserId: userId,
      });
      setParentPin(cleanedPin);
      setParentPinSet(true);
      showStatus?.("Parent PIN saved.", "success");
    } catch (error) {
      console.error("Could not save parent PIN:", error);
      /*
       * Fall back to local PIN if settings row is not ready yet.
       */
      setParentPin(cleanedPin);
      setParentPinSet(true);
      showStatus?.(
        error instanceof Error
          ? error.message
          : "Parent PIN saved on this device only for now.",
        "info"
      );
    }
  }

  return {
    parentPin,
    setParentPin,
    parentPinSet,
    setParentPinSet,
    parentAreaUnlocked,
    setParentAreaUnlocked,
    parentAreasLocked,
    saveParentPin,
  };
}
