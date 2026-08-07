// src/pages/ParentPage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateMomentModal from "../components/CreateMomentModal";
import ReviewMomentModal from "../components/ReviewMomentModal";
import { fetchRescueActivities } from "../api/sharedActivitiesApi";
import { useActivityContext } from "../context/domainContexts";
import { useFamilyContext } from "../context/domainContexts";
import { getPresetKey } from "../utils/momentPresets";
import { trackProductEvent } from "../utils/analytics";
import { markMomentCreatedAt } from "../utils/timeToStart";

const RESCUE_TIME_OPTIONS = [10, 20, 30];

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
  const navigate = useNavigate();
  const { setActivities, handleStartActivityFromUi } = useActivityContext();
  const family = useFamilyContext();
  const inventory = family?.inventory || [];
  const showStatus = family?.showStatus;

  const [reviewPreset, setReviewPreset] = useState(null);
  const [reviewPresetKey, setReviewPresetKey] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [rescueMinutes, setRescueMinutes] = useState(20);
  const [rescueLoading, setRescueLoading] = useState(false);

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

  async function applyRescueMode() {
    const minutes = RESCUE_TIME_OPTIONS.includes(rescueMinutes)
      ? rescueMinutes
      : 20;

    const rescueMoment = {
      parentActivity: `Need ${minutes} quiet minutes`,
      availability:
        lastSuccessfulMoment?.availability || "do-not-interrupt",
      timeNeededMinutes: minutes,
      space: lastSuccessfulMoment?.space || "Living room",
      messLevel: "low",
      noiseLevel: "quiet",
      supervisionLevel: "independent",
    };

    applyMomentDraft(rescueMoment, { navigateToKid: false, rescueMode: true });
    trackProductEvent("rescue_started", { timeNeededMinutes: minutes });
    trackProductEvent("rescue_mode_started", { timeNeededMinutes: minutes });

    setRescueLoading(true);
    try {
      const response = await fetchRescueActivities({
        minutes,
        inventory,
        currentMoment: rescueMoment,
      });
      const activities = Array.isArray(response?.activities)
        ? response.activities
        : [];

      if (response?.momentId) {
        markMomentCreatedAt(undefined, { momentId: response.momentId });
      }

      if (activities.length > 0) {
        setActivities?.(activities);
        handleStartActivityFromUi?.(activities[0]);
        navigate("/quest");
        trackProductEvent("rescue_successful", {
          timeNeededMinutes: minutes,
          source: response?.source || "shared-library",
          recommendationBatchId: response?.recommendationBatchId || null,
          momentId: response?.momentId || null,
          planBCount: Math.max(0, activities.length - 1),
        });
        showStatus?.(
          `Rescue ready: "${activities[0].title}". Plan B loaded.`,
          "success"
        );
      } else {
        applyMomentDraft(rescueMoment, { navigateToKid: true });
        showStatus?.(
          "No cached rescue ideas yet — pick an activity on Kid.",
          "info"
        );
      }
    } catch (error) {
      console.error("Rescue Mode failed:", error);
      applyMomentDraft(rescueMoment, { navigateToKid: true });
      showStatus?.("Rescue lookup failed — continuing to Kid.", "info");
    } finally {
      setRescueLoading(false);
    }
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
            No questionnaire. Pick a time window and ActivCue starts a
            low-setup activity with Plan B already loaded.
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
        </div>
        <button
          type="button"
          className="rescue-mode-button"
          onClick={() => void applyRescueMode()}
          disabled={rescueLoading}
        >
          {rescueLoading
            ? "Finding a rescue…"
            : `I need ${rescueMinutes} minutes`}
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
