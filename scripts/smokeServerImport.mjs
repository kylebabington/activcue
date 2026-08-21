#!/usr/bin/env node
/**
 * Boot the Express server under Node ESM long enough to prove the module
 * graph resolves, then shut it down. Vite build success does not prove this.
 *
 * Usage:
 *   node scripts/smokeServerImport.mjs
 */

import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join(ROOT, "server", "index.js");
const PORT = String(process.env.SMOKE_SERVER_PORT || "3911");
const HOST = "127.0.0.1";
const BOOT_TIMEOUT_MS = Number(process.env.SMOKE_SERVER_TIMEOUT_MS || 20000);

const smokeEnv = {
  ...process.env,
  NODE_ENV: "production",
  PORT,
  APP_URL: process.env.APP_URL || `http://${HOST}:${PORT}`,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "sk-smoke-placeholder",
  SUPABASE_URL: process.env.SUPABASE_URL || "https://smoke.supabase.co",
  SUPABASE_PUBLISHABLE_KEY:
    process.env.SUPABASE_PUBLISHABLE_KEY || "smoke-publishable-key",
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || "smoke-secret-key",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "sk_test_smoke",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "whsec_smoke",
  STRIPE_MONTHLY_PRICE_ID:
    process.env.STRIPE_MONTHLY_PRICE_ID || "price_smoke_monthly",
  STRIPE_ANNUAL_PRICE_ID:
    process.env.STRIPE_ANNUAL_PRICE_ID || "price_smoke_annual",
};

function waitForHealth(timeoutMs) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(
        {
          hostname: HOST,
          port: Number(PORT),
          path: "/api/health",
          timeout: 1000,
        },
        (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) {
            resolve(res.statusCode);
            return;
          }
          retryOrFail(`health status ${res.statusCode}`);
        }
      );
      req.on("error", () => retryOrFail("connection error"));
      req.on("timeout", () => {
        req.destroy();
        retryOrFail("timeout");
      });
    };

    const retryOrFail = (reason) => {
      if (Date.now() - started >= timeoutMs) {
        reject(new Error(`Server did not become healthy in time (${reason}).`));
        return;
      }
      setTimeout(attempt, 150);
    };

    attempt();
  });
}

const child = spawn(process.execPath, [ENTRY], {
  cwd: ROOT,
  env: smokeEnv,
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
let settled = false;

child.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
  process.stdout.write(chunk);
});
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
  process.stderr.write(chunk);
});

const shutdown = (code) => {
  settled = true;
  clearTimeout(bootTimer);
  if (!child.killed) {
    child.kill();
  }
  // Give the child a moment to exit on Windows before ending the parent.
  setTimeout(() => process.exit(code), 200);
};

const bootTimer = setTimeout(() => {
  console.error("FAIL: server smoke timed out before healthy response.");
  if (stdout) console.error("--- stdout ---\n" + stdout);
  if (stderr) console.error("--- stderr ---\n" + stderr);
  shutdown(1);
}, BOOT_TIMEOUT_MS);

child.on("exit", (code, signal) => {
  if (settled) {
    return;
  }
  clearTimeout(bootTimer);
  console.error(
    `FAIL: server exited early (code=${code}, signal=${signal}).`
  );
  if (stdout) console.error("--- stdout ---\n" + stdout);
  if (stderr) console.error("--- stderr ---\n" + stderr);
  process.exit(code && code !== 0 ? code : 1);
});

try {
  await waitForHealth(BOOT_TIMEOUT_MS - 500);
  console.log("OK: server/index.js booted under Node ESM and answered /api/health.");
  shutdown(0);
} catch (error) {
  console.error("FAIL: server smoke could not confirm boot.");
  console.error(error?.stack || error?.message || error);
  if (stdout) console.error("--- stdout ---\n" + stdout);
  if (stderr) console.error("--- stderr ---\n" + stderr);
  shutdown(1);
}
