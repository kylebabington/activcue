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
  updateCustomParentPreset,
  deleteCustomParentPreset,
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
      <section className="page-intro page-intro--minimal">
        <h1>Pick what’s happening</h1>
        <p>Choose a moment so kids get activities that fit.</p>
      </section>

      <section className="panel parent-preset-panel">

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
                <div key={preset.id} className="custom-preset-card-wrap">
                  <button
                    type="button"
                    className={presetCardClass(preset)}
                    onClick={() => openReviewModal(preset)}
                  >
                    <span>{preset.label}</span>
                    <small>{formatPresetMeta(preset)}</small>
                  </button>

                  <button
                    type="button"
                    className="ghost-button custom-preset-delete"
                    onClick={() => deleteCustomParentPreset(preset.id)}
                  >
                    Delete
                  </button>
                </div>
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
        onUpdateCustom={
          reviewPreset?.id
            ? (label, draft) => {
                updateCustomParentPreset(reviewPreset.id, label, draft);
                closeReviewModal();
              }
            : null
        }
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
