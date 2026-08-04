// src/pages/MyActivitiesPage.jsx

import { useLocalStorage } from "../hooks/useLocalStorage";
import { useAppContext } from "../context/AppContext";
import SavedActivitiesPanel from "../components/SavedActivitiesPanel";
import ActivityHistoryPanel from "../components/ActivityHistoryPanel";

const MY_ACTIVITIES_TABS = [
  { id: "saved", label: "Saved" },
  { id: "history", label: "History" },
];

function MyActivitiesPage() {
  const ctx = useAppContext();
  const [activeTab, setActiveTab] = useLocalStorage(
    "myActivitiesTab",
    "saved"
  );

  const resolvedTab = MY_ACTIVITIES_TABS.some((tab) => tab.id === activeTab)
    ? activeTab
    : "saved";

  return (
    <section className="page-layout page-layout--parent">
      <header className="my-activities-header">
        <h1>My Activities</h1>
        <p>Activities you saved for later and ones you have already tried.</p>
      </header>

      <div
        className="settings-tablist"
        role="tablist"
        aria-label="My Activities sections"
      >
        {MY_ACTIVITIES_TABS.map((tab) => {
          const isActive = resolvedTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`my-activities-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`my-activities-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={
                isActive
                  ? "settings-tab settings-tab--active"
                  : "settings-tab"
              }
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {resolvedTab === "saved" ? (
        <div
          className="settings-tab-panel"
          role="tabpanel"
          id="my-activities-panel-saved"
          aria-labelledby="my-activities-tab-saved"
        >
          <SavedActivitiesPanel
            savedActivities={ctx.savedActivities}
            handleReplaySavedActivity={ctx.handleReplaySavedActivity}
            removeSavedActivity={ctx.removeSavedActivity}
          />
        </div>
      ) : null}

      {resolvedTab === "history" ? (
        <div
          className="settings-tab-panel"
          role="tabpanel"
          id="my-activities-panel-history"
          aria-labelledby="my-activities-tab-history"
        >
          <ActivityHistoryPanel
            activityHistory={ctx.activityHistory}
            clearActivityHistory={ctx.clearActivityHistory}
            formatFeedbackLabel={ctx.formatFeedbackLabel}
          />
        </div>
      ) : null}
    </section>
  );
}

export default MyActivitiesPage;
