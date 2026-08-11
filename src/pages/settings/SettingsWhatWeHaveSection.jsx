// src/pages/settings/SettingsWhatWeHaveSection.jsx

import { useState } from "react";
import { BRAND } from "../../config/brand.js";
import { lookupBarcode } from "../../api/barcodeApi.js";
import { ApiRequestError } from "../../api/apiClient.js";
import BarcodeScanner from "../../components/BarcodeScanner.jsx";
import Modal from "../../components/Modal.jsx";

export default function SettingsWhatWeHaveSection({
  inventoryCategories,
  inventoryPresets,
  customInventoryItems,
  isInventoryItemSelected,
  toggleInventoryPreset,
  newInventoryItem,
  setNewInventoryItem,
  newInventoryCategory,
  setNewInventoryCategory,
  addInventoryItem,
  addInventoryItemFromScan,
  removeInventoryItem,
  assumeHouseholdBasics,
  setAssumeHouseholdBasics,
  selectedCount = 0,
  showStatus,
}) {
  const [inventorySearch, setInventorySearch] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [confirmCategory, setConfirmCategory] = useState("Other");
  const [confirmFound, setConfirmFound] = useState(false);
  const [confirmNote, setConfirmNote] = useState("");

  const normalizedSearch = inventorySearch.trim().toLowerCase();

  function presetMatchesFilters(preset) {
    const isSelected = isInventoryItemSelected(preset.name);

    if (showSelectedOnly && !isSelected) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return preset.name.toLowerCase().includes(normalizedSearch);
  }

  async function handleBarcodeDetected(code) {
    setScannerOpen(false);
    setLookupLoading(true);
    setConfirmCode(code);
    setConfirmName("");
    setConfirmCategory("Other");
    setConfirmFound(false);
    setConfirmNote("");
    setConfirmOpen(true);

    try {
      const result = await lookupBarcode(code);
      setConfirmFound(Boolean(result.found));
      setConfirmName(result.name || "");
      setConfirmCategory(result.categoryHint || "Other");
      setConfirmNote(
        result.found
          ? result.brand
            ? `Matched ${result.brand}. Edit the name if needed, then add.`
            : "Product found. Edit the name if needed, then add."
          : "No product match found. Enter a name, then add."
      );
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : "Could not look up that barcode.";
      setConfirmNote(`${message} You can still enter a name and add.`);
      showStatus?.(message, "error");
    } finally {
      setLookupLoading(false);
    }
  }

  function closeConfirm() {
    setConfirmOpen(false);
    setConfirmCode("");
    setConfirmName("");
    setConfirmCategory("Other");
    setConfirmFound(false);
    setConfirmNote("");
    setLookupLoading(false);
  }

  function handleConfirmAdd() {
    const added = addInventoryItemFromScan({
      name: confirmName,
      category: confirmCategory,
      barcode: confirmCode,
    });

    if (added) {
      closeConfirm();
    }
  }

  return (
    <section className="panel inventory-panel">
      <div className="panel-header">
        <div>
          <h2>What we have</h2>
          <p>
            {BRAND.name} uses this to avoid suggesting things you do not have.
          </p>
        </div>
      </div>

      <label className="settings-toggle-row">
        <input
          type="checkbox"
          checked={Boolean(assumeHouseholdBasics)}
          onChange={(event) => setAssumeHouseholdBasics(event.target.checked)}
        />
        <span>
          Assume common household basics
          <small>
            Paper, pencil, towels, cups, cardboard, blankets, and similar items
            without listing every junk-drawer staple.
          </small>
        </span>
      </label>

      <div className="inventory-filter-row">
        <input
          value={inventorySearch}
          onChange={(event) => setInventorySearch(event.target.value)}
          placeholder="Search supplies…"
          aria-label="Search supplies"
        />

        <button
          type="button"
          className={showSelectedOnly ? "enabled" : "secondary-action"}
          onClick={() => setShowSelectedOnly((current) => !current)}
        >
          {showSelectedOnly ? "Showing selected" : "Show selected only"}
        </button>
      </div>

      <p className="inventory-selected-count" role="status">
        Selected: {selectedCount} items
      </p>

      <div className="inventory-preset-list">
        {inventoryCategories.map((category) => {
          const presetsInCategory = inventoryPresets.filter(
            (preset) =>
              preset.category === category && presetMatchesFilters(preset)
          );

          if (presetsInCategory.length === 0) {
            return null;
          }

          return (
            <section key={category} className="inventory-category-group">
              <h3>{category}</h3>

              <div className="chip-list inventory-preset-grid">
                {presetsInCategory.map((preset) => {
                  const isSelected = isInventoryItemSelected(preset.name);

                  return (
                    <button
                      key={preset.name}
                      type="button"
                      className={
                        isSelected
                          ? "chip inventory-preset-chip selected"
                          : "chip inventory-preset-chip"
                      }
                      aria-pressed={isSelected}
                      onClick={() => toggleInventoryPreset(preset)}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {customInventoryItems.length > 0 && (
        <section className="inventory-category-group inventory-custom-group">
          <h3>Custom items</h3>

          <div className="chip-list">
            {customInventoryItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="chip inventory-preset-chip selected"
                onClick={() => removeInventoryItem(item.id)}
              >
                {item.name} ×
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="inventory-scan-block">
        <div className="inventory-scan-row">
          <button
            type="button"
            className="secondary-action"
            onClick={() => setScannerOpen(true)}
          >
            Scan barcode
          </button>
          <p>Scan a toy box barcode to autofill name and category.</p>
        </div>
        <p className="inventory-scan-notice" role="note">
          Barcode scanning is in testing. Product lookup uses a free daily
          limit, so matches may fail once that limit is reached — you can still
          enter the name yourself.
        </p>
      </div>

      <details className="inventory-custom-add">
        <summary>+ Add something else</summary>

        <div className="inventory-add-grid">
          <input
            value={newInventoryItem}
            onChange={(event) => setNewInventoryItem(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addInventoryItem();
            }}
            placeholder="Example: marble collection, ukulele"
          />

          <select
            value={newInventoryCategory}
            onChange={(event) => setNewInventoryCategory(event.target.value)}
          >
            {inventoryCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <button type="button" onClick={addInventoryItem}>
            Add
          </button>
        </div>
      </details>

      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />

      <Modal
        title="Confirm inventory item"
        isOpen={confirmOpen}
        onClose={closeConfirm}
        footer={
          <>
            <button
              type="button"
              className="secondary-action"
              onClick={closeConfirm}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAdd}
              disabled={lookupLoading || !confirmName.trim()}
            >
              Add
            </button>
          </>
        }
      >
        <div className="inventory-barcode-confirm">
          {lookupLoading ? (
            <p role="status">Looking up barcode…</p>
          ) : (
            <>
              {confirmNote ? <p>{confirmNote}</p> : null}
              <p className="inventory-barcode-code">
                Barcode: <code>{confirmCode}</code>
                {confirmFound ? null : " (unmatched)"}
              </p>
            </>
          )}

          <label htmlFor="inventory-scan-name">Name</label>
          <input
            id="inventory-scan-name"
            value={confirmName}
            onChange={(event) => setConfirmName(event.target.value)}
            disabled={lookupLoading}
            placeholder="Toy name"
            autoFocus
          />

          <label htmlFor="inventory-scan-category">Category</label>
          <select
            id="inventory-scan-category"
            value={confirmCategory}
            onChange={(event) => setConfirmCategory(event.target.value)}
            disabled={lookupLoading}
          >
            {inventoryCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </Modal>
    </section>
  );
}
