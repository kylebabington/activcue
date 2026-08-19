import { describe, expect, it } from "vitest";
import { LANDING_ACTIVITY_PREVIEW } from "./landingActivityPreview";
import { buildDemoUrl, LANDING_SITUATIONS } from "./landingSituations";

describe("buildDemoUrl", () => {
  it("sends situation and moment without locking in a kid age", () => {
    const cookDinner = LANDING_SITUATIONS.find((item) => item.id === "cook-dinner");
    expect(buildDemoUrl(cookDinner)).toBe(
      "/demo?situation=cook-dinner&moment=cooking&time=20&space=inside&mess=low&supervision=nearby"
    );
    expect(buildDemoUrl(cookDinner)).not.toContain("ages=");
  });
});

describe("LANDING_ACTIVITY_PREVIEW", () => {
  it("shows a complete independent kitchen activity", () => {
    expect(LANDING_ACTIVITY_PREVIEW.title).toBe("Secret Agent Kitchen Watch");
    expect(LANDING_ACTIVITY_PREVIEW.situationId).toBe("cook-dinner");
    expect(LANDING_ACTIVITY_PREVIEW.firstMove).toMatch(/three objects/i);
    expect(LANDING_ACTIVITY_PREVIEW.ifStuck).toMatch(/red/i);
  });
});
