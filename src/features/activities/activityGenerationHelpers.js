// src/features/activities/activityGenerationHelpers.js

export function getKidEnergyInstruction(energyLevel) {
  if (energyLevel === "quiet") {
    return "The child feels quiet or low-energy. Prefer calm, low-noise activities. Avoid running, shouting, wild movement, or complex setup.";
  }

  if (energyLevel === "energetic") {
    return "The child has extra energy. Suggest movement or active engagement only if the current family moment allows it. If the parent moment requires quiet, choose contained energy like building, sorting, obstacle planning, or quiet movement.";
  }

  return "The child feels neutral. Suggest an activity with a balanced amount of effort.";
}

/*
 * Browser sends intent only. Full style policy lives in server/prompts.
 */
export function getKidActivityStyleInstruction(activityStyle) {
  if (activityStyle === "imaginative") {
    return "Intent: activityStyle=imaginative. Prefer pretend framing.";
  }

  return "Intent: activityStyle=simple. Prefer plain real-life activities.";
}

export function buildKidBoredFeedbackContext({
  kidActivityStyle,
  kidEnergyLevel,
}) {
  const activityStyle = kidActivityStyle;
  const styleInstruction = getKidActivityStyleInstruction(activityStyle);
  const energyInstruction = getKidEnergyInstruction(kidEnergyLevel);

  return `
The child chose activity style: ${activityStyle}.
${styleInstruction}

The child chose energy level: ${kidEnergyLevel}.
${energyInstruction}

Generate 3 activities that fit BOTH:
1. the child's chosen style and energy level
2. the current family moment

Very important:
If activityStyle is "simple", the activities should feel like normal things a kid might actually do at home.

Simple activity targets:
- "Draw a picture of your family"
- "Use your crystal growing kit"
- "Jump on the trampoline"
- "Build with blocks"
- "Read a book"
- "Do a puzzle"
- "Sort your cards"
- "Play catch outside"
- "Make a paper airplane"

For simple activities:
- use plain titles
- use plain summaries
- keep steps very short
- avoid elaborate missions
- avoid pretend roles
- avoid fantasy framing
- avoid making chores or crafts sound like quests
- do not over-explain

If activityStyle is "imaginative":
- playful quest language is required
- the mission must be a 3-to-5-sentence setup story, not a short goal line
- summary should hook the child with the story before listing actions

Always obey currentMoment limits for time, mess, noise, supervision, and parent availability.
`;
}

export function buildAutoStartFeedbackContext({
  kidActivityStyle,
  kidEnergyLevel,
}) {
  return `
The child wants the app to choose and start something automatically.

Use the child's current energy level: ${kidEnergyLevel}.
${getKidEnergyInstruction(kidEnergyLevel)}

Use the child's preferred style: ${kidActivityStyle}.
${getKidActivityStyleInstruction(kidActivityStyle)}

Generate 3 safe, easy-to-start options that fit the current family moment.

If the preferred style is "simple":
- choose normal real-life activities
- prefer activities like drawing, reading, building, puzzles, trampoline, kits, cards, toys, or simple outdoor play
- avoid elaborate story framing
- avoid complicated missions
- avoid long lists of steps
- avoid turning everything into pretend play

If the preferred style is "imaginative":
- lean into pretend play and a rich setup story
- the mission should be a 3-to-5-sentence setup story, not a short goal line

Prioritize activities that require the least decision-making from the child.
`;
}

export function filterStartableActivities({
  activities,
  freeImaginativeUnlockUsed,
  freeImaginativeActivityId,
}) {
  if (!Array.isArray(activities)) {
    return [];
  }

  if (!freeImaginativeUnlockUsed) {
    return activities.filter(Boolean);
  }

  return activities.filter(
    (activity) =>
      activity &&
      (!activity.isLocked ||
        (freeImaginativeActivityId && activity.id === freeImaginativeActivityId))
  );
}
