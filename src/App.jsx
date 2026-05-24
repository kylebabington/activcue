// src/App.jsx

import { useState } from "react";
import { getActivitySuggestions } from "./api/activityApi";
import { useLocalStorage } from "./hooks/useLocalStorage";
import "./App.css";

function App() {
  const [appMode, setAppMode] = useLocalStorage("appMode", "parent");

  const [parentStatus, setParentStatus] = useLocalStorage("parentStatus", {
    activity: "Cleaning the kitchen",
    availability: "helper-welcome",
  });

  const [inventory, setInventory] = useLocalStorage("inventory", [
    "LEGO",
    "markers",
    "paper",
    "blankets",
    "stuffed animals",
    "soccer ball",
  ]);

  const [newInventoryItem, setNewInventoryItem] = useState("");

  const [kidMood, setKidMood] = useLocalStorage("kidMood", "creative");
  const [messLevel, setMessLevel] = useLocalStorage("messLevel", "low");
  const [locationPreference, setLocationPreference] = useLocalStorage(
    "locationPreference",
    "indoor"
  );
  const [childAgeRange, setChildAgeRange] = useLocalStorage(
    "childAgeRange",
    "6-9"
  );

  const [activities, setActivities] = useState([]);

  const [activityHistory, setActivityHistory] = useLocalStorage(
    "activityHistory",
    []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function addInventoryItem() {
    const cleanedItem = newInventoryItem.trim();

    if (cleanedItem === "") return;

    const itemAlreadyExists = inventory.some(
      (item) => item.toLowerCase() === cleanedItem.toLowerCase()
    );

    if (itemAlreadyExists) {
      setErrorMessage("That item is already in your inventory.");
      return;
    }

    setInventory([...inventory, cleanedItem]);
    setNewInventoryItem("");
    setErrorMessage("");
  }

  function removeInventoryItem(itemToRemove) {
    setInventory(inventory.filter((item) => item !== itemToRemove));
  }

  async function handleGenerateActivities(customFeedbackContext = "") {
    setIsLoading(true);
    setErrorMessage("");
    setActivities([]);

    try {
      const previousActivityTitles = activityHistory
        .slice(-10)
        .map((historyItem) => historyItem.title);

      const activityRequest = {
        parentActivity: parentStatus.activity,
        parentAvailability: parentStatus.availability,
        inventory,
        kidMood,
        messLevel,
        locationPreference,
        childAgeRange,
        feedbackContext: customFeedbackContext,
        previousActivityTitles,
      };

      const generatedActivities = await getActivitySuggestions(activityRequest);

      setActivities(generatedActivities);
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while generating ideas.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKidQuickChoice(choice) {
    if (choice === "bored") {
      setKidMood("surprise");
      handleGenerateActivities(
        "The child says they are bored. Give 3 very different choices so they feel like they have options."
      );
      return;
    }

    if (choice === "move") {
      setKidMood("active");
      handleGenerateActivities(
        "The child needs to move. Suggest safe active ideas using available inventory."
      );
      return;
    }

    if (choice === "make") {
      setKidMood("creative");
      handleGenerateActivities(
        "The child wants to make something. Suggest creative ideas using available inventory."
      );
      return;
    }

    if (choice === "quiet") {
      setKidMood("calm");
      handleGenerateActivities(
        "The child wants quiet time. Suggest calm, low-noise activities."
      );
      return;
    }

    if (choice === "help") {
      setKidMood("helper");
      handleGenerateActivities(
        "The child wants to help. Suggest useful helper activities connected to the parent's current task if safe."
      );
      return;
    }

    if (choice === "surprise") {
      setKidMood("surprise");
      handleGenerateActivities(
        "Surprise the child with 3 fun, safe, very different activity ideas."
      );
    }
  }

  function saveActivityFeedback(activity, feedbackType) {
    const historyItem = {
      id: crypto.randomUUID(),
      title: activity.title,
      feedbackType,
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange,
    };

    setActivityHistory([...activityHistory, historyItem]);
  }

  function handleStartActivity(activity) {
    saveActivityFeedback(activity, "started");
    setErrorMessage(`Saved: "${activity.title}" was started.`);
  }

  function handleTooMessy(activity) {
    saveActivityFeedback(activity, "too-messy");
    handleGenerateActivities(
      `The activity "${activity.title}" was too messy. Suggest lower-mess alternatives.`
    );
  }

  function handleTooHard(activity) {
    saveActivityFeedback(activity, "too-hard");
    handleGenerateActivities(
      `The activity "${activity.title}" was too hard. Suggest easier alternatives.`
    );
  }

  function handleNeedQuieter(activity) {
    saveActivityFeedback(activity, "need-quieter");
    handleGenerateActivities(
      `The activity "${activity.title}" was too loud or active. Suggest quieter alternatives.`
    );
  }

  function handleMoreLikeThis(activity) {
    saveActivityFeedback(activity, "more-like-this");
    handleGenerateActivities(
      `The family liked "${activity.title}". Suggest more activities with a similar feeling, but do not repeat the same title.`
    );
  }

  function clearActivityHistory() {
    setActivityHistory([]);
    setErrorMessage("Activity history cleared.");
  }

  function resetSavedData() {
    window.localStorage.removeItem("appMode");
    window.localStorage.removeItem("parentStatus");
    window.localStorage.removeItem("inventory");
    window.localStorage.removeItem("kidMood");
    window.localStorage.removeItem("messLevel");
    window.localStorage.removeItem("locationPreference");
    window.localStorage.removeItem("childAgeRange");
    window.localStorage.removeItem("activityHistory");
    window.location.reload();
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Family Activity Helper</p>
        <h1>AI-powered activity ideas using what you already own.</h1>
        <p>
          Parents show what they are doing. Kids choose what kind of activity
          they want. AI suggests simple, safe ideas.
        </p>
      </section>

      <section className="mode-switcher">
        <button
          className={appMode === "parent" ? "active" : ""}
          onClick={() => setAppMode("parent")}
        >
          Parent Setup
        </button>

        <button
          className={appMode === "kid" ? "active" : ""}
          onClick={() => setAppMode("kid")}
        >
          Kid Mode
        </button>
      </section>

      {appMode === "parent" ? (
        <>
          <section className="grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Parent Status</h2>
                  <p>
                    Make adult work visible without needing a full schedule yet.
                  </p>
                </div>
              </div>

              <label>
                What are you doing?
                <input
                  value={parentStatus.activity}
                  onChange={(event) =>
                    setParentStatus({
                      ...parentStatus,
                      activity: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Can kids interrupt?
                <select
                  value={parentStatus.availability}
                  onChange={(event) =>
                    setParentStatus({
                      ...parentStatus,
                      availability: event.target.value,
                    })
                  }
                >
                  <option value="available">Available</option>
                  <option value="ask-first">Ask first</option>
                  <option value="do-not-interrupt">Do not interrupt</option>
                  <option value="helper-welcome">Helper welcome</option>
                </select>
              </label>

              <ParentStatusCard parentStatus={parentStatus} />
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Toy & Supply Inventory</h2>
                  <p>Add things once. The app remembers them after refresh.</p>
                </div>
              </div>

              <div className="add-row">
                <input
                  value={newInventoryItem}
                  onChange={(event) =>
                    setNewInventoryItem(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addInventoryItem();
                  }}
                  placeholder="Example: chalk, blocks, cards"
                />

                <button onClick={addInventoryItem}>Add</button>
              </div>

              <div className="chip-list">
                {inventory.map((item) => (
                  <button
                    key={item}
                    className="chip"
                    onClick={() => removeInventoryItem(item)}
                  >
                    {item} ×
                  </button>
                ))}
              </div>
            </section>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Activity Settings</h2>
                <p>
                  These settings guide the AI when generating activity ideas.
                </p>
              </div>

              <button className="ghost-button" onClick={resetSavedData}>
                Reset saved data
              </button>
            </div>

            <ActivityControls
              kidMood={kidMood}
              setKidMood={setKidMood}
              messLevel={messLevel}
              setMessLevel={setMessLevel}
              locationPreference={locationPreference}
              setLocationPreference={setLocationPreference}
              childAgeRange={childAgeRange}
              setChildAgeRange={setChildAgeRange}
            />

            <button
              className="generate-button"
              onClick={() => handleGenerateActivities()}
              disabled={isLoading}
            >
              {isLoading ? "Generating ideas..." : "Generate 3 Activity Ideas"}
            </button>
          </section>
        </>
      ) : (
        <section className="kid-mode">
          <section className="panel kid-status-panel">
            <h2>What is the adult doing?</h2>
            <ParentStatusCard parentStatus={parentStatus} />
          </section>

          <section className="panel">
            <h2>What do you want to do?</h2>
            <p className="kid-helper-text">
              Pick one. The app will give you three ideas.
            </p>

            <div className="kid-choice-grid">
              <button onClick={() => handleKidQuickChoice("bored")}>
                I’m bored
              </button>

              <button onClick={() => handleKidQuickChoice("move")}>
                I need to move
              </button>

              <button onClick={() => handleKidQuickChoice("make")}>
                I want to make something
              </button>

              <button onClick={() => handleKidQuickChoice("quiet")}>
                I want quiet time
              </button>

              <button onClick={() => handleKidQuickChoice("help")}>
                I want to help
              </button>

              <button onClick={() => handleKidQuickChoice("surprise")}>
                Surprise me
              </button>
            </div>
          </section>
        </section>
      )}

      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <ActivityResults
        activities={activities}
        isLoading={isLoading}
        handleStartActivity={handleStartActivity}
        handleTooMessy={handleTooMessy}
        handleTooHard={handleTooHard}
        handleNeedQuieter={handleNeedQuieter}
        handleMoreLikeThis={handleMoreLikeThis}
      />

      <section className="panel history-panel">
        <div className="panel-header">
          <div>
            <h2>Activity History</h2>
            <p>
              This is the start of personalization. For now, it remembers what
              happened in this browser.
            </p>
          </div>

          <button className="ghost-button" onClick={clearActivityHistory}>
            Clear history
          </button>
        </div>

        {activityHistory.length === 0 ? (
          <p className="empty-text">No activity feedback saved yet.</p>
        ) : (
          <div className="history-list">
            {activityHistory
              .slice()
              .reverse()
              .slice(0, 8)
              .map((historyItem) => (
                <div key={historyItem.id} className="history-item">
                  <strong>{historyItem.title}</strong>
                  <span>{formatFeedbackLabel(historyItem.feedbackType)}</span>
                </div>
              ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ParentStatusCard({ parentStatus }) {
  return (
    <div className={`status-card ${parentStatus.availability}`}>
      <span>Adult is currently:</span>
      <strong>{parentStatus.activity}</strong>
      <p>{getAvailabilityMessage(parentStatus.availability)}</p>
    </div>
  );
}

function ActivityControls({
  kidMood,
  setKidMood,
  messLevel,
  setMessLevel,
  locationPreference,
  setLocationPreference,
  childAgeRange,
  setChildAgeRange,
}) {
  return (
    <div className="controls-grid">
      <label>
        What kind of activity?
        <select
          value={kidMood}
          onChange={(event) => setKidMood(event.target.value)}
        >
          <option value="creative">Creative</option>
          <option value="active">Active</option>
          <option value="calm">Calm</option>
          <option value="silly">Silly</option>
          <option value="helper">I want to help</option>
          <option value="surprise">Surprise me</option>
        </select>
      </label>

      <label>
        Mess level
        <select
          value={messLevel}
          onChange={(event) => setMessLevel(event.target.value)}
        >
          <option value="low">Low mess</option>
          <option value="medium">Medium mess</option>
          <option value="high">High mess</option>
        </select>
      </label>

      <label>
        Location
        <select
          value={locationPreference}
          onChange={(event) => setLocationPreference(event.target.value)}
        >
          <option value="indoor">Indoor</option>
          <option value="outdoor">Outdoor</option>
          <option value="either">Either</option>
        </select>
      </label>

      <label>
        Age range
        <select
          value={childAgeRange}
          onChange={(event) => setChildAgeRange(event.target.value)}
        >
          <option value="3-5">3-5</option>
          <option value="6-9">6-9</option>
          <option value="10-12">10-12</option>
          <option value="13+">13+</option>
        </select>
      </label>
    </div>
  );
}

function ActivityResults({
  activities,
  isLoading,
  handleStartActivity,
  handleTooMessy,
  handleTooHard,
  handleNeedQuieter,
  handleMoreLikeThis,
}) {
  if (isLoading) {
    return (
      <section className="panel loading-panel">
        <h2>Thinking up ideas...</h2>
        <p>Finding something that fits your home, supplies, and parent status.</p>
      </section>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <section className="panel results-panel">
      <h2>Activity Ideas</h2>

      <div className="activity-grid">
        {activities.map((activity) => (
          <article key={activity.title} className="activity-card">
            <h3>{activity.title}</h3>
            <p>{activity.summary}</p>

            <h4>Steps</h4>
            <ol>
              {activity.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>

            <div className="activity-meta">
              <span>Energy: {activity.energy}</span>
              <span>Mess: {activity.mess}</span>
              <span>Adult help: {activity.adultHelp}</span>
            </div>

            <p className="why-it-fits">{activity.whyItFits}</p>

            {activity.uses.length > 0 && (
              <p className="uses-list">Uses: {activity.uses.join(", ")}</p>
            )}

            <div className="feedback-buttons">
              <button onClick={() => handleStartActivity(activity)}>
                Start this
              </button>

              <button onClick={() => handleTooMessy(activity)}>Too messy</button>

              <button onClick={() => handleTooHard(activity)}>Too hard</button>

              <button onClick={() => handleNeedQuieter(activity)}>
                Need quieter
              </button>

              <button onClick={() => handleMoreLikeThis(activity)}>
                More like this
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function getAvailabilityMessage(availability) {
  if (availability === "available") return "You can ask for help.";
  if (availability === "ask-first") return "Please ask before interrupting.";
  if (availability === "do-not-interrupt") {
    return "Try one activity before interrupting.";
  }
  if (availability === "helper-welcome") return "You can ask how to help.";

  return "Check before interrupting.";
}

function formatFeedbackLabel(feedbackType) {
  if (feedbackType === "started") return "Started";
  if (feedbackType === "too-messy") return "Too messy";
  if (feedbackType === "too-hard") return "Too hard";
  if (feedbackType === "need-quieter") return "Needed quieter";
  if (feedbackType === "more-like-this") return "More like this";

  return feedbackType;
}

export default App;