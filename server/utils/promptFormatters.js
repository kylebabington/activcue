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

export function formatChildProfilesForPrompt(childProfiles) {
  if (!Array.isArray(childProfiles) || childProfiles.length === 0) {
    return "No child profiles selected.";
  }

  return childProfiles
    .map((child) => {
      return `${child.name || "Unnamed child"} (${child.ageRange || "unknown age"}): interests=${child.interests || "not specified"}; notes=${child.needs || "not specified"}`;
    })
    .join(" | ");
}
