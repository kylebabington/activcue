import { describe, expect, it } from "vitest";
import {
  isLaunchTrialOfferActive,
  launchTrialCtaLabel,
  launchTrialHeroKicker,
  launchTrialOfferNote,
} from "./launchTrialCopy";

const offer = { available: true, days: 7, limit: 20, remaining: 17 };

describe("launch trial copy", () => {
  it("is only active when the offer is available", () => {
    expect(isLaunchTrialOfferActive(offer)).toBe(true);
    expect(isLaunchTrialOfferActive({ available: false, days: 7 })).toBe(
      false
    );
    expect(isLaunchTrialOfferActive(null)).toBe(false);
  });

  it("keeps family counts off the price buttons", () => {
    expect(launchTrialCtaLabel(offer)).toBe("Start 7-day free trial");
    expect(launchTrialCtaLabel(offer, "annual")).toBe(
      "Start 7-day free trial"
    );
  });

  it("counts down remaining families in the public offer copy", () => {
    expect(launchTrialOfferNote(offer)).toBe(
      "Launch offer: 7 days free. 17 of 20 families left. Card required — $0 today."
    );
    expect(launchTrialHeroKicker(offer)).toBe(
      "Launch offer: 7 days free — 17 of 20 families left"
    );
  });

  it("falls back to 7 days and a full 20-family cap", () => {
    expect(launchTrialOfferNote({})).toContain("7 days free");
    expect(launchTrialOfferNote({})).toContain("20 of 20 families left");
  });
});
