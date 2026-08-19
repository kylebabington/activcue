import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { completeActivityV2Fixture } from "../../fixtures/completeActivityV2Fixture";

vi.mock("../SpeakButton.jsx", () => ({
  default: ({ label }) => <button type="button">{label}</button>,
}));

import QuestContent from "./QuestContent.jsx";

const cssDir = join(dirname(fileURLToPath(import.meta.url)), "../../styles");

describe("QuestContent active layout", () => {
  const html = renderToStaticMarkup(
    <QuestContent
      activity={{
        ...completeActivityV2Fixture,
        selectedRoleName: "Lead Communications Designer",
      }}
      mode="active"
      focusStepIndex={0}
      selectedRoleName="Lead Communications Designer"
    />
  );

  it("keeps the story and current scene visible instead of collapsing them", () => {
    expect(html).toContain('data-quest-layout="active"');
    expect(html).toContain("The Story");
    expect(html).toContain("moon base radios have gone almost silent");
    expect(html).toContain("Current scene");
    expect(html).toContain("Make a communications desk.");
    expect(html).toMatch(/chair|books|radio/i);
    expect(html).toContain("Ready to move on when");
    expect(html).toContain("I’m stuck");
    expect(html).not.toContain("quest-collapsible-section");
  });

  it("does not replace the scene instruction with a role-only line", () => {
    expect(html).toContain("Make a communications desk.");
    expect(html).toContain("Your part");
    expect(html).toContain("Label each station zone on a scrap of paper.");
    expect(html.indexOf("Make a communications desk.")).toBeLessThan(
      html.indexOf("Label each station zone on a scrap of paper.")
    );
  });

  it("keeps supporting context on the board", () => {
    expect(html).toContain("Your Roles");
    expect(html).toContain("Props &amp; Supplies");
    expect(html).toContain("Starting Ideas");
    expect(html).toContain("The Big Finish");
    expect(html).toContain("paper");
    expect(html).toContain("Message from Earth");
    expect(html).toMatch(/Your Roles[\s\S]*Read/);
    expect(html).toMatch(/Props &amp; Supplies[\s\S]*Read/);
    expect(html).toMatch(/Starting Ideas[\s\S]*Read/);
    expect(html).toMatch(/The Big Finish[\s\S]*Read/);
  });
});

describe("QuestContent preview layout", () => {
  it("still uses collapsible sections on the details page", () => {
    const html = renderToStaticMarkup(
      <QuestContent activity={completeActivityV2Fixture} mode="preview" />
    );

    expect(html).toContain('data-quest-layout="preview"');
    expect(html).toContain("quest-collapsible-section");
    expect(html).toContain("The Story");
    expect(html).toContain("Make a communications desk.");
  });
});

describe("active quest CSS", () => {
  const pagesCss = readFileSync(join(cssDir, "pages.css"), "utf8");
  const layoutCss = readFileSync(join(cssDir, "layout.css"), "utf8");

  it("uses a wide three-column board on desktop", () => {
    expect(pagesCss).toMatch(
      /@media \(min-width: 1024px\)[\s\S]*minmax\(0, 2fr\)/
    );
    expect(layoutCss).toContain("kid-center-column--play");
    expect(layoutCss).toContain("--kid-play-column-max-width");
  });

  it("stacks story, current scene, then supporting cards on tablet and mobile", () => {
    expect(pagesCss).toMatch(
      /@media \(max-width: 1023px\)[\s\S]*quest-active-stage[\s\S]*order:\s*2/
    );
    expect(pagesCss).toMatch(
      /quest-active-other-scenes[\s\S]*order:\s*7/
    );
  });
});
