// src/App.jsx

import { useEffect, useState } from "react";
import { getActivitySuggestions } from "./api/activityApi";
import { useLocalStorage } from "./hooks/useLocalStorage";
import "./App.css";

const defaultParentStatusPresets = [
  {
    label: "Cooking",
    activity: "Cooking",
    availability: "helper-welcome",
  },
  {
    label: "Cleaning",
    activity: "Cleaning",
    availability: "helper-welcome",
  },
  {
    label: "Work call",
    activity: "On a work call",
    availability: "do-not-interrupt",
  },
  {
    label: "Paying bills",
    activity: "Paying bills",
    availability: "ask-first",
  },
  {
    label: "Resting",
    activity: "Resting",
    availability: "do-not-interrupt",
  },
  {
    label: "Yard work",
    activity: "Doing yard work",
    availability: "helper-welcome",
  },
  {
    label: "Errands",
    activity: "Handling errands",
    availability: "ask-first",
  },
  {
    label: "Helping sibling",
    activity: "Helping someone else",
    availability: "ask-first",
  },
];

const inventoryCategories = [
  "Building toys",
  "Art supplies",
  "Outdoor gear",
  "Pretend play",
  "Books",
  "Board games",
  "Household-safe items",
  "STEM / experiments",
  "Quiet activities",
  "Other",
];

const activitySpaceOptions = [
  "Living room",
  "Bedroom",
  "Kitchen table",
  "Backyard",
  "Front yard",
  "Garage",
  "Basement",
  "Car ride",
  "Waiting room",
  "Custom",
];

