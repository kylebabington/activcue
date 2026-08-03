export function formatEstimatedMinutes(estimatedMinutes, options = {}) {
  const { suffix = " min" } = options;

  if (typeof estimatedMinutes !== "number") {
    return null;
  }

  if (estimatedMinutes < 1) {
    return null;
  }

  return `${Math.round(estimatedMinutes)}${suffix}`;
}

export function formatMessLabel(mess) {
  if (mess === "low") return "Low mess";
  if (mess === "medium") return "Medium mess";
  if (mess === "high") return "Messy";
  return null;
}

export function formatEnergyLabel(energy) {
  if (energy === "low") return "Calm";
  if (energy === "medium") return "Active";
  if (energy === "high") return "High energy";
  return null;
}

export function formatAdultHelpLabel(adultHelp) {
  if (adultHelp === "none") return "No adult help";
  if (adultHelp === "optional") return "Adult optional";
  if (adultHelp === "needed") return "Adult needed";
  return null;
}

export function formatActivityStyleLabel(activityStyle) {
  if (activityStyle === "simple") return "Simple";
  if (activityStyle === "imaginative") return "Pretend";
  return "Activity";
}

export function formatAvailabilityLabel(availability) {
  if (availability === "available") return "Available";
  if (availability === "ask-first") return "Ask first";
  if (availability === "do-not-interrupt") return "Do not interrupt";
  if (availability === "helper-welcome") return "Helper welcome";
  return "Check first";
}

export function formatAvailabilityMessage(availability) {
  if (availability === "available") return "You can ask for help.";
  if (availability === "ask-first") return "Please ask before interrupting.";
  if (availability === "do-not-interrupt") {
    return "Try one activity before interrupting.";
  }
  if (availability === "helper-welcome") return "You can ask how to help.";
  return "Check before interrupting.";
}

export function formatKidMomentMessage(currentMoment) {
  const availability = currentMoment?.availability;

  if (availability === "do-not-interrupt") {
    return "An adult can’t help right now — pick something you can start alone.";
  }

  if (availability === "ask-first") {
    return "An adult is busy — try your activity first, then ask if you need help.";
  }

  if (availability === "helper-welcome") {
    return "An adult is around if you want to help or ask a question.";
  }

  if (availability === "available") {
    return "An adult can help if you need it.";
  }

  return "Pick something that fits right now.";
}

export function formatNoiseForBanner(noiseLevel) {
  if (noiseLevel === "quiet") return "Quiet";
  if (noiseLevel === "normal") return "Normal noise";
  if (noiseLevel === "loud") return "Loud okay";
  return "Noise not set";
}

export function formatMessForBanner(messLevel) {
  if (messLevel === "low") return "Low mess";
  if (messLevel === "medium") return "Medium mess";
  if (messLevel === "high") return "Messy okay";
  return "Mess not set";
}

export function formatSupervisionForBanner(supervisionLevel) {
  if (supervisionLevel === "independent") return "No adult help";
  if (supervisionLevel === "mostly-independent") return "Mostly independent";
  if (supervisionLevel === "nearby") return "Adult nearby";
  return "Supervision not set";
}

export function formatFeedbackLabel(feedbackType) {
  if (feedbackType === "started") return "Started";
  if (feedbackType === "finished") return "Finished";
  if (feedbackType === "canceled") return "Canceled";
  if (feedbackType === "not-finished") return "Not finished";
  if (feedbackType === "need-another-idea") return "Need another idea";
  if (feedbackType === "timer-more-like-this") return "More like this";
  if (feedbackType === "too-messy") return "Too messy";
  if (feedbackType === "too-hard") return "Too hard";
  if (feedbackType === "too-easy") return "Too easy";
  if (feedbackType === "too-young") return "Too young";
  if (feedbackType === "too-old") return "Too old";
  if (feedbackType === "wrong-moment") return "Wrong moment";
  if (feedbackType === "need-quieter") return "Needed quieter";
  if (feedbackType === "more-like-this") return "More like this";
  if (feedbackType === "activity_rejected") return "Skipped for next best";
  return feedbackType;
}

export function formatTimer(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
