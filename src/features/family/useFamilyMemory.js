// src/features/family/useFamilyMemory.js

import { useCallback, useEffect, useRef, useState } from "react";
import {
  appendActivityEvent,
  clearActivityEvents,
  deleteSavedActivity,
  listActivityEvents,
  listSavedActivities,
  saveSavedActivity,
} from "../../api/familyMemoryApi";
import { useLocalStorage } from "../../hooks/useLocalStorage";

function flattenSavedRow(row) {
  const data =
    row?.activityData && typeof row.activityData === "object"
      ? row.activityData
      : {};

  return {
    ...data,
    id: row.id || data.id || crypto.randomUUID(),
    savedAt: row.savedAt || data.savedAt || new Date().toISOString(),
  };
}

function historyFromEvent(event) {
  const context =
    event?.context && typeof event.context === "object" ? event.context : {};

  return {
    id: event.id || crypto.randomUUID(),
    title: event.activityTitle || context.title || "Activity",
    feedbackType: event.eventType || "unknown",
    createdAt: event.createdAt || new Date().toISOString(),
    activityStyle: event.activityStyle || context.activityStyle || "",
    childId: event.childId || context.childId || "",
    childName: context.childName || "",
    kidMood: context.kidMood || "",
    messLevel: event.mess || context.messLevel || "",
    locationPreference: context.locationPreference || "",
    childAgeRange: context.childAgeRange || "",
    energy: event.energy || "",
    adultHelp: event.adultHelp || "",
    estimatedMinutes: event.estimatedMinutes ?? null,
    uses: Array.isArray(event.uses) ? event.uses : [],
  };
}

function eventFromHistoryItem(item) {
  return {
    activityTitle: item.title || "Activity",
    eventType: item.feedbackType || "unknown",
    childId: item.childId || "",
    activityStyle: item.activityStyle || "",
    energy: item.energy || "",
    mess: item.messLevel || item.mess || "",
    adultHelp: item.adultHelp || "",
    estimatedMinutes: item.estimatedMinutes ?? null,
    uses: Array.isArray(item.uses) ? item.uses : [],
    context: {
      kidMood: item.kidMood || "",
      childName: item.childName || "",
      locationPreference: item.locationPreference || "",
      childAgeRange: item.childAgeRange || "",
      activityMode: item.activityMode || "",
    },
  };
}

function favoritePayload(activity) {
  const activityData = { ...activity };
  delete activityData.id;
  delete activityData.savedAt;
  return activityData;
}

/*
 * First-class favorites + activity event history (tables), with one-time
 * import from localStorage when tables are empty.
 * Legacy family_settings JSON memory columns are ignored.
 */
