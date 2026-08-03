import { useState } from "react";

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
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = isControlled ? open : uncontrolledOpen;

  function handleToggle(event) {
    const nextOpen = Boolean(event.currentTarget.open);
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  return (
    <details
      id={id}
      className="quest-collapsible-section"
      open={isOpen}
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
