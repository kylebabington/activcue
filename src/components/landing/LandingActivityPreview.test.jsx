import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import LandingActivityPreview from "./LandingActivityPreview";

describe("LandingActivityPreview", () => {
  it("shows a real activity with a try-this CTA", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LandingActivityPreview />
      </MemoryRouter>
    );

    expect(html).toContain("Secret Agent Kitchen Watch");
    expect(html).toContain("Your first move");
    expect(html).toContain("Try this with my kid");
    expect(html).toContain("/demo?situation=cook-dinner");
  });
});
