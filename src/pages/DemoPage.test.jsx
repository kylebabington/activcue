import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../utils/analytics", () => ({
  captureAttribution: () => {},
  trackProductEvent: () => {},
}));

vi.mock("../components/SpeakButton.jsx", () => ({
  default: () => null,
}));

import DemoPage from "./DemoPage";

describe("DemoPage express path", () => {
  it("asks only for age when a landing situation is already chosen", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[
          "/demo?situation=cook-dinner&moment=cooking&time=20",
        ]}
      >
        <DemoPage />
      </MemoryRouter>
    );

    expect(html).toContain("How old are they?");
    expect(html).not.toContain("What sounds good?");
    expect(html).not.toContain("Create your free family");
  });
});
