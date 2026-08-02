// Tracks the guided first-run coach so a new family can finish one activity
// without opening Settings. Stored on-device only.

import { useLocalStorage } from "../hooks/useLocalStorage";

export const FIRST_RUN_STORAGE_KEY = "hasCompletedFirstRun";

export const FIRST_RUN_STEPS = {
  setMoment: "setMoment",
  generate: "generate",
  done: "done",
};

export function useFirstRunCoach() {
  const [completed, setCompleted] = useLocalStorage(
    FIRST_RUN_STORAGE_KEY,
    false
  );
  const [step, setStep] = useLocalStorage("firstRunStep", FIRST_RUN_STEPS.setMoment);

  const active = completed !== true;

  function markMomentSet() {
    if (!active) {
      return;
    }

    setStep(FIRST_RUN_STEPS.generate);
  }

  function markGenerated() {
    if (!active) {
      return;
    }

    setStep(FIRST_RUN_STEPS.done);
    setCompleted(true);
  }

  function dismiss() {
    setStep(FIRST_RUN_STEPS.done);
    setCompleted(true);
  }

  return {
    active,
    step: active ? step : FIRST_RUN_STEPS.done,
    highlightCooking: active && step === FIRST_RUN_STEPS.setMoment,
    pulseImBored: active && step === FIRST_RUN_STEPS.generate,
    markMomentSet,
    markGenerated,
    dismiss,
  };
}
