import { describe, expect, it } from "vitest";
import { buildPartialRefillSteer } from "./activitySuggestions.js";

describe("buildPartialRefillSteer", () => {
  it("includes story quality failures and fix hints", () => {
    const steer = buildPartialRefillSteer({
      remaining: 2,
      rejectionTitles: ["Weak Story Activity"],
      rejectedByReason: { "clarity-failed": 1 },
      participantCount: 2,
      storyRejectedByReason: {
        "story-too-thin": 2,
        "story-beat-missing": 1,
      },
    });

    expect(steer).toContain("PARTIAL REFILL");
    expect(steer).toContain("story-too-thin:2");
    expect(steer).toContain("story-beat-missing:1");
    expect(steer).toMatch(/sceneSetup|storyBeat/i);
    expect(steer).toMatch(/3–5 sentence/i);
  });
});
