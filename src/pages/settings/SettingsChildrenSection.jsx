// src/pages/settings/SettingsChildrenSection.jsx

import { BRAND } from "../../config/brand.js";
import { calculateAge, resolveChildAge } from "../../utils/childAge";

function interestChips(interests) {
  if (Array.isArray(interests)) {
    return interests.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof interests === "string" && interests.trim()) {
    return interests
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function avoidChips(avoids) {
  if (Array.isArray(avoids)) {
    return avoids.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof avoids === "string" && avoids.trim()) {
    return avoids
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function formatIndependenceLabel(level) {
  switch (level) {
    case "needs-help":
      return "Needs help getting started";
    case "very-independent":
      return "Very independent";
    case "usually-independent":
    default:
      return "Usually starts independently";
  }
}

export default function SettingsChildrenSection({
  childProfiles,
  activeChildId,
  setActiveChildId,
  newChildName,
  setNewChildName,
  newChildAgeRange,
  setNewChildAgeRange,
  newChildBirthDate,
  setNewChildBirthDate,
  newChildAgeYears,
  setNewChildAgeYears,
  agePreviewYears,
  newChildInterests,
  setNewChildInterests,
  newChildNeeds,
  setNewChildNeeds,
  newChildAvoids,
  setNewChildAvoids,
  newChildIndependenceLevel,
  setNewChildIndependenceLevel,
  editingChildId,
  showChildForm,
  beginAddingChildProfile,
  startEditingChildProfile,
  cancelEditingChildProfile,
  addChildProfile,
  deleteChildProfile,
}) {
  const formVisible = showChildForm || Boolean(editingChildId);

  return (
    <section className="panel child-profile-panel">
      <div className="panel-header">
        <div>
          <h2>Your children</h2>
          <p>
            Profiles help {BRAND.name} suggest age-appropriate activities for each
            child.
          </p>
        </div>
      </div>

      {childProfiles.length === 0 && !formVisible ? (
        <p className="empty-text">No child profiles yet.</p>
      ) : null}

      {childProfiles.length > 0 ? (
        <div className="child-profile-list child-profile-list--cards">
          {childProfiles.map((child) => {
            const resolved = resolveChildAge(child);
            const interests = interestChips(child.interests);
            const avoids = avoidChips(child.avoids);
            const isActive = activeChildId === child.id;

            return (
              <article
                key={child.id}
                className={
                  isActive
                    ? "child-profile-card active"
                    : "child-profile-card"
                }
              >
                <div>
                  <h3>{child.name}</h3>
                  <p>
                    Age {resolved.ageYears}
                    {!child.birthDate && newChildAgeYears === ""
                      ? ` · ${child.ageRange || "range"}`
                      : ""}
                  </p>
                  {interests.length > 0 ? (
                    <div className="chip-list child-interest-chips">
                      {interests.map((interest) => (
                        <span key={interest} className="chip chip--static">
                          {interest}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {avoids.length > 0 ? (
                    <p className="child-avoids-line">
                      Usually avoids: {avoids.join(" · ")}
                    </p>
                  ) : null}
                  <p className="child-independence-line">
                    {formatIndependenceLabel(child.independenceLevel)}
                  </p>
                  {isActive ? (
                    <p className="child-active-badge" role="status">
                      Active profile
                    </p>
                  ) : null}
                </div>

                <div className="child-profile-actions">
                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => setActiveChildId(child.id)}
                    >
                      Use
                    </button>
                  ) : null}
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
            );
          })}
        </div>
      ) : null}

      {!formVisible ? (
        <button
          type="button"
          className="secondary-action"
          onClick={beginAddingChildProfile}
        >
          + Add child
        </button>
      ) : (
        <div
          className={
            editingChildId
              ? "child-profile-form child-profile-form--editing"
              : "child-profile-form"
          }
          id="child-profile-form"
        >
          {editingChildId ? (
            <p className="child-age-prompt" role="status">
              Editing profile — update the fields below, then save.
            </p>
          ) : (
            <p className="child-age-prompt" role="status">
              Add a child profile.
            </p>
          )}

          <label>
            Child name
            <input
              id="child-profile-name-input"
              value={newChildName}
              onChange={(event) => setNewChildName(event.target.value)}
              placeholder="Example: Mia"
            />
          </label>

          <label>
            Birthday
            <input
              type="date"
              value={newChildBirthDate}
              onChange={(event) => {
                const next = event.target.value;
                setNewChildBirthDate(next);
                if (next) {
                  const age = calculateAge(next);
                  if (Number.isFinite(age)) {
                    setNewChildAgeYears(String(age));
                    setNewChildAgeRange(
                      age <= 5
                        ? "3-5"
                        : age <= 9
                          ? "6-9"
                          : age <= 12
                            ? "10-12"
                            : "13+"
                    );
                  }
                }
              }}
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>

          <label>
            Or exact current age
            <input
              type="number"
              min={0}
              max={25}
              inputMode="numeric"
              value={newChildAgeYears}
              onChange={(event) => {
                const next = event.target.value;
                setNewChildAgeYears(next);
                if (next !== "" && newChildBirthDate) {
                  const fromBirthday = calculateAge(newChildBirthDate);
                  const typed = Math.floor(Number(next));
                  if (
                    Number.isFinite(fromBirthday) &&
                    Number.isFinite(typed) &&
                    fromBirthday !== typed
                  ) {
                    setNewChildBirthDate("");
                  }
                }
                const typed = Math.floor(Number(next));
                if (Number.isFinite(typed) && typed >= 0 && typed <= 25) {
                  setNewChildAgeRange(
                    typed <= 5
                      ? "3-5"
                      : typed <= 9
                        ? "6-9"
                        : typed <= 12
                          ? "10-12"
                          : "13+"
                  );
                }
              }}
              placeholder="Example: 14"
            />
          </label>

          <label>
            Age range fallback
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

          {agePreviewYears != null ? (
            <p className="child-age-preview" role="status">
              Current age used for suggestions: {agePreviewYears}
            </p>
          ) : (
            <p className="child-age-prompt" role="status">
              Add a birthday or exact age when you can. Age range is only a
              temporary fallback.
            </p>
          )}

          <label>
            Interests
            <input
              value={newChildInterests}
              onChange={(event) => setNewChildInterests(event.target.value)}
              placeholder="Example: animals, LEGO, drawing"
            />
          </label>

          <label>
            Usually avoids
            <input
              value={newChildAvoids}
              onChange={(event) => setNewChildAvoids(event.target.value)}
              placeholder="Example: pretend play, competitive games"
            />
          </label>

          <label>
            Comfort starting activities alone
            <select
              value={newChildIndependenceLevel}
              onChange={(event) =>
                setNewChildIndependenceLevel(event.target.value)
              }
            >
              <option value="needs-help">Needs help getting started</option>
              <option value="usually-independent">
                Usually starts independently
              </option>
              <option value="very-independent">Very independent</option>
            </select>
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
              {editingChildId ? "Save profile" : "Add child"}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={cancelEditingChildProfile}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
