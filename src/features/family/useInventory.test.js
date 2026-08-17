import { describe, expect, it } from "vitest";
import {
  applyInventoryItemUpdate,
  normalizeInventoryItems,
} from "./useInventory";

describe("normalizeInventoryItems", () => {
  it("keeps barcode and catalog title on scanned items", () => {
    const [item] = normalizeInventoryItems([
      {
        id: "scan-1",
        name: "Farm animals",
        category: "Pretend play",
        barcode: "088590950367",
        lookupTitle: "LEGO DUPLO Town Farm Animals 10870",
      },
    ]);

    expect(item).toMatchObject({
      id: "scan-1",
      name: "Farm animals",
      category: "Pretend play",
      barcode: "088590950367",
      lookupTitle: "LEGO DUPLO Town Farm Animals 10870",
    });
  });
});

describe("applyInventoryItemUpdate", () => {
  const inventory = [
    {
      id: "scan-1",
      name: "LEGO DUPLO Town Farm Animals 10870",
      category: "Building toys",
      barcode: "123",
      lookupTitle: "LEGO DUPLO Town Farm Animals 10870",
    },
    {
      id: "custom-1",
      name: "Ukulele",
      category: "Other",
    },
  ];

  it("renames the display name without dropping the catalog title", () => {
    const result = applyInventoryItemUpdate(inventory, "scan-1", {
      name: "Farm animals",
      category: "Pretend play",
    });

    expect(result.ok).toBe(true);
    expect(result.items[0]).toMatchObject({
      id: "scan-1",
      name: "Farm animals",
      category: "Pretend play",
      barcode: "123",
      lookupTitle: "LEGO DUPLO Town Farm Animals 10870",
    });
  });

  it("rejects a name that already exists", () => {
    const result = applyInventoryItemUpdate(inventory, "scan-1", {
      name: "ukulele",
    });

    expect(result).toEqual({ ok: false, error: "duplicate-name" });
  });

  it("rejects a blank display name", () => {
    const result = applyInventoryItemUpdate(inventory, "scan-1", {
      name: "   ",
    });

    expect(result).toEqual({ ok: false, error: "empty-name" });
  });
});
