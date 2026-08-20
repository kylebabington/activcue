import { describe, expect, it, vi, afterEach } from "vitest";
import {
  evaluateActivityAgeFit,
  getExpectedMaturityLevel,
  getPolicyAgeBand,
  scoreActivityAgeMatch,
  validateDevelopmentalComplexity,
  AGE_POLICY_VERSION,
} from "./activityAgePolicy.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function child(ageYears, name = "Kid") {
  return { name, ageYears };
}

function concreteAge6Activity(overrides = {}) {
  return {
    title: "Pillow Stations",
    summary: "Put three pillows around the room and walk between them.",
    activityStyle: "imaginative",
    ageFit: {
      minAge: 5,
      maxAge: 9,
      targetAges: [6, 7],
      maturityLevel: "child",
      independenceLevel: "some-help",
      ageFitReason: "Concrete stations for early elementary.",
    },
    stepDetails: [
      {
        title: "Set stations",
        instruction:
          "Put three pillows around the room. Call them Station 1, Station 2, and Station 3.",
        doneWhen: "You can point to each station.",
      },
      {
        title: "Walk the route",
        instruction: "Walk to Station 1 first. Then walk to Station 2.",
        doneWhen: "You visited Station 1 and Station 2.",
      },
      {
        title: "Finish",
        instruction: "Walk to Station 3 and sit down.",
        doneWhen: "You are sitting at Station 3.",
      },
    ],
    setup: ["Three pillows", "Clear floor space"],
    ...overrides,
  };
}

describe("activityAgePolicy bands", () => {
  it("exposes policy version 2", () => {
    expect(AGE_POLICY_VERSION).toBe(2);
  });

  it("maps refined policy bands", () => {
    expect(getPolicyAgeBand(4)).toBe("young-child");
    expect(getPolicyAgeBand(6)).toBe("early-elementary");
    expect(getPolicyAgeBand(8)).toBe("elementary");
    expect(getPolicyAgeBand(10)).toBe("older-elementary");
    expect(getPolicyAgeBand(12)).toBe("tween");
    expect(getPolicyAgeBand(13)).toBe("young-teen");
    expect(getPolicyAgeBand(15)).toBe("teen");
  });

  it("maps single-child expected maturity", () => {
    expect(getExpectedMaturityLevel(4)).toBe("young-child");
    expect(getExpectedMaturityLevel(6)).toBe("child");
    expect(getExpectedMaturityLevel(9)).toBe("child");
    expect(getExpectedMaturityLevel(10)).toBe("tween");
    expect(getExpectedMaturityLevel(12)).toBe("tween");
    expect(getExpectedMaturityLevel(13)).toBe("teen");
  });

  it("allows mixed-age only for family mode with span", () => {
    expect(
      getExpectedMaturityLevel(6, "family", [6, 10, 13])
    ).toBe("mixed-age");
    expect(getExpectedMaturityLevel(6, "single-child", [6])).toBe("child");
  });
});

describe("evaluateActivityAgeFit", () => {
  it("rejects age 6 + range 8–12", () => {
    const result = evaluateActivityAgeFit({
      activity: {
        ...concreteAge6Activity(),
        ageFit: {
          minAge: 8,
          maxAge: 12,
          targetAges: [9, 10],
          maturityLevel: "tween",
        },
      },
      childrenContext: [child(6)],
      activityMode: "single-child",
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("age-range-mismatch");
  });

  it("accepts age 6 + range 5–9 + maturity child", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = evaluateActivityAgeFit({
      activity: concreteAge6Activity(),
      childrenContext: [child(6)],
      activityMode: "single-child",
    });
    expect(result.eligible).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it("rejects age 6 + maturity mixed-age", () => {
    const result = evaluateActivityAgeFit({
      activity: concreteAge6Activity({
        ageFit: {
          minAge: 5,
          maxAge: 9,
          targetAges: [6],
          maturityLevel: "mixed-age",
        },
      }),
      childrenContext: [child(6)],
      activityMode: "single-child",
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("mixed-age-only");
  });

  it("rejects age 13 + maturity child", () => {
    const result = evaluateActivityAgeFit({
      activity: {
        title: "Simple Sort",
        ageFit: {
          minAge: 10,
          maxAge: 15,
          targetAges: [13],
          maturityLevel: "child",
        },
      },
      childrenContext: [child(13)],
      activityMode: "single-child",
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("maturity-mismatch");
  });

  it("rejects age 13 + stuffed-animal preschool framing", () => {
    const result = evaluateActivityAgeFit({
      activity: {
        title: "Teddy Tea Party",
        summary: "Host a stuffed animal tea party with fairy dust.",
        ageFit: {
          minAge: 5,
          maxAge: 15,
          targetAges: [13],
          maturityLevel: "teen",
        },
        stepDetails: [
          {
            title: "Set the table",
            instruction: "Invite each stuffed animal to the tea party.",
          },
        ],
      },
      childrenContext: [child(13)],
      activityMode: "single-child",
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("developmental-complexity");
  });

  it("accepts ages 6+13 + mixed-age activity with roles", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = evaluateActivityAgeFit({
      activity: {
        title: "Family Delivery Hub",
        summary: "Run a family delivery desk with age-appropriate jobs.",
        ageFit: {
          minAge: 6,
          maxAge: 14,
          targetAges: [6, 13],
          maturityLevel: "mixed-age",
        },
        roleGuide: {
          childRoles: [
            {
              childName: "Sam",
              roleTitle: "Sorter",
              responsibility: "Sort packages by color",
              firstAction: "Make three piles",
            },
            {
              childName: "Alex",
              roleTitle: "Route Planner",
              responsibility: "Plan the delivery order",
              firstAction: "Write the stop list",
            },
          ],
        },
        stepDetails: [
          {
            title: "Open the hub",
            instruction: "Put three baskets on the table and label them.",
          },
          {
            title: "Sort",
            instruction: "Sam sorts. Alex writes the route.",
          },
        ],
      },
      childrenContext: [child(6, "Sam"), child(13, "Alex")],
      activityMode: "family",
    });
    expect(result.eligible).toBe(true);
  });
});

describe("validateDevelopmentalComplexity", () => {
  it("rejects age 6 + 7 scenes × many actions / abstract planning", () => {
    const result = validateDevelopmentalComplexity(
      {
        title: "Network Design",
        summary:
          "Design a communication network connecting three stations and determine the optimal sequence for transmitting clues.",
        stepDetails: Array.from({ length: 7 }, (_, i) => ({
          title: `Scene ${i + 1}`,
          instruction:
            "Plan the route. Optimize the sequence. Infer missing links. Redesign the protocol. Document constraints. Review. Adjust.",
        })),
      },
      [6]
    );
    expect(result.ok).toBe(false);
  });

  it("accepts age 6 + 3 scenes × concrete actions", () => {
    const result = validateDevelopmentalComplexity(concreteAge6Activity(), [6]);
    expect(result.ok).toBe(true);
  });
});

describe("scoreActivityAgeMatch", () => {
  it("ranks exact target age above broad range", () => {
    const tight = scoreActivityAgeMatch(
      {
        ageFit: {
          minAge: 6,
          maxAge: 8,
          targetAges: [6, 7],
        },
      },
      [6]
    );
    const broad = scoreActivityAgeMatch(
      {
        ageFit: {
          minAge: 5,
          maxAge: 13,
          targetAges: [8, 10],
        },
      },
      [6]
    );
    expect(tight).toBeGreaterThan(broad);
  });
});
