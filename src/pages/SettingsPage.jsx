// src/pages/SettingsPage.jsx

import SavedActivitiesPanel from "../components/SavedActivitiesPanel";
import ActivityHistoryPanel from "../components/ActivityHistoryPanel";

// This page holds the parent setup details that should not clutter the Now Setup page.
// Inventory, safety, child profiles, saved activities, and history all live here.

function SettingsPage({
    safetySettings,
    toggleSafetySetting,
    updateSafetySetting,
    inventoryCategories,
    normalizedInventory,
    newInventoryItem,
    setNewInventoryItem,
    newInventoryCategory,
    setNewInventoryCategory,
    addInventoryItem,
    removeInventoryItem,
    childProfiles,
    activeChildId,
    setActiveChildId,
    newChildName,
    setNewChildName,
    newChildAgeRange,
    setNewChildAgeRange,
    newChildInterests,
    setNewChildInterests,
    newChildNeeds,
    setNewChildNeeds,
    addChildProfile,
    deleteChildProfile,
    parentPin,
    ParentPinForm,
    saveParentPin,
    savedActivities,
    handleStartActivity,
    removeSavedActivity,
    activityHistory,
    clearActivityHistory,
    formatFeedbackLabel,
    resetSavedData,
}) {
    return (
        <section className="page-layout">
            <section className="hero-card">
                <p className="eyebrow">Parent Settings</p>

                <h1>Set up the family helper.</h1>

                <p>
                    Manage supplies, safety rules, child profiles, saved activities, and
                    history.
                </p>
            </section>

            <section className="panel safety-panel">
                <div className="panel-header">
                    <div>
                        <h2>Safety Settings</h2>
                        <p>
                            These rules tell the AI what not to suggest.
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
                        <h2>Toy & Supply Inventory</h2>
                        <p>Add things once. The app remembers them after refresh.</p>
                    </div>
                </div>

                <div className="inventory-add-grid">
                    <input
                        value={newInventoryItem}
                        onChange={(event) => setNewInventoryItem(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") addInventoryItem();
                        }}
                        placeholder="Example: chalk, blocks, cards"
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

                    <button onClick={addInventoryItem}>Add</button>
                </div>

                <div className="categorized-inventory-list">
                    {inventoryCategories.map((category) => {
                        const itemsInCategory = normalizedInventory.filter(
                            (item) => item.category === category
                        );

                        if (itemsInCategory.length === 0) {
                            return null;
                        }

                        return (
                            <section key={category} className="inventory-category-group">
                                <h3>{category}</h3>

                                <div className="chip-list">
                                    {itemsInCategory.map((item) => (
                                        <button
                                            key={item.id}
                                            className="chip"
                                            onClick={() => removeInventoryItem(item.id)}
                                        >
                                            {item.name} ×
                                        </button>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
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

                    <button type="button" onClick={addChildProfile}>
                        Add child profile
                    </button>
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

            <section className="panel pin-settings-panel">
                <div className="panel-header">
                    <div>
                        <h2>Parent PIN</h2>
                        <p>
                            This locks Parent Setup from Kid Mode. MVP-level protection, not
                            real account security.
                        </p>
                    </div>
                </div>

                <ParentPinForm parentPin={parentPin} saveParentPin={saveParentPin} />
            </section>

            <SavedActivitiesPanel
                savedActivities={savedActivities}
                handleStartActivity={handleStartActivity}
                removeSavedActivity={removeSavedActivity}
            />

            <ActivityHistoryPanel
                activityHistory={activityHistory}
                clearActivityHistory={clearActivityHistory}
                formatFeedbackLabel={formatFeedbackLabel}
            />

            <section className="panel">
                <h2>Danger zone</h2>

                <p>
                    Reset local saved data if you want to start this browser over.
                </p>

                <button className="ghost-button" onClick={resetSavedData}>
                    Reset saved data
                </button>
            </section>
        </section>
    );
}

export default SettingsPage;