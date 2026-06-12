import { useEffect, useState } from "react";
import Modal from "./Modal";
import MomentEditorFields from "./MomentEditorFields";
import { createEmptyMomentDraft } from "../utils/momentPresets";

function CreateMomentModal({
  isOpen,
  onClose,
  onSave,
  onSaveAndSet,
  getAvailabilityLabel,
}) {
  const [label, setLabel] = useState("");
  const [draft, setDraft] = useState(createEmptyMomentDraft());
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLabel("");
      setDraft(createEmptyMomentDraft());
      setError("");
    }
  }, [isOpen]);

  function handleDraftChange(adjustment) {
    setDraft((current) => ({
      ...current,
      ...adjustment,
    }));
  }

  function validate() {
    const trimmedLabel = label.trim();

    if (!trimmedLabel) {
      setError("Please enter a name for this custom moment.");
      return null;
    }

    setError("");
    return trimmedLabel;
  }

  function handleSave() {
    const trimmedLabel = validate();
    if (!trimmedLabel) {
      return;
    }

    onSave(trimmedLabel, draft);
    onClose();
  }

  function handleSaveAndSet() {
    const trimmedLabel = validate();
    if (!trimmedLabel) {
      return;
    }

    onSaveAndSet(trimmedLabel, draft);
    onClose();
  }

  const footer = (
    <>
      <button type="button" className="ghost-button" onClick={onClose}>
        Cancel
      </button>

      <button type="button" className="secondary-action" onClick={handleSave}>
        Save custom moment
      </button>

      <button type="button" onClick={handleSaveAndSet}>
        Save & set moment
      </button>
    </>
  );

  return (
    <Modal
      title="Create custom moment"
      isOpen={isOpen}
      onClose={onClose}
      footer={footer}
    >
      <div className="create-moment-form">
        <label>
          Moment name
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Example: Sunday laundry"
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <MomentEditorFields
          draft={draft}
          onDraftChange={handleDraftChange}
          getAvailabilityLabel={getAvailabilityLabel}
        />
      </div>
    </Modal>
  );
}

export default CreateMomentModal;
