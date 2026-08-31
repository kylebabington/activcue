import { describe, expect, it } from "vitest";
import {
  buildActivitySuggestionsInstructions,
  buildActivitySuggestionsInput,
  resolvePromptAgeBand,
} from "./activitySuggestions.js";

describe("resolvePromptAgeBand", () => {
  it("maps oldest ages to refined policy bands", () => {
    expect(resolvePromptAgeBand({ oldestAge: 7 })).toBe("early-elementary");
    expect(resolvePromptAgeBand({ oldestAge: 11 })).toBe("older-elementary");
    expect(resolvePromptAgeBand({ oldestAge: 12 })).toBe("tween");
    expect(resolvePromptAgeBand({ oldestAge: 14 })).toBe("young-teen");
    expect(resolvePromptAgeBand({ oldestAge: 16 })).toBe("teen");
  });
});

describe("buildActivitySuggestionsInstructions", () => {
  it("gives imaginative activities a warm teacher voice for younger kids", () => {
    const instructions = buildActivitySuggestionsInstructions(
      "imaginative",
      "playroom",
      { groupAgeContext: { oldestAge: 7 } }
    );

    expect(instructions).toContain(
      "Write like a warm teacher sitting beside the child and getting them started."
    );
    expect(instructions).toContain(
      "Every scene should feel like invitation → action → response"
    );
    expect(instructions).toContain("EARLY-ELEMENTARY (AGES 6–7) FRAMING");
    expect(instructions).not.toContain("TEEN / YOUNG-TEEN FRAMING");
    expect(instructions).toContain("Do NOT include kidRole, mission");
  });

  it("steers teens toward creative thinking instead of pretend stories", () => {
    const instructions = buildActivitySuggestionsInstructions(
      "imaginative",
      "playroom",
      { groupAgeContext: { oldestAge: 13 }, childrenContext: [{ ageYears: 13 }] }
    );

    expect(instructions).toContain("TEEN / YOUNG-TEEN FRAMING");
    expect(instructions).toContain(
      "do not invent an imaginary story world unless the child's listed interests explicitly ask for roleplay/fiction"
    );
    expect(instructions).toContain("Room Redesign Lead");
    expect(instructions).toContain("NEVER use a generic one-word role");
    expect(instructions).not.toContain("EARLY-ELEMENTARY (AGES 6–7) FRAMING");
    expect(instructions).toContain("ACTIVITY DESIGN BRIEF");
  });

  it("keeps simple activities practical instead of forcing story framing", () => {
    const instructions = buildActivitySuggestionsInstructions(
      "simple",
      "playroom",
      { groupAgeContext: { oldestAge: 8 } }
    );

    expect(instructions).toContain("STYLE RULES (simple — only)");
    expect(instructions).toContain(
      "Do NOT create an elaborate pretend story or fantasy mission."
    );
    expect(instructions).toContain("Do NOT include storyBeat or finishGuide.resolution");
    expect(instructions).toContain("paper ramp");
    expect(instructions).not.toContain("STYLE RULES (imaginative");
  });

  it("demands concrete scene actions instead of brief labels", () => {
    const instructions = buildActivitySuggestionsInstructions(
      "imaginative",
      "playroom",
      { groupAgeContext: { oldestAge: 8 } }
    );

    expect(instructions).toContain("ACTION WRITING RULES");
    expect(instructions).toContain("COMPLEXITY BUDGET");
    expect(instructions).toContain("SECTION OWNERSHIP");
    expect(instructions).toContain("activityFormatVersion");
    expect(instructions).toContain("qualityContractVersion");
    expect(instructions).toContain('BAD: "Draw the map."');
    expect(instructions).toContain("setupGuide");
    expect(instructions).toContain("finishGuide");
    expect(instructions).toContain("actions[]");
    expect(instructions).toContain("CAUSAL ACTIVITY DESIGN");
    expect(instructions).toContain("sceneSetup");
    expect(instructions).toContain("sceneOutcome");
    expect(instructions).toContain("WHY TEST");
    expect(instructions).toContain("SWAP TEST");
    expect(instructions).toContain("finishGuide.resolution");
    expect(instructions).not.toContain("step instruction: max 2–3 sentences");
    expect(instructions).not.toContain(
      "Prefer fewer, denser steps over long prose"
    );
  });

  it("omits the opposite style block to shrink prompt size", () => {
    const imaginative = buildActivitySuggestionsInstructions(
      "imaginative",
      "playroom",
      { groupAgeContext: { oldestAge: 8 } }
    );
    const simple = buildActivitySuggestionsInstructions(
      "simple",
      "playroom",
      { groupAgeContext: { oldestAge: 8 } }
    );

    expect(imaginative.length).toBeLessThan(16000);
    expect(simple.length).toBeLessThan(14000);
    expect(imaginative).not.toContain("STYLE RULES (simple");
    expect(simple).not.toContain("STYLE RULES (imaginative");
  });

  it("requests a variable activity count for hybrid cache fill", () => {
    const one = buildActivitySuggestionsInstructions("simple", "playroom", {
      groupAgeContext: { oldestAge: 8 },
      activityCount: 1,
    });
    const two = buildActivitySuggestionsInstructions("simple", "playroom", {
      groupAgeContext: { oldestAge: 8 },
      activityCount: 2,
    });

    expect(one).toContain("Give exactly 1 activity.");
    expect(two).toContain("Give exactly 2 activities.");
  });

  it("allows over-generation counts above 3 up to 5", () => {
    const forFive = buildActivitySuggestionsInstructions(
      "simple",
      "playroom",
      { groupAgeContext: { oldestAge: 8 }, activityCount: 5 }
    );
    const forNine = buildActivitySuggestionsInstructions(
      "simple",
      "playroom",
      { groupAgeContext: { oldestAge: 8 }, activityCount: 9 }
    );
    expect(forFive).toContain("5 activities");
    expect(forNine).toContain("5 activities");
    expect(forNine).not.toContain("9 activities");
  });

  it("uses four-action maximum for ages 6 and 8 in instructions", () => {
    const instructions = buildActivitySuggestionsInstructions(
      "imaginative",
      "playroom",
      {
        childrenContext: [{ ageYears: 6 }, { ageYears: 8 }],
        groupAgeContext: { youngestAge: 6, oldestAge: 8 },
      }
    );
    expect(instructions).toContain("Maximum 4 actions per scene");
    expect(instructions).not.toContain("3–7 actions per scene");
    expect(instructions).not.toContain("4–7 sentences");
  });

  it("buildActivitySuggestionsInput uses design brief with both ages once", () => {
    const input = buildActivitySuggestionsInput({
      safeCurrentMoment: {
        parentActivity: "work",
        timeNeededMinutes: 20,
        space: "Living room",
        messLevel: "low",
        noiseLevel: "quiet",
        supervisionLevel: "independent",
        availability: "limited",
      },
      kidMood: "neutral",
      childrenContext: [
        { ageYears: 6, ageBand: "early-elementary", interests: [], avoids: [] },
        { ageYears: 8, ageBand: "elementary", interests: [], avoids: [] },
      ],
      groupAgeContext: { youngestAge: 6, oldestAge: 8 },
      safeActivityStyle: "imaginative",
      activityMode: "family",
      safeSelectedChildProfiles: [],
      inventory: [],
      safeFeedbackContext: "",
      safePreviousActivityTitles: [],
      safeSafetySettings: {
        screenFreeOnly: true,
        noFoodActivities: false,
        noWaterPlay: true,
        noSmallObjects: true,
        quietMode: true,
        maxActivityMinutes: 20,
        adultHelpAllowed: "independent",
      },
    });
    expect(input).toContain("ACTIVITY DESIGN BRIEF");
    expect(input).toContain('"age": 6');
    expect(input).toContain('"age": 8');
    expect(input).toContain('"requiredRoleCount": 2');
    expect(input).toContain('"directionsMustWorkForAge": 6');
    expect(input).toContain('"engagementMustWorkForAge": 8');
    expect(input).not.toContain("PARTICIPANTS:");
    expect(input).not.toContain("Selected child profiles");
    expect(input).toContain("sceneSetup");
    expect(input).toContain("sceneOutcome");
    expect(input).toContain("finishGuide{resolution");
  });
});
