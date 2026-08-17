import { describe, expect, it } from "vitest";
import {
  isLaunchTrialOfferActive,
  launchTrialCtaLabel,
  launchTrialHeroKicker,
  launchTrialOfferNote,
} from "./launchTrialCopy";

const offer = { available: true, days: 7, limit: 20 };

describe("launch trial copy", () => {
  it("is only active when the offer is available", () => {
    expect(isLaunchTrialOfferActive(offer)).toBe(true);
    expect(isLaunchTrialOfferActive({ available: false, days: 7 })).toBe(
      false
    );
    expect(isLaunchTrialOfferActive(null)).toBe(false);
  });

  it("includes trial length and family cap in every public string", () => {
    expect(launchTrialOfferNote(offer)).toBe(
      "Launch offer: 7 days free for the first 20 families. Card required — $0 today."
    );
    expect(launchTrialHeroKicker(offer)).toBe(
      "Launch offer: 7 days free for the first 20 families"
    );
    expect(launchTrialCtaLabel(offer, "monthly")).toBe(
      "Start 7-day free trial — first 20 families"
    );
    expect(launchTrialCtaLabel(offer, "annual")).toBe(
      "Start 7-day free trial (annual) — first 20 families"
    );
  });

  it("falls back to 7 days and 20 families", () => {
    expect(launchTrialOfferNote({})).toContain("7 days free");
    expect(launchTrialOfferNote({})).toContain("first 20 families");
  });
});
