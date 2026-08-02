import { describe, expect, it } from "vitest";
import {
  buildActivitySessionExitPatch,
  buildActivitySessionStartPayload,
} from "./questSessionHelpers.js";

describe("activity session lifecycle payloads", () => {
  const activity = {
    title: "LEGO city",
    activityStyle: "simple",
    startedAt: Date.now() - 10 * 60 * 1000,
    durationMinutes: 20,
    energy: "medium",
    mess: "low",
    adultHelp: "optional",
    uses: ["LEGO"],
  };

  const moment = {
    parentActivity: "Cooking",
    availability: "do-not-interrupt",
    timeNeededMinutes: 20,
    space: "Kitchen",
    noiseLevel: "quiet",
    messLevel: "low",
    supervisionLevel: "independent",
  };

  it("builds an in-progress start payload without finishedAt", () => {
    const payload = buildActivitySessionStartPayload(activity, moment, {
      childId: "child-1",
    });

    expect(payload.completionStatus).toBe("in-progress");
    expect(payload.finishedAt).toBeNull();
    expect(payload.actualMinutes).toBeNull();
    expect(payload.childId).toBe("child-1");
    expect(payload.activityTitle).toBe("LEGO city");
  });

  it("builds exit patches for each completion status", () => {
    const finished = buildActivitySessionExitPatch(activity, {
      completionStatus: "finished",
      finishedAt: activity.startedAt + 12 * 60 * 1000,
    });
    const canceled = buildActivitySessionExitPatch(activity, {
      completionStatus: "canceled",
    });
    const abandoned = buildActivitySessionExitPatch(activity, {
      completionStatus: "abandoned",
    });

    expect(finished.completionStatus).toBe("finished");
    expect(finished.actualMinutes).toBe(12);
    expect(finished.finishedAt).toBeTruthy();
    expect(canceled.completionStatus).toBe("canceled");
    expect(abandoned.completionStatus).toBe("abandoned");
  });
});
