import { describe, expect, it } from "vitest";
import {
  applySessionFitBoost,
  getSessionFitBoost,
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
});
