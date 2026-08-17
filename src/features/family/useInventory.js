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

    const lookupTitle =
      typeof item.lookupTitle === "string" ? item.lookupTitle.trim() : "";

    return {
      id: item.id || crypto.randomUUID(),
      name: item.name || "Unnamed item",
      category: item.category || "Other",
      ...(typeof item.barcode === "string" && item.barcode
        ? { barcode: item.barcode }
        : {}),
      ...(lookupTitle ? { lookupTitle } : {}),
    };
  });
}

export function applyInventoryItemUpdate(items, itemId, { name, category } = {}) {
  const list = Array.isArray(items) ? items : [];
  const existing = list.find((item) => item.id === itemId);

  if (!existing) {
    return { ok: false, error: "missing" };
  }

  const cleanedName =
    typeof name === "string" ? name.trim() : String(existing.name || "").trim();

  if (!cleanedName) {
    return { ok: false, error: "empty-name" };
  }

  const duplicate = list.some(
    (item) =>
      item.id !== itemId &&
      String(item.name || "").toLowerCase() === cleanedName.toLowerCase()
  );

  if (duplicate) {
    return { ok: false, error: "duplicate-name" };
  }

  const nextCategory =
    typeof category === "string" && category.trim()
      ? category.trim()
      : existing.category || "Other";

  return {
    ok: true,
    items: list.map((item) =>
      item.id === itemId
        ? { ...item, name: cleanedName, category: nextCategory }
        : item
    ),
  };
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

  /**
   * Add an inventory item from barcode scan confirm.
   * @returns {boolean} true when the item was added
   */
  function addInventoryItemFromScan({
    name,
    category,
    barcode,
    lookupTitle,
  } = {}) {
    const cleanedName = typeof name === "string" ? name.trim() : "";
    const cleanedBarcode =
      typeof barcode === "string" ? barcode.trim() : "";
    const cleanedLookupTitle =
      typeof lookupTitle === "string" ? lookupTitle.trim() : "";

    if (cleanedName === "") {
      showStatus?.("Enter a name before adding this item.", "error");
      return false;
    }

    if (cleanedBarcode) {
      const barcodeExists = normalizedInventory.some(
        (item) => item.barcode === cleanedBarcode
      );

      if (barcodeExists) {
        showStatus?.(
          "That barcode is already in your inventory.",
          "error"
        );
        return false;
      }
    }

    const nameExists = normalizedInventory.some(
      (item) => item.name.toLowerCase() === cleanedName.toLowerCase()
    );

    if (nameExists) {
      showStatus?.("That item is already in your inventory.", "error");
      return false;
    }

    const itemToAdd = {
      id: crypto.randomUUID(),
      name: cleanedName,
      category: category || "Other",
      ...(cleanedBarcode ? { barcode: cleanedBarcode } : {}),
      ...(cleanedLookupTitle ? { lookupTitle: cleanedLookupTitle } : {}),
    };

    setInventory([...normalizedInventory, itemToAdd]);
    showStatus?.(`Added ${cleanedName}.`);
    return true;
  }

  /**
   * Rename or recategorize an existing custom/scanned item.
   * @returns {boolean} true when the item was updated
   */
  function updateInventoryItem(itemId, patch = {}) {
    const result = applyInventoryItemUpdate(
      normalizedInventory,
      itemId,
      patch
    );

    if (!result.ok) {
      if (result.error === "empty-name") {
        showStatus?.("Enter a name for this item.", "error");
      } else if (result.error === "duplicate-name") {
        showStatus?.("That item is already in your inventory.", "error");
      }
      return false;
    }

    setInventory(result.items);
    const updated = result.items.find((item) => item.id === itemId);
    showStatus?.(`Updated ${updated?.name || "item"}.`);
    return true;
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
    addInventoryItemFromScan,
    updateInventoryItem,
    removeInventoryItem,
    isInventoryItemSelected,
    toggleInventoryPreset,
  };
}
