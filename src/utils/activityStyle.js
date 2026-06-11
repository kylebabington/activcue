export function normalizeActivityStyle(activity, fallback = "simple") {
  if (
    activity?.activityStyle === "simple" ||
    activity?.activityStyle === "imaginative"
  ) {
    return activity.activityStyle;
  }

  return fallback;
}
