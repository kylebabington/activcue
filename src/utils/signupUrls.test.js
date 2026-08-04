// src/utils/signupUrls.test.js

import { describe, expect, it } from "vitest";
import {
  buildSignupUrl,
  parseSignupCheckoutIntent,
} from "./signupUrls.js";

describe("buildSignupUrl", () => {
  it("returns plain /signup without checkout intent", () => {
    expect(buildSignupUrl()).toBe("/signup");
    expect(buildSignupUrl({ next: "app" })).toBe("/signup");
  });

  it("carries checkout intent and plan", () => {
    expect(
      buildSignupUrl({ next: "checkout", plan: "annual" })
    ).toBe("/signup?next=checkout&plan=annual");
  });

  it("defaults invalid plans to monthly", () => {
    expect(
      buildSignupUrl({ next: "checkout", plan: "weekly" })
    ).toBe("/signup?next=checkout&plan=monthly");
  });
});

describe("parseSignupCheckoutIntent", () => {
  it("detects checkout intent from the query string", () => {
    expect(parseSignupCheckoutIntent("next=checkout&plan=annual")).toEqual({
      shouldCheckout: true,
      plan: "annual",
    });
  });

  it("ignores unrelated queries", () => {
    expect(parseSignupCheckoutIntent("foo=bar")).toEqual({
      shouldCheckout: false,
      plan: "monthly",
    });
  });
});
