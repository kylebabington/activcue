// Contextual tips after onboarding — not the primary setup path.
// Device-local only; onboarding owns first-run setup.

import { useLocalStorage } from "../hooks/useLocalStorage";

export const CONTEXT_COACH_STORAGE_KEY = "ff_context_coach_v1";

export const CONTEXT_COACH_TIPS = {
  planB: "planB",
  rescue: "rescue",
  learning: "learning",
  done: "done",
};

const TIP_ORDER = [
  CONTEXT_COACH_TIPS.planB,
  CONTEXT_COACH_TIPS.rescue,
  CONTEXT_COACH_TIPS.learning,
];

/** @deprecated Use CONTEXT_COACH_* — kept for older imports. */
export const FIRST_RUN_STORAGE_KEY = CONTEXT_COACH_STORAGE_KEY;
export const FIRST_RUN_STEPS = CONTEXT_COACH_TIPS;

export function useFirstRunCoach() {
  const [dismissedTips, setDismissedTips] = useLocalStorage(
    CONTEXT_COACH_STORAGE_KEY,
    []
  );
  const dismissed = Array.isArray(dismissedTips) ? dismissedTips : [];

  const nextTip =
    TIP_ORDER.find((tip) => !dismissed.includes(tip)) || CONTEXT_COACH_TIPS.done;

  function dismissTip(tip = nextTip) {
    if (!tip || tip === CONTEXT_COACH_TIPS.done) {
      return;
    }
    setDismissedTips((current) => {
      const list = Array.isArray(current) ? current : [];
      if (list.includes(tip)) {
        return list;
      }
      return [...list, tip];
    });
  }

  function dismiss() {
    setDismissedTips([...TIP_ORDER]);
  }

  // Legacy API used by Parent/Kid pages — keep harmless no-ops / soft mappings.
  function markMomentSet() {
    // Onboarding owns moment setup now.
  }

  function markGenerated() {
    dismissTip(CONTEXT_COACH_TIPS.planB);
  }

  return {
    active: nextTip !== CONTEXT_COACH_TIPS.done,
    step: nextTip,
    tip: nextTip,
    tipCopy: {
      [CONTEXT_COACH_TIPS.planB]:
        "Not the right fit? Try the next best one — that’s Plan B.",
      [CONTEXT_COACH_TIPS.rescue]:
        "Everything falling apart? Rescue Mode is a calm fallback.",
      [CONTEXT_COACH_TIPS.learning]:
        "After activities, say how independent it felt so suggestions improve.",
    }[nextTip] || "",
    highlightCooking: false,
    pulseImBored: false,
    markMomentSet,
    markGenerated,
    dismissTip,
    dismiss,
  };
}
