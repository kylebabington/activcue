import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { completeActivityV2Fixture } from "../../fixtures/completeActivityV2Fixture";
import { lostShellSignalV3Fixture } from "../../fixtures/lostShellSignalV3Fixture";
import {
  getStarterIdeas,
  getStepDetails,
  getSetupGuide,
  getFinishGuide,
  getStepActions,
} from "../../utils/activityVisualTheme";
import { buildNarrationText } from "../../utils/buildNarrationText";
import { normalizeActivityV3 } from "../../../server/utils/normalizeActivityV3.js";

vi.mock("../SpeakButton.jsx", () => ({
  default: ({ label }) => <button type="button">{label}</button>,
}));

import QuestContent from "./QuestContent.jsx";

describe("completeActivityV2Fixture", () => {
  it("includes every Activity V2 field both quest surfaces should render", () => {
    const activity = completeActivityV2Fixture;

    expect(activity.activityFormatVersion).toBe(2);
    expect(activity.roleGuide.name).toBeTruthy();
    expect(activity.roleGuide.childRoles.length).toBeGreaterThan(0);
    expect(activity.ageFit.minAge).toBeLessThanOrEqual(activity.ageFit.maxAge);
    expect(getStarterIdeas(activity).length).toBeGreaterThan(0);

    const steps = getStepDetails(activity);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((step) => step.instruction)).toBe(true);
    expect(steps.every((step) => step.doneWhen)).toBe(true);
    expect(steps.every((step) => step.ifStuck)).toBe(true);
    expect(
      steps.every(
        (step) =>
          Array.isArray(step.starterIdeas) && step.starterIdeas.length >= 2
      )
    ).toBe(true);
    expect(Array.isArray(activity.uses)).toBe(true);
    expect(activity.uses.length).toBeGreaterThan(0);
  });
});

describe("lostShellSignalV3Fixture", () => {
  const normalized = normalizeActivityV3(lostShellSignalV3Fixture, "imaginative", [8]);

  it("exposes setup, actions, and finish guide fields", () => {
    expect(normalized.activityFormatVersion).toBe(3);
    expect(getSetupGuide(normalized)?.steps.length).toBeGreaterThan(0);
    expect(getFinishGuide(normalized).action).toContain("three clues");
    expect(getStepActions(normalized.stepDetails[0]).length).toBeGreaterThan(2);
    expect(normalized.stepDetails[0].instruction).toContain("Walk slowly");
  });

  it("renders setup, numbered actions, Big Finish, and extensions separately", () => {
    const html = renderToStaticMarkup(
      <QuestContent activity={normalized} mode="active" focusStepIndex={0} />
    );

    expect(html).toContain("Set Up");
    expect(html).toContain("Get these things");
    expect(html).toContain("quest-action-list");
    expect(html).toContain("Walk slowly to Station 1.");
    expect(html).toContain("The Big Finish");
    expect(html).toContain("Want to keep playing?");
    expect(html).toContain("Draw the complete signal.");
    expect(html).not.toContain("quest-collapsible-section");
  });

  it("builds V3 setup and scene narration with natural action pauses", () => {
    const setup = buildNarrationText(normalized, "setup");
    expect(setup).toContain("First, set up");
    expect(setup).toMatch(/Get 3 pieces of paper/i);

    const scene = buildNarrationText(normalized, "step", { stepIndex: 0 });
    expect(scene).toContain("Scene 1");
    expect(scene).toContain("First, Walk slowly");
    expect(scene).toContain("Next,");
  });
});
