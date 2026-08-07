// src/utils/permanentAccountAccess.js

/**
 * Real FamilyFlow app routes require a permanent (non-anonymous) session.
 * Public marketing routes (/ , /demo, auth, legal) do not use this gate.
 */
export function canAccessPermanentApp({ user, isAnonymous } = {}) {
  if (!user) {
    return false;
  }
  if (isAnonymous === true || user.is_anonymous === true) {
    return false;
  }
  return true;
}

export function signupRedirectForProtectedPath(pathname, search = "") {
  const redirect = `${pathname || ""}${search || ""}`;
  if (!redirect || redirect === "/" || redirect === "/signup") {
    return "/signup";
  }
  const params = new URLSearchParams();
  params.set("redirect", redirect);
  return `/signup?${params.toString()}`;
}
