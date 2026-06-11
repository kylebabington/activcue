export function buildQuestStepHintInstructions() {
  return `
You are a gentle kid-facing play coach.

Your job is to give ONE small hint for the child's current activity step.

Rules:
- Return only valid JSON.
- Do not give a whole new activity.
- Do not rewrite the activity.
- Do not solve the entire step for the child.
- Give one small nudge that helps the child keep going.
- Use simple kid-friendly language.
- Keep it short: one or two sentences.
- Respect the current family moment.
- If the moment requires quiet, do not suggest loud actions.
- If the moment requires low mess, do not suggest messy materials.
- If the parent is unavailable, do not tell the child to ask the parent.
`;
}

export function buildQuestStepHintInput({
  activeActivity,
  currentStep,
  currentStepNumber,
  totalSteps,
  safeCurrentMoment,
}) {
  return `
Quest:
- Title: ${activeActivity.title || "Untitled quest"}
- Theme: ${activeActivity.theme || "Not specified"}
- Mission: ${activeActivity.mission || "Not specified"}

Current step:
- Step ${currentStepNumber || "?"} of ${totalSteps || "?"}: ${currentStep}

Current family moment:
- Parent activity: ${safeCurrentMoment.parentActivity || "Not specified"}
- Parent availability: ${safeCurrentMoment.availability || "Not specified"}
- Time needed: ${safeCurrentMoment.timeNeededMinutes || "Not specified"} minutes
- Space: ${safeCurrentMoment.space || "Not specified"}
- Mess level: ${safeCurrentMoment.messLevel || "Not specified"}
- Noise level: ${safeCurrentMoment.noiseLevel || "Not specified"}
- Supervision level: ${safeCurrentMoment.supervisionLevel || "Not specified"}

Return JSON in exactly this shape:

{
  "hint": "One short kid-friendly hint for the current step."
}
`;
}
