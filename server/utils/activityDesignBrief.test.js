import { describe, expect, it } from "vitest";
import { buildActivityDesignBrief, formatActivityDesignBriefForPrompt } from "./activityDesignBrief.js";

describe("buildActivityDesignBrief", () => {
  const children = [
    {
      name: "Alice",
      birthDate: "2018-01-01",
      ageYears: 6,
      ageBand: "early-elementary",
      interests: ["animals"],
      avoids: ["loud"],
      independenceLevel: "usually-independent",
    },
    {
      name: "Bob",
      ageYears: 8,
      ageBand: "elementary",
      interests: ["building"],
      avoids: [],
      independenceLevel: "usually-independent",
    },
  ];

  it("includes both exact ages once with required role count 2", () => {
    const brief = buildActivityDesignBrief({
      childrenContext: children,
      activityMode: "family",
    });
    expect(brief.participants.count).toBe(2);
    expect(brief.participants.children.map((c) => c.age)).toEqual([6, 8]);
    expect(brief.participants.children.map((c) => c.label)).toEqual([
      "Child 1",
      "Child 2",
    ]);
    expect(brief.groupDesign.requiredRoleCount).toBe(2);
    expect(brief.groupDesign.directionsMustWorkForAge).toBe(6);
    expect(brief.groupDesign.engagementMustWorkForAge).toBe(8);
    expect(brief.narrativeDesign.mode).toBe("causal-adventure");
    expect(brief.narrativeDesign.requiresSceneSetup).toBe(true);
    expect(brief.participants.children[0].cognitive.primaryThinking).toContain(
      "observe"
    );
    expect(brief.participants.children[1].cognitive.primaryThinking).toContain(
      "classify"
    );
    expect(brief.cognitiveDesign.byChild).toHaveLength(2);
  });

  it("does not include names or birth dates in prompt JSON", () => {
    const json = formatActivityDesignBriefForPrompt(
      buildActivityDesignBrief({ childrenContext: children })
    );
    expect(json).not.toContain("Alice");
    expect(json).not.toContain("Bob");
    expect(json).not.toContain("2018");
    expect(json).toContain('"age": 6');
    expect(json).toContain('"age": 8');
  });

  it("sets complexity budget from youngest child", () => {
    const brief = buildActivityDesignBrief({
      childrenContext: children,
      activityStyle: "imaginative",
    });
    expect(brief.complexityBudget.maxScenes).toBe(4);
    expect(brief.complexityBudget.maxActionsPerScene).toBe(4);
  });

  it("attaches per-child cognitive expectations for mixed ages", () => {
    const brief = buildActivityDesignBrief({
      childrenContext: [
        { ageYears: 7, interests: ["animals"] },
        { ageYears: 12, interests: ["science"] },
      ],
      activityMode: "family",
    });
    expect(brief.participants.children[0].cognitive.band).toBe("early-elementary");
    expect(brief.participants.children[0].cognitive.primaryThinking).toContain(
      "simple-prediction"
    );
    expect(brief.participants.children[1].cognitive.band).toBe("older-elementary");
    expect(brief.participants.children[1].cognitive.primaryThinking).toContain(
      "hypothesize"
    );
    expect(brief.cognitiveDesign.oldest.inquiryDepth).toBe("high");
  });
});
