import { useEffect, useState } from "react";
import Modal from "./Modal";
import MomentEditorFields from "./MomentEditorFields";
import { presetToMomentDraft } from "../utils/momentPresets";

function ReviewMomentModal({
  isOpen,
  preset,
  presetKey,
  onClose,
  onSetMoment,
  onUpdateCustom,
  getAvailabilityLabel,
}) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (isOpen && preset) {
      setDraft(presetToMomentDraft(preset));
    }
  }, [isOpen, preset]);

  if (!preset || !draft) {
    return null;
  }

  function handleDraftChange(adjustment) {
    setDraft((current) => ({
      ...current,
      ...adjustment,
    }));
  }

  function handleSetMoment() {
    onSetMoment(draft, presetKey);
    onClose();
  }

  function handleSaveChanges() {
    if (!onUpdateCustom) {
      return;
    }

    onUpdateCustom(preset.label, draft);
  }

  const footer = (
    <>
      <button type="button" className="ghost-button" onClick={onClose}>
        Cancel
      </button>

      {onUpdateCustom && (
        <button
          type="button"
          className="secondary-action"
          onClick={handleSaveChanges}
        >
          Save changes
        </button>
      )}

      <button type="button" onClick={handleSetMoment}>
        Set moment
      </button>
    </>
  );

  return (
    <Modal
      title={preset.label}
      isOpen={isOpen}
      onClose={onClose}
      footer={footer}
    >
      <MomentEditorFields
        draft={draft}
        onDraftChange={handleDraftChange}
        getAvailabilityLabel={getAvailabilityLabel}
      />
    </Modal>
  );
}

export default ReviewMomentModal;
