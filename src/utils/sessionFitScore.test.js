import { describe, expect, it } from "vitest";
import {
  applySessionFitBoost,
  filterSessionsForFitScore,
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
    expect(applySessionFitBoost(50, activity, [
      {
        activityTitle: "LEGO Free Build",
        independenceRating: "worked-great",
        actualMinutes: 24,
        requestedMinutes: 20,
      },
    ])).toBeGreaterThan(50);
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
    };
    const drawing = {
      title: "Quiet Drawing",
      activityStyle: "simple",
      energy: "low",
      mess: "low",
      estimatedMinutes: 20,
    };

    const moment = {
      timeNeededMinutes: 20,
      messLevel: "low",
      noiseLevel: "quiet",
      supervisionLevel: "independent",
      space: "Living room",
      availability: "do-not-interrupt",
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
      currentMoment: moment,
      activityHistory: [],
      activitySessions: sessions,
      scoringOptions: { activeChildId: "emma", inventory: [] },
      activityMode: "single-child",
    });

    const boardTop = forEmma[0].activity;
    const autoPick = pickBestActivityForCurrentMoment({
      activities: [lego, drawing],
      currentMoment: moment,
      activityHistory: [],
      activitySessions: sessions,
      scoringOptions: { activeChildId: "emma", inventory: [] },
      activityMode: "single-child",
    });

    expect(autoPick).toBe(boardTop);
    expect(forEmma.find((row) => row.activity.title === "LEGO Free Build").sessionBoost).toBe(0);
  });
});
