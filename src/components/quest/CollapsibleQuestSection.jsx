import { useEffect, useRef } from "react";

/**
 * Native details/summary collapsible section for quest content.
 * Open state is synced via the DOM `open` property (not React's `open` prop)
 * to avoid controlled-details toggle races that leave sections empty.
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
  const detailsRef = useRef(null);
  const ignoreToggleRef = useRef(false);

  useEffect(() => {
    const node = detailsRef.current;
    if (!node) {
      return;
    }

    const desiredOpen = isControlled ? open : defaultOpen;
    if (node.open === desiredOpen) {
      return;
    }

    ignoreToggleRef.current = true;
    node.open = desiredOpen;
  }, [isControlled, open, defaultOpen]);

  function handleToggle(event) {
    if (ignoreToggleRef.current) {
      ignoreToggleRef.current = false;
      return;
    }

    const nextOpen = Boolean(event.currentTarget.open);

    if (isControlled && nextOpen !== open) {
      // Keep DOM aligned with controlled prop until parent state updates.
      ignoreToggleRef.current = true;
      event.currentTarget.open = open;
      onOpenChange?.(nextOpen);
      return;
    }

    onOpenChange?.(nextOpen);
  }

  return (
    <details
      ref={detailsRef}
      id={id}
      className="quest-collapsible-section"
      onToggle={handleToggle}
    >
      <summary className="quest-collapsible-summary">
        <span className="quest-collapsible-chevron" aria-hidden="true">
          ▾
        </span>
        <div className="quest-collapsible-summary-text">
          <h2>{title}</h2>
          {summary ? <p>{summary}</p> : null}
        </div>
      </summary>
      <div className="quest-collapsible-body">{children}</div>
    </details>
  );
}
