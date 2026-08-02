import { describe, expect, it, vi } from "vitest";

import { requireAdmin } from "./requireAdmin.js";

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  return res;
}

describe("requireAdmin", () => {
  it("returns 500 PROFILE_CONTEXT_MISSING when profile is unavailable", () => {
    const req = {};
    const res = createMockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe("PROFILE_CONTEXT_MISSING");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 ADMIN_REQUIRED for a normal user", () => {
    const req = {
      profile: {
        role: "user",
        billing_exempt: true,
      },
    };
    const res = createMockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe("ADMIN_REQUIRED");
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next for an administrator", () => {
    const req = {
      profile: {
        role: "admin",
        billing_exempt: false,
      },
    };
    const res = createMockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.body).toBeNull();
  });

  it("does not treat billing_exempt as administrator access", () => {
    const req = {
      profile: {
        role: "user",
        billing_exempt: true,
      },
    };
    const res = createMockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe("ADMIN_REQUIRED");
    expect(next).not.toHaveBeenCalled();
  });
});
