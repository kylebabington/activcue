// src/pages/ParentPage.jsx

import { useState } from "react";
import CreateMomentModal from "../components/CreateMomentModal";
import ReviewMomentModal from "../components/ReviewMomentModal";
import { getPresetKey } from "../utils/momentPresets";

function ParentPage({
  defaultParentStatusPresets,
  customParentPresets,
  getAvailabilityLabel,
  applyMomentDraft,
  saveCustomParentPreset,
  activePresetKey,
  setActivePresetKey,
}) {
  const [reviewPreset, setReviewPreset] = useState(null);
  const [reviewPresetKey, setReviewPresetKey] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  function openReviewModal(preset) {
    setReviewPreset(preset);
    setReviewPresetKey(getPresetKey(preset));
  }

  function closeReviewModal() {
    setReviewPreset(null);
    setReviewPresetKey("");
  }

  function handleSetMoment(draft, presetKey) {
    applyMomentDraft(draft);
    setActivePresetKey(presetKey);
  }

  function handleSaveCustomMoment(label, draft) {
    const preset = saveCustomParentPreset(label, draft);
    setActivePresetKey(preset.id);
  }

  function handleSaveAndSetCustomMoment(label, draft) {
    const preset = saveCustomParentPreset(label, draft);
    applyMomentDraft(draft);
    setActivePresetKey(preset.id);
  }

  function presetCardClass(preset) {
    const key = getPresetKey(preset);
    return key === activePresetKey ? "preset-card active" : "preset-card";
  }

  function formatPresetMeta(preset) {
    return `${getAvailabilityLabel(preset.availability)} · ${preset.timeNeededMinutes} min · ${preset.space}`;
  }

  return (
    <section className="page-layout page-layout--parent parent-preset-page">
      <section className="panel parent-preset-panel">
        <div className="panel-header">
          <h2>Pick a moment</h2>
        </div>

        <div className="preset-grid preset-grid--dense">
          {defaultParentStatusPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={presetCardClass(preset)}
              onClick={() => openReviewModal(preset)}
            >
              <span>{preset.label}</span>
              <small>{formatPresetMeta(preset)}</small>
            </button>
          ))}
        </div>

        {customParentPresets.length > 0 && (
          <>
            <h3 className="custom-presets-heading">Saved custom moments</h3>

            <div className="preset-grid preset-grid--dense">
              {customParentPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={presetCardClass(preset)}
                  onClick={() => openReviewModal(preset)}
                >
                  <span>{preset.label}</span>
                  <small>{formatPresetMeta(preset)}</small>
                </button>
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          className="create-moment-button"
          onClick={() => setIsCreateOpen(true)}
        >
          Create custom moment
        </button>
      </section>

      <ReviewMomentModal
        isOpen={Boolean(reviewPreset)}
        preset={reviewPreset}
        presetKey={reviewPresetKey}
        onClose={closeReviewModal}
        onSetMoment={handleSetMoment}
        getAvailabilityLabel={getAvailabilityLabel}
      />

      <CreateMomentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleSaveCustomMoment}
        onSaveAndSet={handleSaveAndSetCustomMoment}
        getAvailabilityLabel={getAvailabilityLabel}
      />
    </section>
  );
}

export default ParentPage;
