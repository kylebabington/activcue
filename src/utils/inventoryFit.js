import { normalizeTextValue } from "./activityScoring";

export function getInventoryNames(inventory) {
  if (!Array.isArray(inventory)) {
    return [];
  }

  return inventory
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      return item?.name || "";
    })
    .filter(Boolean);
}

export function findOwnedInventoryMatches(useItem, inventoryNames) {
  const normalizedUse = normalizeTextValue(useItem);

  if (!normalizedUse) {
    return [];
  }

  return inventoryNames.filter((name) => {
    const normalizedName = normalizeTextValue(name);

    if (!normalizedName) {
      return false;
    }

    return (
      normalizedUse.includes(normalizedName) ||
      normalizedName.includes(normalizedUse)
    );
  });
}

export function scoreInventoryMatch(activity, inventory) {
  const uses = Array.isArray(activity?.uses) ? activity.uses : [];
  const inventoryNames = getInventoryNames(inventory);

  if (uses.length === 0) {
    return -2;
  }

  if (inventoryNames.length === 0) {
    return 0;
  }

  let matchedCount = 0;

  uses.forEach((useItem) => {
    if (findOwnedInventoryMatches(useItem, inventoryNames).length > 0) {
      matchedCount += 1;
    }
  });

  if (matchedCount === 0) {
    return -8;
  }

  return matchedCount * 4;
}

export function activityPassesInventorySoftCheck(activity, inventory) {
  const uses = Array.isArray(activity?.uses) ? activity.uses : [];
  const inventoryNames = getInventoryNames(inventory);

  if (uses.length === 0 || inventoryNames.length === 0) {
    return true;
  }

  return uses.some(
    (useItem) => findOwnedInventoryMatches(useItem, inventoryNames).length > 0
  );
}

export function normalizeActivityUsesToInventory(activity, inventory) {
  const uses = Array.isArray(activity?.uses) ? activity.uses : [];
  const inventoryNames = getInventoryNames(inventory);

  if (uses.length === 0 || inventoryNames.length === 0) {
    return {
      ...activity,
      uses,
      verifiedUses: [],
    };
  }

  const verifiedUses = [];
  const seen = new Set();

  uses.forEach((useItem) => {
    const matches = findOwnedInventoryMatches(useItem, inventoryNames);

    matches.forEach((match) => {
      const key = normalizeTextValue(match);

      if (!key || seen.has(key)) {
        return;
      }

      seen.add(key);
      verifiedUses.push(match);
    });
  });

  return {
    ...activity,
    uses: verifiedUses.length > 0 ? verifiedUses : uses,
    verifiedUses,
  };
}

export function normalizeActivitiesToInventory(activities, inventory) {
  if (!Array.isArray(activities)) {
    return [];
  }

  return activities.map((activity) =>
    normalizeActivityUsesToInventory(activity, inventory)
  );
}

export function buildInventoryOnlyFeedback(inventory) {
  const names = getInventoryNames(inventory);

  if (names.length === 0) {
    return "Only use common household items the family likely already has.";
  }

  return `ONLY use items from this owned inventory list: ${names.join(", ")}. Do not invent supplies that are not on the list.`;
}

export function getVerifiedFitFacts(activity, currentMoment) {
  const verifiedUses = Array.isArray(activity?.verifiedUses)
    ? activity.verifiedUses
    : [];
  const uses =
    verifiedUses.length > 0
      ? verifiedUses
      : Array.isArray(activity?.uses)
        ? activity.uses
        : [];

  const facts = [];

  if (uses.length > 0) {
    facts.push(`Uses ${uses.slice(0, 3).join(", ")}`);
  }

  if (currentMoment?.space) {
    facts.push(currentMoment.space);
  }

  const minutes = Number(activity?.estimatedMinutes);
  if (Number.isFinite(minutes) && minutes > 0) {
    facts.push(`${Math.round(minutes)} min`);
  }

  if (activity?.adultHelp === "none") {
    facts.push("No adult help");
  } else if (activity?.adultHelp === "optional") {
    facts.push("Adult optional");
  } else if (activity?.adultHelp === "needed") {
    facts.push("Adult needed");
  }

  return facts;
}

export function buildWhyThisFits(activity, currentMoment) {
  const facts = getVerifiedFitFacts(activity, currentMoment);

  if (facts.length === 0) {
    if (currentMoment?.parentActivity) {
      return `Fits ${currentMoment.parentActivity}.`;
    }

    return "";
  }

  const momentLabel = currentMoment?.parentActivity
    ? `Fits ${currentMoment.parentActivity}`
    : "Strong fit right now";

  return `${momentLabel}: ${facts.slice(0, 3).join(" · ")}.`;
}
