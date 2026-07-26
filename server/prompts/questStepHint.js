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
- Prefer using items from the family's inventory when suggesting materials.
- Lean into the child's interests when helpful.
`;
}

export function buildQuestStepHintInput({
  activeActivity,
  currentStep,
  currentStepNumber,
  totalSteps,
  safeCurrentMoment,
  activeChildProfile,
  inventory,
}) {
  const inventoryNames = Array.isArray(inventory)
    ? inventory
        .map((item) => (typeof item === "string" ? item : item?.name))
        .filter(Boolean)
        .slice(0, 40)
    : [];

  return `
Activity:
- Title: ${activeActivity.title || "Untitled activity"}
- Theme: ${activeActivity.theme || "Not specified"}
- Story: ${activeActivity.mission || "Not specified"}
- Uses: ${(Array.isArray(activeActivity.uses) ? activeActivity.uses : []).join(", ") || "Not specified"}

Current step:
- Step ${currentStepNumber || "?"} of ${totalSteps || "?"}: ${currentStep}

Child profile:
- Name: ${activeChildProfile?.name || "Not specified"}
- Interests: ${activeChildProfile?.interests || "Not specified"}
- Notes: ${activeChildProfile?.needs || "Not specified"}

Owned inventory (prefer these):
${inventoryNames.length > 0 ? inventoryNames.join(", ") : "Not specified"}

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
