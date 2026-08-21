/**
 * Strip household-specific identity before writing to the shared activity library.
 * Generic roles (Player 1 / Player 2) are kept; real names and ids are not.
 */

const GENERIC_NAME_RE = /^(player(?:\s*\d+)?|child(?:\s*\d+)?|kid(?:\s*\d+)?|sibling(?:\s*\d+)?|partner(?:\s*\d+)?)$/i;

const PERSONAL_ID_KEYS = new Set([
  "childId",
  "childIds",
  "profileId",
  "userId",
  "householdId",
  "momentId",
  "whyItFits",
  "presentedAt",
]);

export function isGenericRoleName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return true;
  }
  return GENERIC_NAME_RE.test(trimmed);
}

function looksLikePersonalName(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed || isGenericRoleName(trimmed)) {
    return false;
  }
  // Heuristic: Title Case first name without spaces, or multi-word given names.
  if (/^[A-Z][a-z]{1,20}$/.test(trimmed)) {
    return true;
  }
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}$/.test(trimmed)) {
    return true;
  }
  return false;
}

function sanitizeChildRole(role, index) {
  if (!role || typeof role !== "object") {
    return null;
  }

  const rawName = String(role.childName || "").trim();
  const childName =
    rawName && isGenericRoleName(rawName) ? rawName : `Player ${index + 1}`;

  return {
    childName,
    age: Number.isFinite(Number(role.age)) ? Number(role.age) : 0,
    roleTitle: String(role.roleTitle || role.name || "Player").trim() || "Player",
    responsibility:
      String(role.responsibility || role.description || "Help with the activity.").trim() ||
      "Help with the activity.",
    firstAction: String(role.firstAction || "").trim(),
  };
}

function deepStripPersonalKeys(value) {
  if (Array.isArray(value)) {
    return value.map((item) => deepStripPersonalKeys(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const next = {};
  for (const [key, entry] of Object.entries(value)) {
    if (PERSONAL_ID_KEYS.has(key)) {
      continue;
    }
    next[key] = deepStripPersonalKeys(entry);
  }
  return next;
}

/**
 * Classify whether activity_data is safe for the global shared cache.
 */
export function classifySharedLibrarySafety(activity) {
  const failures = [];
  const roleGuide =
    activity?.roleGuide && typeof activity.roleGuide === "object"
      ? activity.roleGuide
      : {};
  const childRoles = Array.isArray(roleGuide.childRoles)
    ? roleGuide.childRoles
    : [];

  childRoles.forEach((role, index) => {
    const name = role?.childName;
    if (looksLikePersonalName(name) && !isGenericRoleName(name)) {
      failures.push(`personalized-role-name:${index}`);
    }
    if (role?.childId || role?.profileId) {
      failures.push(`personalized-role-id:${index}`);
    }
  });

  if (activity?.childId || activity?.profileId || activity?.userId) {
    failures.push("household-identity-field");
  }

  if (failures.length === 0) {
    return { status: "validated", failures };
  }

  if (failures.some((f) => f.startsWith("personalized-role"))) {
    return { status: "unsafe-for-shared-cache", failures };
  }

  return { status: "needs-review", failures };
}

/**
 * Return a shared-library-safe copy of an activity payload.
 */
export function sanitizeForSharedLibrary(activity) {
  if (!activity || typeof activity !== "object") {
    return {};
  }

  const safe = deepStripPersonalKeys({ ...activity });
  delete safe.whyItFits;
  delete safe.presentedAt;
  delete safe.childId;
  delete safe.childIds;
  delete safe.profileId;
  delete safe.userId;
  delete safe.householdId;
  delete safe.momentId;

  if (safe.roleGuide && typeof safe.roleGuide === "object") {
    const roles = Array.isArray(safe.roleGuide.childRoles)
      ? safe.roleGuide.childRoles
      : [];
    safe.roleGuide = {
      ...safe.roleGuide,
      childRoles: roles
        .map((role, index) => sanitizeChildRole(role, index))
        .filter(Boolean),
    };
  }

  return safe;
}
