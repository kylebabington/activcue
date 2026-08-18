import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { LEGAL_NAV, LEGAL_PATHS } from "./legal.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("LEGAL_NAV", () => {
  it("exposes visible privacy, terms, and contact paths", () => {
    expect(LEGAL_PATHS).toEqual({
      privacy: "/privacy",
      terms: "/terms",
      contact: "/contact",
    });
    expect(LEGAL_NAV.map((item) => item.label)).toEqual([
      "Privacy",
      "Terms",
      "Contact",
    ]);
  });

  it("keeps crawler-visible legal links in the HTML shell before JS loads", () => {
    const html = readFileSync(join(repoRoot, "index.html"), "utf8");

    expect(html).toMatch(/rel="privacy-policy"[^>]*href="https:\/\/activcue\.fun\/privacy"/);
    expect(html).toMatch(
      /rel="terms-of-service"[^>]*href="https:\/\/activcue\.fun\/terms"/
    );
    expect(html).toContain('href="/privacy">Privacy</a>');
    expect(html).toContain('href="/terms">Terms</a>');
    expect(html).toContain('href="/contact">Contact</a>');
  });
});
