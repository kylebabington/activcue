import { describe, expect, it } from "vitest";
import { getRecentPlayAgainActivities } from "./playAgainActivities";

describe("getRecentPlayAgainActivities", () => {
  it("prefers finished history for playing children", () => {
    const result = getRecentPlayAgainActivities({
      savedActivities: [
        { id: "1", title: "Global Favorite" },
        { id: "2", title: "Iris Puzzle" },
      ],
      activityHistory: [
        {
          title: "Iris Puzzle",
          feedbackType: "finished",
          childId: "child-a",
        },
        {
          title: "Other Kid Build",
          feedbackType: "finished",
          childId: "child-b",
        },
      ],
      playingChildIds: ["child-a"],
      limit: 3,
    });

    expect(result.map((item) => item.title)).toEqual(["Iris Puzzle"]);
  });

  it("falls back to saved favorites when no finished history", () => {
    const result = getRecentPlayAgainActivities({
      savedActivities: [
        { id: "1", title: "A" },
        { id: "2", title: "B" },
        { id: "3", title: "C" },
      ],
      activityHistory: [],
      playingChildIds: ["child-a"],
      limit: 2,
    });

    expect(result.map((item) => item.title)).toEqual(["C", "B"]);
  });
});
