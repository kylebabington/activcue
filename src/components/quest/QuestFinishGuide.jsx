/** Big Finish — one ending action, separate from optional extensions (V3). */

export default function QuestFinishGuide({
  finishGuide,
  extensionIdeas = [],
  isImaginative = true,
  children,
}) {
  const guide =
    finishGuide && typeof finishGuide === "object" ? finishGuide : null;
  const action = String(guide?.action || "").trim();
  const example = String(guide?.example || "").trim();
  const resolution = String(guide?.resolution || "").trim();
  const doneWhen = String(guide?.doneWhen || "").trim();
  const extensions =
    Array.isArray(guide?.extensions) && guide.extensions.length > 0
      ? guide.extensions.filter(Boolean)
      : Array.isArray(extensionIdeas)
        ? extensionIdeas.filter(Boolean)
        : [];

  return (
    <>
      {resolution ? (
        <p className="quest-finish-resolution">{resolution}</p>
      ) : null}
      {action ? (
        <div className="quest-finish-primary">
          <p className="quest-finish-action">{action}</p>
          {example ? <p className="quest-finish-example">{example}</p> : null}
          {doneWhen ? (
            <p className="quest-finish-done-when">
              {isImaginative ? "Ready to wrap up when: " : "Done when: "}
              {doneWhen}
            </p>
          ) : null}
        </div>
      ) : (
        <p>
          {isImaginative
            ? "When the last scene is done, wrap the story and celebrate."
            : "When the last step is done, you are finished."}
        </p>
      )}

      {extensions.length > 0 ? (
        <div className="quest-finish-extensions">
          <h3>{isImaginative ? "Want to keep playing?" : "Keep going"}</h3>
          <ul>
            {extensions.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {children}
    </>
  );
}
