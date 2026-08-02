// server/lib/parentPin.test.js

import { describe, expect, it } from "vitest";
import { hashParentPin, verifyParentPin } from "./parentPin.js";

describe("parentPin", () => {
  it("hashes and verifies a PIN", () => {
    const stored = hashParentPin("1234");
    expect(verifyParentPin("1234", stored)).toBe(true);
    expect(verifyParentPin("9999", stored)).toBe(false);
  });

  it("rejects short PINs", () => {
    expect(() => hashParentPin("12")).toThrow(/at least 4/);
  });
});
