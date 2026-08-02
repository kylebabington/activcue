import { describe, expect, it, vi } from "vitest";
import {
  buildActivitySessionExitPatch,
  buildActivitySessionStartPayload,
  resolveActivitySessionId,
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
    expect(payload.sessionScope).toBe("single");
    expect(payload.participantChildIds).toEqual([]);
  });

  it("builds a group session payload with participant child ids", () => {
    const payload = buildActivitySessionStartPayload(activity, moment, {
      childId: "child-1",
      sessionScope: "group",
      participantChildIds: ["child-1", "child-2", "child-1", ""],
    });

    expect(payload.sessionScope).toBe("group");
    expect(payload.participantChildIds).toEqual(["child-1", "child-2"]);
  });

  it("infers group scope when multiple participants are provided", () => {
    const payload = buildActivitySessionStartPayload(activity, moment, {
      participantChildIds: ["sam", "emma"],
    });

    expect(payload.sessionScope).toBe("group");
    expect(payload.participantChildIds).toEqual(["sam", "emma"]);
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

describe("resolveActivitySessionId race handling", () => {
  it("awaits a slow create and returns that single session id", async () => {
    const createCalls = [];
    const patchCalls = [];

    const slowCreate = new Promise((resolve) => {
      setTimeout(() => {
        createCalls.push("created");
        resolve({ activitySession: { id: "session-1" } });
      }, 50);
    });

    const sessionIdPromise = resolveActivitySessionId({
      existingSessionId: null,
      creationPromise: slowCreate,
    }).then(async (sessionId) => {
      patchCalls.push(sessionId);
      return sessionId;
    });

    const sessionId = await sessionIdPromise;

    expect(sessionId).toBe("session-1");
    expect(createCalls).toEqual(["created"]);
    expect(patchCalls).toEqual(["session-1"]);
  });

  it("prefers an existing session id without awaiting create", async () => {
    const slowCreate = new Promise(() => {});
    const sessionId = await resolveActivitySessionId({
      existingSessionId: "already-known",
      creationPromise: slowCreate,
    });
    expect(sessionId).toBe("already-known");
  });

  it("returns null when create fails instead of inventing a second session", async () => {
    const failedCreate = Promise.reject(new Error("network down"));
    failedCreate.catch(() => {});

    const sessionId = await resolveActivitySessionId({
      existingSessionId: null,
      creationPromise: failedCreate,
    });
    expect(sessionId).toBeNull();
  });
});

describe("slow POST + instant finish produces one session", () => {
  it("chains finish onto pending create without a fallback POST", async () => {
    const sessions = [];
    let createCount = 0;
    let patchCount = 0;

    const createActivitySession = vi.fn(async () => {
      createCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 40));
      const session = {
        id: `session-${createCount}`,
        completionStatus: "in-progress",
      };
      sessions.push(session);
      return { activitySession: session };
    });

    const updateActivitySession = vi.fn(async (sessionId, patch) => {
      patchCount += 1;
      const existing = sessions.find((row) => row.id === sessionId);
      Object.assign(existing, patch);
      return { activitySession: existing };
    });

    const creationPromise = createActivitySession({
      completionStatus: "in-progress",
    });

    const finishPromise = (async () => {
      const sessionId = await resolveActivitySessionId({
        existingSessionId: null,
        creationPromise,
      });
      expect(sessionId).toBeTruthy();
      await updateActivitySession(sessionId, {
        completionStatus: "finished",
      });
    })();

    await finishPromise;

    expect(createCount).toBe(1);
    expect(patchCount).toBe(1);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].completionStatus).toBe("finished");
  });
});
