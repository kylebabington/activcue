import { describe, expect, it, vi } from "vitest";
import {
  FEEDBACK_DUPLICATE_WINDOW_MS,
  parseFeedbackInput,
  submitUserFeedback,
} from "./submitUserFeedback.js";

function createLookupQuery({ data = null, error = null } = {}) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error })),
  };
  return query;
}

function createInsertQuery({ data = null, error = null } = {}) {
  const query = {
    insert: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(async () => ({ data, error })),
  };
  return query;
}

describe("parseFeedbackInput", () => {
  it("accepts a valid payload and trims the message", () => {
    expect(
      parseFeedbackInput({
        category: "idea",
        message: "  Please add dark mode  ",
        page: "/onboarding",
      })
    ).toEqual({
      category: "idea",
      message: "Please add dark mode",
      page: "/onboarding",
    });
  });

  it("rejects an unknown category", () => {
    expect(
      parseFeedbackInput({
        category: "spam",
        message: "hello",
        page: "/",
      }).error.code
    ).toBe("FEEDBACK_INVALID");
  });

  it("rejects a blank message", () => {
    expect(
      parseFeedbackInput({
        category: "bug",
        message: "   ",
        page: "/",
      }).error.message
    ).toMatch(/short message/i);
  });

  it("slices page to 500 characters", () => {
    const parsed = parseFeedbackInput({
      category: "other",
      message: "ok",
      page: "x".repeat(600),
    });
    expect(parsed.page).toHaveLength(500);
  });
});

describe("submitUserFeedback", () => {
  const payload = {
    userId: "user-1",
    category: "idea",
    message: "Please add dark mode",
    page: "/onboarding",
    now: new Date("2026-08-14T12:05:00.000Z"),
  };

  it("returns the existing id when the same feedback was sent within 60 seconds", async () => {
    const lookupQuery = createLookupQuery({ data: { id: "existing-1" } });
    const insertQuery = createInsertQuery();
    const supabase = {
      from: vi.fn((table) => {
        expect(table).toBe("user_feedback");
        return lookupQuery;
      }),
    };

    const result = await submitUserFeedback({ supabase, ...payload });

    expect(result).toEqual({ id: "existing-1", duplicate: true });
    expect(insertQuery.insert).not.toHaveBeenCalled();
    expect(lookupQuery.gte).toHaveBeenCalledWith(
      "created_at",
      new Date(
        payload.now.getTime() - FEEDBACK_DUPLICATE_WINDOW_MS
      ).toISOString()
    );
  });

  it("inserts a new row when no recent duplicate exists", async () => {
    const lookupQuery = createLookupQuery({ data: null });
    const insertQuery = createInsertQuery({ data: { id: "new-1" } });
    let call = 0;
    const supabase = {
      from: vi.fn(() => {
        call += 1;
        return call === 1 ? lookupQuery : insertQuery;
      }),
    };

    const result = await submitUserFeedback({ supabase, ...payload });

    expect(result).toEqual({ id: "new-1", duplicate: false });
    expect(insertQuery.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      category: "idea",
      message: "Please add dark mode",
      page: "/onboarding",
      status: "new",
    });
  });
});
