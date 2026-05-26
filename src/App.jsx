// src/App.jsx

import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getActivitySuggestions } from "./api/activityApi";
import { useLocalStorage } from "./hooks/useLocalStorage";
import ParentPage from "./pages/ParentPage";
import KidPage from "./pages/KidPage";
import QuestPage from "./pages/QuestPage";
import SettingsPage from "./pages/SettingsPage";
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

function App() {
  const navigate = useNavigate();

  // This is the parent PIN.
  // For MVP, we save it in localStorage.
  // Later, real accounts should move this server-side.
  const [parentPin, setParentPin] = useLocalStorage("parentPin", "");

  const [parentStatus, setParentStatus] = useLocalStorage("parentStatus", {
    activity: "Cleaning the kitchen",
    availability: "helper-welcome",
  });

  const [customParentPresets] = useLocalStorage(
    "customParentPresets",
    []
  );

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

  const [activityMode] = useLocalStorage(
    "activityMode",
    "single-child"
  );

  const [kidMood, setKidMood] = useLocalStorage("kidMood", "creative");
  const [messLevel] = useLocalStorage("messLevel", "low");
  const [locationPreference] = useLocalStorage(
    "locationPreference",
    "indoor"
  );

  const [activitySpace] = useLocalStorage(
    "activitySpace",
    "Living room"
  );

  const [customActivitySpace] = useLocalStorage(
    "customActivitySpace",
    ""
  );
  const [childAgeRange] = useLocalStorage(
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

      navigate("/quest");
      return;
    }

    if (choice === "move") {
      setKidMood("active");

      handleGenerateActivities(
        "The child needs to move. Suggest safe active ideas using available inventory."
      );

      navigate("/quest");
      return;
    }

    if (choice === "make") {
      setKidMood("creative");

      handleGenerateActivities(
        "The child wants to make something. Suggest creative ideas using available inventory."
      );

      navigate("/quest");
      return;
    }

    if (choice === "quiet") {
      setKidMood("calm");

      handleGenerateActivities(
        "The child wants quiet time. Suggest calm, low-noise activities."
      );

      navigate("/quest");
      return;
    }

    if (choice === "help") {
      setKidMood("helper");

      handleGenerateActivities(
        "The child wants to help. Suggest useful helper activities connected to the parent's current task if safe."
      );

      navigate("/quest");
      return;
    }

    if (choice === "surprise") {
      setKidMood("surprise");

      handleGenerateActivities(
        "Surprise the child with 3 fun, safe, very different activity ideas."
      );

      navigate("/quest");
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

        <h1>When parents are busy, kids get a clear next move.</h1>

        <p>
          Set the current family moment, let kids choose what they need, and turn
          “I’m bored” into an independent quest.
        </p>
      </section>

      <nav className="app-nav">
        <NavLink
          to="/parent"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Parent
        </NavLink>

        <NavLink
          to="/kid"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Kid
        </NavLink>

        <NavLink
          to="/quest"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Quest
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Settings
        </NavLink>
      </nav>

      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <Routes>
        <Route path="/" element={<Navigate to="/parent" replace />} />

        <Route
          path="/parent"
          element={
            <ParentPage
              parentStatus={parentStatus}
              setParentStatus={setParentStatus}
              defaultParentStatusPresets={defaultParentStatusPresets}
              customParentPresets={customParentPresets}
              applyParentStatusPreset={applyParentStatusPreset}
              getAvailabilityLabel={getAvailabilityLabel}
              ParentStatusCard={ParentStatusCard}
            />
          }
        />

        <Route
          path="/kid"
          element={
            <KidPage
              parentStatus={parentStatus}
              ParentStatusCard={ParentStatusCard}
              handleKidQuickChoice={handleKidQuickChoice}
              isLoading={isLoading}
            />
          }
        />

        <Route
          path="/quest"
          element={
            <QuestPage
              activeActivity={activeActivity}
              timerSecondsRemaining={timerSecondsRemaining}
              finishActiveActivity={finishActiveActivity}
              cancelActiveActivity={cancelActiveActivity}
              handleTimerNotFinished={handleTimerNotFinished}
              handleTimerNeedAnotherIdea={handleTimerNeedAnotherIdea}
              handleTimerMoreLikeThis={handleTimerMoreLikeThis}
              formatTimer={formatTimer}
              activities={activities}
              isLoading={isLoading}
              handleStartActivity={handleStartActivity}
              saveFavoriteActivity={saveFavoriteActivity}
              handleTooMessy={handleTooMessy}
              handleTooHard={handleTooHard}
              handleNeedQuieter={handleNeedQuieter}
              handleMoreLikeThis={handleMoreLikeThis}
            />
          }
        />

        <Route
          path="/settings"
          element={
            <SettingsPage
              safetySettings={safetySettings}
              toggleSafetySetting={toggleSafetySetting}
              updateSafetySetting={updateSafetySetting}
              inventoryCategories={inventoryCategories}
              normalizedInventory={normalizedInventory}
              newInventoryItem={newInventoryItem}
              setNewInventoryItem={setNewInventoryItem}
              newInventoryCategory={newInventoryCategory}
              setNewInventoryCategory={setNewInventoryCategory}
              addInventoryItem={addInventoryItem}
              removeInventoryItem={removeInventoryItem}
              childProfiles={childProfiles}
              activeChildId={activeChildId}
              setActiveChildId={setActiveChildId}
              newChildName={newChildName}
              setNewChildName={setNewChildName}
              newChildAgeRange={newChildAgeRange}
              setNewChildAgeRange={setNewChildAgeRange}
              newChildInterests={newChildInterests}
              setNewChildInterests={setNewChildInterests}
              newChildNeeds={newChildNeeds}
              setNewChildNeeds={setNewChildNeeds}
              addChildProfile={addChildProfile}
              deleteChildProfile={deleteChildProfile}
              parentPin={parentPin}
              ParentPinForm={ParentPinForm}
              saveParentPin={saveParentPin}
              savedActivities={savedActivities}
              handleStartActivity={handleStartActivity}
              removeSavedActivity={removeSavedActivity}
              activityHistory={activityHistory}
              clearActivityHistory={clearActivityHistory}
              formatFeedbackLabel={formatFeedbackLabel}
              resetSavedData={resetSavedData}
            />
          }
        />
      </Routes>
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