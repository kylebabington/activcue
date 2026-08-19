import { describe, expect, it } from "vitest";
import {
  buildReadingModePreference,
  getYoungestPlayingAgeYears,
  resolveReadingMode,
  resolveReadingModeDefaults,
  SPEECH_RATE_SLOW,
} from "./readingMode";

describe("resolveReadingModeDefaults", () => {
  it("starts on the full play board for ages 9 and under", () => {
    expect(resolveReadingModeDefaults(5)).toMatchObject({
      enabled: false,
      autoAdvance: true,
      showNextPrompt: true,
    });
    expect(resolveReadingModeDefaults(9).enabled).toBe(false);
  });

  it("keeps speakers available but listening off for ages 10-11", () => {
    expect(resolveReadingModeDefaults(10)).toMatchObject({
      enabled: false,
      autoAdvance: false,
      showNextPrompt: true,
    });
  });

  it("hides next prompt by default for ages 12+", () => {
    expect(resolveReadingModeDefaults(12)).toMatchObject({
      enabled: false,
      showNextPrompt: false,
    });
  });
});

describe("resolveReadingMode", () => {
  it("uses age defaults when preference is null", () => {
    expect(
      resolveReadingMode({ preference: null, youngestAgeYears: 7 }).enabled
    ).toBe(false);
  });

  it("lets preference override enabled and rate", () => {
    const resolved = resolveReadingMode({
      preference: {
        enabled: true,
        autoAdvance: false,
        speechSpeed: "slow",
      },
      youngestAgeYears: 13,
    });
    expect(resolved.enabled).toBe(true);
    expect(resolved.autoAdvance).toBe(false);
    expect(resolved.speechRate).toBe(SPEECH_RATE_SLOW);
  });
});

describe("getYoungestPlayingAgeYears", () => {
  it("returns youngest resolved age", () => {
    expect(
      getYoungestPlayingAgeYears([
        { ageRange: "10-12" },
        { ageRange: "6-9" },
      ])
    ).toBe(7);
  });

  it("falls back to 7 when no children", () => {
    expect(getYoungestPlayingAgeYears([])).toBe(7);
  });
});

describe("buildReadingModePreference", () => {
  it("returns null when using age defaults", () => {
    expect(buildReadingModePreference({ useAgeDefaults: true })).toBeNull();
  });

  it("stores explicit overrides", () => {
    expect(
      buildReadingModePreference({
        enabled: true,
        autoAdvance: true,
        speechSpeed: "slow",
      })
    ).toMatchObject({
      enabled: true,
      autoAdvance: true,
      speechSpeed: "slow",
      speechRate: SPEECH_RATE_SLOW,
    });
  });
});
