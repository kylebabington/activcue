import { describe, expect, it } from "vitest";
import {
  buildActivitySuggestionsInstructions,
  resolvePromptAgeBand,
} from "./activitySuggestions.js";

describe("resolvePromptAgeBand", () => {
  it("maps oldest ages to under10 / tween / teen", () => {
    expect(resolvePromptAgeBand({ oldestAge: 7 })).toBe("under10");
    expect(resolvePromptAgeBand({ oldestAge: 11 })).toBe("tween");
    expect(resolvePromptAgeBand({ oldestAge: 14 })).toBe("teen");
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
    expect(instructions).toContain("UNDER-10 FRAMING");
    expect(instructions).not.toContain("TEEN (13+) FRAMING");
    expect(instructions).toContain("Do NOT include kidRole, mission");
  });

  it("steers teens toward creative thinking instead of pretend stories", () => {
    const instructions = buildActivitySuggestionsInstructions(
      "imaginative",
      "playroom",
      { groupAgeContext: { oldestAge: 13 } }
    );

    expect(instructions).toContain("TEEN (13+) FRAMING");
    expect(instructions).toContain(
      "do not invent an imaginary story world unless the child's listed interests explicitly ask for roleplay/fiction"
    );
    expect(instructions).toContain("Room Redesign Lead");
    expect(instructions).toContain("NEVER use a generic one-word role");
    expect(instructions).not.toContain("UNDER-10 FRAMING");
  });

  it("keeps simple activities practical instead of forcing story framing", () => {
    const instructions = buildActivitySuggestionsInstructions(
      "simple",
      "playroom",
      { groupAgeContext: { oldestAge: 8 } }
    );

    expect(instructions).toContain("STYLE RULES (simple — only)");
    expect(instructions).toContain(
      "Do NOT create an elaborate pretend story."
    );
    expect(instructions).not.toContain("STYLE RULES (imaginative");
  });

  it("demands concrete scene actions instead of brief labels", () => {
    const instructions = buildActivitySuggestionsInstructions(
      "imaginative",
      "playroom",
      { groupAgeContext: { oldestAge: 8 } }
    );

    expect(instructions).toContain("ACTION WRITING RULES");
    expect(instructions).toContain("SECTION OWNERSHIP");
    expect(instructions).toContain("activityFormatVersion");
    expect(instructions).toContain("Do not copy objects, settings, or jobs from the examples");
    expect(instructions).toContain("8-year-old");
    expect(instructions).toContain("setupGuide");
    expect(instructions).toContain("finishGuide");
    expect(instructions).toContain("actions[]");
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

    expect(imaginative.length).toBeLessThan(14000);
    expect(simple.length).toBeLessThan(imaginative.length);
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
});
