import {
  formatAvailabilityLabel,
  formatMessForBanner,
  formatNoiseForBanner,
  formatSupervisionForBanner,
} from "../utils/activityFormatters";

function MomentStatusBanner({ currentMoment }) {
  if (!currentMoment) {
    return null;
  }

  return (
    <section className="current-moment-banner">
      <div>
        <p className="eyebrow dark">Right now</p>

        <h2>{currentMoment.parentActivity}</h2>

        <p>{formatAvailabilityLabel(currentMoment.availability)}</p>
      </div>

      <div className="moment-chip-list">
        <span>{Number(currentMoment.timeNeededMinutes) || 20} min</span>

        <span>{currentMoment.space || "Space not set"}</span>

        <span>{formatNoiseForBanner(currentMoment.noiseLevel)}</span>

        <span>{formatMessForBanner(currentMoment.messLevel)}</span>

        <span>{formatSupervisionForBanner(currentMoment.supervisionLevel)}</span>
      </div>
    </section>
  );
}

export default MomentStatusBanner;
