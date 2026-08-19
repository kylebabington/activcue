import { createServer } from "node:http";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";

import {
  applySecurityHeaders,
  PERMISSIONS_POLICY,
  REFERRER_POLICY,
} from "./securityHeaders.js";

describe("applySecurityHeaders", () => {
  let server;

  afterEach(async () => {
    if (!server) {
      return;
    }

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    server = null;
  });

  it("sets CSP, frame protection, Referrer-Policy, and Permissions-Policy", async () => {
    const app = express();
    applySecurityHeaders(app);
    app.get("/", (req, res) => {
      res.status(200).send("ok");
    });

    server = createServer(app);
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });

    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/`);

    const csp = response.headers.get("content-security-policy") || "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe(REFERRER_POLICY);
    expect(response.headers.get("permissions-policy")).toBe(PERMISSIONS_POLICY);
    expect(response.headers.get("permissions-policy")).toContain(
      "geolocation=()"
    );
  });
});
