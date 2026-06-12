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

  const footer = (
    <>
      <button type="button" className="ghost-button" onClick={onClose}>
        Cancel
      </button>

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
