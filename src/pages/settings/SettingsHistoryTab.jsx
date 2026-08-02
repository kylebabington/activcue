// src/pages/settings/SettingsHistoryTab.jsx

import SavedActivitiesPanel from "../../components/SavedActivitiesPanel";
import ActivityHistoryPanel from "../../components/ActivityHistoryPanel";

export default function SettingsHistoryTab({
  savedActivities,
  handleReplaySavedActivity,
  removeSavedActivity,
  activityHistory,
  clearActivityHistory,
  formatFeedbackLabel,
}) {
  return (
    <div
      className="settings-tab-panel"
      role="tabpanel"
      id="settings-panel-history"
      aria-labelledby="settings-tab-history"
    >
      <SavedActivitiesPanel
        savedActivities={savedActivities}
        handleReplaySavedActivity={handleReplaySavedActivity}
        removeSavedActivity={removeSavedActivity}
      />

      <ActivityHistoryPanel
        activityHistory={activityHistory}
        clearActivityHistory={clearActivityHistory}
        formatFeedbackLabel={formatFeedbackLabel}
      />
    </div>
  );
}
