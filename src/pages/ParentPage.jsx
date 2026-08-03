// src/pages/ParentPage.jsx

import { useState } from "react";
import CreateMomentModal from "../components/CreateMomentModal";
import ReviewMomentModal from "../components/ReviewMomentModal";
import { getPresetKey } from "../utils/momentPresets";
import { trackProductEvent } from "../utils/analytics";

const RESCUE_TIME_OPTIONS = [10, 20, 30];
const RESCUE_NOISE_OPTIONS = [
  { value: "quiet", label: "Quiet" },
  { value: "normal", label: "Normal" },
  { value: "loud", label: "Anything goes" },
];

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
  firstRunHighlightCooking = false,
  onFirstRunMomentSet,
  onDismissFirstRun,
  lastSuccessfulMoment = null,
}) {
  const [reviewPreset, setReviewPreset] = useState(null);
  const [reviewPresetKey, setReviewPresetKey] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [rescueMinutes, setRescueMinutes] = useState(20);
  const [rescueNoise, setRescueNoise] = useState("quiet");

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
    onFirstRunMomentSet?.();
  }

  function handleSaveCustomMoment(label, draft) {
    const preset = saveCustomParentPreset(label, draft);
    setActivePresetKey(preset.id);
  }

  function handleSaveAndSetCustomMoment(label, draft) {
    const preset = saveCustomParentPreset(label, draft);
    applyMomentDraft(draft);
    setActivePresetKey(preset.id);
    onFirstRunMomentSet?.();
  }

  function presetCardClass(preset) {
    const key = getPresetKey(preset);
    const base = key === activePresetKey ? "preset-card active" : "preset-card";
    const coach =
      firstRunHighlightCooking && preset.label === "Cooking"
        ? " preset-card--coach"
        : "";
    return `${base}${coach}`;
  }

  function formatPresetMeta(preset) {
    return `${getAvailabilityLabel(preset.availability)} · ${preset.timeNeededMinutes} min · ${preset.space}`;
  }

  function applyRescueMode() {
    const minutes = RESCUE_TIME_OPTIONS.includes(rescueMinutes)
      ? rescueMinutes
      : 20;
    const noise = RESCUE_NOISE_OPTIONS.some((option) => option.value === rescueNoise)
      ? rescueNoise
      : "quiet";
    const activityLabel =
      noise === "quiet"
        ? `Need ${minutes} quiet minutes`
        : `Need ${minutes} minutes`;

    applyMomentDraft(
      {
        parentActivity: activityLabel,
        availability: "do-not-interrupt",
        timeNeededMinutes: minutes,
        space: "Living room",
        messLevel: "low",
        noiseLevel: noise,
        supervisionLevel: "independent",
      },
      { navigateToKid: true }
    );
    trackProductEvent("rescue_mode_started", {
      timeNeededMinutes: minutes,
      noiseLevel: noise,
    });
  }

  return (
    <section className="page-layout page-layout--parent parent-preset-page">
      <section className="page-intro page-intro--minimal">
        <h1>Pick what’s happening</h1>
        <p>Choose a moment so kids get activities that fit.</p>
      </section>

      <div className="rescue-mode-banner">
        <div>
          <p className="rescue-mode-kicker">Rescue Mode</p>
          <p>
            Need breathing room fast? Pick a time window, optional noise
            preference, then jump to Kid.
          </p>

          <div className="rescue-mode-options" role="group" aria-label="Rescue time">
            {RESCUE_TIME_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={
                  rescueMinutes === minutes
                    ? "rescue-mode-chip active"
                    : "rescue-mode-chip"
                }
                onClick={() => setRescueMinutes(minutes)}
              >
                {minutes} min
              </button>
            ))}
          </div>

          <div
            className="rescue-mode-options"
            role="group"
            aria-label="Rescue noise preference"
          >
            {RESCUE_NOISE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  rescueNoise === option.value
                    ? "rescue-mode-chip active"
                    : "rescue-mode-chip"
                }
                onClick={() => setRescueNoise(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="rescue-mode-button"
          onClick={applyRescueMode}
        >
          I need {rescueMinutes} minutes
        </button>
      </div>

      {lastSuccessfulMoment?.parentActivity ? (
        <div className="parent-while-you-ritual" role="status">
          <p>
            Last win was while you were{" "}
            <strong>{lastSuccessfulMoment.parentActivity}</strong>
            {lastSuccessfulMoment.activityTitle
              ? ` (${lastSuccessfulMoment.activityTitle})`
              : ""}
            .
          </p>
          <button
            type="button"
            onClick={() => {
              applyMomentDraft(
                {
                  parentActivity: lastSuccessfulMoment.parentActivity,
                  availability:
                    lastSuccessfulMoment.availability || "helper-welcome",
                  timeNeededMinutes:
                    Number(lastSuccessfulMoment.timeNeededMinutes) || 20,
                  space: lastSuccessfulMoment.space || "Living room",
                  messLevel: lastSuccessfulMoment.messLevel || "low",
                  noiseLevel: lastSuccessfulMoment.noiseLevel || "normal",
                  supervisionLevel:
                    lastSuccessfulMoment.supervisionLevel || "independent",
                },
                { navigateToKid: true }
              );
            }}
          >
            While you {lastSuccessfulMoment.parentActivity}
          </button>
        </div>
      ) : null}

      {firstRunHighlightCooking && (
        <div className="first-run-coach" role="status">
          <p>
            <strong>First time?</strong> Try <strong>Cooking</strong>, set the
            moment, then head to Kid and tap I&apos;m Bored.
          </p>
          <button
            type="button"
            className="ghost-button"
            onClick={() => onDismissFirstRun?.()}
          >
            Skip tip
          </button>
        </div>
      )}

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
              {firstRunHighlightCooking && preset.label === "Cooking" ? (
                <span className="preset-card-coach-badge">Try this</span>
              ) : null}
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
