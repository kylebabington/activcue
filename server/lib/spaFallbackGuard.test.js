import { describe, expect, it } from "vitest";
import { shouldRejectSpaFallback } from "./spaFallbackGuard.js";

describe("shouldRejectSpaFallback", () => {
  it.each([
    ["/.env"],
    ["/.git/config"],
    ["/.git/HEAD"],
    ["/.aws/credentials"],
    ["/wp-login.php"],
    ["/wp-admin/install.php"],
    ["/wp-admin/"],
    ["/wordpress/wp-login.php"],
    ["/phpmyadmin"],
    ["/phpmyadmin/index.php"],
    ["/xmlrpc.php"],
    ["/backup.sql"],
    ["/config.bak"],
    ["/archive.zip"],
    ["/%2eenv"],
  ])("rejects probe path %s", (pathname) => {
    expect(shouldRejectSpaFallback(pathname)).toBe(true);
  });

  it.each([
    ["/"],
    ["/settings"],
    ["/admin/growth"],
    ["/admin/feedback"],
    ["/reset-password"],
    ["/forgot-password"],
    ["/onboarding"],
    ["/demo"],
    ["/login"],
    ["/signup"],
  ])("allows SPA route %s", (pathname) => {
    expect(shouldRejectSpaFallback(pathname)).toBe(false);
  });

  it("rejects invalid percent-encoding", () => {
    expect(shouldRejectSpaFallback("/%E0%A4%A")).toBe(true);
  });
});
