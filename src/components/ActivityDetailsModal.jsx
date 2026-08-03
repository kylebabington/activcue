import QuestContent from "./quest/QuestContent";
import Modal from "./Modal";

function ActivityDetailsContent({ activity, score, currentMoment }) {
  return (
    <div className="activity-details-content">
      <QuestContent
        activity={activity}
        mode="preview"
        score={score}
        currentMoment={currentMoment}
      />
    </div>
  );
}

function ActivityDetailsModal({
  activity,
  score,
  currentMoment,
  isOpen,
  onClose,
  handleStartActivity,
  saveFavoriteActivity,
}) {
  if (!activity) {
    return null;
  }

  function handleStart() {
    handleStartActivity(activity);
    onClose();
  }

  const footer = (
    <>
      <button type="button" className="ghost-button" onClick={onClose}>
        Close
      </button>

      <button
        type="button"
        className="secondary-action"
        onClick={() => saveFavoriteActivity(activity)}
      >
        Save favorite
      </button>

      <button type="button" onClick={handleStart}>
        {activity.activityStyle === "imaginative"
          ? "Enter the story"
          : "Start this activity"}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activity.title}
      footer={footer}
    >
      <ActivityDetailsContent
        activity={activity}
        score={score}
        currentMoment={currentMoment}
      />
    </Modal>
  );
}

export { ActivityDetailsModal, ActivityDetailsContent };
export default ActivityDetailsModal;
