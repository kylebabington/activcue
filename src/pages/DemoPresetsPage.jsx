// src/pages/DemoPresetsPage.jsx

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiRequestError } from "../api/apiClient";
import {
  getPresetActivities,
  unlockPresetActivity,
} from "../api/activityApi";
import { useAppContext } from "../context/AppContext";
import "../styles/landing.css";

function DemoPresetsPage() {
  const navigate = useNavigate();
  const { handleStartActivity } = useAppContext();

  const [activities, setActivities] = useState([]);
  const [entitlement, setEntitlement] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyActivityId, setBusyActivityId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPresets() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const payload = await getPresetActivities();

        if (!isMounted) {
          return;
        }

        setActivities(payload.activities);
        setEntitlement(payload.entitlement);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load sample activities."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPresets();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSelectActivity(activity) {
    setStatusMessage("");
    setErrorMessage("");
    setBusyActivityId(activity.id);

    try {
      let readyActivity = activity;

      if (activity.isLocked) {
        const payload = await unlockPresetActivity(activity.id);
        readyActivity = payload.activity;
        setEntitlement(payload.entitlement || null);
        setActivities((current) =>
          current.map((item) =>
            item.id === readyActivity.id ? readyActivity : item
          )
        );
        setStatusMessage(
          `Unlocked “${readyActivity.title}” as your free pretend quest.`
        );
      }

      if (readyActivity.isLocked) {
        throw new Error("This activity is still locked.");
      }

      handleStartActivity(readyActivity);
      navigate("/quest");
    } catch (error) {
      const code =
        error instanceof ApiRequestError ? error.code : "";

      if (code === "FREE_IMAGINATIVE_UNLOCK_USED") {
        setErrorMessage(
          "You already unlocked one free pretend quest. Try a simple activity, or sign up for more later."
        );
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not start that activity."
        );
      }
    } finally {
      setBusyActivityId(null);
    }
  }

  const simpleActivities = activities.filter(
    (activity) => activity.activityStyle === "simple"
  );
  const imaginativeActivities = activities.filter(
    (activity) => activity.activityStyle === "imaginative"
  );
  const freeUnlockUsed = Boolean(entitlement?.freeImaginativeActivityId);

  return (
    <section className="demo-presets" aria-labelledby="demo-presets-title">
      <div className="demo-presets-intro">
        <p className="demo-presets-eyebrow">Sample activities</p>
        <h1 id="demo-presets-title">Try FamilyFlow without signing up</h1>
        <p className="demo-presets-lead">
          Browse curated simple play and pretend quests. Every simple idea is
          open. Unlock one pretend quest free.
        </p>
        <p className="demo-presets-account">
          Want to save progress later?{" "}
          <Link to="/signup">Sign up</Link>
          {" · "}
          <Link to="/login">Log in</Link>
        </p>
      </div>

      {isLoading ? (
        <p className="demo-presets-status" role="status">
          Loading sample activities…
        </p>
      ) : null}

      {errorMessage ? (
        <p className="demo-presets-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="demo-presets-status" role="status">
          {statusMessage}
        </p>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          <PresetGroup
            title="Simple play"
            description="Ready anytime — no unlock needed."
            activities={simpleActivities}
            busyActivityId={busyActivityId}
            onSelect={handleSelectActivity}
            freeUnlockUsed={freeUnlockUsed}
          />

          <PresetGroup
            title="Imaginative quests"
            description={
              freeUnlockUsed
                ? "Your free pretend unlock is used. Other quests stay locked until Plus."
                : "Pick one pretend quest to unlock free."
            }
            activities={imaginativeActivities}
            busyActivityId={busyActivityId}
            onSelect={handleSelectActivity}
            freeUnlockUsed={freeUnlockUsed}
          />
        </>
      ) : null}
    </section>
  );
}

function PresetGroup({
  title,
  description,
  activities,
  busyActivityId,
  onSelect,
  freeUnlockUsed,
}) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <div className="demo-preset-group">
      <div className="demo-preset-group-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <ul className="demo-preset-list">
        {activities.map((activity) => {
          const isBusy = busyActivityId === activity.id;
          const isLocked = Boolean(activity.isLocked);
          const canUnlock = isLocked && !freeUnlockUsed;
          const blocked = isLocked && freeUnlockUsed;

          let actionLabel = "Start";
          if (isBusy) {
            actionLabel = isLocked ? "Unlocking…" : "Starting…";
          } else if (canUnlock) {
            actionLabel = "Unlock free";
          } else if (blocked) {
            actionLabel = "Locked";
          }

          return (
            <li key={activity.id}>
              <article className="demo-preset-item">
                <div className="demo-preset-item-copy">
                  <h3>{activity.title}</h3>
                  <p>{activity.summary}</p>
                  <p className="demo-preset-meta">
                    {activity.estimatedMinutes
                      ? `About ${activity.estimatedMinutes} min`
                      : null}
                    {activity.theme ? ` · ${activity.theme}` : null}
                  </p>
                </div>

                <button
                  type="button"
                  className="landing-btn landing-btn--primary demo-preset-action"
                  disabled={Boolean(busyActivityId) || blocked}
                  onClick={() => onSelect(activity)}
                >
                  {actionLabel}
                </button>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default DemoPresetsPage;
