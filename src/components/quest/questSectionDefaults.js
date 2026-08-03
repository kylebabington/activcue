export const DEFAULT_OPEN_SECTIONS = Object.freeze({
  mission: true,
  role: true,
  starters: true,
  materials: false,
  steps: true,
  rescue: false,
  finish: false,
});

export function getDefaultOpenSections(overrides = {}) {
  return { ...DEFAULT_OPEN_SECTIONS, ...overrides };
}
