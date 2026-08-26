import { describe, expect, it, vi } from "vitest";
import {
  AiResponseInvalidError,
  generateActivitiesWithParseRecovery,
} from "./generateActivitiesWithParseRecovery.js";

function okPayload(titles) {
  return JSON.stringify({
    activities: titles.map((title) => ({
      title,
      activityStyle: "imaginative",
      summary: "A pretend adventure.",
    })),
  });
}

describe("generateActivitiesWithParseRecovery", () => {
  it("retries truncated JSON once and returns imaginative activities", async () => {
    const createResponse = vi
      .fn()
      .mockResolvedValueOnce({ outputText: '{"activities":[{"title":"A"' })
      .mockResolvedValueOnce({
        outputText: okPayload(["Spy Base", "Lost Signal", "Moon Fort"]),
        model: "test",
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        responseId: "r1",
      });

    const result = await generateActivitiesWithParseRecovery({
      createResponse,
      buildInput: (feedback, count) => `count=${count}|${feedback}`,
      expectedCount: 3,
      activityStyle: "imaginative",
      maxTokensForCount: (n) => n * 1000,
    });

    expect(createResponse).toHaveBeenCalledTimes(2);
    expect(result.activities).toHaveLength(3);
    expect(result.activities.map((a) => a.title)).toEqual([
      "Spy Base",
      "Lost Signal",
      "Moon Fort",
    ]);
  });

  it("throws AI_RESPONSE_INVALID when parse fails twice", async () => {
    const createResponse = vi.fn().mockResolvedValue({
      outputText: '{"activities":[{"title":"broken"',
    });

    await expect(
      generateActivitiesWithParseRecovery({
        createResponse,
        buildInput: () => "x",
        expectedCount: 3,
        activityStyle: "imaginative",
        maxTokensForCount: () => 1000,
      })
    ).rejects.toMatchObject({
      code: "AI_RESPONSE_INVALID",
      status: 422,
    });

    expect(createResponse).toHaveBeenCalledTimes(2);
  });

  it("fills missing slots one at a time without changing style", async () => {
    const createResponse = vi
      .fn()
      .mockResolvedValueOnce({
        outputText: okPayload(["Only One", "Only Two"]),
      })
      .mockResolvedValueOnce({
        outputText: okPayload(["Third Quest"]),
      });

    const result = await generateActivitiesWithParseRecovery({
      createResponse,
      buildInput: (feedback, count) => `count=${count}|${feedback}`,
      expectedCount: 3,
      activityStyle: "imaginative",
      maxTokensForCount: (n) => n * 1000,
    });

    expect(result.activities).toHaveLength(3);
    expect(result.activities[2].title).toBe("Third Quest");
    expect(
      result.activities.every((a) => a.activityStyle === "imaginative")
    ).toBe(true);
  });

  it("rejects wrong-style substitution", async () => {
    const createResponse = vi.fn().mockResolvedValue({
      outputText: JSON.stringify({
        activities: [
          { title: "Draw", activityStyle: "simple" },
          { title: "Color", activityStyle: "simple" },
          { title: "Cut", activityStyle: "simple" },
        ],
      }),
    });

    await expect(
      generateActivitiesWithParseRecovery({
        createResponse,
        buildInput: () => "x",
        expectedCount: 3,
        activityStyle: "imaginative",
        maxTokensForCount: () => 1000,
      })
    ).rejects.toBeInstanceOf(AiResponseInvalidError);
  });
});
