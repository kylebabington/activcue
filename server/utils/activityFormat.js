import {
  ACTIVE_ACTIVITY_FORMAT_VERSION,
  QUALITY_CONTRACT_VERSION,
} from "./activityFormatConstants.js";

/** True when activity uses Activity Format V4 (format version only — not activity style). */
export function isActivityFormatV4(activity) {
  return Number(activity?.activityFormatVersion) === ACTIVE_ACTIVITY_FORMAT_VERSION;
}

/** True when activity style is imaginative (style only — not format version). */
export function isImaginativeActivity(activity) {
  return activity?.activityStyle === "imaginative";
}

/** V4 activities are imaginative-only today, but keep both checks explicit at call sites. */
export function isV4ImaginativeActivity(activity) {
  return isActivityFormatV4(activity) && isImaginativeActivity(activity);
}

export function hasQualityContractVersion(activity, version = QUALITY_CONTRACT_VERSION) {
  return Number(activity?.qualityContractVersion) === version;
}
