export function presetToMomentDraft(preset) {
  return {
    parentActivity: preset.activity,
    availability: preset.availability,
    timeNeededMinutes: preset.timeNeededMinutes ?? 20,
    space: preset.space ?? "Living room",
    messLevel: preset.messLevel ?? "low",
    noiseLevel: preset.noiseLevel ?? "normal",
    supervisionLevel: preset.supervisionLevel ?? "independent",
  };
}

export function createEmptyMomentDraft() {
  return {
    parentActivity: "Custom activity",
    availability: "ask-first",
    timeNeededMinutes: 20,
    space: "Living room",
    messLevel: "low",
    noiseLevel: "normal",
    supervisionLevel: "independent",
  };
}

export function getPresetKey(preset) {
  return preset.id ?? preset.label;
}
