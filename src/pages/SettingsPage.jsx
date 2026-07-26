// src/pages/SettingsPage.jsx

import { useState } from "react";
import SavedActivitiesPanel from "../components/SavedActivitiesPanel";
import ActivityHistoryPanel from "../components/ActivityHistoryPanel";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { useAppContext } from "../context/AppContext";

function SettingsPage() {
  const {
    safetySettings,
    toggleSafetySetting,
    updateSafetySetting,
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
    childProfiles,
    activeChildId,
    setActiveChildId,
    activityMode,
    setActivityMode,
    newChildName,
    setNewChildName,
    newChildAgeRange,
    setNewChildAgeRange,
    newChildInterests,
    setNewChildInterests,
    newChildNeeds,
    setNewChildNeeds,
    editingChildId,
    startEditingChildProfile,
    cancelEditingChildProfile,
    addChildProfile,
    deleteChildProfile,
    parentPin,
    ParentPinForm,
    saveParentPin,
    savedActivities,
    handleReplaySavedActivity,
    removeSavedActivity,
    activityHistory,
    clearActivityHistory,
    formatFeedbackLabel,
    resetSavedData,
    uiTheme,
    setUiTheme,
    uiThemes,
  } = useAppContext();

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
    <section className="page-layout page-layout--parent">
      <section className="settings-cluster">
        <h2 className="settings-cluster-title">Family setup</h2>

        <div className="content-grid-2">
          <section className="panel safety-panel">
            <div className="panel-header">
              <div>
                <h2>Safety Settings</h2>
                <p>These rules tell the AI what not to suggest.</p>
                <p className="settings-note">
                  Current moment can tighten time and quiet while it is active.
                </p>
              </div>
            </div>

            <div className="safety-toggle-grid">
              <button
                type="button"
                className={safetySettings.screenFreeOnly ? "enabled" : ""}
                onClick={() => toggleSafetySetting("screenFreeOnly")}
              >
                <span>Screen-free only</span>
                <small>
                  {safetySettings.screenFreeOnly
                    ? "AI avoids screens"
                    : "Screens may be suggested"}
                </small>
              </button>

              <button
                type="button"
                className={safetySettings.noFoodActivities ? "enabled" : ""}
                onClick={() => toggleSafetySetting("noFoodActivities")}
              >
                <span>No food activities</span>
                <small>
                  {safetySettings.noFoodActivities
                    ? "AI avoids food"
                    : "Food may be suggested"}
                </small>
              </button>

              <button
                type="button"
                className={safetySettings.noWaterPlay ? "enabled" : ""}
                onClick={() => toggleSafetySetting("noWaterPlay")}
              >
                <span>No water play</span>
                <small>
                  {safetySettings.noWaterPlay
                    ? "AI avoids water play"
                    : "Water play may be suggested"}
                </small>
              </button>

              <button
                type="button"
                className={safetySettings.noSmallObjects ? "enabled" : ""}
                onClick={() => toggleSafetySetting("noSmallObjects")}
              >
                <span>No small objects</span>
                <small>
                  {safetySettings.noSmallObjects
                    ? "AI avoids choking-sized items"
                    : "Small items may be suggested"}
                </small>
              </button>

              <button
                type="button"
                className={safetySettings.quietMode ? "enabled" : ""}
                onClick={() => toggleSafetySetting("quietMode")}
              >
                <span>Quiet mode</span>
                <small>
                  {safetySettings.quietMode
                    ? "AI suggests quiet ideas"
                    : "Normal noise allowed"}
                </small>
              </button>
            </div>

            <div className="safety-controls-grid">
              <label>
                Max activity time
                <select
                  value={safetySettings.maxActivityMinutes}
                  onChange={(event) =>
                    updateSafetySetting(
                      "maxActivityMinutes",
                      Number(event.target.value)
                    )
                  }
                >
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </label>

              <label>
                Adult help allowed?
                <select
                  value={safetySettings.adultHelpAllowed}
                  onChange={(event) =>
                    updateSafetySetting("adultHelpAllowed", event.target.value)
                  }
                >
                  <option value="none">No adult help</option>
                  <option value="optional">Optional adult help</option>
                  <option value="needed">Adult help is okay</option>
                </select>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Who is playing?</h2>
                <p>Choose one child or family mode for shared activities.</p>
              </div>
            </div>

            <div className="activity-mode-toggle">
              <button
                type="button"
                className={activityMode === "single-child" ? "enabled" : ""}
                onClick={() => setActivityMode("single-child")}
              >
                <span>One child</span>
                <small>Uses the active child profile</small>
              </button>

              <button
                type="button"
                className={activityMode === "family" ? "enabled" : ""}
                onClick={() => setActivityMode("family")}
              >
                <span>Family / siblings</span>
                <small>Ideas for everyone together</small>
              </button>
            </div>
          </section>
        </div>

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

        <section className="panel child-profile-panel">
          <div className="panel-header">
            <div>
              <h2>Child Profiles</h2>
              <p>
                Add basic details so AI suggestions can fit each child instead of
                treating everyone the same.
              </p>
            </div>
          </div>

          <div className="child-profile-form">
            <label>
              Child name
              <input
                value={newChildName}
                onChange={(event) => setNewChildName(event.target.value)}
                placeholder="Example: Mia"
              />
            </label>

            <label>
              Age range
              <select
                value={newChildAgeRange}
                onChange={(event) => setNewChildAgeRange(event.target.value)}
              >
                <option value="3-5">3-5</option>
                <option value="6-9">6-9</option>
                <option value="10-12">10-12</option>
                <option value="13+">13+</option>
              </select>
            </label>

            <label>
              Interests
              <input
                value={newChildInterests}
                onChange={(event) => setNewChildInterests(event.target.value)}
                placeholder="Example: animals, LEGO, drawing"
              />
            </label>

            <label>
              Helpful notes
              <input
                value={newChildNeeds}
                onChange={(event) => setNewChildNeeds(event.target.value)}
                placeholder="Example: gets overwhelmed by loud games"
              />
            </label>

            <div className="child-profile-form-actions">
              <button type="button" onClick={addChildProfile}>
                {editingChildId ? "Save profile" : "Add child profile"}
              </button>

              {editingChildId && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={cancelEditingChildProfile}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </div>

          {childProfiles.length === 0 ? (
            <p className="empty-text">No child profiles yet.</p>
          ) : (
            <div className="child-profile-list">
              {childProfiles.map((child) => (
                <article
                  key={child.id}
                  className={
                    activeChildId === child.id
                      ? "child-profile-card active"
                      : "child-profile-card"
                  }
                >
                  <div>
                    <h3>{child.name}</h3>
                    <p>Age: {child.ageRange}</p>

                    {child.interests && <p>Interests: {child.interests}</p>}
                    {child.needs && <p>Notes: {child.needs}</p>}
                  </div>

                  <div className="child-profile-actions">
                    <button
                      type="button"
                      onClick={() => setActiveChildId(child.id)}
                    >
                      Use profile
                    </button>

                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => startEditingChildProfile(child)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => deleteChildProfile(child.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="settings-cluster">
        <h2 className="settings-cluster-title">Saved & history</h2>

        <SavedActivitiesPanel
          savedActivities={savedActivities}
          handleReplaySavedActivity={handleReplaySavedActivity}
          removeSavedActivity={removeSavedActivity}
        />

        <ActivityHistoryPanel
          activityHistory={activityHistory}
          clearActivityHistory={clearActivityHistory}
          formatFeedbackLabel={formatFeedbackLabel}
        />
      </section>

      <section className="settings-cluster">
        <h2 className="settings-cluster-title">Account</h2>

        <section className="panel theme-settings-panel">
          <div className="panel-header">
            <div>
              <h2>Look & feel</h2>
              <p>
                Switch themes anytime. Compare Playroom, Workshop, and Storybook
                to find what fits your family.
              </p>
            </div>
          </div>

          <ThemeSwitcher
            theme={uiTheme}
            onChange={setUiTheme}
            themes={uiThemes}
          />
        </section>

        <section className="panel pin-settings-panel">
          <div className="panel-header">
            <div>
              <h2>Parent PIN</h2>
              <p>
                When set, Parent and Settings stay locked until unlocked for this
                session. MVP-level protection, not real account security.
              </p>
            </div>
          </div>

          <ParentPinForm parentPin={parentPin} saveParentPin={saveParentPin} />
        </section>

        <section className="panel">
          <h2>Danger zone</h2>

          <p>Reset local saved data if you want to start this browser over.</p>

          <button className="ghost-button" onClick={resetSavedData}>
            Reset saved data
          </button>
        </section>
      </section>
    </section>
  );
}

export default SettingsPage;
