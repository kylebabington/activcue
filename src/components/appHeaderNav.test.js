// src/components/appHeaderNav.test.js

import { describe, expect, it } from "vitest";
import { buildAppNavClassName } from "./appHeaderNav.js";

describe("buildAppNavClassName", () => {
  it("marks the active route", () => {
    expect(buildAppNavClassName({ isActive: true })).toBe("active");
  });

  it("mutes locked inactive parent areas", () => {
    expect(
      buildAppNavClassName({ isActive: false, mutedWhenInactive: true })
    ).toBe("nav-muted");
  });

  it("does not mute an active locked route", () => {
    expect(
      buildAppNavClassName({ isActive: true, mutedWhenInactive: true })
    ).toBe("active");
  });

  it("keeps drawer base class with active state", () => {
    expect(
      buildAppNavClassName({
        isActive: true,
        baseClass: "app-nav-drawer-link",
      })
    ).toBe("app-nav-drawer-link active");
  });
});