export function useFamilyMemory({ userId } = {}) {
  const [savedActivities, setSavedActivities] = useLocalStorage(
    "savedActivities",
    []
  );
  const [activityHistory, setActivityHistory] = useLocalStorage(
    "activityHistory",
    []
  );
  const [memoryReady, setMemoryReady] = useState(false);
  const hydrateUserIdRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      setMemoryReady(false);
      return;
    }

    let cancelled = false;
    hydrateUserIdRef.current = userId;
    setMemoryReady(false);

    async function hydrate() {
      try {
        const [savedPayload, eventsPayload] = await Promise.all([
          listSavedActivities({ expectedUserId: userId }),
          listActivityEvents({ limit: 200 }, { expectedUserId: userId }),
        ]);

        if (cancelled || hydrateUserIdRef.current !== userId) {
          return;
        }

        let savedRows = Array.isArray(savedPayload?.savedActivities)
          ? savedPayload.savedActivities
          : [];
        let eventRows = Array.isArray(eventsPayload?.activityEvents)
          ? eventsPayload.activityEvents
          : [];

        const localSaved = Array.isArray(savedActivities) ? savedActivities : [];
        const localHistory = Array.isArray(activityHistory)
          ? activityHistory
          : [];

        if (savedRows.length === 0 && localSaved.length > 0) {
          for (const favorite of localSaved) {
            try {
              await saveSavedActivity(favoritePayload(favorite), {
                expectedUserId: userId,
              });
            } catch (error) {
              console.warn("Could not import saved activity:", error);
            }
          }

          const refreshed = await listSavedActivities({
            expectedUserId: userId,
          });
          savedRows = Array.isArray(refreshed?.savedActivities)
            ? refreshed.savedActivities
            : [];
        }

        if (eventRows.length === 0 && localHistory.length > 0) {
          for (const item of localHistory.slice(-200)) {
            try {
              await appendActivityEvent(eventFromHistoryItem(item), {
                expectedUserId: userId,
              });
            } catch (error) {
              console.warn("Could not import activity event:", error);
            }
          }

          const refreshed = await listActivityEvents(
            { limit: 200 },
            { expectedUserId: userId }
          );
          eventRows = Array.isArray(refreshed?.activityEvents)
            ? refreshed.activityEvents
            : [];
        }

        if (cancelled || hydrateUserIdRef.current !== userId) {
          return;
        }

        setSavedActivities(savedRows.map(flattenSavedRow));
        setActivityHistory(eventRows.map(historyFromEvent));
        setMemoryReady(true);
      } catch (error) {
        console.warn("Could not hydrate family memory tables:", error);
        if (!cancelled && hydrateUserIdRef.current === userId) {
          setMemoryReady(true);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
    // Local arrays are only seeds for one-time import on empty tables.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per user
  }, [userId]);

  const persistFavorite = useCallback(
    async (favoriteActivity) => {
      setSavedActivities((current) => [...current, favoriteActivity]);

      try {
        const response = await saveSavedActivity(
          favoritePayload(favoriteActivity),
          { expectedUserId: userId }
        );
        const row = response?.savedActivity;
        if (row?.id) {
          const flat = flattenSavedRow(row);
          setSavedActivities((current) =>
            current.map((item) =>
              item.id === favoriteActivity.id ? flat : item
            )
          );
        }
        return { ok: true, savedActivity: row || null };
      } catch (error) {
        setSavedActivities((current) =>
          current.filter((item) => item.id !== favoriteActivity.id)
        );
        console.error("Could not save favorite to cloud:", error);
        return { ok: false, error };
      }
    },
    [setSavedActivities, userId]
  );

  const removeFavorite = useCallback(
    async (activityId) => {
      let removed = null;
      setSavedActivities((current) => {
        removed = current.find((activity) => activity.id === activityId) || null;
        return current.filter((activity) => activity.id !== activityId);
      });

      try {
        await deleteSavedActivity(activityId, { expectedUserId: userId });
        return { ok: true };
      } catch (error) {
        if (removed) {
          setSavedActivities((current) => [...current, removed]);
        }
        console.error("Could not delete cloud favorite:", error);
        return { ok: false, error };
      }
    },
    [setSavedActivities, userId]
  );

  const appendHistory = useCallback(
    (historyItem) => {
      setActivityHistory((current) => [...current, historyItem].slice(-200));

      void appendActivityEvent(eventFromHistoryItem(historyItem), {
        expectedUserId: userId,
      }).catch((error) => {
        console.error("Could not append activity event:", error);
      });
    },
    [setActivityHistory, userId]
  );

  const clearHistory = useCallback(async () => {
    try {
      await clearActivityEvents({ expectedUserId: userId });
      setActivityHistory([]);
      return { ok: true };
    } catch (error) {
      console.error("Could not clear cloud activity history:", error);
      return { ok: false, error };
    }
  }, [setActivityHistory, userId]);

  return {
    savedActivities,
    setSavedActivities,
    activityHistory,
    setActivityHistory,
    memoryReady,
    persistFavorite,
    removeFavorite,
    appendHistory,
    clearHistory,
  };
}
