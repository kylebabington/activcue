export function resolveActivityStyle(activityStyle, activityMode) {
  if (activityStyle === "simple" || activityStyle === "imaginative") {
    return activityStyle;
  }

  if (activityMode === "simple" || activityMode === "imaginative") {
    return activityMode;
  }

  return "simple";
}

export function buildSafeCurrentMoment(body) {
  const {
    currentMoment,
    parentActivity,
    parentAvailability,
    messLevel,
    activitySpace,
    safetySettings,
  } = body;

  return {
    parentActivity:
      currentMoment?.parentActivity ||
      parentActivity ||
      "Doing a household task",
    availability:
      currentMoment?.availability || parentAvailability || "ask-first",
    timeNeededMinutes: Number(
      currentMoment?.timeNeededMinutes ||
        safetySettings?.maxActivityMinutes ||
        20
    ),
    space: currentMoment?.space || activitySpace || "Living room",
    messLevel: currentMoment?.messLevel || messLevel || "low",
    noiseLevel:
      currentMoment?.noiseLevel ||
      (safetySettings?.quietMode ? "quiet" : "normal"),
    supervisionLevel:
      currentMoment?.supervisionLevel || "mostly-independent",
  };
}

export function buildSafeSafetySettings(safeCurrentMoment, safetySettings) {
  return {
    screenFreeOnly: safetySettings?.screenFreeOnly ?? true,
    noFoodActivities: safetySettings?.noFoodActivities ?? false,
    noWaterPlay: safetySettings?.noWaterPlay ?? true,
    noSmallObjects: safetySettings?.noSmallObjects ?? true,
    quietMode: safeCurrentMoment.noiseLevel === "quiet",
    maxActivityMinutes: safeCurrentMoment.timeNeededMinutes,
    adultHelpAllowed:
      safeCurrentMoment.supervisionLevel === "independent"
        ? "none"
        : safeCurrentMoment.supervisionLevel === "mostly-independent"
          ? "optional"
          : safetySettings?.adultHelpAllowed || "optional",
  };
}

export function normalizeActivity(activity, safeActivityStyle) {
  return {
    ...activity,
    activityStyle:
      activity.activityStyle === "simple" ||
      activity.activityStyle === "imaginative"
        ? activity.activityStyle
        : safeActivityStyle,
    starterPrompts: Array.isArray(activity.starterPrompts)
      ? activity.starterPrompts
      : [],
    firstMoves: Array.isArray(activity.firstMoves) ? activity.firstMoves : [],
    steps: Array.isArray(activity.steps) ? activity.steps : [],
    roles: Array.isArray(activity.roles) ? activity.roles : [],
    extensionIdeas: Array.isArray(activity.extensionIdeas)
      ? activity.extensionIdeas
      : [],
    uses: Array.isArray(activity.uses) ? activity.uses : [],
  };
}
