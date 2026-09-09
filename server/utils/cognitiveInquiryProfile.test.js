import { describe, expect, it } from "vitest";
import {
  getCognitiveInquiryProfile,
  interestsSupportFiction,
} from "./cognitiveInquiryProfile.js";

describe("getCognitiveInquiryProfile", () => {
  it("maps the age progression of thinking types", () => {
    expect(getCognitiveInquiryProfile(5).band).toBe("preschool");
    expect(getCognitiveInquiryProfile(5).primaryThinking).toContain("notice");
    expect(getCognitiveInquiryProfile(5).inquiryDepth).toBe("low");

    expect(getCognitiveInquiryProfile(7).band).toBe("early-elementary");
    expect(getCognitiveInquiryProfile(7).primaryThinking).toContain("observe");
    expect(getCognitiveInquiryProfile(7).primaryThinking).toContain("compare");

    expect(getCognitiveInquiryProfile(9).band).toBe("elementary");
    expect(getCognitiveInquiryProfile(9).primaryThinking).toContain("classify");
    expect(getCognitiveInquiryProfile(9).inquiryDepth).toBe("moderate");

    expect(getCognitiveInquiryProfile(10).band).toBe("older-elementary");
    expect(getCognitiveInquiryProfile(10).primaryThinking).toContain("hypothesize");
    expect(getCognitiveInquiryProfile(10).framingDefault).toBe("authentic-inquiry");

    expect(getCognitiveInquiryProfile(12).band).toBe("older-elementary");
    expect(getCognitiveInquiryProfile(12).primaryThinking).toContain("test");

    expect(getCognitiveInquiryProfile(13).band).toBe("teen");
    expect(getCognitiveInquiryProfile(13).fictionPolicy).toBe("interests-only");
    expect(getCognitiveInquiryProfile(13).inquiryDepth).toBe("rigorous");

    expect(getCognitiveInquiryProfile(16).band).toBe("teen");
    expect(getCognitiveInquiryProfile(16).primaryThinking).toContain(
      "analyze-evidence"
    );
  });

  it("detects fiction-supporting interests", () => {
    expect(
      interestsSupportFiction([{ interests: ["soccer", "cooking"] }])
    ).toBe(false);
    expect(
      interestsSupportFiction([{ interests: ["game design", "photography"] }])
    ).toBe(true);
  });
});
