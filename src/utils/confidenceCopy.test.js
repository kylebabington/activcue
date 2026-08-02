import { describe, expect, it } from "vitest";
import { buildConfidenceCopy } from "./confidenceCopy";

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
