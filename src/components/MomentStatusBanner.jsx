import { formatKidMomentMessage } from "../utils/activityFormatters";

function MomentStatusBanner({ currentMoment, kidFacing = false }) {
  if (!currentMoment) {
    return null;
  }

  if (kidFacing) {
    return (
      <section className="current-moment-banner current-moment-banner--kid">
        <p className="kid-moment-message">
          {formatKidMomentMessage(currentMoment)}
        </p>
      </section>
    );
  }

  return (
    <section className="current-moment-banner">
      <div>
        <h2>{currentMoment.parentActivity}</h2>
        <p>{formatKidMomentMessage(currentMoment)}</p>
      </div>
    </section>
  );
}

export default MomentStatusBanner;
