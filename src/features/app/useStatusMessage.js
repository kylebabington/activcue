// src/features/app/useStatusMessage.js

import { useCallback, useState } from "react";

export function useStatusMessage() {
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info");

  const showStatus = useCallback((message, type = "info") => {
    if (!message) {
      setStatusMessage("");
      setStatusType("info");
      return;
    }

    setStatusMessage(message);
    setStatusType(type);
  }, []);

  return {
    statusMessage,
    statusType,
    setStatusMessage,
    setStatusType,
    showStatus,
  };
}
