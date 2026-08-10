// src/pages/settings/SettingsWhatWeHaveSection.jsx

import { useState } from "react";
import { BRAND } from "../../config/brand.js";

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
  removeInventoryItem,
  assumeHouseholdBasics,
  setAssumeHouseholdBasics,
  selectedCount = 0,
}) {
  const [inventorySearch, setInventorySearch] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
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
    </section>
  );
}
