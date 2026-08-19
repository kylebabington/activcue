/** Numbered kid-facing action list for Activity Format V3 scenes. */

export default function QuestActionList({
  actions = [],
  instruction = "",
  kicker = "Do this",
  className = "",
}) {
  const items = Array.isArray(actions)
    ? actions.map((action) => String(action || "").trim()).filter(Boolean)
    : [];

  if (items.length === 0) {
    if (!instruction) return null;
    return (
      <p className={["quest-step-story-prompt", className].filter(Boolean).join(" ")}>
        {instruction}
      </p>
    );
  }

  return (
    <div className={["quest-action-list-block", className].filter(Boolean).join(" ")}>
      {kicker ? <p className="quest-play-card-kicker">{kicker}</p> : null}
      <ol className="quest-action-list">
        {items.map((action, index) => (
          <li key={`${index}-${action.slice(0, 24)}`}>{action}</li>
        ))}
      </ol>
    </div>
  );
}
