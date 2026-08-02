// src/pages/settings/SettingsInventoryTab.jsx

import { useState } from "react";

export default function SettingsInventoryTab({
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
    <div
      className="settings-tab-panel"
      role="tabpanel"
      id="settings-panel-inventory"
      aria-labelledby="settings-tab-inventory"
    >
      <section className="panel inventory-panel">
        <div className="panel-header">
          <div>
            <h2>Toy & Supply Inventory</h2>
            <p>
              Tap what you have at home. No typing needed — pick from common
              toys, craft supplies, and play items.
            </p>
          </div>
        </div>

        <div className="inventory-filter-row">
          <input
            value={inventorySearch}
            onChange={(event) => setInventorySearch(event.target.value)}
            placeholder="Search supplies"
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
          <summary>Add something not listed</summary>

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
              onChange={(event) =>
                setNewInventoryCategory(event.target.value)
              }
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
    </div>
  );
}
