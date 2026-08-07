// server/lib/claimDemoFreeUnlock.test.js

import { describe, expect, it } from "vitest";
import {
  decideDemoFreeUnlockClaim,
  resolveDemoUnlockPresetId,
} from "./claimDemoFreeUnlock.js";

describe("resolveDemoUnlockPresetId", () => {
  const presets = [
    { id: "simple-1", slug: "kitchen-comic-studio", activity_style: "simple" },
    {
      id: "imag-1",
      slug: "secret-animal-rescue",
      activity_style: "imaginative",
    },
  ];

  it("prefers the matching slug", () => {
    expect(
      resolveDemoUnlockPresetId("secret-animal-rescue", presets)
    ).toBe("imag-1");
    expect(
      resolveDemoUnlockPresetId("kitchen-comic-studio", presets)
    ).toBe("simple-1");
  });

  it("falls back to any imaginative preset", () => {
    expect(resolveDemoUnlockPresetId("unknown-slug", presets)).toBe("imag-1");
  });
});

describe("decideDemoFreeUnlockClaim", () => {
  it("allows first claim", () => {
    expect(
      decideDemoFreeUnlockClaim({
        currentFreeImaginativeActivityId: null,
        unlockPresetId: "imag-1",
      })
    ).toEqual({
      status: "ok",
      freeImaginativeActivityId: "imag-1",
    });
  });

  it("returns already when same unlock", () => {
    expect(
      decideDemoFreeUnlockClaim({
        currentFreeImaginativeActivityId: "imag-1",
        unlockPresetId: "imag-1",
      }).status
    ).toBe("already");
  });

  it("conflicts when unlock already used on another activity", () => {
    expect(
      decideDemoFreeUnlockClaim({
        currentFreeImaginativeActivityId: "imag-1",
        unlockPresetId: "imag-2",
      }).status
    ).toBe("conflict");
  });
});
