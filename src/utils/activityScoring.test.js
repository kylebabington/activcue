import { describe, expect, it } from "vitest";
import {
  getTotalActivityScore,
  scoreActivityForCurrentMoment,
  scoreSpaceFit,
} from "./activityScoring";
import { scoreInventoryMatch } from "./inventoryFit";

const quietMoment = {
  parentActivity: "On a work call",
  availability: "do-not-interrupt",
  timeNeededMinutes: 20,
  space: "Living room",
  messLevel: "low",
  noiseLevel: "quiet",
  supervisionLevel: "independent",
};

describe("scoreActivityForCurrentMoment", () => {
  it("prefers low-energy activities when the moment is quiet", () => {
    const calmActivity = {
      title: "Reading nook",
      mess: "low",
      energy: "low",
      adultHelp: "none",
      estimatedMinutes: 15,
      steps: ["Pick a book", "Read"],
      uses: ["books"],
      firstMoves: [],
      starterPrompts: [],
    };

    const loudActivity = {
      title: "Dance party",
      mess: "low",
      energy: "high",
      adultHelp: "none",
      estimatedMinutes: 15,
      steps: ["Pick music", "Dance"],
      uses: [],
      firstMoves: [],
      starterPrompts: [],
    };

    expect(
      scoreActivityForCurrentMoment(calmActivity, quietMoment)
    ).toBeGreaterThan(scoreActivityForCurrentMoment(loudActivity, quietMoment));
  });

  it("penalizes activities that exceed the requested time window", () => {
    const shortActivity = {
      title: "Quick puzzle",
      mess: "low",
      energy: "low",
      adultHelp: "none",
      estimatedMinutes: 15,
      steps: ["Open puzzle"],
      uses: ["puzzle"],
      firstMoves: [],
      starterPrompts: [],
    };

    const longActivity = {
      ...shortActivity,
      title: "Long build",
      estimatedMinutes: 45,
    };

    expect(
      scoreActivityForCurrentMoment(shortActivity, quietMoment)
    ).toBeGreaterThan(
      scoreActivityForCurrentMoment(longActivity, quietMoment)
    );
  });

  it("rewards activities that use owned inventory items", () => {
    const inventory = [{ id: "1", name: "LEGO", category: "Building toys" }];

    const matching = {
      title: "LEGO build",
      mess: "low",
      energy: "low",
      adultHelp: "none",
      estimatedMinutes: 15,
      steps: ["Build"],
      uses: ["LEGO"],
      firstMoves: [],
      starterPrompts: [],
    };

    const invented = {
      ...matching,
      title: "Robot kit",
      uses: ["advanced robot kit"],
    };

    expect(
      scoreActivityForCurrentMoment(matching, quietMoment, inventory)
    ).toBeGreaterThan(
      scoreActivityForCurrentMoment(invented, quietMoment, inventory)
    );
  });

  it("boosts space-aligned activities", () => {
    const indoor = {
      title: "Couch fort",
      summary: "Build a fort in the living room",
      mess: "low",
      energy: "low",
      adultHelp: "none",
      estimatedMinutes: 15,
      steps: ["Use pillows"],
      uses: ["pillows"],
    };

    const outdoor = {
      ...indoor,
      title: "Yard sprint",
      summary: "Run outside in the backyard",
      steps: ["Go outside"],
    };

    expect(scoreSpaceFit(indoor, quietMoment)).toBeGreaterThan(
      scoreSpaceFit(outdoor, quietMoment)
    );
  });
});

describe("scoreInventoryMatch", () => {
  it("penalizes invented supplies", () => {
    const inventory = [{ name: "markers" }, { name: "paper" }];

    expect(
      scoreInventoryMatch({ uses: ["laser cutter"] }, inventory)
    ).toBeLessThan(scoreInventoryMatch({ uses: ["markers"] }, inventory));
  });
});

describe("getTotalActivityScore", () => {
  it("learns from too-messy feedback in history", () => {
    const messyActivity = {
      title: "Paint mural",
      mess: "high",
      energy: "medium",
      adultHelp: "optional",
      estimatedMinutes: 20,
      steps: ["Paint"],
      uses: ["paint"],
      firstMoves: [],
      starterPrompts: [],
    };

    const cleanActivity = {
      ...messyActivity,
      title: "Quiet drawing",
      mess: "low",
      uses: ["paper"],
    };

    const history = [
      { feedbackType: "too-messy", mess: "high" },
      { feedbackType: "too-messy", mess: "high" },
    ];

    expect(
      getTotalActivityScore(cleanActivity, quietMoment, history)
    ).toBeGreaterThan(
      getTotalActivityScore(messyActivity, quietMoment, history)
    );
  });

  it("soft-penalizes activities matching child avoids", () => {
    const pretendActivity = {
      title: "Pretend restaurant",
      mess: "low",
      energy: "medium",
      adultHelp: "optional",
      estimatedMinutes: 20,
      steps: ["Play"],
      uses: [],
      firstMoves: [],
      starterPrompts: [],
      theme: "pretend play restaurant",
    };

    const buildingActivity = {
      ...pretendActivity,
      title: "LEGO tower",
      theme: "building",
    };

    const options = {
      activeChildProfile: {
        avoids: ["pretend"],
        interests: "LEGO",
        independenceLevel: "usually-independent",
      },
      activityPreferences: {
        messTolerance: "a-little",
        setupEffort: "a-few-minutes",
        independencePreference: "mostly-independent",
        activityStylePreference: "mix",
        indoorOutdoorPreference: "either",
      },
    };

    expect(
      getTotalActivityScore(buildingActivity, quietMoment, [], options)
    ).toBeGreaterThan(
      getTotalActivityScore(pretendActivity, quietMoment, [], options)
    );
  });
});
