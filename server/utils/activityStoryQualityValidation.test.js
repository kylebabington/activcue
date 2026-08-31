import { describe, expect, it } from "vitest";
import {
  validateImaginativeStoryQuality,
  formatStoryQualitySteerHints,
} from "./activityStoryQualityValidation.js";

function buildValidUnder10Activity(overrides = {}) {
  return {
    activityFormatVersion: 3,
    activityStyle: "imaginative",
    story:
      "A nighttime storm blew the trail markers away from Whispering Woods, and several frightened animals wandered into the living room. " +
      "The smallest animals found hiding places, but the rescue wagon cannot see them or tell which places are safe. " +
      "It will arrive in sixteen minutes before the next wave of wind reaches the woods. " +
      "The Safe Spot Artist will mark each shelter while the Animal Route Matcher guides every animal to the right sign. " +
      "The room must stay quiet so the animals do not panic and hide again.",
    roleGuide: {
      name: "Rescue Sign Team",
      description: "Mark safe shelters and guide animals to the right signs.",
      childRoles: [
        {
          childName: "Sam",
          age: 6,
          roleTitle: "Safe Spot Artist",
          responsibility: "Mark each shelter.",
          firstAction: "Pick a crayon.",
        },
        {
          childName: "Riley",
          age: 8,
          roleTitle: "Animal Route Matcher",
          responsibility: "Guide animals to signs.",
          firstAction: "Look at the first animal.",
        },
      ],
    },
    stepDetails: [
      {
        title: "Replace the Markers",
        storyBeat:
          "The storm erased the trail markers, so the rescue wagon will not know where to stop.",
        actions: ["Draw a sign on paper.", "Tape it beside a pillow shelter."],
      },
      {
        title: "Match the Animals",
        storyBeat:
          "The animals emerge with different needs, and each one must reach the right shelter sign.",
        actions: ["Point each animal to its matching sign.", "Say the sign color aloud."],
      },
      {
        title: "Guide the Wagon",
        storyBeat:
          "The rescue wagon is arriving, and the marked route must be clear before it reaches the room.",
        actions: ["Line up the signs in order.", "Walk the route once slowly."],
      },
    ],
    finishGuide: {
      resolution:
        "Every animal reaches a safe spot, and the rescue wagon follows the signs you made to solve the original problem.",
      action: "Stand at the last sign and point along the full route you marked.",
      example: "Show how each sign leads to a safe shelter.",
      doneWhen: "You can trace the route from the first sign to the last shelter.",
      extensions: [],
    },
    ...overrides,
  };
}

describe("validateImaginativeStoryQuality", () => {
  it("rejects a one-sentence vague story for under-10", () => {
    const result = validateImaginativeStoryQuality(
      {
        activityFormatVersion: 3,
        activityStyle: "imaginative",
        story: "A group of animals needs signs to find safe places before the rescue team arrives.",
        stepDetails: [{ storyBeat: "Make signs." }],
        finishGuide: { resolution: "Done." },
      },
      { oldestAge: 8, participantCount: 1 }
    );

    expect(result.valid).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining(["story-too-thin", "story-missing-problem"])
    );
  });

  it("passes a substantive 4–6 sentence story with arc fields", () => {
    const result = validateImaginativeStoryQuality(buildValidUnder10Activity(), {
      oldestAge: 8,
      participantCount: 2,
    });
    expect(result.valid).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("requires distinct storyBeat on each scene", () => {
    const activity = buildValidUnder10Activity({
      stepDetails: [
        {
          title: "One",
          storyBeat: "The storm erased the markers.",
          actions: ["Draw a sign."],
        },
        {
          title: "Two",
          storyBeat: "The storm erased the markers.",
          actions: ["Tape a sign."],
        },
      ],
    });
    const result = validateImaginativeStoryQuality(activity, {
      oldestAge: 8,
      participantCount: 2,
    });
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("story-beat-repeated");
  });

  it("requires finishGuide.resolution", () => {
    const activity = buildValidUnder10Activity({
      finishGuide: {
        action: "Do one last check.",
        example: "",
        doneWhen: "You are done.",
        extensions: [],
      },
    });
    const result = validateImaginativeStoryQuality(activity, {
      oldestAge: 8,
      participantCount: 2,
    });
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("story-resolution-missing");
  });

  it("requires both role titles in the opening story for two-child activities", () => {
    const activity = buildValidUnder10Activity({
      story:
        "A storm blew markers away and animals wandered into the living room. " +
        "The rescue wagon cannot see them. It arrives soon. " +
        "The Safe Spot Artist must mark shelters before the wind returns. " +
        "Everyone must stay quiet so the animals do not panic again.",
    });
    const result = validateImaginativeStoryQuality(activity, {
      oldestAge: 8,
      participantCount: 2,
    });
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("story-roles-missing");
  });

  it("skips simple-style activities", () => {
    const result = validateImaginativeStoryQuality(
      {
        activityFormatVersion: 3,
        activityStyle: "simple",
        story: "Sort blocks.",
        stepDetails: [],
        finishGuide: {},
      },
      { oldestAge: 8 }
    );
    expect(result.valid).toBe(true);
  });

  it("uses lighter story minimums for teens", () => {
    const teenStory =
      "Redesign the living room corner so it works as a quiet study zone before guests arrive tonight. " +
      "The corner is too cluttered for reading, and you must solve lighting, seating, and supply storage without buying anything new. " +
      "You were chosen because you already know which books and supplies you use most after school.";
    const result = validateImaginativeStoryQuality(
      {
        activityFormatVersion: 3,
        activityStyle: "imaginative",
        story: teenStory,
        roleGuide: { name: "Room Redesign Lead", description: "Plan the zone.", childRoles: [] },
        stepDetails: [
          {
            title: "Audit",
            storyBeat: "The corner is too cluttered to use for studying.",
            actions: ["List three problems you see."],
          },
          {
            title: "Prototype",
            storyBeat: "A quick layout test shows where the desk should go.",
            actions: ["Move one chair to the test spot."],
          },
        ],
        finishGuide: {
          resolution:
            "The corner now works as a study zone and solves the original clutter problem.",
          action: "Sit in the new setup and read one page.",
          example: "",
          doneWhen: "You can study there comfortably.",
          extensions: [],
        },
      },
      { oldestAge: 14, participantCount: 1 }
    );
    expect(result.valid).toBe(true);
  });
});

describe("formatStoryQualitySteerHints", () => {
  it("returns actionable hints for story failure codes", () => {
    const hints = formatStoryQualitySteerHints([
      "story-too-thin",
      "story-beat-missing",
    ]);
    expect(hints.length).toBeGreaterThanOrEqual(2);
    expect(hints.join(" ")).toMatch(/3–5 sentence/i);
    expect(hints.join(" ")).toMatch(/storyBeat/i);
  });
});
