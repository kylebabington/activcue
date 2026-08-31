export function buildQuestStepHintInstructions() {
  return `
You are a gentle kid-facing play coach.

Your job is to give ONE concrete next action for THIS scene — the child's current step, not the whole activity.

Rules:
- Return only valid JSON.
- Do not give a whole new activity.
- Do not rewrite the activity.
- Do not solve the entire step for the child.
- Name a specific thing the child can do in the next minute using items they already have.
- Any hint must help solve the specific problem described in sceneSetup. Do not invent an unrelated action merely because it matches the activity theme.
- Stay inside this scene's job (sceneSetup + actions). Do not jump ahead to later scenes.
- Use simple kid-friendly language.
- Keep it short: one or two sentences.
- Respect the current family moment.
- If the moment requires quiet, do not suggest loud actions.
- If the moment requires low mess, do not suggest messy materials.
- If the parent is unavailable, do not tell the child to ask the parent.
- Prefer using items from the family's inventory and the activity's "Uses" list.
- Lean into the child's interests when helpful.
- Do not repeat starter ideas or previous hints. Give a different concrete action.

Never say things like:
- "try a simpler version"
- "do the easiest piece"
- "try something easier"
- "just finish this step"
- "you finished this step"
`;
}

export function buildQuestStepHintInput({
  activeActivity,
  currentStep,
  currentStepTitle,
  currentStepInstruction,
  currentStepNumber,
  totalSteps,
  sceneSetup,
  sceneOutcome,
  sceneActions,
  sceneDoneWhen,
  starterIdeas,
  previousHints,
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

  const storyText =
    activeActivity?.story ||
    activeActivity?.mission ||
    activeActivity?.summary ||
    "Not specified";

  const sceneTitle = currentStepTitle || currentStep || "Not specified";
  const sceneInstruction =
    currentStepInstruction || currentStep || "Not specified";
  const actionsList = Array.isArray(sceneActions)
    ? sceneActions.filter(Boolean)
    : sceneInstruction
      ? [sceneInstruction]
      : [];
  const starterLines = Array.isArray(starterIdeas)
    ? starterIdeas
        .map((idea) => {
          if (typeof idea === "string") return idea;
          const title = idea?.title || "";
          const example = idea?.example || "";
          return [title, example].filter(Boolean).join(" — ");
        })
        .filter(Boolean)
    : [];
  const previous = Array.isArray(previousHints)
    ? previousHints.filter(Boolean)
    : [];

  return `
Activity:
- Title: ${activeActivity.title || "Untitled activity"}
- Theme: ${activeActivity.theme || activeActivity.visualTheme || "Not specified"}
- Story: ${storyText}
- Uses: ${(Array.isArray(activeActivity.uses) ? activeActivity.uses : []).join(", ") || "Not specified"}

Current scene:
- Scene ${currentStepNumber || "?"} of ${totalSteps || "?"}: ${sceneTitle}
- Why this scene matters: ${sceneSetup || "Not specified"}
- Actions: ${actionsList.length > 0 ? actionsList.join(" | ") : sceneInstruction}
- Done when: ${sceneDoneWhen || "Not specified"}
${sceneOutcome ? `- Story consequence after success (for context only): ${sceneOutcome}` : ""}

Starter ideas already on the card (give a different action):
${starterLines.length > 0 ? starterLines.map((line) => `- ${line}`).join("\n") : "- None"}

Hints already given (do not repeat):
${previous.length > 0 ? previous.map((line) => `- ${line}`).join("\n") : "- None"}

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
