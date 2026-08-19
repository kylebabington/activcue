import { describe, expect, it } from "vitest";
import { getSceneBeatTitle } from "./sceneBeatTitles";

describe("getSceneBeatTitle", () => {
  it("returns theme-specific story beats", () => {
    expect(getSceneBeatTitle("animals", 0)).toBe("The Animals Need You");
    expect(getSceneBeatTitle("space", 1)).toBe("A Signal Breaks Through");
  });

  it("aliases related visual themes", () => {
    expect(getSceneBeatTitle("jungle", 0)).toBe("Base Camp Opens");
    expect(getSceneBeatTitle("detective", 0)).toBe("The Case Opens");
  });
});
