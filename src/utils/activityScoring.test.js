import { describe, expect, it } from "vitest";
import {
  getTotalActivityScore,
  scoreActivityForCurrentMoment,
} from "./activityScoring";

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

    const history = [
      { feedbackType: "too-messy" },
      { feedbackType: "too-messy" },
    ];

    const withoutHistory = getTotalActivityScore(
      messyActivity,
      quietMoment,
      []
    );
    const withHistory = getTotalActivityScore(
      messyActivity,
      quietMoment,
      history
    );

    expect(withHistory).toBeLessThan(withoutHistory);
  });
});
