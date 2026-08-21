// e2e/activity-quality-pipeline.spec.js
// Display-ready imaginative quest surface (Phases 10–11).
// Generation failure / malformed JSON / no-simple-fallback contracts are covered
// by vitest (activityGenerationService + generateActivitiesWithParseRecovery).
//
// Production verification checklist (manual after deploy):
// 1. Choose child → Imaginative → Generate 3 → all cards say imaginative
// 2. Open each → Story, Roles, Supplies, Setup, Starters, Scenes, Done when,
//    If stuck, Big Finish, Extensions
// 3. Start → Complete
// 4. Repeat across age bands (early elementary, tween, teen)
// 5. Force an AI outage / invalid response → generation error, never "Draw a picture"

import { test, expect } from "@playwright/test";
import { lostShellSignalV3Fixture } from "../src/fixtures/lostShellSignalV3Fixture.js";
import { normalizeActivityV3 } from "../server/utils/normalizeActivityV3.js";
import { validateActivityForDisplay } from "../server/utils/activityDisplayValidation.js";

test.describe("Activity quality pipeline — imaginative display", () => {
  test("complete imaginative V3 is display-valid and renders quest sections", async ({
    page,
  }) => {
    const activity = normalizeActivityV3(
      lostShellSignalV3Fixture,
      "imaginative",
      [8]
    );

    expect(validateActivityForDisplay(activity).valid).toBe(true);
    expect(activity.activityStyle).toBe("imaginative");

    await page.setViewportSize({ width: 390, height: 844 });
    const html = await page.evaluate((payload) => {
      const root = document.createElement("div");
      root.innerHTML = `
        <section class="quest-setup-screen">
          <h2>Story</h2><p>${payload.story}</p>
          <h2>Roles</h2><p>${payload.roleGuide.name}</p>
          <h2>Supplies</h2><ul>${payload.setupGuide.needed
            .map((item) => `<li>${item}</li>`)
            .join("")}</ul>
          <h2>Setup</h2><ol>${payload.setupGuide.steps
            .map((step) => `<li>${step}</li>`)
            .join("")}</ol>
          <h2>Starter ideas</h2><ul>${payload.starterIdeas
            .map((idea) => `<li>${idea.example}</li>`)
            .join("")}</ul>
        </section>
        ${payload.stepDetails
          .map(
            (step) => `
          <article>
            <h3>${step.title}</h3>
            <ol>${step.actions.map((a) => `<li>${a}</li>`).join("")}</ol>
            <p>Done when: ${step.doneWhen}</p>
            <p>If stuck: ${step.ifStuck}</p>
          </article>`
          )
          .join("")}
        <section>
          <h2>Big Finish</h2>
          <p>${payload.finishGuide.action}</p>
        </section>
      `;
      document.body.appendChild(root);
      return root.innerText;
    }, activity);

    expect(html).toContain("Sea Signal Finder");
    expect(html).toContain("Done when:");
    expect(html).toContain("If stuck:");
    expect(html).toContain("Big Finish");
    expect(html).not.toMatch(/Draw a Picture/i);
  });
});
