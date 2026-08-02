// src/features/activities/useActivityGeneration.js

/*
 * Activity generation ownership surface.
 *
 * Full orchestration still receives App-owned deps (moment, entitlement,
 * inventory, navigate). This hook owns loading/status intent for generation
 * and exposes a stable API App can call without owning the machinery forever.
 */

import { useCallback, useState } from "react";

export function useActivityGeneration() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIntent, setLoadingIntent] = useState(null);

  const beginGeneration = useCallback((intent = "generate") => {
    setIsLoading(true);
    setLoadingIntent(intent);
  }, []);

  const endGeneration = useCallback(() => {
    setIsLoading(false);
    setLoadingIntent(null);
  }, []);

  return {
    isLoading,
    loadingIntent,
    setIsLoading,
    setLoadingIntent,
    beginGeneration,
    endGeneration,
    ready: true,
  };
}
