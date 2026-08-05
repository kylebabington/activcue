// src/pages/KidPage.jsx

import { Link } from "react-router-dom";
import { formatKidMomentMessage } from "../utils/activityFormatters";
import { getRecentPlayAgainActivities } from "../utils/playAgainActivities";
import { buildSignupUrl } from "../utils/signupUrls";

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
  childProfiles = [],
  playingChildIds = [],
  togglePlayingChild,
  savedActivities,
  activityHistory = [],
  handleReplaySavedActivity,
  isDemoMode = false,
  imBoredDisabled = false,
  onGetPlus = null,
  checkoutBusy = false,
  firstRunPulseImBored = false,
  onFirstRunGenerated,
  playModeLine = "",
  kidDeviceMode = false,
  gettingBetterCopy = "",
  setupNudgeNeeded = false,
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

  const recentSaved = getRecentPlayAgainActivities({
    savedActivities,
    activityHistory,
    playingChildIds,
    limit: 3,
  });

  const boredLabel =
    loadingIntent === "board"
      ? "Finding activities..."
      : loadingIntent === "quick"
        ? "Quick ideas..."
        : "I'm Bored";

  const startForMeLabel =
    loadingIntent === "auto-start" ? "Picking one for you..." : "Start for me";

  const showPlayingPicker = childProfiles.length > 1;

  const playingProfiles = childProfiles.filter((child) =>
    playingChildIds.includes(child.id)
  );

  const profileLabel =
    playingProfiles.length > 1 || activityMode === "family"
      ? "Playing together"
      : playingProfiles[0] || activeChildProfile
        ? `Playing as ${(playingProfiles[0] || activeChildProfile).name}`
        : null;

  const busyNote =
    currentMoment?.availability === "do-not-interrupt"
      ? "Try one activity for about 10 minutes before asking for help."
      : null;

  return (
    <section
      className={`page-layout page-layout--kid${kidDeviceMode ? " page-layout--kid-device" : ""}`}
    >
      <section className="page-intro page-intro--kid page-intro--minimal">
        <h1>What sounds good?</h1>
        {playModeLine ? (
          <p className="play-mode-line">{playModeLine}</p>
        ) : null}
      </section>

      <div className="kid-center-column">
        {isDemoMode ? (
          <div
            className={`kid-demo-banner${imBoredDisabled ? " kid-demo-banner--exhausted" : ""}`}
            role="status"
          >
            {imBoredDisabled ? (
              <p>
                Nice work finishing your free pretend world. Unlimited ideas for{" "}
                <strong>
                  {currentMoment?.parentActivity || "this moment"}
                </strong>{" "}
                unlock with{" "}
                {typeof onGetPlus === "function" ? (
                  <button
                    type="button"
                    className="kid-plus-link"
                    onClick={onGetPlus}
                    disabled={checkoutBusy || isLoading}
                  >
                    {checkoutBusy ? "Starting checkout…" : "FamilyFlow Plus"}
                  </button>
                ) : (
                  <Link to={buildSignupUrl({ next: "checkout", plan: "monthly" })}>
                    FamilyFlow Plus
                  </Link>
                )}
                . Keep using Simple / Quick ideas anytime.
              </p>
            ) : (
              <p>
                These are <strong>sample presets</strong> so you can try the full
                flow.{" "}
                {typeof onGetPlus === "function" ? (
                  <>
                    <button
                      type="button"
                      className="kid-plus-link"
                      onClick={onGetPlus}
                      disabled={checkoutBusy || isLoading}
                    >
                      {checkoutBusy ? "Starting checkout…" : "FamilyFlow Plus"}
                    </button>{" "}
                    will tailor activities to the current parent moment, kid
                    energy/style, and supplies.
                  </>
                ) : (
                  <>
                    <strong>FamilyFlow Plus</strong> will tailor activities to
                    the current parent moment, kid energy/style, and supplies.{" "}
                    <Link to={buildSignupUrl({ next: "checkout", plan: "monthly" })}>
                      Sign up
                    </Link>{" "}
                    to subscribe.
                  </>
                )}
              </p>
            )}
          </div>
        ) : null}

        {gettingBetterCopy ? (
          <p className="kid-getting-better" role="status">
            {gettingBetterCopy}
          </p>
        ) : null}

        {setupNudgeNeeded ? (
          <p className="kid-setup-nudge" role="status">
            Add a child profile and a few supplies in Settings so ideas can match
            your house — Rescue Mode and Quick ideas still work without that.
          </p>
        ) : null}

        <div className="kid-status-strip">
          {!showPlayingPicker && profileLabel && (
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
          {firstRunPulseImBored && (
            <div className="first-run-coach first-run-coach--kid" role="status">
              <p>
                <strong>Next:</strong> pick energy, then tap I&apos;m Bored.
              </p>
            </div>
          )}

          {showPlayingPicker && (
            <div className="kid-playing-picker">
              <h3>Who&apos;s playing?</h3>
              <div
                className="kid-playing-row chip-grid"
                role="group"
                aria-label="Who is playing"
              >
                {childProfiles.map((child) => {
                  const isPlaying = playingChildIds.includes(child.id);

                  return (
                    <button
                      key={child.id}
                      type="button"
                      className={
                        isPlaying
                          ? "kid-playing-chip active"
                          : "kid-playing-chip"
                      }
                      aria-pressed={isPlaying}
                      onClick={() => togglePlayingChild?.(child.id)}
                      disabled={isLoading}
                    >
                      {child.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
              <span>Imaginative</span>
              <small>Creative thinking</small>
            </button>
          </div>

          <button
            type="button"
            className={
              firstRunPulseImBored
                ? "im-bored-button im-bored-button--pulse"
                : "im-bored-button"
            }
            onClick={() => {
              onFirstRunGenerated?.();
              handleGenerateKidActivities();
            }}
            disabled={isLoading || imBoredDisabled}
            title={
              imBoredDisabled
                ? "Free pretend sample finished — Plus unlocks more I'm Bored ideas"
                : undefined
            }
          >
            {isLoading && loadingIntent !== "auto-start"
              ? boredLabel
              : imBoredDisabled
                ? "I'm Bored — unlock more with Plus"
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
                  className="kid-replay-button"
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
