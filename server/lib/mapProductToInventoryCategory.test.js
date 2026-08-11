// server/lib/mapProductToInventoryCategory.test.js

import { describe, expect, it } from "vitest";
import { mapProductToInventoryCategory } from "./mapProductToInventoryCategory.js";

describe("mapProductToInventoryCategory", () => {
  it("maps LEGO titles to Building toys", () => {
    expect(
      mapProductToInventoryCategory({
        title: "LEGO Classic Creative Building Set",
        brand: "LEGO",
      })
    ).toBe("Building toys");
  });

  it("maps art supplies from keywords", () => {
    expect(
      mapProductToInventoryCategory({
        title: "Crayola Washable Markers",
      })
    ).toBe("Art supplies");
  });

  it("maps books from remote category", () => {
    expect(
      mapProductToInventoryCategory({
        title: "The Very Hungry Caterpillar",
        remoteCategory: "Books > Children's Books",
      })
    ).toBe("Books");
  });

  it("defaults to Other when nothing matches", () => {
    expect(
      mapProductToInventoryCategory({
        title: "Mystery Widget 3000",
        brand: "Acme",
      })
    ).toBe("Other");
  });
});
