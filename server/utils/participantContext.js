// server/utils/participantContext.js
// Server derives participant mode/count from provided profiles — never trusts contradictory client mode.

import { buildChildrenAgeContext } from "./childAge.js";

function asId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function profilesFromBody(body = {}) {
  if (
    body.requestContext?.participants?.children &&
    Array.isArray(body.requestContext.participants.children)
  ) {
    return body.requestContext.participants.children.filter(Boolean);
  }

  if (Array.isArray(body.selectedChildProfiles) && body.selectedChildProfiles.length > 0) {
    return body.selectedChildProfiles.filter(Boolean);
  }

  if (body.activeChildProfile && typeof body.activeChildProfile === "object") {
    return [body.activeChildProfile];
  }

  const childIds = Array.isArray(body.childIds) ? body.childIds.map(asId).filter(Boolean) : [];
  if (childIds.length > 0 && Array.isArray(body.childProfiles)) {
    const byId = new Map(
      body.childProfiles
        .filter((child) => child?.id)
        .map((child) => [asId(child.id), child])
    );
    return childIds.map((id) => byId.get(id)).filter(Boolean);
  }

  return [];
}

/**
 * Resolve authoritative participant context for recommendation routes.
 * @returns {{ ok: true, participantCount: number, mode: string, children: object[], ages: number[], childrenContext: object[] }
 *   | { ok: false, error: string, code: string }}
 */
export function resolveParticipantContext(body = {}) {
  let profiles = profilesFromBody(body);

  if (profiles.length === 0) {
    const activeId = asId(body.activeChildId);
    if (activeId && Array.isArray(body.childProfiles)) {
      const match = body.childProfiles.find(
        (child) => asId(child?.id) === activeId
      );
      if (match) {
        profiles = [match];
      }
    }
  }

  if (profiles.length === 0) {
    return {
      ok: false,
      error: "At least one participating child is required.",
      code: "PARTICIPANTS_REQUIRED",
    };
  }

  const childrenContext = buildChildrenAgeContext(profiles);
  const ages = childrenContext
    .map((child) => child.ageYears)
    .filter((age) => Number.isFinite(age));

  const participantCount = profiles.length;
  const mode = participantCount >= 2 ? "family" : "single-child";

  return {
    ok: true,
    participantCount,
    mode,
    children: profiles,
    ages,
    childrenContext,
    // Client-declared mode is ignored when contradictory; exposed for telemetry only.
    declaredMode: String(body.activityMode || body.requestContext?.declaredActivityMode || "").trim() || null,
  };
}
