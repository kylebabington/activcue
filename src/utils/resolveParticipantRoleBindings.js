/**
 * Bind canonical activity participant slots (Child 1, Child 2, …) to the
 * current family's child profiles for one session.
 *
 * Cached roleGuide.childRoles[].childName is a reusable slot label, not a
 * household name. This helper never mutates activity data.
 */

export function canonicalParticipantLabel(index) {
  return `Child ${Number(index) + 1}`;
}

const GENERIC_SLOT_NAME_RE =
  /^(player(?:\s*\d+)?|child(?:\s*\d+)?|kid(?:\s*\d+)?|sibling(?:\s*\d+)?|partner(?:\s*\d+)?)$/i;

export function isGenericParticipantLabel(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return true;
  return GENERIC_SLOT_NAME_RE.test(trimmed);
}

function parseAge(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function getPlayingChildAge(child) {
  return parseAge(child?.ageYears ?? child?.age);
}

function matchSlotsToChildrenByAge(roleAges, childAges) {
  const unmatchedChildren = childAges.map((_, index) => index);
  const assignment = roleAges.map(() => -1);

  for (let slotIndex = 0; slotIndex < roleAges.length; slotIndex += 1) {
    const exact = unmatchedChildren.find(
      (childIndex) => childAges[childIndex] === roleAges[slotIndex]
    );
    if (exact == null) continue;
    assignment[slotIndex] = exact;
    unmatchedChildren.splice(unmatchedChildren.indexOf(exact), 1);
  }

  for (let slotIndex = 0; slotIndex < roleAges.length; slotIndex += 1) {
    if (assignment[slotIndex] !== -1) continue;
    if (unmatchedChildren.length === 0) break;

    let bestChild = unmatchedChildren[0];
    let bestDist = Math.abs(childAges[bestChild] - roleAges[slotIndex]);
    for (const childIndex of unmatchedChildren) {
      const dist = Math.abs(childAges[childIndex] - roleAges[slotIndex]);
      if (dist < bestDist || (dist === bestDist && childIndex < bestChild)) {
        bestDist = dist;
        bestChild = childIndex;
      }
    }
    assignment[slotIndex] = bestChild;
    unmatchedChildren.splice(unmatchedChildren.indexOf(bestChild), 1);
  }

  return assignment;
}

function childIndexBySlot(roles, children) {
  if (roles.length === 0 || children.length === 0) {
    return roles.map(() => -1);
  }

  const roleAges = roles.map((role) => parseAge(role?.age));
  const childAges = children.map((child) => getPlayingChildAge(child));
  const agesUsable =
    roleAges.every((age) => age != null) && childAges.every((age) => age != null);

  if (!agesUsable) {
    return roles.map((_, slotIndex) =>
      slotIndex < children.length ? slotIndex : -1
    );
  }

  return matchSlotsToChildrenByAge(roleAges, childAges);
}

/**
 * Deterministically map canonical childRoles slots onto playing children.
 *
 * Prefers exact ages, then closest age, then original order. One child and
 * one slot are each used at most once.
 *
 * @param {{ childRoles?: object[], playingChildren?: object[] }} input
 * @returns {{
 *   slotBindings: Array<{
 *     participantLabel: string,
 *     slotIndex: number,
 *     childIndex: number,
 *     childId: string|null,
 *     childName: string,
 *     roleTitle: string,
 *     responsibility: string,
 *     firstAction: string,
 *     roleAge: number|null,
 *   }>,
 *   roleAssignments: Record<string, string>,
 * }}
 */
export function resolveParticipantRoleBindings({
  childRoles = [],
  playingChildren = [],
} = {}) {
  const roles = Array.isArray(childRoles)
    ? childRoles.filter((role) => role && typeof role === "object")
    : [];
  const children = Array.isArray(playingChildren)
    ? playingChildren.filter((child) => child && typeof child === "object")
    : [];

  const assignedChildIndexes = childIndexBySlot(roles, children);
  const slotBindings = [];
  const roleAssignments = {};

  assignedChildIndexes.forEach((childIndex, slotIndex) => {
    if (childIndex < 0 || !children[childIndex]) return;
    const role = roles[slotIndex];
    const child = children[childIndex];
    const roleTitle = String(role?.roleTitle || "").trim();
    const participantLabel = canonicalParticipantLabel(slotIndex);
    const childName =
      String(child?.name || "").trim() || participantLabel;
    const binding = {
      participantLabel,
      slotIndex,
      childIndex,
      childId: child?.id ? String(child.id) : null,
      childName,
      roleTitle,
      responsibility: String(role?.responsibility || "").trim(),
      firstAction: String(role?.firstAction || "").trim(),
      roleAge: parseAge(role?.age),
    };
    slotBindings.push(binding);
    if (binding.childId && roleTitle) {
      roleAssignments[binding.childId] = roleTitle;
    }
  });

  return { slotBindings, roleAssignments };
}

/**
 * Session-start role map keyed by child profile id.
 * Bound slot titles win; leftover children fall back to activity.roles order.
 */
export function buildInitialRoleAssignments({
  childRoles = [],
  playingChildren = [],
  fallbackRoles = [],
  fallbackRoleName = "",
} = {}) {
  const { roleAssignments } = resolveParticipantRoleBindings({
    childRoles,
    playingChildren,
  });
  const assignments = { ...roleAssignments };
  const roles = Array.isArray(fallbackRoles) ? fallbackRoles : [];
  const children = Array.isArray(playingChildren) ? playingChildren : [];

  children.forEach((child, index) => {
    if (!child?.id || assignments[child.id]) return;
    assignments[child.id] =
      roles[index] || roles[0] || fallbackRoleName || "";
  });

  return assignments;
}

/**
 * Kid-facing role cards for the current family, or canonical slots when no
 * profiles are available.
 */
export function getDisplayRoleCards({
  childRoles = [],
  playingChildren = [],
  roleAssignments = {},
} = {}) {
  const roles = Array.isArray(childRoles) ? childRoles : [];
  const children = Array.isArray(playingChildren) ? playingChildren : [];
  const { slotBindings, roleAssignments: boundAssignments } =
    resolveParticipantRoleBindings({
      childRoles: roles,
      playingChildren: children,
    });
  const assignments = { ...boundAssignments, ...(roleAssignments || {}) };

  if (children.length > 0 && (slotBindings.length > 0 || roles.length > 0)) {
    return children
      .map((child, index) => {
        const binding = child?.id
          ? slotBindings.find((entry) => entry.childId === child.id)
          : slotBindings.find((entry) => entry.childIndex === index);
        const roleTitle =
          (child?.id && assignments[child.id]) ||
          binding?.roleTitle ||
          "";
        if (!roleTitle && roles.length === 0) return null;
        return {
          key: child?.id || `child-${index}`,
          displayName:
            String(child?.name || "").trim() ||
            binding?.participantLabel ||
            canonicalParticipantLabel(index),
          roleTitle,
          childId: child?.id || null,
          age: binding?.roleAge ?? null,
          responsibility: binding?.responsibility || "",
          firstAction: binding?.firstAction || "",
        };
      })
      .filter(Boolean);
  }

  return roles.map((role, index) => ({
    key: `${role?.childName || canonicalParticipantLabel(index)}-${index}`,
    displayName:
      String(role?.childName || "").trim() || canonicalParticipantLabel(index),
    roleTitle: String(role?.roleTitle || "").trim(),
    childId: null,
    age: parseAge(role?.age),
    responsibility: String(role?.responsibility || "").trim(),
    firstAction: String(role?.firstAction || "").trim(),
  }));
}

/**
 * Narration lines for each bound (or canonical) child role.
 */
export function getBoundChildRoleNarration({
  childRoles = [],
  playingChildren = [],
  roleAssignments = {},
} = {}) {
  const roles = Array.isArray(childRoles) ? childRoles : [];
  const children = Array.isArray(playingChildren) ? playingChildren : [];
  const { slotBindings, roleAssignments: boundAssignments } =
    resolveParticipantRoleBindings({
      childRoles: roles,
      playingChildren: children,
    });
  const assignments = { ...boundAssignments, ...(roleAssignments || {}) };

  if (children.length > 0 && slotBindings.length > 0) {
    return slotBindings.map((binding) => {
      const role = roles[binding.slotIndex] || {};
      return {
        name: binding.childName,
        title:
          (binding.childId && assignments[binding.childId]) ||
          binding.roleTitle ||
          "helper",
        responsibility: String(role.responsibility || "").trim(),
        firstAction: String(role.firstAction || "").trim(),
      };
    });
  }

  return roles.map((role) => ({
    name: String(role?.childName || "").trim() || "Player",
    title: String(role?.roleTitle || "").trim() || "helper",
    responsibility: String(role?.responsibility || "").trim(),
    firstAction: String(role?.firstAction || "").trim(),
  }));
}
