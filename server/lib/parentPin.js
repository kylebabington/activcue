// server/lib/parentPin.js

import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_KEYLEN = 64;

export function hashParentPin(pin) {
  const cleaned = String(pin || "").trim();
  if (cleaned.length < 4) {
    throw new Error("PIN must be at least 4 digits.");
  }

  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(cleaned, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyParentPin(pin, storedHash) {
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }

  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) {
    return false;
  }

  const cleaned = String(pin || "").trim();
  const actual = scryptSync(cleaned, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(expectedHex, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
