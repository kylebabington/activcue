import { describe, expect, it } from "vitest";
import { buildAgeFitRetrySteer } from "./ageFitRetrySteer.js";

describe("buildAgeFitRetrySteer", () => {
  it("maps science validator failures to hypothesis/test/evidence guidance", () => {
    const steer = buildAgeFitRetrySteer({
      oldestAge: 12,
      childAges: [12],
      rejectedReasons: ["science-missing-test", "science-missing-evidence"],
    });
    expect(steer).toMatch(/hypothesis, test, evidence/i);
    expect(steer).toMatch(/run a real test/i);
    expect(steer).toMatch(/compare results/i);
  });

  it("requires authentic inquiry for teens", () => {
    const steer = buildAgeFitRetrySteer({
      oldestAge: 13,
      childAges: [13],
      rejectedReasons: ["older-inquiry-too-shallow", "teen-pretend-story"],
    });
    expect(steer).toMatch(/authentic real-world inquiry/i);
    expect(steer).toMatch(/Fictional worlds only/i);
  });
});
