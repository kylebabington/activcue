import { describe, expect, it } from "vitest";

import { BRAND } from "./brand.js";

describe("BRAND", () => {
  it("exposes the ActivCue identity fields", () => {
    expect(BRAND).toEqual({
      name: "ActivCue",
      plusName: "ActivCue Plus",
      domain: "activcue.fun",
      url: "https://activcue.fun",
      supportEmail: "support@activcue.fun",
      tagline: "Need 20 minutes?",
      secondaryHeadline:
        "Get an activity your kid can actually start without you.",
    });
  });

  it("keeps url and supportEmail aligned with domain", () => {
    expect(BRAND.url).toBe(`https://${BRAND.domain}`);
    expect(BRAND.supportEmail).toBe(`support@${BRAND.domain}`);
    expect(BRAND.plusName).toBe(`${BRAND.name} Plus`);
  });
});
