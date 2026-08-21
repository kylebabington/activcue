import { describe, expect, it } from "vitest";
import { resolveParticipantContext } from "./participantContext.js";

describe("resolveParticipantContext", () => {
  const six = { id: "c6", name: "Six", birthDate: "2020-06-01" };
  const ten = { id: "c10", name: "Ten", birthDate: "2016-06-01" };
  const thirteen = { id: "c13", name: "Thirteen", birthDate: "2013-06-01" };

  it("derives single-child from one selected profile even if mode says family", () => {
    const result = resolveParticipantContext({
      activityMode: "family",
      selectedChildProfiles: [six],
    });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe("single-child");
    expect(result.participantCount).toBe(1);
  });

  it("derives family from two selected profiles even if mode says single-child", () => {
    const result = resolveParticipantContext({
      activityMode: "single-child",
      selectedChildProfiles: [six, thirteen],
    });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe("family");
    expect(result.participantCount).toBe(2);
  });

  it("prefers requestContext.participants.children", () => {
    const result = resolveParticipantContext({
      activityMode: "family",
      selectedChildProfiles: [six, ten, thirteen],
      requestContext: {
        participants: { children: [six] },
      },
    });
    expect(result.participantCount).toBe(1);
    expect(result.mode).toBe("single-child");
  });

  it("rejects when no participants can be resolved", () => {
    const result = resolveParticipantContext({
      activityMode: "single-child",
      selectedChildProfiles: [],
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("PARTICIPANTS_REQUIRED");
  });

  it("honors ageYears on requestContext children without birthDate", () => {
    const result = resolveParticipantContext({
      requestContext: {
        participants: {
          children: [{ id: "c9", name: "Nine", ageYears: 9 }],
        },
      },
    });
    expect(result.ok).toBe(true);
    expect(result.ages).toEqual([9]);
    expect(result.mode).toBe("single-child");
  });
});
