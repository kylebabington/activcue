import { describe, expect, it } from "vitest";
import { enrichActivityForServe } from "./enrichActivityForServe.js";

describe("enrichActivityForServe", () => {
  it("storyifies imaginative V2 cache payloads and stamps format version 2", () => {
    const enriched = enrichActivityForServe(
      {
        title: "Moon Mail Desk",
        activityStyle: "imaginative",
        visualTheme: "space",
        summary: "Deliver messages across the room.",
        steps: ["Make a desk.", "Write a note.", "Deliver it."],
        ageFit: { minAge: 5, maxAge: 9, maturityLevel: "child" },
      },
      "imaginative",
      [7]
    );

    expect(enriched.activityFormatVersion).toBe(2);
    expect(enriched.storyVoiceVersion).toBe(1);
    expect(enriched.stepDetails.length).toBeGreaterThan(0);
    expect(enriched.stepDetails[0].instruction.length).toBeGreaterThan(20);
    expect(enriched.starterIdeas.length).toBeGreaterThan(0);
  });

  it("preserves V3 activities without storyify rewrite", () => {
    const v3 = {
      title: "Signal Desk",
      activityFormatVersion: 3,
      activityStyle: "imaginative",
      story: "A quiet desk waits for the next signal.",
      summary: "Run the signal desk.",
      uses: ["paper"],
      roleGuide: {
        name: "Signal Runner",
        description: "You keep the desk ready.",
        goal: "Send one clear signal.",
        firstAction: "Clear a spot for the desk.",
        childRoles: [],
      },
      ageFit: { minAge: 6, maxAge: 10, maturityLevel: "child" },
      starterIdeas: [
        {
          title: "Folded paper mail",
          example: "Fold a few small pieces of paper like letters.",
          kind: "building",
        },
      ],
      setupGuide: {
        needed: ["paper"],
        steps: ["Clear a desk."],
        readyWhen: "The desk is clear.",
      },
      finishGuide: {
        action: "Close the desk.",
        example: "Stack the mail.",
        doneWhen: "The desk is closed.",
        extensions: [],
      },
      stepDetails: [
        {
          title: "Open the desk",
          actions: ["Clear a spot.", "Put paper nearby."],
          starterIdeas: [
            {
              title: "Use a bowl",
              example: "Put finished notes in a bowl.",
              kind: "choice",
            },
          ],
          doneWhen: "Paper is ready.",
          ifStuck: "Use one sheet only.",
          roleInstructions: [],
        },
      ],
      candidateId: "keep-me",
    };

    const enriched = enrichActivityForServe(v3, "imaginative", [8]);
    expect(enriched.activityFormatVersion).toBe(3);
    expect(enriched.story).toBe(v3.story);
    expect(enriched.candidateId).toBe("keep-me");
    expect(enriched.storyVoiceVersion).toBeUndefined();
  });

  it("leaves simple activities alone aside from normalize stamps", () => {
    const enriched = enrichActivityForServe(
      {
        title: "Play-Doh shapes",
        activityStyle: "simple",
        steps: ["Open the dough.", "Roll a snake.", "Make one shape."],
      },
      "simple",
      [5]
    );

    expect(enriched.activityStyle).toBe("simple");
    expect(enriched.storyVoiceVersion).toBeUndefined();
    expect(enriched.activityFormatVersion).toBe(2);
  });
});
