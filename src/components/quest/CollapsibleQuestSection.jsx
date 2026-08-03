const DEFAULT_OPEN_SECTIONS = Object.freeze({
  mission: true,
  role: true,
  starters: true,
  materials: false,
  steps: true,
  rescue: false,
  finish: false,
});

export function getDefaultOpenSections(overrides = {}) {
  return { ...DEFAULT_OPEN_SECTIONS, ...overrides };
}

/**
 * Native details/summary collapsible section for quest content.
 */
export default function CollapsibleQuestSection({
  id,
  title,
  summary,
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}) {
  const isControlled = typeof open === "boolean";

  function handleToggle(event) {
    if (!onOpenChange) {
      return;
    }
    onOpenChange(Boolean(event.currentTarget.open));
  }

  return (
    <details
      id={id}
      className="quest-collapsible-section"
      open={isControlled ? open : undefined}
      defaultOpen={isControlled ? undefined : defaultOpen}
      onToggle={handleToggle}
    >
      <summary className="quest-collapsible-summary">
        <div className="quest-collapsible-summary-text">
          <h2>{title}</h2>
          {summary ? <p>{summary}</p> : null}
        </div>
      </summary>
      <div className="quest-collapsible-body">{children}</div>
    </details>
  );
}

export { DEFAULT_OPEN_SECTIONS };
