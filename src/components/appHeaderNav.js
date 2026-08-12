// src/components/appHeaderNav.js

export function buildAppNavClassName({
  isActive,
  mutedWhenInactive = false,
  baseClass = "",
}) {
  const parts = [];
  if (baseClass) parts.push(baseClass);
  if (isActive) {
    parts.push("active");
  } else if (mutedWhenInactive) {
    parts.push("nav-muted");
  }
  return parts.filter(Boolean).join(" ");
}