function App() {
  const [appMode, setAppMode] = useLocalStorage("appMode", "parent");

  // This is the parent PIN.
  // For MVP, we save it in localStorage.
  // Later, real accounts should move this server-side.
  const [parentPin, setParentPin] = useLocalStorage("parentPin", "");

  // This stores what the user types into the PIN fields.
  const [pinInput, setPinInput] = useState("");

  // This controls whether the PIN box is currently shown.
  const [showPinGate, setShowPinGate] = useState(false);

  const [parentStatus, setParentStatus] = useLocalStorage("parentStatus", {
    activity: "Cleaning the kitchen",
    availability: "helper-welcome",
  });

  const [customParentPresets, setCustomParentPresets] = useLocalStorage(
    "customParentPresets",
    []
  );

  const [newPresetLabel, setNewPresetLabel] = useState("");
  const [newPresetActivity, setNewPresetActivity] = useState("");
  const [newPresetAvailability, setNewPresetAvailability] =
    useState("ask-first");

  const [inventory, setInventory] = useLocalStorage("inventory", [
    {
      id: crypto.randomUUID(),
      name: "LEGO",
      category: "Building toys",
    },
    {
      id: crypto.randomUUID(),
      name: "markers",
      category: "Art supplies",
    },
    {
      id: crypto.randomUUID(),
      name: "paper",
      category: "Art supplies",
    },
    {
      id: crypto.randomUUID(),
      name: "blankets",
      category: "Household-safe items",
    },
    {
      id: crypto.randomUUID(),
      name: "stuffed animals",
      category: "Pretend play",
    },
    {
      id: crypto.randomUUID(),
      name: "soccer ball",
      category: "Outdoor gear",
    },
  ]);

  const [newInventoryItem, setNewInventoryItem] = useState("");

  const [newInventoryCategory, setNewInventoryCategory] =
    useState("Building toys");

  const [activityMode, setActivityMode] = useLocalStorage(
    "activityMode",
    "single-child"
  );

  const [kidMood, setKidMood] = useLocalStorage("kidMood", "creative");
  const [messLevel, setMessLevel] = useLocalStorage("messLevel", "low");
  const [locationPreference, setLocationPreference] = useLocalStorage(
    "locationPreference",
    "indoor"
  );

  const [activitySpace, setActivitySpace] = useLocalStorage(
    "activitySpace",
    "Living room"
  );

  const [customActivitySpace, setCustomActivitySpace] = useLocalStorage(
    "customActivitySpace",
    ""
  );
  const [childAgeRange, setChildAgeRange] = useLocalStorage(
    "childAgeRange",
    "6-9"
  );

  const [childProfiles, setChildProfiles] = useLocalStorage("childProfiles", []);

  const [activeChildId, setActiveChildId] = useLocalStorage(
    "activeChildId",
    ""
  );

  const [newChildName, setNewChildName] = useState("");
  const [newChildAgeRange, setNewChildAgeRange] = useState("6-9");
  const [newChildInterests, setNewChildInterests] = useState("");
  const [newChildNeeds, setNewChildNeeds] = useState("");

  const [safetySettings, setSafetySettings] = useLocalStorage("safetySettings", {
    screenFreeOnly: true,
    noFoodActivities: false,
    noWaterPlay: true,
    noSmallObjects: true,
    quietMode: false,
    maxActivityMinutes: 30,
    adultHelpAllowed: "optional",
  });

  const [activities, setActivities] = useState([]);

  const [activeActivity, setActiveActivity] = useLocalStorage(
    "activeActivity",
    null
  );

  const timerSecondsRemaining = useActivityTimer(activeActivity);

  const [savedActivities, setSavedActivities] = useLocalStorage(
    "savedActivities",
    []
  );

  const [activityHistory, setActivityHistory] = useLocalStorage(
    "activityHistory",
    []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const activeActivitySpace =
    activitySpace === "Custom" && customActivitySpace.trim() !== ""
      ? customActivitySpace.trim()
      : activitySpace;

  const activeChildProfile =
    childProfiles.find((child) => child.id === activeChildId) || null;

  const effectiveChildAgeRange = activeChildProfile
    ? activeChildProfile.ageRange
    : childAgeRange;

  const selectedChildProfiles =
    activityMode === "family"
      ? childProfiles
      : activeChildProfile
        ? [activeChildProfile]
        : [];

  useEffect(() => {
    if (!activeActivity?.id) {
      return;
    }



    document
      .getElementById("active-activity-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeActivity?.id]);

  function applyParentStatusPreset(preset) {
    setParentStatus({
      activity: preset.activity,
      availability: preset.availability,
    });

    setErrorMessage(`Parent status set to "${preset.label}".`);
  }

  function addCustomParentPreset() {
    const cleanedLabel = newPresetLabel.trim();
    const cleanedActivity = newPresetActivity.trim();

    if (cleanedLabel === "" || cleanedActivity === "") {
      setErrorMessage("Preset name and activity are required.");
      return;
    }

    const duplicateDefaultPreset = defaultParentStatusPresets.some(
      (preset) => preset.label.toLowerCase() === cleanedLabel.toLowerCase()
    );

    const duplicateCustomPreset = customParentPresets.some(
      (preset) => preset.label.toLowerCase() === cleanedLabel.toLowerCase()
    );

    if (duplicateDefaultPreset || duplicateCustomPreset) {
      setErrorMessage("A preset with that name already exists.");
      return;
    }

    const newPreset = {
      id: crypto.randomUUID(),
      label: cleanedLabel,
      activity: cleanedActivity,
      availability: newPresetAvailability,
    };

    setCustomParentPresets([...customParentPresets, newPreset]);

    setNewPresetLabel("");
    setNewPresetActivity("");
    setNewPresetAvailability("ask-first");

    setErrorMessage(`Custom preset "${cleanedLabel}" saved.`);
  }

  function deleteCustomParentPreset(presetId) {
    setCustomParentPresets(
      customParentPresets.filter((preset) => preset.id !== presetId)
    );

    setErrorMessage("Custom preset deleted.");
  }

  function updateSafetySetting(settingName, newValue) {
    setSafetySettings({
      ...safetySettings,
      [settingName]: newValue,
    });
  }

  function toggleSafetySetting(settingName) {
    setSafetySettings({
      ...safetySettings,
      [settingName]: !safetySettings[settingName],
    });
  }

  function addChildProfile() {
    const cleanedName = newChildName.trim();
    const cleanedInterests = newChildInterests.trim();
    const cleanedNeeds = newChildNeeds.trim();

    if (cleanedName === "") {
      setErrorMessage("Child name is required.");
      return;
    }

    const duplicateChild = childProfiles.some(
      (child) => child.name.toLowerCase() === cleanedName.toLowerCase()
    );

    if (duplicateChild) {
      setErrorMessage("A child with that name already exists.");
      return;
    }

    const childToAdd = {
      id: crypto.randomUUID(),
      name: cleanedName,
      ageRange: newChildAgeRange,
      interests: cleanedInterests,
      needs: cleanedNeeds,
      createdAt: new Date().toISOString(),
    };

    const updatedChildren = [...childProfiles, childToAdd];

    setChildProfiles(updatedChildren);
    setActiveChildId(childToAdd.id);

    setNewChildName("");
    setNewChildAgeRange("6-9");
    setNewChildInterests("");
    setNewChildNeeds("");

    setErrorMessage(`Added child profile for ${cleanedName}.`);
  }

  function deleteChildProfile(childIdToDelete) {
    const childToDelete = childProfiles.find(
      (child) => child.id === childIdToDelete
    );

    setChildProfiles(
      childProfiles.filter((child) => child.id !== childIdToDelete)
    );

    if (activeChildId === childIdToDelete) {
      setActiveChildId("");
    }

    setErrorMessage(
      childToDelete
        ? `Deleted child profile for ${childToDelete.name}.`
        : "Child profile deleted."
    );
  }

  function normalizeInventoryItems(items) {
    return items.map((item) => {
      if (typeof item === "string") {
        return {
          id: crypto.randomUUID(),
          name: item,
          category: "Other",
        };
      }

      return {
        id: item.id || crypto.randomUUID(),
        name: item.name || "Unnamed item",
        category: item.category || "Other",
      };
    });
  }

  const normalizedInventory = normalizeInventoryItems(inventory);

  function addChildProfile() {
    const cleanedName = newChildName.trim();
    const cleanedInterests = newChildInterests.trim();
    const cleanedNeeds = newChildNeeds.trim();

    if (cleanedName === "") {
      setErrorMessage("Child name is required.");
      return;
    }

    const duplicateChild = childProfiles.some(
      (child) => child.name.toLowerCase() === cleanedName.toLowerCase()
    );

    if (duplicateChild) {
      setErrorMessage("A child with that name already exists.");
      return;
    }

    const childToAdd = {
      id: crypto.randomUUID(),
      name: cleanedName,
      ageRange: newChildAgeRange,
      interests: cleanedInterests,
      needs: cleanedNeeds,
      createdAt: new Date().toISOString(),
    };

    const updatedChildren = [...childProfiles, childToAdd];

    setChildProfiles(updatedChildren);
    setActiveChildId(childToAdd.id);

    setNewChildName("");
    setNewChildAgeRange("6-9");
    setNewChildInterests("");
    setNewChildNeeds("");

    setErrorMessage(`Added child profile for ${cleanedName}.`);
  }

  function deleteChildProfile(childIdToDelete) {
    const childToDelete = childProfiles.find(
      (child) => child.id === childIdToDelete
    );

    setChildProfiles(
      childProfiles.filter((child) => child.id !== childIdToDelete)
    );

    if (activeChildId === childIdToDelete) {
      setActiveChildId("");
    }

    setErrorMessage(
      childToDelete
        ? `Deleted child profile for ${childToDelete.name}.`
        : "Child profile deleted."
    );
  }

  function addInventoryItem() {
    const cleanedItem = newInventoryItem.trim();

    if (cleanedItem === "") {
      return;
    }

    const itemAlreadyExists = normalizedInventory.some(
      (item) => item.name.toLowerCase() === cleanedItem.toLowerCase()
    );

    if (itemAlreadyExists) {
      setErrorMessage("That item is already in your inventory.");
      return;
    }

    const itemToAdd = {
      id: crypto.randomUUID(),
      name: cleanedItem,
      category: newInventoryCategory,
    };

    setInventory([...normalizedInventory, itemToAdd]);
    setNewInventoryItem("");
    setNewInventoryCategory("Building toys");
    setErrorMessage("");
  }

  function removeInventoryItem(itemIdToRemove) {
    setInventory(
      normalizedInventory.filter((item) => item.id !== itemIdToRemove)
    );
  }

  function switchToKidMode() {
    setAppMode("kid");
    setShowPinGate(false);
    setPinInput("");
    setErrorMessage("");
  }

  function requestParentMode() {
    // If no PIN exists yet, allow parent setup.
    // The parent can create a PIN inside Parent Setup.
    if (parentPin === "") {
      setAppMode("parent");
      setErrorMessage("Create a Parent PIN to lock Parent Setup.");
      return;
    }

    // If a PIN does exist, show the PIN gate.
    setShowPinGate(true);
    setPinInput("");
    setErrorMessage("");
  }

  function unlockParentMode() {
    if (pinInput === parentPin) {
      setAppMode("parent");
      setShowPinGate(false);
      setPinInput("");
      setErrorMessage("");
      return;
    }

    setErrorMessage("Incorrect PIN.");
  }

  function saveParentPin(newPin) {
    const cleanedPin = newPin.trim();

    if (cleanedPin.length < 4) {
      setErrorMessage("PIN must be at least 4 digits.");
      return;
    }

    setParentPin(cleanedPin);
    setErrorMessage("Parent PIN saved.");
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
        activitySpace: activeActivitySpace,
        childAgeRange: effectiveChildAgeRange,
        activityMode,
        activeChildProfile,
        selectedChildProfiles,
        safetySettings,
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
      childAgeRange: effectiveChildAgeRange,
    };

    setActivityHistory([...activityHistory, historyItem]);
  }

  function saveFavoriteActivity(activity) {
    const alreadySaved = savedActivities.some(
      (savedActivity) =>
        savedActivity.title.toLowerCase() === activity.title.toLowerCase()
    );

    if (alreadySaved) {
      setErrorMessage(`"${activity.title}" is already saved.`);
      return;
    }

    const favoriteActivity = {
      id: crypto.randomUUID(),
      title: activity.title,
      summary: activity.summary,
      parentSetup: activity.parentSetup || null,
      kidMission: activity.kidMission || "",
      roles: Array.isArray(activity.roles) ? activity.roles : [],
      extensionIdeas: Array.isArray(activity.extensionIdeas)
        ? activity.extensionIdeas
        : [],
      steps: Array.isArray(activity.steps) ? activity.steps : [],
      uses: Array.isArray(activity.uses) ? activity.uses : [],
      energy: activity.energy || "medium",
      mess: activity.mess || "low",
      adultHelp: activity.adultHelp || "optional",
      whyItFits: activity.whyItFits || "",
      savedAt: new Date().toISOString(),
    };

    setSavedActivities([...savedActivities, favoriteActivity]);
    setErrorMessage(`Saved favorite: "${activity.title}".`);
  }

  function removeSavedActivity(activityId) {
    setSavedActivities(
      savedActivities.filter((activity) => activity.id !== activityId)
    );

    setErrorMessage("Saved activity removed.");
  }

  function handleStartActivity(activity) {
    const durationMinutes = Number(safetySettings.maxActivityMinutes) || 20;

    const activityToStart = {
      id: crypto.randomUUID(),
      title: activity.title,
      theme: activity.theme || "",
      summary: activity.summary,
      kidRole: activity.kidRole || "",
      mission: activity.mission || "",
      starterPrompts: Array.isArray(activity.starterPrompts)
        ? activity.starterPrompts
        : [],
      firstMoves: Array.isArray(activity.firstMoves) ? activity.firstMoves : [],
      roles: Array.isArray(activity.roles) ? activity.roles : [],
      steps: Array.isArray(activity.steps) ? activity.steps : [],
      extensionIdeas: Array.isArray(activity.extensionIdeas)
        ? activity.extensionIdeas
        : [],
      uses: Array.isArray(activity.uses) ? activity.uses : [],
      startedAt: Date.now(),
      durationMinutes,
    };

    setActiveActivity(activityToStart);
    saveActivityFeedback(activity, "started");
    setErrorMessage(`Started: "${activity.title}". Timer is running.`);
  };

  function finishActiveActivity() {
    if (!activeActivity) {
      return;
    }

    const finishedHistoryItem = {
      id: crypto.randomUUID(),
      title: activeActivity.title,
      feedbackType: "finished",
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,
    };

    setActivityHistory([...activityHistory, finishedHistoryItem]);
    setActiveActivity(null);
    setErrorMessage(`Finished: "${activeActivity.title}". Nice work.`);
  }

  function cancelActiveActivity() {
    if (!activeActivity) {
      return;
    }

    const canceledHistoryItem = {
      id: crypto.randomUUID(),
      title: activeActivity.title,
      feedbackType: "canceled",
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,
    };

    setActivityHistory([...activityHistory, canceledHistoryItem]);
    setActiveActivity(null);
    setErrorMessage(`Canceled: "${activeActivity.title}".`);
  }

  function handleTimerNotFinished() {
    if (!activeActivity) {
      return;
    }

    const notFinishedHistoryItem = {
      id: crypto.randomUUID(),
      title: activeActivity.title,
      feedbackType: "not-finished",
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,
    };

    setActivityHistory([...activityHistory, notFinishedHistoryItem]);
    setActiveActivity(null);
    setErrorMessage(
      `"${activeActivity.title}" was marked not finished. We’ll use that to improve suggestions.`
    );
  }

  function handleTimerNeedAnotherIdea() {
    if (!activeActivity) {
      return;
    }

    const previousTitle = activeActivity.title;

    const anotherIdeaHistoryItem = {
      id: crypto.randomUUID(),
      title: previousTitle,
      feedbackType: "need-another-idea",
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,
    };

    setActivityHistory([...activityHistory, anotherIdeaHistoryItem]);
    setActiveActivity(null);

    handleGenerateActivities(
      `The child tried "${previousTitle}" but needs another idea. Suggest 3 different activities that are easier to start and feel fresh.`
    );
  }

  function handleTimerMoreLikeThis() {
    if (!activeActivity) {
      return;
    }

    const previousTitle = activeActivity.title;

    const moreLikeThisHistoryItem = {
      id: crypto.randomUUID(),
      title: previousTitle,
      feedbackType: "timer-more-like-this",
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,
    };

    setActivityHistory([...activityHistory, moreLikeThisHistoryItem]);
    setActiveActivity(null);

    handleGenerateActivities(
      `The child finished or liked "${previousTitle}". Suggest 3 more activities with a similar feeling, but do not repeat it.`
    );
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
    window.localStorage.removeItem("parentPin");
    window.localStorage.removeItem("parentStatus");
    window.localStorage.removeItem("customParentPresets");
    window.localStorage.removeItem("inventory");
    window.localStorage.removeItem("activityMode");
    window.localStorage.removeItem("kidMood");
    window.localStorage.removeItem("messLevel");
    window.localStorage.removeItem("locationPreference");
    window.localStorage.removeItem("activitySpace");
    window.localStorage.removeItem("customActivitySpace");
    window.localStorage.removeItem("childAgeRange");
    window.localStorage.removeItem("childProfiles");
    window.localStorage.removeItem("activeChildId");
    window.localStorage.removeItem("safetySettings");
    window.localStorage.removeItem("activityHistory");
    window.localStorage.removeItem("savedActivities");
    window.localStorage.removeItem("activeActivity");
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
          onClick={requestParentMode}
        >
          Parent Setup
        </button>

        <button
          className={appMode === "kid" ? "active" : ""}
          onClick={switchToKidMode}
        >
          Kid Mode
        </button>
      </section>

      {activeActivity && (
        <ActiveActivityPanel
          activeActivity={activeActivity}
          timerSecondsRemaining={timerSecondsRemaining}
          finishActiveActivity={finishActiveActivity}
          cancelActiveActivity={cancelActiveActivity}
          handleTimerNotFinished={handleTimerNotFinished}
          handleTimerNeedAnotherIdea={handleTimerNeedAnotherIdea}
          handleTimerMoreLikeThis={handleTimerMoreLikeThis}
        />
      )}

      {showPinGate && (
        <section className="panel pin-panel">
          <h2>Enter Parent PIN</h2>
          <p>Parent Setup is locked so kids cannot change the rules.</p>

          <div className="pin-row">
            <input
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  unlockParentMode();
                }
              }}
              placeholder="Enter PIN"
            />

            <button onClick={unlockParentMode}>Unlock</button>

            <button
              className="ghost-button"
              onClick={() => {
                setShowPinGate(false);
                setPinInput("");
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

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

              <div className="preset-section">
                <h3>Quick status</h3>

                <div className="preset-grid">
                  {defaultParentStatusPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyParentStatusPreset(preset)}
                    >
                      <span>{preset.label}</span>
                      <small>{getAvailabilityLabel(preset.availability)}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="preset-section">
                <h3>Custom status</h3>

                {customParentPresets.length === 0 ? (
                  <p className="empty-text">No custom presets yet.</p>
                ) : (
                  <div className="custom-preset-list">
                    {customParentPresets.map((preset) => (
                      <div key={preset.id} className="custom-preset-item">
                        <button type="button" onClick={() => applyParentStatusPreset(preset)}>
                          <span>{preset.label}</span>
                          <small>{getAvailabilityLabel(preset.availability)}</small>
                        </button>

                        <button
                          type="button"
                          className="delete-small-button"
                          onClick={() => deleteCustomParentPreset(preset.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="custom-preset-form">
                  <label>
                    Preset name
                    <input
                      value={newPresetLabel}
                      onChange={(event) => setNewPresetLabel(event.target.value)}
                      placeholder="Example: Shower"
                    />
                  </label>

                  <label>
                    What should kids see?
                    <input
                      value={newPresetActivity}
                      onChange={(event) => setNewPresetActivity(event.target.value)}
                      placeholder="Example: Taking a shower"
                    />
                  </label>

                  <label>
                    Availability
                    <select
                      value={newPresetAvailability}
                      onChange={(event) => setNewPresetAvailability(event.target.value)}
                    >
                      <option value="available">Available</option>
                      <option value="ask-first">Ask first</option>
                      <option value="do-not-interrupt">Do not interrupt</option>
                      <option value="helper-welcome">Helper welcome</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    className="save-preset-button"
                    onClick={addCustomParentPreset}
                  >
                    Save custom preset
                  </button>
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

            <section className="panel safety-panel">
              <div className="panel-header">
                <div>
                  <h2>Parent Safety Settings</h2>
                  <p>
                    These rules tell the AI what not to suggest. This is how parents stay in
                    control.
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
                      updateSafetySetting("maxActivityMinutes", Number(event.target.value))
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
          </section>

          <section className="panel pin-settings-panel">
            <div className="panel-header">
              <div>
                <h2>Parent PIN</h2>
                <p>
                  This locks Parent Setup from Kid Mode. MVP-level protection,
                  not real account security.
                </p>
              </div>
            </div>

            <ParentPinForm parentPin={parentPin} saveParentPin={saveParentPin} />
          </section>

          <section className="panel child-profile-panel">
            <div className="panel-header">
              <div>
                <h2>Child Profiles</h2>
                <p>
                  Add basic details so AI suggestions can fit each child instead
                  of treating everyone the same.
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
                  onChange={(event) =>
                    setNewChildInterests(event.target.value)
                  }
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
              activityMode={activityMode}
              setActivityMode={setActivityMode}
              messLevel={messLevel}
              setMessLevel={setMessLevel}
              locationPreference={locationPreference}
              setLocationPreference={setLocationPreference}
              activitySpace={activitySpace}
              setActivitySpace={setActivitySpace}
              customActivitySpace={customActivitySpace}
              setCustomActivitySpace={setCustomActivitySpace}
              childAgeRange={childAgeRange}
              setChildAgeRange={setChildAgeRange}
              childProfiles={childProfiles}
              activeChildId={activeChildId}
              setActiveChildId={setActiveChildId}
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
        saveFavoriteActivity={saveFavoriteActivity}
        handleTooMessy={handleTooMessy}
        handleTooHard={handleTooHard}
        handleNeedQuieter={handleNeedQuieter}
        handleMoreLikeThis={handleMoreLikeThis}
      />

      <SavedActivitiesPanel
        savedActivities={savedActivities}
        handleStartActivity={handleStartActivity}
        removeSavedActivity={removeSavedActivity}
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

function ParentPinForm({ parentPin, saveParentPin }) {
  const [newPin, setNewPin] = useState("");

  function handleSavePin() {
    saveParentPin(newPin);
    setNewPin("");
  }

  return (
    <div className="pin-form">
      <p className="pin-status">
        Current PIN status:{" "}
        <strong>{parentPin === "" ? "No PIN set" : "PIN is set"}</strong>
      </p>

      <div className="pin-row">
        <input
          type="password"
          inputMode="numeric"
          value={newPin}
          onChange={(event) => setNewPin(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSavePin();
            }
          }}
          placeholder="Create or replace PIN"
        />

        <button onClick={handleSavePin}>Save PIN</button>
      </div>
    </div>
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
  activityMode,
  setActivityMode,
  kidMood,
  setKidMood,
  messLevel,
  setMessLevel,
  locationPreference,
  setLocationPreference,
  activitySpace,
  setActivitySpace,
  customActivitySpace,
  setCustomActivitySpace,
  childAgeRange,
  setChildAgeRange,
  childProfiles,
  activeChildId,
  setActiveChildId,
}) {
  return (
    <div className="controls-grid">
      <label>
        Activity mode
        <select
          value={activityMode}
          onChange={(event) => setActivityMode(event.target.value)}
        >
          <option value="single-child">One child</option>
          <option value="family">Family / multiple kids</option>
        </select>
      </label>
      <label>
        Active child
        <select
          value={activeChildId}
          onChange={(event) => setActiveChildId(event.target.value)}
          disabled={activityMode === "family"}
        >
          <option value="">No profile selected</option>

          {childProfiles.map((child) => (
            <option key={child.id} value={child.id}>
              {child.name} ({child.ageRange})
            </option>
          ))}
        </select>
      </label>
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
        Activity space
        <select
          value={activitySpace}
          onChange={(event) => setActivitySpace(event.target.value)}
        >
          {activitySpaceOptions.map((space) => (
            <option key={space} value={space}>
              {space}
            </option>
          ))}
        </select>
      </label>

      {activitySpace === "Custom" && (
        <label>
          Custom space
          <input
            value={customActivitySpace}
            onChange={(event) => setCustomActivitySpace(event.target.value)}
            placeholder="Example: Grandma's house"
          />
        </label>
      )}

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

function ActiveActivityPanel({
  activeActivity,
  timerSecondsRemaining,
  finishActiveActivity,
  cancelActiveActivity,
  handleTimerNotFinished,
  handleTimerNeedAnotherIdea,
  handleTimerMoreLikeThis,
}) {
  const steps = Array.isArray(activeActivity.steps) ? activeActivity.steps : [];
  const uses = Array.isArray(activeActivity.uses) ? activeActivity.uses : [];
  const timerDone = timerSecondsRemaining <= 0;

  return (
    <section
      id="active-activity-panel"
      className="panel active-activity-panel"
    >
      <div className="active-activity-header">
        <div>
          <p className="eyebrow dark">Current Quest</p>
          <h2>{activeActivity.title}</h2>

          {activeActivity.theme && (
            <p className="activity-theme">{activeActivity.theme}</p>
          )}

          <p>{activeActivity.summary}</p>
        </div>

        <div
          className={timerDone ? "timer-badge done" : "timer-badge"}
          aria-live="polite"
          aria-label={
            timerDone
              ? "Activity timer finished"
              : `Time left: ${formatTimer(timerSecondsRemaining)}`
          }
        >
          <span className="timer-label">
            {timerDone ? "Timer" : "Time left"}
          </span>
          <span className="timer-value">
            {timerDone ? "Done!" : formatTimer(timerSecondsRemaining)}
          </span>
        </div>
      </div>

      {activeActivity.kidMission && (
        <div className="kid-mission-box active-mission-box">
          <h3>Kid mission</h3>
          <p>{activeActivity.kidMission}</p>
        </div>
      )}

      {Array.isArray(activeActivity.roles) &&
        activeActivity.roles.length > 0 && (
          <div className="activity-roles active-roles">
            <h3>Roles</h3>

            <ul>
              {activeActivity.roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </div>
        )}

      {activeActivity.kidRole && (
        <div className="quest-box active-quest-box">
          <h3>Your role</h3>
          <p>{activeActivity.kidRole}</p>
        </div>
      )}

      {activeActivity.mission && (
        <div className="quest-box active-quest-box">
          <h3>Your mission</h3>
          <p>{activeActivity.mission}</p>
        </div>
      )}

      {Array.isArray(activeActivity.starterPrompts) &&
        activeActivity.starterPrompts.length > 0 && (
          <div className="quest-box active-quest-box">
            <h3>Starter prompts</h3>
            <ul>
              {activeActivity.starterPrompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ul>
          </div>
        )}

      {Array.isArray(activeActivity.firstMoves) &&
        activeActivity.firstMoves.length > 0 && (
          <div className="quest-box active-quest-box">
            <h3>First moves</h3>
            <ol>
              {activeActivity.firstMoves.map((move) => (
                <li key={move}>{move}</li>
              ))}
            </ol>
          </div>
        )}

      {Array.isArray(activeActivity.roles) &&
        activeActivity.roles.length > 0 && (
          <div className="quest-box active-quest-box">
            <h3>Roles</h3>
            <ul>
              {activeActivity.roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </div>
        )}

      <div className="mission-steps">
        <h3>Quest steps</h3>

        <ol>
          {activeActivity.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      {Array.isArray(activeActivity.extensionIdeas) &&
        activeActivity.extensionIdeas.length > 0 && (
          <div className="quest-box active-quest-box">
            <h3>Keep going</h3>
            <ul>
              {activeActivity.extensionIdeas.map((idea) => (
                <li key={idea}>{idea}</li>
              ))}
            </ul>
          </div>
        )}

      {Array.isArray(activeActivity.roles) &&
        activeActivity.roles.length > 0 && (
          <div className="activity-roles active-roles">
            <h3>Roles</h3>

            <ul>
              {activeActivity.roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </div>
        )}

      {activeActivity.uses.length > 0 && (
        <p className="uses-list">Uses: {uses.join(", ")}</p>
      )}

      <div className="active-activity-actions">
        {!timerDone ? (
          <>
            <button onClick={finishActiveActivity}>Finished Early</button>

            <button className="danger-button" onClick={cancelActiveActivity}>
              Cancel Mission
            </button>
          </>
        ) : (
          <>
            <button onClick={finishActiveActivity}>Yes, finished</button>

            <button className="secondary-action" onClick={handleTimerNotFinished}>
              Not really
            </button>

            <button className="secondary-action" onClick={handleTimerNeedAnotherIdea}>
              Need another idea
            </button>

            <button className="secondary-action" onClick={handleTimerMoreLikeThis}>
              More like this
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function SavedActivitiesPanel({
  savedActivities,
  handleStartActivity,
  removeSavedActivity,
}) {
  if (savedActivities.length === 0) {
    return null;
  }

  return (
    <section className="panel saved-activities-panel">
      <div className="panel-header">
        <div>
          <h2>Saved Activities</h2>
          <p>
            These are ideas that worked well enough to keep. Start one again
            anytime.
          </p>
        </div>
      </div>

      <div className="saved-activity-list">
        {savedActivities
          .slice()
          .reverse()
          .map((activity) => (
            <article key={activity.id} className="saved-activity-item">
              <div>
                <h3>{activity.title}</h3>
                <p>{activity.summary}</p>

                {activity.uses.length > 0 && (
                  <p className="uses-list">
                    Uses: {activity.uses.join(", ")}
                  </p>
                )}
              </div>

              <div className="saved-activity-actions">
                <button onClick={() => handleStartActivity(activity)}>
                  Start
                </button>

                <button
                  className="danger-button"
                  onClick={() => removeSavedActivity(activity.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}

function ActivityResults({
  activities,
  isLoading,
  handleStartActivity,
  saveFavoriteActivity,
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

            {activity.theme && (
              <p className="activity-theme">{activity.theme}</p>
            )}

            <p>{activity.summary}</p>

            {activity.kidRole && (
              <div className="quest-box role-box">
                <h4>Your role</h4>
                <p>{activity.kidRole}</p>
              </div>
            )}

            {activity.mission && (
              <div className="quest-box mission-box">
                <h4>Your mission</h4>
                <p>{activity.mission}</p>
              </div>
            )}

            {Array.isArray(activity.starterPrompts) &&
              activity.starterPrompts.length > 0 && (
                <div className="quest-box prompt-box">
                  <h4>Starter prompts</h4>

                  <ul>
                    {activity.starterPrompts.map((prompt) => (
                      <li key={prompt}>{prompt}</li>
                    ))}
                  </ul>
                </div>
              )}

            {Array.isArray(activity.firstMoves) &&
              activity.firstMoves.length > 0 && (
                <div className="quest-box first-moves-box">
                  <h4>First moves</h4>

                  <ol>
                    {activity.firstMoves.map((move) => (
                      <li key={move}>{move}</li>
                    ))}
                  </ol>
                </div>
              )}

            {Array.isArray(activity.roles) && activity.roles.length > 0 && (
              <div className="quest-box roles-box">
                <h4>Roles</h4>

                <ul>
                  {activity.roles.map((role) => (
                    <li key={role}>{role}</li>
                  ))}
                </ul>
              </div>
            )}

            <h4>Quest steps</h4>
            <ol>
              {(Array.isArray(activity.steps) ? activity.steps : []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>

            {Array.isArray(activity.extensionIdeas) &&
              activity.extensionIdeas.length > 0 && (
                <div className="quest-box extension-box">
                  <h4>Keep going</h4>

                  <ul>
                    {activity.extensionIdeas.map((idea) => (
                      <li key={idea}>{idea}</li>
                    ))}
                  </ul>
                </div>
              )}

            <div className="activity-meta">
              <span>Energy: {activity.energy}</span>
              <span>Mess: {activity.mess}</span>
              <span>Adult help: {activity.adultHelp}</span>
            </div>

            <p className="why-it-fits">{activity.whyItFits}</p>

            {Array.isArray(activity.uses) && activity.uses.length > 0 && (
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

function getAvailabilityLabel(availability) {
  if (availability === "available") return "Available";
  if (availability === "ask-first") return "Ask first";
  if (availability === "do-not-interrupt") return "Do not interrupt";
  if (availability === "helper-welcome") return "Helper welcome";

  return "Check first";
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

function getActivitySecondsRemaining(activeActivity) {
  if (!activeActivity) {
    return 0;
  }

  const startedAt = Number(activeActivity.startedAt);
  const durationMinutes = Number(activeActivity.durationMinutes) || 20;

  if (!Number.isFinite(startedAt) || durationMinutes <= 0) {
    return 0;
  }

  const endTime = startedAt + durationMinutes * 60 * 1000;
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
}

function useActivityTimer(activeActivity) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!activeActivity) {
      return;
    }

    const timerId = window.setInterval(() => {
      setTick((currentTick) => currentTick + 1);
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [activeActivity]);

  return getActivitySecondsRemaining(activeActivity);
}

function formatTimer(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatFeedbackLabel(feedbackType) {
  if (feedbackType === "started") return "Started";
  if (feedbackType === "finished") return "Finished";
  if (feedbackType === "canceled") return "Canceled";
  if (feedbackType === "not-finished") return "Not finished";
  if (feedbackType === "need-another-idea") return "Need another idea";
  if (feedbackType === "timer-more-like-this") return "More like this";
  if (feedbackType === "too-messy") return "Too messy";
  if (feedbackType === "too-hard") return "Too hard";
  if (feedbackType === "need-quieter") return "Needed quieter";
  if (feedbackType === "more-like-this") return "More like this";


  return feedbackType;
}

export default App;