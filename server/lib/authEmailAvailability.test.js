import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  checkEmailAvailabilityForUser,
  normalizeAuthEmail,
  resolveEmailAvailability,
} from "./authEmailAvailability.js";

describe("normalizeAuthEmail", () => {
  it("trims and lowercases email addresses", () => {
    expect(normalizeAuthEmail("  Parent@Example.COM ")).toBe(
      "parent@example.com"
    );
  });

  it("returns an empty string for non-string input", () => {
    expect(normalizeAuthEmail(null)).toBe("");
    expect(normalizeAuthEmail(undefined)).toBe("");
    expect(normalizeAuthEmail(12)).toBe("");
  });
});

describe("resolveEmailAvailability", () => {
  it("marks an unused email as available", () => {
    expect(
      resolveEmailAvailability({
        currentUserId: "user-1",
        existingUserId: null,
      })
    ).toEqual({
      available: true,
    });
  });

  it("treats the current user's own email as available", () => {
    expect(
      resolveEmailAvailability({
        currentUserId: "user-1",
        existingUserId: "user-1",
      })
    ).toEqual({
      available: true,
      sameUser: true,
    });
  });

  it("rejects an email owned by another Auth user", () => {
    expect(
      resolveEmailAvailability({
        currentUserId: "user-1",
        existingUserId: "user-2",
      })
    ).toEqual({
      available: false,
      code: "EMAIL_ALREADY_REGISTERED",
    });
  });
});

describe("checkEmailAvailabilityForUser", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "secret-test-key";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns INVALID_EMAIL for blank input", async () => {
    await expect(
      checkEmailAvailabilityForUser({
        email: "   ",
        currentUserId: "user-1",
      })
    ).resolves.toMatchObject({
      available: false,
      code: "INVALID_EMAIL",
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns available when no Auth user owns the email", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ users: [] }),
    });

    await expect(
      checkEmailAvailabilityForUser({
        email: "parent@example.com",
        currentUserId: "user-1",
      })
    ).resolves.toEqual({
      email: "parent@example.com",
      available: true,
    });
  });

  it("returns available when the email belongs to the current user", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [
          {
            id: "user-1",
            email: "parent@example.com",
          },
        ],
      }),
    });

    await expect(
      checkEmailAvailabilityForUser({
        email: "Parent@Example.com",
        currentUserId: "user-1",
      })
    ).resolves.toEqual({
      email: "parent@example.com",
      available: true,
      sameUser: true,
    });
  });

  it("returns EMAIL_ALREADY_REGISTERED when another user owns the email", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [
          {
            id: "user-2",
            email: "parent@example.com",
          },
        ],
      }),
    });

    await expect(
      checkEmailAvailabilityForUser({
        email: "parent@example.com",
        currentUserId: "user-1",
      })
    ).resolves.toEqual({
      email: "parent@example.com",
      available: false,
      code: "EMAIL_ALREADY_REGISTERED",
    });
  });
});
