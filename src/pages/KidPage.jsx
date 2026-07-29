// src/pages/KidPage.jsx

import { Link } from "react-router-dom";
import { formatKidMomentMessage } from "../utils/activityFormatters";

function KidPage({
  currentMoment,
  kidEnergyLevel,
  setKidEnergyLevel,
  kidActivityStyle,
  setKidActivityStyle,
  handleGenerateKidActivities,
  handleStartSomethingForMe,
  isLoading,
  loadingIntent,
  activeChildProfile,
  activityMode,
  savedActivities,
  handleReplaySavedActivity,
  isDemoMode = false,
  imBoredDisabled = false,
}) {
  function energyChipClass(energyLevel) {
    return kidEnergyLevel === energyLevel
      ? `kid-energy-chip active kid-energy-chip--${energyLevel}`
      : `kid-energy-chip kid-energy-chip--${energyLevel}`;
  }

  function styleButtonClass(activityStyle) {
    return kidActivityStyle === activityStyle
      ? `kid-style-button active kid-style-button--${activityStyle}`
      : `kid-style-button kid-style-button--${activityStyle}`;
  }

  const recentSaved = Array.isArray(savedActivities)
    ? savedActivities.slice(-3).reverse()
    : [];

  const boredLabel =
    loadingIntent === "board"
      ? "Finding activities..."
      : loadingIntent === "quick"
        ? "Quick ideas..."
        : "I'm Bored";

  const startForMeLabel =
    loadingIntent === "auto-start" ? "Picking one for you..." : "Start for me";

  const profileLabel =
    activityMode === "family"
      ? "Playing together"
      : activeChildProfile
        ? `Playing as ${activeChildProfile.name}`
        : null;

  const busyNote =
    currentMoment?.availability === "do-not-interrupt"
      ? "Try one activity for about 10 minutes before asking for help."
      : null;

  return (
    <section className="page-layout page-layout--kid">
      <section className="page-intro page-intro--kid page-intro--minimal">
        <h1>What sounds good?</h1>
      </section>

      <div className="kid-center-column">
        {isDemoMode ? (
          <div
            className={`kid-demo-banner${imBoredDisabled ? " kid-demo-banner--exhausted" : ""}`}
            role="status"
          >
            {imBoredDisabled ? (
              <p>
                Free pretend sample used. <strong>I&apos;m Bored</strong> needs{" "}
                <Link to="/signup">FamilyFlow Plus</Link> for more ideas.
                Simple Quick ideas still work.
              </p>
            ) : (
              <p>
                These are <strong>sample presets</strong> so you can try the full
                flow. <strong>FamilyFlow Plus</strong> will tailor activities to
                the current parent moment, kid energy/style, and supplies.
              </p>
            )}
          </div>
        ) : null}

        <div className="kid-status-strip">
          {profileLabel && (
            <span className="kid-status-strip-profile">{profileLabel}</span>
          )}
          {currentMoment && (
            <p className="kid-status-strip-message">
              {formatKidMomentMessage(currentMoment)}
            </p>
          )}
          {busyNote && <p className="kid-status-strip-note">{busyNote}</p>}
        </div>

        <section className="panel kid-main-panel">
          <div className="kid-energy-picker">
            <h3>My energy</h3>

            <div className="kid-energy-row chip-grid">
              <button
                type="button"
                className={energyChipClass("quiet")}
                onClick={() => setKidEnergyLevel("quiet")}
                disabled={isLoading}
              >
                Quiet
              </button>

              <button
                type="button"
                className={energyChipClass("neutral")}
                onClick={() => setKidEnergyLevel("neutral")}
                disabled={isLoading}
              >
                In-between
              </button>

              <button
                type="button"
                className={energyChipClass("energetic")}
                onClick={() => setKidEnergyLevel("energetic")}
                disabled={isLoading}
              >
                Bouncy
              </button>
            </div>
          </div>

          <div className="kid-style-grid">
            <button
              type="button"
              className={styleButtonClass("simple")}
              onClick={() => setKidActivityStyle("simple")}
              disabled={isLoading}
            >
              <span>Simple</span>
              <small>Easy and clear</small>
            </button>

            <button
              type="button"
              className={styleButtonClass("imaginative")}
              onClick={() => setKidActivityStyle("imaginative")}
              disabled={isLoading}
            >
              <span>Pretend</span>
              <small>Story play</small>
            </button>
          </div>

          <button
            type="button"
            className="im-bored-button"
            onClick={() => handleGenerateKidActivities()}
            disabled={isLoading || imBoredDisabled}
            title={
              imBoredDisabled
                ? "Free pretend sample used — Plus unlocks more I'm Bored ideas"
                : undefined
            }
          >
            {isLoading && loadingIntent !== "auto-start"
              ? boredLabel
              : imBoredDisabled
                ? "I'm Bored (needs Plus)"
                : "I'm Bored"}
          </button>

          <div className="kid-secondary-actions">
            {kidActivityStyle === "simple" && (
              <button
                type="button"
                className="text-action"
                onClick={() =>
                  handleGenerateKidActivities({ preferSimpleTemplates: true })
                }
                disabled={isLoading}
              >
                {loadingIntent === "quick" && isLoading
                  ? "Quick ideas..."
                  : "Quick ideas"}
              </button>
            )}

            <button
              type="button"
              className="text-action"
              onClick={handleStartSomethingForMe}
              disabled={isLoading}
            >
              {isLoading && loadingIntent === "auto-start"
                ? startForMeLabel
                : "Start for me"}
            </button>
          </div>
        </section>

        {recentSaved.length > 0 && (
          <section className="kid-replay-quiet">
            <p className="kid-replay-quiet-label">Play again</p>

            <div className="kid-replay-list">
              {recentSaved.map((activity) => (
                <button
                  key={activity.id || activity.title}
                  type="button"
                  className="kid-replay-chip"
                  onClick={() => handleReplaySavedActivity(activity)}
                  disabled={isLoading}
                >
                  {activity.title}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

export default KidPage;
