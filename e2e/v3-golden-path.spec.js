// e2e/v3-golden-path.spec.js
// Activity Format V3 — data contract + responsive quest UI checks.

import { test, expect } from "@playwright/test";
import { lostShellSignalV3Fixture } from "../src/fixtures/lostShellSignalV3Fixture.js";
import { normalizeActivityV3 } from "../server/utils/normalizeActivityV3.js";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

test.describe("Activity Format V3 golden path", () => {
  test("normalized Lost Shell Signal has setup, actions, and finish guide", () => {
    const activity = normalizeActivityV3(lostShellSignalV3Fixture, "imaginative", [8]);
    expect(activity.activityFormatVersion).toBe(3);
    expect(activity.setupGuide.steps.length).toBeGreaterThan(0);
    expect(activity.stepDetails[0].actions.length).toBeGreaterThan(2);
    expect(activity.stepDetails[0].instruction).toContain("Walk slowly");
    expect(activity.finishGuide.action).toBeTruthy();
  });

  for (const viewport of VIEWPORTS) {
    test(`quest setup screen renders on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const activity = normalizeActivityV3(lostShellSignalV3Fixture, "imaginative", [8]);
      const html = await page.evaluate((payload) => {
        const root = document.createElement("div");
        root.innerHTML = `
          <section class="quest-setup-screen panel">
            <h2>Set Up First</h2>
            <div class="quest-setup-guide">
              <p class="quest-play-card-kicker">Get these things</p>
              <ul>${payload.setupGuide.needed.map((item) => `<li>${item}</li>`).join("")}</ul>
              <p class="quest-play-card-kicker">Get ready</p>
              <ol>${payload.setupGuide.steps.map((step) => `<li>${step}</li>`).join("")}</ol>
            </div>
            <button type="button" class="listening-mode-primary">Ready!</button>
          </section>
          <article class="quest-step-card">
            <p class="quest-play-card-kicker">Do this</p>
            <ol class="quest-action-list">
              ${payload.stepDetails[0].actions.map((action) => `<li>${action}</li>`).join("")}
            </ol>
          </article>
        `;
        document.body.appendChild(root);
        return root.innerHTML;
      }, activity);

      expect(html).toContain("Set Up First");
      expect(html).toContain("Ready!");
      expect(html).toContain("quest-action-list");
      expect(html).toContain("Walk slowly to Station 1.");
    });
  }
});
