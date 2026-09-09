import { describe, expect, it } from "vitest";
import { ACTIVITY_CATEGORIES } from "./activityTaxonomy.js";

describe("ACTIVITY_CATEGORIES", () => {
  it("includes engineering and history without removing existing values", () => {
    expect(ACTIVITY_CATEGORIES).toContain("engineering");
    expect(ACTIVITY_CATEGORIES).toContain("history");
    expect(ACTIVITY_CATEGORIES).toContain("science");
    expect(ACTIVITY_CATEGORIES).toContain("building");
    expect(ACTIVITY_CATEGORIES).toContain("reading");
  });
});
