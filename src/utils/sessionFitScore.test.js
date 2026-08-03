import { describe, expect, it } from "vitest";
import {
  applySessionFitBoost,
  calculateMomentSimilarity,
  filterSessionsForFitScore,
  getChildPreferenceScore,
  getDurationReliabilityRatio,
  getDurationReliabilityScore,
  getHistoricalContextSimilarity,
  getIndependenceSignal,
  getRecentRepetitionPenalty,
  getSessionFitBoost,
  pickBestActivityForCurrentMoment,
  scoreActivitiesForCurrentMoment,
} from "./sessionFitScore";

describe("sessionFitScore", () => {
  const activity = {
    title: "LEGO Free Build",
    activityStyle: "simple",
    energy: "medium",
    mess: "low",
    uses: ["LEGO"],
  };

  const cookingMoment = {
    timeNeededMinutes: 20,
    messLevel: "low",
    noiseLevel: "quiet",
    supervisionLevel: "independent",
    space: "Kitchen",
    availability: "do-not-interrupt",
    parentActivity: "Cooking",
  };

  it("boosts activities with independent-time wins", () => {
    const boost = getSessionFitBoost(activity, [
      {
        activityTitle: "LEGO Free Build",
        independenceRating: "worked-great",
        actualMinutes: 24,
        requestedMinutes: 20,
      },
    ]);

    expect(boost).toBeGreaterThan(0);
    expect(
      applySessionFitBoost(50, activity, [
        {
          activityTitle: "LEGO Free Build",
          independenceRating: "worked-great",
          actualMinutes: 24,
          requestedMinutes: 20,
        },
      ])
    ).toBeGreaterThan(50);
  });

  it("penalizes activities that did not last", () => {
    const boost = getSessionFitBoost(activity, [
      {
        activityTitle: "LEGO Free Build",
        independenceRating: "didnt-last",
        actualMinutes: 5,
        requestedMinutes: 20,
      },
    ]);

    expect(boost).toBeLessThan(0);
  });

  it("filters sessions by child in single-child mode", () => {
    const sessions = [
      { childId: "sam", activityTitle: "LEGO Free Build" },
      { childId: "emma", activityTitle: "LEGO Free Build" },
    ];

    expect(
      filterSessionsForFitScore(sessions, {
        activeChildId: "emma",
        activityMode: "single-child",
      })
    ).toEqual([sessions[1]]);
  });

  it("does not let another child's wins boost auto-pick", () => {
    const lego = {
      title: "LEGO Free Build",
      activityStyle: "simple",
      energy: "medium",
      mess: "low",
      estimatedMinutes: 20,
      uses: ["LEGO"],
    };
    const drawing = {
      title: "Quiet Drawing",
      activityStyle: "simple",
      energy: "low",
      mess: "low",
      estimatedMinutes: 20,
      uses: ["crayons"],
    };

    const sessions = [
      {
        childId: "sam",
        activityTitle: "LEGO Free Build",
        independenceRating: "worked-great",
        actualMinutes: 25,
        requestedMinutes: 20,
      },
    ];

    const forEmma = scoreActivitiesForCurrentMoment({
      activities: [lego, drawing],
      currentMoment: cookingMoment,
      activityHistory: [],
      activitySessions: sessions,
      scoringOptions: { activeChildId: "emma", inventory: [] },
      activityMode: "single-child",
    });

    const boardTop = forEmma[0].activity;
    const autoPick = pickBestActivityForCurrentMoment({
      activities: [lego, drawing],
      currentMoment: cookingMoment,
      activityHistory: [],
      activitySessions: sessions,
      scoringOptions: { activeChildId: "emma", inventory: [] },
      activityMode: "single-child",
    });

    expect(autoPick).toBe(boardTop);
    expect(
      forEmma.find((row) => row.activity.title === "LEGO Free Build").sessionBoost
    ).toBe(0);
  });

  it("gates out age-ineligible activities before ranking", () => {
    const youngOnly = {
      title: "Toddler Finger Paint",
      energy: "low",
      mess: "high",
      adultHelp: "needed",
      estimatedMinutes: 15,
      uses: [],
      ageFit: { minAge: 2, maxAge: 4, targetAges: [3] },
    };
    const tweenOk = {
      title: "Photo Scavenger Hunt",
      energy: "medium",
      mess: "low",
      adultHelp: "none",
      estimatedMinutes: 20,
      uses: [],
      ageFit: { minAge: 10, maxAge: 15, targetAges: [13] },
    };

    const ranked = scoreActivitiesForCurrentMoment({
      activities: [youngOnly, tweenOk],
      currentMoment: cookingMoment,
      activityHistory: [],
      activitySessions: [],
      scoringOptions: { inventory: [] },
      childAges: [13],
    });

    expect(ranked).toHaveLength(1);
    expect(ranked[0].activity.title).toBe("Photo Scavenger Hunt");
  });

  it("maps independence ratings and duration reliability", () => {
    expect(
      getIndependenceSignal({ independenceRating: "worked-great" })
    ).toBeGreaterThan(getIndependenceSignal({ independenceRating: "needed-me-few-times" }));
    expect(getIndependenceSignal({ independenceRating: "didnt-last" })).toBeLessThan(0);
    expect(getIndependenceSignal({ completionStatus: "abandoned" })).toBeLessThan(0);
    expect(getIndependenceSignal({ completionStatus: "canceled" })).toBeLessThan(0);

    expect(
      getDurationReliabilityRatio({
        actualMinutes: 18,
        requestedMinutes: 20,
      })
    ).toBeCloseTo(0.9);
    expect(
      getDurationReliabilityScore({
        actualMinutes: 20,
        requestedMinutes: 20,
      })
    ).toBeGreaterThan(
      getDurationReliabilityScore({
        actualMinutes: 5,
        requestedMinutes: 20,
      })
    );
  });

  it("weights matching historical moment context more heavily", () => {
    const matchingContext = {
      childId: "emma",
      activityTitle: "LEGO Free Build",
      independenceRating: "worked-great",
      actualMinutes: 20,
      requestedMinutes: 20,
      parentActivity: "Cooking",
      parentAvailability: "do-not-interrupt",
      space: "Kitchen",
      noiseLimit: "quiet",
      messLimit: "low",
      supervisionLevel: "independent",
    };

    const mismatchedContext = {
      ...matchingContext,
      parentActivity: "Calls",
      parentAvailability: "helper-welcome",
      space: "Backyard",
      noiseLimit: "loud",
      messLimit: "high",
      supervisionLevel: "nearby",
      requestedMinutes: 45,
    };

    expect(
      getHistoricalContextSimilarity(matchingContext, cookingMoment, {
        activeChildId: "emma",
      })
    ).toBeGreaterThan(
      getHistoricalContextSimilarity(mismatchedContext, cookingMoment, {
        activeChildId: "emma",
      })
    );

    const matchingBoost = getSessionFitBoost(activity, [matchingContext], {
      currentMoment: cookingMoment,
      activeChildId: "emma",
    });
    const mismatchedBoost = getSessionFitBoost(activity, [mismatchedContext], {
      currentMoment: cookingMoment,
      activeChildId: "emma",
    });

    expect(matchingBoost).toBeGreaterThan(mismatchedBoost);
  });


  it("scores nearly identical moments close to 1", () => {
    const score = calculateMomentSimilarity(cookingMoment, {
      availability: "do-not-interrupt",
      supervisionLevel: "independent",
      space: "Kitchen",
      noiseLevel: "quiet",
      messLevel: "low",
      timeNeededMinutes: 20,
    });

    expect(score).toBeGreaterThan(0.85);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("clamps learned boost within +/-12", () => {
    const sessions = Array.from({ length: 12 }, () => ({
      activityTitle: "LEGO Free Build",
      independenceRating: "worked-great",
      actualMinutes: 20,
      requestedMinutes: 20,
      parentActivity: "Cooking",
      parentAvailability: "do-not-interrupt",
      space: "Kitchen",
      noiseLimit: "quiet",
      messLimit: "low",
      supervisionLevel: "independent",
    }));

    const boost = getSessionFitBoost(activity, sessions, {
      currentMoment: cookingMoment,
    });

    expect(boost).toBeLessThanOrEqual(12);
    expect(boost).toBeGreaterThanOrEqual(-12);
  });

  it("matches trait-similar activities when titles differ", () => {
    const blocks = {
      title: "Block Tower Challenge",
      activityStyle: "simple",
      energy: "medium",
      mess: "low",
      uses: ["blocks"],
    };

    const boost = getSessionFitBoost(blocks, [
      {
        activityTitle: "LEGO Free Build",
        activityEnergy: "medium",
        activityMess: "low",
        activitySupplies: ["LEGO"],
        independenceRating: "worked-great",
        actualMinutes: 22,
        requestedMinutes: 20,
      },
    ]);

    expect(boost).toBeGreaterThan(0);
  });

  it("applies child preference and recent repetition helpers", () => {
    const preference = getChildPreferenceScore(
      activity,
      [
        {
          childId: "emma",
          activityTitle: "LEGO City",
          activitySupplies: ["LEGO"],
          activityEnergy: "medium",
          activityMess: "low",
          independenceRating: "worked-great",
        },
      ],
      { activeChildId: "emma" }
    );

    expect(preference).toBeGreaterThan(0);

    const penalty = getRecentRepetitionPenalty(
      activity,
      [
        {
          activityTitle: "LEGO Free Build",
          startedAt: new Date().toISOString(),
        },
      ],
      { now: Date.now() }
    );

    expect(penalty).toBeGreaterThan(0);
  });
});
