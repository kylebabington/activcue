/**
 * Paths that should not receive the React SPA fallback (index.html).
 * Scanners probe these; returning 200 + HTML pollutes security logs.
 */

const PROBE_PREFIXES = [
  "/wp-",
  "/wordpress",
  "/phpmyadmin",
  "/xmlrpc.php",
];

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function shouldRejectSpaFallback(pathname) {
  let normalized;
  try {
    normalized = decodeURIComponent(pathname || "").toLowerCase();
  } catch {
    return true;
  }

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  // Drop query string if somehow present
  const q = normalized.indexOf("?");
  if (q !== -1) {
    normalized = normalized.slice(0, q);
  }

  const segments = normalized.split("/");
  // Hidden path segments: /.env, /.git, /.git/config, /.aws/...
  if (segments.some((segment) => segment.startsWith(".") && segment.length > 1)) {
    return true;
  }

  if (PROBE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix))) {
    return true;
  }

  // File-like final segment (e.g. .php, .sql, .bak) — static already served real assets
  const lastSegment = segments[segments.length - 1] || "";
  if (/\.[a-z0-9]{1,10}$/i.test(lastSegment)) {
    return true;
  }

  return false;
}
