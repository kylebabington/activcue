import { describe, expect, it } from "vitest";
import {
  ageRangeToApproxYears,
  birthDateFromAgeYears,
  calculateAge,
  getAgeBand,
  getGroupAgeContext,
  isEligibleForChildren,
  resolveChildAge,
  validateAgeFit,
} from "./childAge";

describe("calculateAge", () => {
  it("returns exact age after birthday has occurred this year", () => {
    const today = new Date(2026, 7, 3);
    expect(calculateAge("2013-07-01", today)).toBe(13);
  });

  it("returns age minus one before birthday this year", () => {
    const today = new Date(2026, 7, 3);
    expect(calculateAge("2013-09-14", today)).toBe(12);
  });

  it("handles birthday on today", () => {
    const today = new Date(2026, 7, 3);
    expect(calculateAge("2014-08-03", today)).toBe(12);
  });
});

describe("getAgeBand", () => {
  it("maps boundary ages", () => {
    expect(getAgeBand(3)).toBe("toddler");
    expect(getAgeBand(5)).toBe("preschool");
    expect(getAgeBand(7)).toBe("early-elementary");
    expect(getAgeBand(9)).toBe("elementary");
    expect(getAgeBand(11)).toBe("older-elementary");
    expect(getAgeBand(13)).toBe("young-teen");
    expect(getAgeBand(14)).toBe("teen");
    expect(getAgeBand(16)).toBe("older-teen");
  });
});

describe("ageRange fallback", () => {
  it("maps buckets to approximate years", () => {
    expect(ageRangeToApproxYears("3-5")).toBe(4);
    expect(ageRangeToApproxYears("6-9")).toBe(7);
    expect(ageRangeToApproxYears("10-12")).toBe(11);
    expect(ageRangeToApproxYears("13+")).toBe(14);
  });

  it("resolveChildAge prefers birthDate over ageRange", () => {
    const today = new Date(2026, 7, 3);
    const resolved = resolveChildAge(
      { birthDate: "2013-09-14", ageRange: "6-9" },
      today
    );
    expect(resolved.ageYears).toBe(12);
    expect(resolved.source).toBe("birthDate");
    expect(resolved.ageBand).toBe("young-teen");
  });

  it("resolveChildAge falls back to ageRange when birthDate missing", () => {
    const resolved = resolveChildAge({ ageRange: "13+" });
    expect(resolved.ageYears).toBe(14);
    expect(resolved.source).toBe("ageRange");
    expect(resolved.ageBand).toBe("teen");
  });
});

describe("getGroupAgeContext", () => {
  it("detects mixed-age groups with span >= 3", () => {
    const ctx = getGroupAgeContext([6, 9, 13]);
    expect(ctx.youngestAge).toBe(6);
    expect(ctx.oldestAge).toBe(13);
    expect(ctx.ageSpan).toBe(7);
    expect(ctx.isMixedAge).toBe(true);
  });

  it("does not mark close ages as mixed", () => {
    expect(getGroupAgeContext([8, 9, 10]).isMixedAge).toBe(false);
  });
});

describe("validateAgeFit / isEligibleForChildren", () => {
  const activityFor8To12 = {
    ageFit: { minAge: 8, maxAge: 12, targetAges: [9, 10] },
  };

  it("rejects ages outside min/max", () => {
    expect(validateAgeFit(activityFor8To12, [13])).toBe(false);
    expect(isEligibleForChildren(activityFor8To12, [13])).toBe(false);
  });

  it("accepts ages inside range", () => {
    expect(validateAgeFit(activityFor8To12, [8, 12])).toBe(true);
  });

  it("allows activities without ageFit (legacy)", () => {
    expect(isEligibleForChildren({}, [13])).toBe(true);
  });
});

describe("birthDateFromAgeYears", () => {
  it("creates a synthetic birth date", () => {
    const today = new Date(2026, 7, 3);
    expect(birthDateFromAgeYears(12, today)).toBe("2014-08-03");
  });
});
