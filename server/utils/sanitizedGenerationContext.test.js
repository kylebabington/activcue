import { describe, expect, it } from "vitest";
import { buildSanitizedGenerationContext } from "./sanitizedGenerationContext.js";
import { AGE_POLICY_VERSION } from "./activityAgePolicy.js";
import { FIT_POLICY_VERSION } from "./activityFitPolicy.js";

describe("buildSanitizedGenerationContext", () => {
  it("builds a privacy-safe snapshot with policy versions", () => {
    const snapshot = buildSanitizedGenerationContext({
      requestContext: {
        requestId: "req-1",
        participants: {
          mode: "single-child",
          participantCount: 1,
          ages: [6],
        },
        activity: { style: "imaginative", energyLevel: "quiet" },
        moment: {
          timeNeededMinutes: 20,
          space: "Kitchen table",
          messLevel: "low",
          noiseLevel: "quiet",
          supervisionLevel: "independent",
        },
        safety: {
          maxActivityMinutes: 20,
          adultHelpAllowed: "independent",
        },
      },
      sourcePath: "activity-suggestions",
    });

    expect(snapshot.participantCount).toBe(1);
    expect(snapshot.participantAges).toEqual([6]);
    expect(snapshot.participantMode).toBe("single-child");
    expect(snapshot.activityStyle).toBe("imaginative");
    expect(snapshot.energyLevel).toBe("quiet");
    expect(snapshot.availableMinutes).toBe(20);
    expect(snapshot.space).toBe("Kitchen table");
    expect(snapshot.messLevel).toBe("low");
    expect(snapshot.noiseLevel).toBe("quiet");
    expect(snapshot.supervisionLevel).toBe("independent");
    expect(snapshot.agePolicyVersion).toBe(AGE_POLICY_VERSION);
    expect(snapshot.fitPolicyVersion).toBe(FIT_POLICY_VERSION);
    expect(snapshot.requestId).toBe("req-1");
    expect(snapshot.sourcePath).toBe("activity-suggestions");
    expect(snapshot).not.toHaveProperty("children");
    expect(JSON.stringify(snapshot)).not.toMatch(/"Six"|"birthDate"/);
  });

  it("prefers authoritative participants override", () => {
    const snapshot = buildSanitizedGenerationContext({
      requestContext: {
        participants: { mode: "family", participantCount: 3, ages: [4, 8, 12] },
      },
      participants: {
        mode: "single-child",
        participantCount: 1,
        ages: [9],
      },
    });

    expect(snapshot.participantCount).toBe(1);
    expect(snapshot.participantAges).toEqual([9]);
    expect(snapshot.participantMode).toBe("single-child");
  });
});
