import { describe, expect, it } from "vitest";
import {
  canAccessPermanentApp,
  signupRedirectForProtectedPath,
} from "./permanentAccountAccess";

describe("canAccessPermanentApp", () => {
  it("blocks missing and anonymous sessions", () => {
    expect(canAccessPermanentApp({})).toBe(false);
    expect(canAccessPermanentApp({ user: null })).toBe(false);
    expect(
      canAccessPermanentApp({
        user: { id: "a", is_anonymous: true },
        isAnonymous: true,
      })
    ).toBe(false);
  });

  it("allows permanent accounts", () => {
    expect(
      canAccessPermanentApp({
        user: { id: "p", is_anonymous: false },
        isAnonymous: false,
      })
    ).toBe(true);
  });
});

describe("signupRedirectForProtectedPath", () => {
  it("sends protected routes to signup with redirect", () => {
    expect(signupRedirectForProtectedPath("/settings")).toBe(
      "/signup?redirect=%2Fsettings"
    );
    expect(signupRedirectForProtectedPath("/parent", "?x=1")).toBe(
      "/signup?redirect=%2Fparent%3Fx%3D1"
    );
  });
});
