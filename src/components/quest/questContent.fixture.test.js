import { describe, expect, it } from "vitest";
import { completeActivityV2Fixture } from "../../fixtures/completeActivityV2Fixture";
import {
  getStarterIdeas,
  getStepDetails,
} from "../../utils/activityVisualTheme";

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
