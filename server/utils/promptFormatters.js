export function formatInventoryForPrompt(inventory) {
  if (!Array.isArray(inventory)) {
    return "No inventory provided.";
  }

  const normalizedInventory = inventory.map((item) => {
    if (typeof item === "string") {
      return {
        name: item,
        category: "Other",
      };
    }

    return {
      name: item.name || "Unnamed item",
      category: item.category || "Other",
    };
  });

  const groupedInventory = normalizedInventory.reduce((groups, item) => {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }

    groups[item.category].push(item.name);
    return groups;
  }, {});

  return Object.entries(groupedInventory)
    .map(([category, items]) => `${category}: ${items.join(", ")}`)
    .join(" | ");
}

export function formatChildProfilesForPrompt(childProfiles, childrenContext = []) {
  if (!Array.isArray(childProfiles) || childProfiles.length === 0) {
    return "No child profiles selected.";
  }

  const byId = new Map(
    (Array.isArray(childrenContext) ? childrenContext : []).map((child) => [
      child.id,
      child,
    ])
  );

  return childProfiles
    .map((child) => {
      const resolved = byId.get(child.id);
      if (resolved) {
        return `${resolved.name} (ageYears=${resolved.ageYears}, ageBand=${resolved.ageBand}): interests=${resolved.interests.join(", ") || "not specified"}; usually avoids=${(resolved.avoids || []).join(", ") || "none"}; independence=${resolved.independenceLevel || "usually-independent"}; notes=${resolved.needs || "not specified"}`;
      }
      return `${child.name || "Unnamed child"} (${child.ageRange || "unknown age"}): interests=${child.interests || "not specified"}; usually avoids=${Array.isArray(child.avoids) ? child.avoids.join(", ") : child.avoids || "none"}; independence=${child.independenceLevel || "usually-independent"}; notes=${child.needs || "not specified"}`;
    })
    .join(" | ");
}

export function formatGroupAgeContextForPrompt(groupAgeContext) {
  if (!groupAgeContext || typeof groupAgeContext !== "object") {
    return "Not available.";
  }

  return `ages=[${(groupAgeContext.ages || []).join(", ")}]; youngest=${groupAgeContext.youngestAge}; oldest=${groupAgeContext.oldestAge}; span=${groupAgeContext.ageSpan}; mixedAge=${groupAgeContext.isMixedAge}`;
}
