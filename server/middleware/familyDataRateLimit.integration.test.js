import { createServer } from "node:http";
import express, { Router } from "express";
import { afterEach, describe, expect, it } from "vitest";

import { createFamilyDataRateLimiter } from "./rateLimits.js";

function requireTestAuth(req, res, next) {
  const userId = req.get("x-test-user-id");
  if (!userId) {
    return res.status(401).json({
      error: "Invalid or expired authentication token.",
    });
  }
  req.auth = { userId };
  return next();
}

function ensureTestProfile(_req, _res, next) {
  return next();
}

async function listen(app) {
  const server = createServer(app);
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
  };
}

async function request(baseUrl, path, { method = "GET", userId, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(userId ? { "x-test-user-id": userId } : {}),
      ...headers,
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body, headers: response.headers };
}

describe("family data rate limit mounting", () => {
  let server;

  afterEach(async () => {
    if (!server) {
      return;
    }
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    server = null;
  });

  it("gives authenticated users independent allowances and rejects unauthenticated requests", async () => {
    const familyDataRateLimiter = createFamilyDataRateLimiter({
      max: 3,
      windowMs: 60_000,
      // Keep tests deterministic without relying on real IPs.
      validate: false,
    });

    const familyRouter = Router();
    familyRouter.get(
      "/family-settings",
      requireTestAuth,
      ensureTestProfile,
      familyDataRateLimiter,
      (_req, res) => {
        res.json({ ok: true, route: "family-settings" });
      }
    );

    // Intentionally wrong pattern kept only for contrast in a separate test.
    const memoryRouter = Router();
    memoryRouter.get(
      "/family-memory/saved-activities",
      requireTestAuth,
      ensureTestProfile,
      familyDataRateLimiter,
      (_req, res) => {
        res.json({ ok: true, route: "family-memory" });
      }
    );

    const laterRouter = Router();
    laterRouter.get("/unrelated-probe", (_req, res) => {
      res.json({ ok: true, route: "unrelated" });
    });

    const app = express();
    app.set("trust proxy", 1);
    // Mirror server/index.js: multiple routers mounted at /api.
    app.use("/api", familyRouter);
    app.use("/api", memoryRouter);
    app.use("/api", laterRouter);

    const listening = await listen(app);
    server = listening.server;
    const { baseUrl } = listening;

    const sharedIpHeaders = { "X-Forwarded-For": "203.0.113.50" };

    expect(
      (await request(baseUrl, "/api/family-settings", { headers: sharedIpHeaders }))
        .status
    ).toBe(401);

    const userA = [];
    for (let i = 0; i < 3; i += 1) {
      userA.push(
        await request(baseUrl, "/api/family-settings", {
          userId: "user-a",
          headers: sharedIpHeaders,
        })
      );
    }
    expect(userA.every((result) => result.status === 200)).toBe(true);

    const exhausted = await request(baseUrl, "/api/family-settings", {
      userId: "user-a",
      headers: sharedIpHeaders,
    });
    expect(exhausted.status).toBe(429);
    expect(exhausted.body.code).toBe("RATE_LIMITED");

    const userB = await request(baseUrl, "/api/family-settings", {
      userId: "user-b",
      headers: sharedIpHeaders,
    });
    expect(userB.status).toBe(200);

    // One intended request is counted once: memory route shares the same
    // per-user allowance, so user-b has 2 remaining after the settings hit.
    const memoryHits = [];
    for (let i = 0; i < 2; i += 1) {
      memoryHits.push(
        await request(baseUrl, "/api/family-memory/saved-activities", {
          userId: "user-b",
          headers: sharedIpHeaders,
        })
      );
    }
    expect(memoryHits.every((result) => result.status === 200)).toBe(true);

    const memoryExhausted = await request(
      baseUrl,
      "/api/family-memory/saved-activities",
      {
        userId: "user-b",
        headers: sharedIpHeaders,
      }
    );
    expect(memoryExhausted.status).toBe(429);

    const unrelated = await request(baseUrl, "/api/unrelated-probe", {
      headers: sharedIpHeaders,
    });
    expect(unrelated.status).toBe(200);
    expect(unrelated.body.route).toBe("unrelated");
  });

  it("does not charge unrelated endpoints when earlier family routers are scoped correctly", async () => {
    const familyDataRateLimiter = createFamilyDataRateLimiter({
      max: 2,
      windowMs: 60_000,
      validate: false,
    });

    // Correct: limiter only on the matched family route, after auth.
    const familyRouter = Router();
    familyRouter.get(
      "/family-settings",
      requireTestAuth,
      ensureTestProfile,
      familyDataRateLimiter,
      (_req, res) => {
        res.json({ ok: true });
      }
    );

    const laterRouter = Router();
    laterRouter.get("/billing/status", (_req, res) => {
      res.json({ ok: true, route: "billing" });
    });

    const app = express();
    app.set("trust proxy", 1);
    app.use("/api", familyRouter);
    app.use("/api", laterRouter);

    const listening = await listen(app);
    server = listening.server;
    const { baseUrl } = listening;
    const sharedIpHeaders = { "X-Forwarded-For": "198.51.100.10" };

    // Unrelated traffic must not consume family-data allowance.
    for (let i = 0; i < 5; i += 1) {
      const unrelated = await request(baseUrl, "/api/billing/status", {
        headers: sharedIpHeaders,
      });
      expect(unrelated.status).toBe(200);
    }

    const first = await request(baseUrl, "/api/family-settings", {
      userId: "user-c",
      headers: sharedIpHeaders,
    });
    const second = await request(baseUrl, "/api/family-settings", {
      userId: "user-c",
      headers: sharedIpHeaders,
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const third = await request(baseUrl, "/api/family-settings", {
      userId: "user-c",
      headers: sharedIpHeaders,
    });
    expect(third.status).toBe(429);
  });
});
