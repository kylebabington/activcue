import { describe, expect, it } from "vitest";
import { buildSimpleActivitiesFromTemplates } from "./simpleActivityTemplates.js";

const inventory = [
  "blankets",
  "pillows",
  "chairs",
  "paper",
  "markers",
  "LEGO",
  "stuffed animals",
];

const currentMoment = {
  timeNeededMinutes: 20,
  messLevel: "medium",
  noiseLevel: "normal",
  space: "Living room",
  supervisionLevel: "independent",
  availability: "unavailable",
};

describe("buildSimpleActivitiesFromTemplates age gate", () => {
  it("can include cozy fort for younger kids", () => {
    const activities = buildSimpleActivitiesFromTemplates({
      inventory,
      currentMoment,
      count: 8,
      oldestChildAgeYears: 8,
    });
    const titles = activities.map((activity) => activity.title);
    expect(titles).toContain("Build a cozy fort");
  });

  it("excludes cozy fort and stuffed animal picnic for teens", () => {
    const activities = buildSimpleActivitiesFromTemplates({
      inventory,
      currentMoment,
      count: 8,
      oldestChildAgeYears: 13,
    });
    const titles = activities.map((activity) => activity.title);
    expect(titles).not.toContain("Build a cozy fort");
    expect(titles).not.toContain("Stuffed animal picnic");
    expect(titles.length).toBeGreaterThan(0);
  });
});
