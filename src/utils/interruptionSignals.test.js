import { describe, expect, it } from "vitest";
import {
  independentMinutesDelivered,
  interruptionLevelFromIndependence,
} from "./interruptionSignals.js";

describe("interruptionSignals", () => {
  it("maps independence ratings to interruption levels", () => {
    expect(interruptionLevelFromIndependence("worked-great")).toBe("low");
    expect(interruptionLevelFromIndependence("needed-me-few-times")).toBe(
      "medium"
    );
    expect(interruptionLevelFromIndependence("didnt-last")).toBe("high");
  });

  it("estimates independent minutes delivered", () => {
    expect(
      independentMinutesDelivered({
        actualMinutes: 20,
        independenceRating: "worked-great",
      })
    ).toBe(20);
    expect(
      independentMinutesDelivered({
        actualMinutes: 20,
        independenceRating: "needed-me-few-times",
      })
    ).toBe(14);
    expect(
      independentMinutesDelivered({
        actualMinutes: 20,
        independenceRating: "didnt-last",
      })
    ).toBe(6);
  });
});
