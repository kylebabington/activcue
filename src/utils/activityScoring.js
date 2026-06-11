export function normalizeTextValue(value) {
  // This helper makes text easier to compare.
  //
  // Example:
  // "Low" becomes "low"
  // "  LOW  " becomes "low"
  //
  // This protects us from capitalization or spacing weirdness.
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

export function getActivityDurationMinutes(activity) {
  // Prefer the new estimatedMinutes field from the backend.
  const estimatedMinutes = Number(activity.estimatedMinutes);

  // Number.isFinite checks that this is a real usable number.
  if (Number.isFinite(estimatedMinutes) && estimatedMinutes > 0) {
    return estimatedMinutes;
  }

  // Fallback: if no estimate exists, return null.
  // That lets the scoring function know it cannot judge duration.
  return null;
}

export function activityUsesItem(activity, itemName) {
  // Make sure activity.uses is an array.
  const uses = Array.isArray(activity.uses) ? activity.uses : [];

  // Normalize the item name we are looking for.
  const normalizedItemName = normalizeTextValue(itemName);

  // If itemName is missing or blank, this cannot match.
  if (!normalizedItemName) {
    return false;
  }

  // Check whether any item in activity.uses includes this item name.
  //
  // Example:
  // itemName = "lego"
  // use = "LEGO bricks"
  // match = true
  return uses.some((use) => {
    const normalizedUse = normalizeTextValue(use);

    return normalizedUse.includes(normalizedItemName);
  });
}

export function scoreActivityForCurrentMoment(activity, currentMoment) {
  // Every activity starts at zero.
  // Good matches add points.
  // Bad matches subtract points.
  let score = 0;

  // Normalize values so comparisons are reliable.
  const activityMess = normalizeTextValue(activity.mess);
  const activityEnergy = normalizeTextValue(activity.energy);
  const activityAdultHelp = normalizeTextValue(activity.adultHelp);

  const momentMessLevel = normalizeTextValue(currentMoment?.messLevel);
  const momentNoiseLevel = normalizeTextValue(currentMoment?.noiseLevel);
  const momentSupervisionLevel = normalizeTextValue(
    currentMoment?.supervisionLevel
  );
  const momentAvailability = normalizeTextValue(currentMoment?.availability);

  const targetMinutes = Number(currentMoment?.timeNeededMinutes) || 20;
  const activityMinutes = getActivityDurationMinutes(activity);

  const steps = Array.isArray(activity.steps) ? activity.steps : [];
  const uses = Array.isArray(activity.uses) ? activity.uses : [];
  const firstMoves = Array.isArray(activity.firstMoves)
    ? activity.firstMoves
    : [];
  const starterPrompts = Array.isArray(activity.starterPrompts)
    ? activity.starterPrompts
    : [];

  // ------------------------------------------------------------
  // 1. Duration scoring
  // ------------------------------------------------------------
  // If the activity has an estimated time and fits inside the parent's
  // requested window, reward it.
  if (activityMinutes !== null && activityMinutes <= targetMinutes) {
    score += 4;
  }

  // If it is only a tiny bit longer, minor penalty.
  // Example: parent needs 20 minutes, activity says 25.
  if (activityMinutes !== null && activityMinutes > targetMinutes) {
    const minutesOver = activityMinutes - targetMinutes;

    if (minutesOver <= 5) {
      score -= 1;
    } else if (minutesOver <= 10) {
      score -= 3;
    } else {
      score -= 6;
    }
  }

  // If no duration exists, small penalty.
  // We do not completely reject it, because old activities may not have this field.
  if (activityMinutes === null) {
    score -= 1;
  }

  // ------------------------------------------------------------
  // 2. Mess scoring
  // ------------------------------------------------------------
  // Exact mess match is good.
  if (activityMess && activityMess === momentMessLevel) {
    score += 4;
  }

  // If parent asked for low mess, medium/high mess should be punished.
  if (momentMessLevel === "low") {
    if (activityMess === "medium") {
      score -= 3;
    }

    if (activityMess === "high") {
      score -= 7;
    }
  }

  // If parent allows medium mess, high mess is still a little risky.
  if (momentMessLevel === "medium" && activityMess === "high") {
    score -= 2;
  }

  // ------------------------------------------------------------
  // 3. Noise / energy scoring
  // ------------------------------------------------------------
  // Your backend uses energy: low | medium | high.
  // Your currentMoment uses noiseLevel: quiet | normal | loud.
  //
  // So we map:
  // quiet  -> prefer low energy
  // normal -> low or medium are okay
  // loud   -> high is okay
  if (momentNoiseLevel === "quiet") {
    if (activityEnergy === "low") {
      score += 5;
    }

    if (activityEnergy === "medium") {
      score -= 2;
    }

    if (activityEnergy === "high") {
      score -= 7;
    }
  }

  if (momentNoiseLevel === "normal") {
    if (activityEnergy === "low" || activityEnergy === "medium") {
      score += 3;
    }

    if (activityEnergy === "high") {
      score -= 2;
    }
  }

  if (momentNoiseLevel === "loud") {
    if (activityEnergy === "high") {
      score += 3;
    }

    if (activityEnergy === "medium") {
      score += 2;
    }

    if (activityEnergy === "low") {
      score += 1;
    }
  }

  // ------------------------------------------------------------
  // 4. Adult help / supervision scoring
  // ------------------------------------------------------------
  // If the current moment says independent, we strongly prefer no adult help.
  if (
    momentSupervisionLevel === "independent" ||
    momentAvailability === "do-not-interrupt"
  ) {
    if (activityAdultHelp === "none") {
      score += 6;
    }

    if (activityAdultHelp === "optional") {
      score += 1;
    }

    if (activityAdultHelp === "needed") {
      score -= 10;
    }
  }

  // If mostly independent, optional help is okay.
  if (momentSupervisionLevel === "mostly-independent") {
    if (activityAdultHelp === "none") {
      score += 4;
    }

    if (activityAdultHelp === "optional") {
      score += 3;
    }

    if (activityAdultHelp === "needed") {
      score -= 5;
    }
  }

  // If adult is nearby/helper-welcome, adult optional is fine.
  if (
    momentSupervisionLevel === "nearby" ||
    momentAvailability === "helper-welcome"
  ) {
    if (activityAdultHelp === "none") {
      score += 2;
    }

    if (activityAdultHelp === "optional") {
      score += 3;
    }

    if (activityAdultHelp === "needed") {
      score -= 1;
    }
  }

  // ------------------------------------------------------------
  // 5. Startability scoring
  // ------------------------------------------------------------
  // We want quests that are easy to begin.
  //
  // A child should not have to read a novel before doing step one.
  if (firstMoves.length > 0) {
    score += 2;
  }

  if (starterPrompts.length > 0) {
    score += 1;
  }

  if (steps.length > 0 && steps.length <= 5) {
    score += 2;
  }

  if (steps.length > 5) {
    score -= 1;
  }

  // ------------------------------------------------------------
  // 6. Supplies scoring
  // ------------------------------------------------------------
  // Activities using known supplies are usually more actionable.
  if (uses.length > 0) {
    score += 2;
  }

  if (uses.length > 3) {
    score -= 1;
  }

  // ------------------------------------------------------------
  // 7. Extra safety penalties based on words in the activity
  // ------------------------------------------------------------
  // This is a simple guardrail.
  // It catches obvious risky words even if the structured fields are imperfect.
  const searchableActivityText = [
    activity.title,
    activity.summary,
    activity.theme,
    activity.mission,
    ...(Array.isArray(activity.steps) ? activity.steps : []),
    ...(Array.isArray(activity.uses) ? activity.uses : []),
  ]
    .join(" ")
    .toLowerCase();

  if (momentMessLevel === "low") {
    const messyWords = ["paint", "glue", "water", "mud", "slime", "sand"];

    const hasMessyWord = messyWords.some((word) =>
      searchableActivityText.includes(word)
    );

    if (hasMessyWord) {
      score -= 4;
    }
  }

  if (momentNoiseLevel === "quiet") {
    const loudWords = ["race", "jump", "shout", "yell", "drum", "dance party"];

    const hasLoudWord = loudWords.some((word) =>
      searchableActivityText.includes(word)
    );

    if (hasLoudWord) {
      score -= 4;
    }
  }

  return score;
}

export function scoreActivityFromHistory(activity, activityHistory) {
  // This function adjusts the score based on previous family feedback.
  //
  // It does NOT replace current-moment scoring.
  // It adds a memory layer on top of it.

  let score = 0;

  // If there is no history yet, there is nothing to learn from.
  if (!Array.isArray(activityHistory) || activityHistory.length === 0) {
    return score;
  }

  // Normalize current activity values.
  const activityEnergy = normalizeTextValue(activity.energy);
  const activityMess = normalizeTextValue(activity.mess);
  const activityAdultHelp = normalizeTextValue(activity.adultHelp);

  const steps = Array.isArray(activity.steps) ? activity.steps : [];
  const uses = Array.isArray(activity.uses) ? activity.uses : [];

  // Look at recent history only.
  // We do not want old feedback from months ago dominating forever.
  const recentHistory = activityHistory.slice(-30);

  // Count feedback types.
  const tooMessyCount = recentHistory.filter(
    (historyItem) => historyItem.feedbackType === "too-messy"
  ).length;

  const needQuieterCount = recentHistory.filter(
    (historyItem) => historyItem.feedbackType === "need-quieter"
  ).length;

  const tooHardCount = recentHistory.filter(
    (historyItem) => historyItem.feedbackType === "too-hard"
  ).length;

  const moreLikeThisItems = recentHistory.filter(
    (historyItem) =>
      historyItem.feedbackType === "more-like-this" ||
      historyItem.feedbackType === "timer-more-like-this"
  );

  const finishedItems = recentHistory.filter(
    (historyItem) => historyItem.feedbackType === "finished"
  );

  const canceledItems = recentHistory.filter(
    (historyItem) => historyItem.feedbackType === "canceled"
  );

  // ------------------------------------------------------------
  // Mess learning
  // ------------------------------------------------------------
  // If the family often rejects things as too messy,
  // penalize medium and high mess activities.
  if (tooMessyCount >= 2) {
    if (activityMess === "medium") {
      score -= 2;
    }

    if (activityMess === "high") {
      score -= 5;
    }
  }

  // ------------------------------------------------------------
  // Noise / energy learning
  // ------------------------------------------------------------
  // If the family often asks for quieter ideas,
  // penalize high energy and slightly penalize medium energy.
  if (needQuieterCount >= 2) {
    if (activityEnergy === "medium") {
      score -= 2;
    }

    if (activityEnergy === "high") {
      score -= 5;
    }

    if (activityEnergy === "low") {
      score += 2;
    }
  }

  // ------------------------------------------------------------
  // Difficulty learning
  // ------------------------------------------------------------
  // If activities are often too hard, prefer shorter step lists
  // and no-adult-help activities.
  if (tooHardCount >= 2) {
    if (steps.length > 5) {
      score -= 3;
    }

    if (steps.length > 0 && steps.length <= 4) {
      score += 2;
    }

    if (activityAdultHelp === "needed") {
      score -= 4;
    }

    if (activityAdultHelp === "none") {
      score += 2;
    }
  }

  // ------------------------------------------------------------
  // Positive learning from "more like this"
  // ------------------------------------------------------------
  // If the user asks for more like a previous quest,
  // boost activities with similar supplies.
  moreLikeThisItems.forEach((historyItem) => {
    const historyUses = Array.isArray(historyItem.uses) ? historyItem.uses : [];

    historyUses.forEach((usedItem) => {
      if (activityUsesItem(activity, usedItem)) {
        score += 2;
      }
    });
  });

  // ------------------------------------------------------------
  // Positive learning from finished quests
  // ------------------------------------------------------------
  // If quests were finished, reward similar basic traits.
  finishedItems.forEach((historyItem) => {
    if (historyItem.energy && normalizeTextValue(historyItem.energy) === activityEnergy) {
      score += 1;
    }

    if (historyItem.mess && normalizeTextValue(historyItem.mess) === activityMess) {
      score += 1;
    }

    if (
      historyItem.adultHelp &&
      normalizeTextValue(historyItem.adultHelp) === activityAdultHelp
    ) {
      score += 1;
    }
  });

  // ------------------------------------------------------------
  // Negative learning from canceled quests
  // ------------------------------------------------------------
  // If quests were canceled, gently penalize similar titles.
  // This avoids repeating a quest the family abandoned.
  canceledItems.forEach((historyItem) => {
    const historyTitle = normalizeTextValue(historyItem.title);
    const activityTitle = normalizeTextValue(activity.title);

    if (historyTitle && activityTitle && historyTitle === activityTitle) {
      score -= 6;
    }
  });

  // ------------------------------------------------------------
  // Supply sanity bonus
  // ------------------------------------------------------------
  // If the activity uses at least one item, give a tiny boost.
  // The more concrete it is, the easier it is to start.
  if (uses.length > 0) {
    score += 1;
  }

  return score;
}

export function getTotalActivityScore(activity, currentMoment, activityHistory) {
  const currentMomentScore = scoreActivityForCurrentMoment(
    activity,
    currentMoment
  );
  const historyScore = scoreActivityFromHistory(activity, activityHistory);
  return currentMomentScore + historyScore;
}

export function logActivityScoreTable(scoredOptions, currentMoment, activityHistory) {
  if (!import.meta.env.DEV) {
    return;
  }

  if (!Array.isArray(scoredOptions) || scoredOptions.length === 0) {
    return;
  }

  console.table(
    scoredOptions.map((item) => {
      return {
        title: item.activity.title,
        totalScore: item.score,
        currentMomentScore: scoreActivityForCurrentMoment(
          item.activity,
          currentMoment
        ),
        historyScore: scoreActivityFromHistory(item.activity, activityHistory),
        estimatedMinutes: item.activity.estimatedMinutes,
        mess: item.activity.mess,
        energy: item.activity.energy,
        adultHelp: item.activity.adultHelp,
      };
    })
  );
}