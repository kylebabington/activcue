// src/features/family/useInventory.js

import { useState } from "react";
import { isPresetInventoryItem } from "../../constants/inventoryPresets";
import { buildDefaultFamilySettings } from "../../constants/familySettingsDefaults";

export function normalizeInventoryItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => {
    if (typeof item === "string") {
      return {
        id: crypto.randomUUID(),
        name: item,
        category: "Other",
      };
    }

    return {
      id: item.id || crypto.randomUUID(),
      name: item.name || "Unnamed item",
      category: item.category || "Other",
    };
  });
}

export function useInventory({ showStatus } = {}) {
  const [inventory, setInventory] = useState(
    () => buildDefaultFamilySettings().inventory
  );
  const [newInventoryItem, setNewInventoryItem] = useState("");
  const [newInventoryCategory, setNewInventoryCategory] =
    useState("Building toys");

  const normalizedInventory = normalizeInventoryItems(inventory);

  function addInventoryItem() {
    const cleanedItem = newInventoryItem.trim();

    if (cleanedItem === "") {
      return;
    }

    const itemAlreadyExists = normalizedInventory.some(
      (item) => item.name.toLowerCase() === cleanedItem.toLowerCase()
    );

    if (itemAlreadyExists) {
      showStatus?.("That item is already in your inventory.", "error");
      return;
    }

    const itemToAdd = {
      id: crypto.randomUUID(),
      name: cleanedItem,
      category: newInventoryCategory,
    };

    setInventory([...normalizedInventory, itemToAdd]);
    setNewInventoryItem("");
    setNewInventoryCategory("Building toys");
    showStatus?.("");
  }

  function removeInventoryItem(itemIdToRemove) {
    setInventory(
      normalizedInventory.filter((item) => item.id !== itemIdToRemove)
    );
  }

  function isInventoryItemSelected(itemName) {
    return normalizedInventory.some(
      (item) => item.name.toLowerCase() === itemName.toLowerCase()
    );
  }

  function toggleInventoryPreset(preset) {
    const existingItem = normalizedInventory.find(
      (item) => item.name.toLowerCase() === preset.name.toLowerCase()
    );

    if (existingItem) {
      removeInventoryItem(existingItem.id);
      return;
    }

    setInventory([
      ...normalizedInventory,
      {
        id: crypto.randomUUID(),
        name: preset.name,
        category: preset.category,
      },
    ]);
  }

  const customInventoryItems = normalizedInventory.filter(
    (item) => !isPresetInventoryItem(item.name)
  );

  return {
    inventory,
    setInventory,
    newInventoryItem,
    setNewInventoryItem,
    newInventoryCategory,
    setNewInventoryCategory,
    normalizedInventory,
    customInventoryItems,
    addInventoryItem,
    removeInventoryItem,
    isInventoryItemSelected,
    toggleInventoryPreset,
  };
}
