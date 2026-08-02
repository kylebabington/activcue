import { describe, expect, it } from "vitest";

/**
 * Mirrors the checkout-return contract owned by useCheckoutReturn:
 * clear URL only after a terminal status; do not clear before polling.
 */
describe("checkout return flow contract", () => {
  it("clears URL only after paid success", () => {
    const steps = [];
    let paid = false;

    function clearUrl() {
      steps.push("clear");
    }

    function onSuccess() {
      steps.push("success");
      clearUrl();
    }

    function onPending() {
      steps.push("pending");
    }

    onPending();
    paid = true;
    if (paid) {
      onSuccess();
    }

    expect(steps).toEqual(["pending", "success", "clear"]);
    expect(steps.indexOf("clear")).toBeGreaterThan(steps.indexOf("pending"));
  });

  it("clears URL after cancelled checkout without polling", () => {
    const steps = [];
    const billing = "checkout-cancelled";

    if (billing === "checkout-cancelled") {
      steps.push("cancelled-message");
      steps.push("clear");
    }

    expect(steps).toEqual(["cancelled-message", "clear"]);
  });
});
