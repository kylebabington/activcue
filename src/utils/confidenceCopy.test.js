import { describe, expect, it } from "vitest";
import {
  buildConfidenceCopy,
  buildGettingBetterCopy,
} from "./confidenceCopy";

describe("buildConfidenceCopy", () => {
  const activity = { title: "LEGO Free Build", energy: "medium", mess: "low" };

  it("does not use Usually when sessions belong to another child", () => {
    const copy = buildConfidenceCopy(
      activity,
      [
        {
          childId: "sam",
          activityTitle: "LEGO Free Build",
          independenceRating: "worked-great",
          actualMinutes: 22,
        },
        {
          childId: "sam",
          activityTitle: "LEGO Free Build",
          independenceRating: "worked-great",
          actualMinutes: 24,
        },
      ],
      "Emma",
      { childId: "emma" }
    );

    expect(copy).not.toMatch(/Usually keeps Emma/i);
  });

  it("requires successful independence before Usually claims", () => {
    const copy = buildConfidenceCopy(
      activity,
      [
        {
          childId: "emma",
          activityTitle: "LEGO Free Build",
          independenceRating: "needed-me-few-times",
          actualMinutes: 18,
        },
        {
          childId: "emma",
          activityTitle: "LEGO Free Build",
          independenceRating: "didnt-last",
          actualMinutes: 6,
        },
      ],
      "Emma",
      { childId: "emma" }
    );

    expect(copy).not.toMatch(/Usually keeps/i);
  });

  it("uses Usually for same child with mostly worked-great outcomes", () => {
    const copy = buildConfidenceCopy(
      activity,
      [
        {
          childId: "emma",
          activityTitle: "LEGO Free Build",
          independenceRating: "worked-great",
          actualMinutes: 22,
        },
        {
          childId: "emma",
          activityTitle: "LEGO Free Build",
          independenceRating: "worked-great",
          actualMinutes: 24,
        },
      ],
      "Emma",
      { childId: "emma" }
    );

    expect(copy).toMatch(/Usually keeps Emma busy independently/i);
  });
});

describe("buildGettingBetterCopy", () => {
  it("stays quiet until enough successful sessions exist", () => {
    expect(
      buildGettingBetterCopy(
        [
          {
            childId: "emma",
            independenceRating: "worked-great",
          },
        ],
        { childId: "emma", childName: "Emma" }
      )
    ).toBe("");
  });

  it("surfaces a flywheel line after repeated success", () => {
    expect(
      buildGettingBetterCopy(
        [
          {
            childId: "emma",
            independenceRating: "worked-great",
            noiseLevel: "quiet",
          },
          {
            childId: "emma",
            independenceRating: "worked-great",
            noiseLevel: "quiet",
          },
        ],
        { childId: "emma", childName: "Emma" }
      )
    ).toMatch(/Getting better at quiet independent time for Emma/i);
  });
});
