import { describe, expect, it } from "vitest";
import {
  resolvePrimaryInquiryDomain,
  validateOlderChildInquiryQuality,
} from "./olderChildInquiryValidation.js";
import { evaluateActivityAgeFit } from "./activityAgePolicy.js";

function teen(age = 13) {
  return [{ name: "Child 1", ageYears: age }];
}

describe("resolvePrimaryInquiryDomain", () => {
  it("prefers engineering over building/creative", () => {
    expect(
      resolvePrimaryInquiryDomain({
        categories: ["engineering", "building", "creative"],
      })
    ).toBe("engineering");
  });

  it("maps history+reading to history", () => {
    expect(
      resolvePrimaryInquiryDomain({ categories: ["history", "reading"] })
    ).toBe("history");
  });

  it("does not treat building as engineering", () => {
    expect(resolvePrimaryInquiryDomain({ categories: ["building"] })).toBe(
      "general"
    );
  });
});

describe("validateOlderChildInquiryQuality", () => {
  it("rejects decorative science that only designs a hidden lab", () => {
    const result = validateOlderChildInquiryQuality(
      {
        title: "Hidden Lab",
        categories: ["science"],
        story: "Design a hidden science lab.",
        stepDetails: [
          {
            sceneSetup: "You want a secret lab in your room.",
            actions: [
              "Draw a hidden science lab on paper.",
              "Decorate the walls with beaker doodles.",
            ],
            doneWhen: "The lab drawing looks finished.",
            sceneOutcome: "Your hidden lab poster is on the wall.",
          },
        ],
      },
      teen(13)
    );
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("science-missing-test");
  });

  it("does not pass science just because inquiry words appear in the story", () => {
    const result = validateOlderChildInquiryQuality(
      {
        title: "Word Salad Lab",
        categories: ["science"],
        story:
          "This is about a hypothesis, a test, evidence, compare, and redesign in a lab.",
        stepDetails: [
          {
            actions: ["Draw a lab bench.", "Color the clipboard."],
            doneWhen: "The drawing is colored in.",
            sceneOutcome: "The picture looks scientific.",
          },
        ],
      },
      teen(13)
    );
    expect(result.ok).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("accepts a structural science investigation for age 13", () => {
    const result = validateOlderChildInquiryQuality(
      {
        title: "Sugar Dissolve Race",
        categories: ["science"],
        story:
          "Predict whether warm water dissolves sugar faster than cold water. Your job is to run a fair test and explain what the evidence shows.",
        stepDetails: [
          {
            sceneSetup: "You need a prediction before you mix anything.",
            actions: [
              "Write your prediction: which cup will dissolve the sugar faster?",
              "Fill one cup with warm water and one with cold water.",
            ],
            doneWhen: "Both cups are filled and your prediction is written.",
            sceneOutcome: "The test is ready to run.",
          },
          {
            sceneSetup: "Now you can run the test.",
            actions: [
              "Add the same spoon of sugar to each cup and time how long each takes to dissolve.",
              "Record both times on paper.",
            ],
            doneWhen: "Both dissolve times are written down.",
            sceneOutcome: "You have two measurements to compare.",
          },
          {
            sceneSetup: "The times are on the page.",
            actions: [
              "Compare the two results.",
              "Explain whether the evidence supports your prediction.",
            ],
            doneWhen: "You can point to the faster cup and say why.",
            sceneOutcome: "Your conclusion is based on the recorded times.",
          },
        ],
      },
      teen(13)
    );
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("rejects engineering that only builds a tower", () => {
    const result = validateOlderChildInquiryQuality(
      {
        title: "Paper Tower",
        categories: ["engineering"],
        story: "Build a tall paper tower.",
        stepDetails: [
          {
            actions: ["Stack paper into a tall tower.", "Tape the sides."],
            doneWhen: "The tower is standing.",
            sceneOutcome: "You made a tower.",
          },
        ],
      },
      teen(12)
    );
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("engineering-missing-constraint");
    expect(result.reasons).toContain("engineering-missing-test");
  });

  it("accepts engineering with constraint, test, failure, and redesign", () => {
    const result = validateOlderChildInquiryQuality(
      {
        title: "Limited Paper Tower",
        categories: ["engineering", "building"],
        story:
          "Build a paper tower using two sheets and limited tape. Your job is to see how much weight it holds, find the failure point, change one feature, and retest.",
        stepDetails: [
          {
            sceneSetup: "Materials are capped so the design has to be efficient.",
            actions: [
              "Fold the two sheets into a tower and tape only the joints you need.",
            ],
            doneWhen: "The tower stands on its own.",
            sceneOutcome: "A testable structure is ready.",
          },
          {
            sceneSetup: "You need an observable strength result.",
            actions: [
              "Test how much weight the tower holds by adding coins one at a time.",
            ],
            doneWhen: "You know how many coins it held before it collapsed.",
            sceneOutcome: "The tower failed at a visible fold. That is the failure point.",
          },
          {
            sceneSetup: "One structural feature can change.",
            actions: [
              "Change one fold near the failure point and rebuild that joint.",
              "Retest the same coin stack and compare the new result.",
            ],
            doneWhen: "The second test number is written next to the first.",
            sceneOutcome: "You know whether the redesign held more weight.",
          },
        ],
      },
      teen(12)
    );
    expect(result.ok).toBe(true);
  });

  it("rejects history that is only a poster", () => {
    const result = validateOlderChildInquiryQuality(
      {
        title: "Egypt Poster",
        categories: ["history"],
        story: "Draw a poster about Ancient Egypt.",
        stepDetails: [
          {
            actions: ["Draw pyramids.", "Color the desert."],
            doneWhen: "The poster is colorful.",
            sceneOutcome: "You have a poster about Ancient Egypt.",
          },
        ],
      },
      teen(12)
    );
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("history-missing-evidence-reasoning");
  });

  it("accepts history that compares factors, ranks, and justifies", () => {
    const result = validateOlderChildInquiryQuality(
      {
        title: "River Cities",
        categories: ["history", "reading"],
        story:
          "Why did ancient settlements develop near rivers? Compare well-established factors such as water, farming, and trade. Do not invent quotations.",
        stepDetails: [
          {
            sceneSetup: "You need the historical question in front of you.",
            actions: [
              "List three factors that helped ancient cities grow near rivers: water, farming, and trade.",
            ],
            doneWhen: "Three factors are written down.",
            sceneOutcome: "You have evidence to compare.",
          },
          {
            sceneSetup: "Factors are listed but not ranked.",
            actions: [
              "Compare the factors and rank the most important cause.",
              "Justify the ranking with evidence from the list you wrote.",
            ],
            doneWhen: "Your claim and reason are on the page.",
            sceneOutcome: "You can defend which factor mattered most.",
          },
        ],
      },
      teen(12)
    );
    expect(result.ok).toBe(true);
  });

  it("skips children under 10", () => {
    const result = validateOlderChildInquiryQuality(
      { title: "Pillow Stations", story: "Make three stations." },
      teen(7)
    );
    expect(result.ok).toBe(true);
  });
});

describe("evaluateActivityAgeFit inquiry gate", () => {
  it("rejects older shallow activities before they can be cached or served", () => {
    const result = evaluateActivityAgeFit({
      activity: {
        title: "Hidden Lab",
        categories: ["science"],
        story: "Design a hidden science lab.",
        ageFit: {
          minAge: 12,
          maxAge: 16,
          targetAges: [13],
          maturityLevel: "teen",
        },
        stepDetails: [
          {
            actions: ["Draw a hidden science lab."],
            doneWhen: "The drawing is done.",
          },
        ],
      },
      childrenContext: teen(13),
      activityMode: "single-child",
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("science-missing-test");
  });

  it("keeps a valid science investigation eligible", () => {
    const result = evaluateActivityAgeFit({
      activity: {
        title: "Sugar Dissolve Race",
        categories: ["science"],
        story:
          "Predict whether warm water dissolves sugar faster than cold water. Run a fair test and explain the evidence.",
        ageFit: {
          minAge: 12,
          maxAge: 16,
          targetAges: [13],
          maturityLevel: "teen",
        },
        stepDetails: [
          {
            actions: [
              "Write your prediction for which water dissolves sugar faster.",
              "Add the same sugar to warm and cold water and time how long each takes.",
              "Record both times, compare the results, and explain whether the evidence supports your prediction.",
            ],
            doneWhen: "Both times and an explanation are written.",
            sceneOutcome: "Your conclusion is based on the measurements.",
          },
        ],
      },
      childrenContext: teen(13),
      activityMode: "single-child",
    });
    expect(result.eligible).toBe(true);
  });
});
