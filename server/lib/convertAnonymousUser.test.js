// server/lib/convertAnonymousUser.test.js

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  checkEmailAvailabilityForUserMock,
  updateUserByIdMock,
  profilesUpdateEqMock,
} = vi.hoisted(() => ({
  checkEmailAvailabilityForUserMock: vi.fn(),
  updateUserByIdMock: vi.fn(),
  profilesUpdateEqMock: vi.fn(),
}));

vi.mock("./authEmailAvailability.js", () => ({
  checkEmailAvailabilityForUser: checkEmailAvailabilityForUserMock,
}));

vi.mock("./supabaseAdminClient.js", () => ({
  getSupabaseAdminClient: () => ({
    auth: {
      admin: {
        updateUserById: updateUserByIdMock,
      },
    },
    from: () => ({
      update: (payload) => {
        expect(payload).toEqual({ is_anonymous: false });
        return {
          eq: profilesUpdateEqMock,
        };
      },
    }),
  }),
}));

import {
  convertAnonymousUser,
  validateConversionPassword,
} from "./convertAnonymousUser.js";

describe("validateConversionPassword", () => {
  it("rejects short passwords", () => {
    expect(
      validateConversionPassword("short", "short")
    ).toMatchObject({
      ok: false,
      code: "PASSWORD_TOO_SHORT",
    });
  });

  it("rejects mismatched passwords", () => {
    expect(
      validateConversionPassword(
        "long-enough",
        "different!"
      )
    ).toMatchObject({
      ok: false,
      code: "PASSWORD_MISMATCH",
    });
  });

  it("accepts matching passwords of sufficient length", () => {
    expect(
      validateConversionPassword(
        "long-enough",
        "long-enough"
      )
    ).toEqual({ ok: true });
  });
});

describe("convertAnonymousUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilesUpdateEqMock.mockResolvedValue({ error: null });
  });

  it("rejects unavailable emails", async () => {
    checkEmailAvailabilityForUserMock.mockResolvedValue({
      available: false,
      email: "taken@example.com",
      code: "EMAIL_ALREADY_REGISTERED",
    });

    const result = await convertAnonymousUser({
      userId: "anon-1",
      email: "taken@example.com",
      password: "long-enough",
      confirmPassword: "long-enough",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "EMAIL_ALREADY_REGISTERED",
      status: 409,
    });
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("sets email, password, and email_confirm on the current user", async () => {
    checkEmailAvailabilityForUserMock.mockResolvedValue({
      available: true,
      email: "parent@example.com",
    });
    updateUserByIdMock.mockResolvedValue({
      data: {
        user: {
          id: "anon-1",
          email: "parent@example.com",
        },
      },
      error: null,
    });

    const result = await convertAnonymousUser({
      userId: "anon-1",
      email: "Parent@Example.com",
      password: "long-enough",
      confirmPassword: "long-enough",
    });

    expect(updateUserByIdMock).toHaveBeenCalledWith("anon-1", {
      email: "parent@example.com",
      password: "long-enough",
      email_confirm: true,
    });
    expect(profilesUpdateEqMock).toHaveBeenCalledWith(
      "user_id",
      "anon-1"
    );
    expect(result).toEqual({
      ok: true,
      user: {
        id: "anon-1",
        email: "parent@example.com",
        isAnonymous: false,
      },
    });
  });
});
