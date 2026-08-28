import { describe, expect, it } from "vitest";
import {
  normalizeParticipantMeta,
  evaluateParticipantCompatibility,
  applyParticipantMeta,
} from "./participantMeta.js";
import { PARTNER_RE } from "./activityFitPolicy.js";

function cooperativeActivity(overrides = {}) {
  return {
    title: "Sibling Sorting Line",
    traits: { socialMode: "cooperative" },
    roleGuide: {
      name: "Team Sorters",
      description: "Sort items together.",
      childRoles: [
        {
          childName: "A",
          age: 6,
          roleTitle: "Sorter",
          responsibility: "Sort",
          firstAction: "Pick",
        },
        {
          childName: "B",
          age: 8,
          roleTitle: "Checker",
          responsibility: "Check",
          firstAction: "Verify",
        },
      ],
    },
    ...overrides,
  };
}

describe("normalizeParticipantMeta", () => {
  it("maps cooperative social mode to min 2 max 4", () => {
    const meta = normalizeParticipantMeta(cooperativeActivity());
    expect(meta.participantMin).toBe(2);
    expect(meta.participantMax).toBe(4);
    expect(meta.socialMode).toBe("cooperative");
  });

  it("maps flexible to min 1 max 4", () => {
    const meta = normalizeParticipantMeta({
      traits: { socialMode: "flexible" },
    });
    expect(meta.participantMin).toBe(1);
    expect(meta.participantMax).toBe(4);
    expect(meta.participantMode).toBe("flexible");
  });

  it("repairs stale cache single/1/1 when validated false and cooperative content", () => {
    const meta = normalizeParticipantMeta({
      participant_mode: "single",
      participant_min: 1,
      participant_max: 1,
      participant_fit_validated: false,
      traits: { socialMode: "cooperative" },
      roleGuide: {
        childRoles: [
          { roleTitle: "A" },
          { roleTitle: "B" },
        ],
      },
    });
    expect(meta.participantMin).toBeGreaterThanOrEqual(2);
    expect(meta.participantMax).toBeGreaterThanOrEqual(2);
    expect(meta.metadataContradiction).toBe(true);
    expect(meta.source).toBe("content-derived");
  });

  it("keeps validated explicit solo when content agrees", () => {
    const meta = normalizeParticipantMeta({
      participant_mode: "single",
      participant_min: 1,
      participant_max: 1,
      participant_fit_validated: true,
      traits: { socialMode: "solo" },
      roleGuide: { childRoles: [] },
    });
    expect(meta.participantMin).toBe(1);
    expect(meta.participantMax).toBe(1);
    expect(meta.source).toBe("validated-explicit");
    expect(meta.metadataContradiction).toBe(false);
  });

  it("two child roles never resolve to max 1", () => {
    const meta = normalizeParticipantMeta({
      traits: { socialMode: "solo" },
      roleGuide: {
        childRoles: [{ roleTitle: "A" }, { roleTitle: "B" }],
      },
    });
    expect(meta.participantMax).toBeGreaterThanOrEqual(2);
  });
});

describe("evaluateParticipantCompatibility", () => {
  it("one child + flexible passes", () => {
    const meta = normalizeParticipantMeta({ traits: { socialMode: "flexible" } });
    const failures = evaluateParticipantCompatibility(meta, 1, "", PARTNER_RE);
    expect(failures).toEqual([]);
  });

  it("two children + flexible passes", () => {
    const meta = normalizeParticipantMeta({ traits: { socialMode: "flexible" } });
    const failures = evaluateParticipantCompatibility(meta, 2, "", PARTNER_RE);
    expect(failures).toEqual([]);
  });

  it("one child + cooperative fails", () => {
    const meta = normalizeParticipantMeta({ traits: { socialMode: "cooperative" } });
    const failures = evaluateParticipantCompatibility(meta, 1, "", PARTNER_RE);
    expect(failures).toContain("participant-count-mismatch");
  });

  it("two children + cooperative passes", () => {
    const meta = normalizeParticipantMeta(cooperativeActivity());
    const failures = evaluateParticipantCompatibility(meta, 2, "", PARTNER_RE);
    expect(failures).toEqual([]);
  });

  it("two children + solo fails", () => {
    const meta = normalizeParticipantMeta({
      traits: { socialMode: "solo" },
      roleGuide: { childRoles: [] },
    });
    const failures = evaluateParticipantCompatibility(meta, 2, "", PARTNER_RE);
    expect(failures).toContain("participant-count-mismatch");
  });
});

describe("applyParticipantMeta", () => {
  it("stamps snake_case and camelCase fields", () => {
    const applied = applyParticipantMeta(
      { title: "Test" },
      normalizeParticipantMeta({ traits: { socialMode: "flexible" } })
    );
    expect(applied.participantMin).toBe(1);
    expect(applied.participant_max).toBe(4);
  });
});
