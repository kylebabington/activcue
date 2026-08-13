// src/utils/generationLoaderStages.test.js

import { describe, expect, it } from "vitest";
import { buildGenerationLoaderStages } from "./generationLoaderStages";

describe("buildGenerationLoaderStages", () => {
  it("personalizes stages from moment + style", () => {
    const stages = buildGenerationLoaderStages(
      { timeNeededMinutes: 15, messLevel: "low" },
      { activityStyle: "simple", inventoryEmpty: false }
    );

    expect(stages[0].detail).toContain("15 minutes");
    expect(stages[1].detail.toLowerCase()).toContain("mess");
    expect(stages[2].title.toLowerCase()).toContain("plain");
    expect(stages[2].detail.toLowerCase()).toContain("already have");
  });

  it("keeps stage copy moving through a ~30s wait", () => {
    const stages = buildGenerationLoaderStages({}, {});
    expect(stages.length).toBeGreaterThanOrEqual(6);
    expect(stages.at(-1).atMs).toBeGreaterThanOrEqual(25000);
  });
});
