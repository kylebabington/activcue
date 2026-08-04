// src/features/app/useActivitySessions.js

import { useEffect, useState } from "react";
import { listActivitySessions } from "../../api/familyMemoryApi";

export function useActivitySessions({ userId } = {}) {
  const [activitySessions, setActivitySessions] = useState([]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;

    listActivitySessions({ limit: 80 }, { expectedUserId: userId })
      .then((payload) => {
        if (cancelled) {
          return;
        }
        const sessions = Array.isArray(payload?.activitySessions)
          ? payload.activitySessions
          : [];
        setActivitySessions(sessions);
      })
      .catch((error) => {
        console.warn("Could not load activity sessions:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    activitySessions,
    setActivitySessions,
  };
}
