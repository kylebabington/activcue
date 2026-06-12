// src/App.jsx

import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getActivitySuggestions, getQuestStepHint } from "./api/activityApi";
import { useLocalStorage } from "./hooks/useLocalStorage";
import ParentPage from "./pages/ParentPage";
import KidPage from "./pages/KidPage";
import QuestPage from "./pages/QuestPage";
import SettingsPage from "./pages/SettingsPage";
import { AppProvider } from "./context/AppContext";
import "./App.css";
import { defaultParentStatusPresets, inventoryCategories } from "./constants/presets";
import { getTotalActivityScore, logActivityScoreTable } from "./utils/activityScoring";
import { normalizeActivityStyle } from "./utils/activityStyle";
import {
  formatAvailabilityLabel,
  formatAvailabilityMessage,
  formatFeedbackLabel,
  formatTimer,
} from "./utils/activityFormatters";


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

  // currentMoment stores the full "right now" family situation.
  //
  // This is different from parentStatus.
  // parentStatus only knows:
  // - what the parent is doing
  // - whether kids can interrupt
  //
  // currentMoment knows more:
  // - what the parent is doing
  // - whether kids can interrupt
  // - how much time the parent needs
  // - where the kid should play
  // - how messy the activity can be
  // - how noisy the activity can be
  // - how much supervision is available
  const [currentMoment, setCurrentMoment] = useLocalStorage("currentMoment", {
    parentActivity: "Cleaning the kitchen",
    availability: "helper-welcome",
    timeNeededMinutes: 20,
    space: "Living room",
    messLevel: "low",
    noiseLevel: "normal",
    supervisionLevel: "independent",
  });

  const [customParentPresets, setCustomParentPresets] = useLocalStorage(
    "customParentPresets",
    []
  );

  const [activePresetKey, setActivePresetKey] = useLocalStorage(
    "activeParentPresetKey",
    ""
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

  const [kidMood, setKidMood] = useLocalStorage("kidMood", "neutral");
  const [kidEnergyLevel, setKidEnergyLevel] = useLocalStorage(
    "kidEnergyLevel",
    "neutral"
  );

  const [kidActivityStyle, setKidActivityStyle] = useLocalStorage(
    "kidActivityStyle",
    "simple"
  );

  const [messLevel] = useLocalStorage("messLevel", "low");
  const [locationPreference] = useLocalStorage(
    "locationPreference",
    "indoor"
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

  const [lastCompletedQuest, setLastCompletedQuest] = useLocalStorage(
    "lastCompletedQuest",
    null
  );

  const [activityHistory, setActivityHistory] = useLocalStorage(
    "activityHistory",
    []
  );

  const scoredActivities = activities
    .map((activity) => {
      return {
        activity,
        score: getTotalActivityScore(activity, currentMoment, activityHistory),
      };
    })
    .sort((a, b) => {
      return b.score - a.score;
    });

  useEffect(() => {
    if (activities.length === 0) {
      return;
    }

    const scored = activities
      .map((activity) => ({
        activity,
        score: getTotalActivityScore(activity, currentMoment, activityHistory),
      }))
      .sort((a, b) => b.score - a.score);

    logActivityScoreTable(scored, currentMoment, activityHistory);
  }, [activities, currentMoment, activityHistory]);

  const timerSecondsRemaining = useActivityTimer(activeActivity);

  const [savedActivities, setSavedActivities] = useLocalStorage(
    "savedActivities",
    []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info");

  function showStatus(message, type = "info") {
    if (!message) {
      setStatusMessage("");
      setStatusType("info");
      return;
    }

    setStatusMessage(message);
    setStatusType(type);
  }

  const [stepHint, setStepHint] = useState("");
  const [isHintLoading, setIsHintLoading] = useState(false);

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

  function applyMomentDraft(draft) {
    setCurrentMoment({
      parentActivity: draft.parentActivity,
      availability: draft.availability,
      timeNeededMinutes: draft.timeNeededMinutes,
      space: draft.space,
      messLevel: draft.messLevel,
      noiseLevel: draft.noiseLevel,
      supervisionLevel: draft.supervisionLevel,
    });
    setParentStatus(parentStatusFromMoment(draft));
    showStatus(`Current moment set to "${draft.parentActivity}".`, "success");
  }

  function saveCustomParentPreset(label, draft) {
    const preset = {
      id: crypto.randomUUID(),
      label: label.trim(),
      activity: draft.parentActivity,
      availability: draft.availability,
      timeNeededMinutes: draft.timeNeededMinutes,
      space: draft.space,
      messLevel: draft.messLevel,
      noiseLevel: draft.noiseLevel,
      supervisionLevel: draft.supervisionLevel,
    };

    setCustomParentPresets([...customParentPresets, preset]);
    showStatus(`Saved "${preset.label}".`, "success");
    return preset;
  }
  // This helper updates one field inside currentMoment.
  //
  // Example:
  // updateCurrentMoment("space", "Backyard")
  //
  // That keeps the rest of currentMoment the same,
  // but changes only the space field.
  function updateCurrentMoment(fieldName, newValue) {
    const nextMoment = {
      ...currentMoment,
      [fieldName]: newValue,
    };
    setCurrentMoment(nextMoment);
    setParentStatus(parentStatusFromMoment(nextMoment));
  }

  function applyCurrentMomentQuickAdjust(adjustment) {
    // adjustment is an object containing one or more currentMoment fields.
    //
    // Example:
    // {
    //   noiseLevel: "quiet",
    //   supervisionLevel: "independent"
    // }
    //
    // We spread currentMoment first, then adjustment second.
    // That means adjustment overwrites only the fields it contains.
    const nextMoment = {
      ...currentMoment,
      ...adjustment,
    };
    setCurrentMoment(nextMoment);
    setParentStatus(parentStatusFromMoment(nextMoment));

    showStatus("Current moment updated.", "success");
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
      showStatus("Child name is required.", "error");
      return;
    }

    const duplicateChild = childProfiles.some(
      (child) => child.name.toLowerCase() === cleanedName.toLowerCase()
    );

    if (duplicateChild) {
      showStatus("A child with that name already exists.", "error");
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

    showStatus(`Added child profile for ${cleanedName}.`, "success");
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

    showStatus(
      childToDelete
        ? `Deleted child profile for ${childToDelete.name}.`
        : "Child profile deleted.",
      "success"
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
      showStatus("That item is already in your inventory.", "error");
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
    showStatus("");
  }

  function removeInventoryItem(itemIdToRemove) {
    setInventory(
      normalizedInventory.filter((item) => item.id !== itemIdToRemove)
    );
  }

  function saveParentPin(newPin) {
    const cleanedPin = newPin.trim();

    if (cleanedPin.length < 4) {
      showStatus("PIN must be at least 4 digits.", "error");
      return;
    }

    setParentPin(cleanedPin);
    showStatus("Parent PIN saved.", "success");
  }

  async function handleGenerateActivities(customFeedbackContext = "") {
    setIsLoading(true);
    showStatus("");
    setActivities([]);

    try {
      const previousActivityTitles = activityHistory
        .slice(-10)
        .map((historyItem) => historyItem.title);

      const activityRequest = {
        // New currentMoment fields.
        //
        // These are now the best description of what is happening right now.
        currentMoment,

        // Keep these old fields too for backend compatibility.
        //
        // This means the backend will still work even if it has not been updated
        // to fully understand currentMoment yet.
        parentActivity: currentMoment.parentActivity,
        parentAvailability: currentMoment.availability,
        inventory,
        kidMood,

        // Use currentMoment as the source of truth for mess and space.
        messLevel: currentMoment.messLevel,
        locationPreference,
        activitySpace: currentMoment.space,

        childAgeRange: effectiveChildAgeRange,

        // This is the kid's selected style.
        // Current values should be something like:
        // "simple" or "imaginative"
        activityStyle: kidActivityStyle,

        // Keep activityMode too so older code still works.
        // This prevents us from breaking anything that already depends on activityMode.
        activityMode,

        activeChildProfile,
        selectedChildProfiles,

        // Safety settings still matter.
        // But currentMoment.timeNeededMinutes should now guide activity duration.
        safetySettings: {
          ...safetySettings,
          maxActivityMinutes: currentMoment.timeNeededMinutes,
          quietMode: currentMoment.noiseLevel === "quiet",
        },

        feedbackContext: customFeedbackContext,
        previousActivityTitles,
      };
      const generatedActivities = await getActivitySuggestions(activityRequest);

      setActivities(generatedActivities);

      // Return the generated activities so other workflows can use them immediately.
      // This matters for "Start something for me", because we want to generate,
      // score, and start without waiting for React state to update.
      return generatedActivities;
    } catch (error) {
      console.error(error);
      showStatus("Something went wrong while generating ideas.", "error");
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  function getKidEnergyInstruction(energyLevel) {
    if (energyLevel === "quiet") {
      return "The child feels quiet or low-energy. Prefer calm, low-noise activities. Avoid running, shouting, wild movement, or complex setup.";
    }

    if (energyLevel === "energetic") {
      return "The child has extra energy. Suggest movement or active engagement only if the current family moment allows it. If the parent moment requires quiet, choose contained energy like building, sorting, obstacle planning, or quiet movement.";
    }

    return "The child feels neutral. Suggest an activity with a balanced amount of effort.";
  }

  function getKidActivityStyleInstruction(activityStyle) {
    if (activityStyle === "imaginative") {
      return `
The child wants imaginative play.

Use playful pretend framing, roles, and mission language.
The activity may include:
- a pretend role
- a small mission
- a story frame
- make-believe play

But still keep setup easy and realistic.
`;
    }

    return `
The child wants a SIMPLE activity.

Simple means:
- normal real-life kid activities
- no elaborate pretend story
- no complicated mission
- no long setup
- no multi-stage project unless the item itself requires it
- no "quest" language unless absolutely necessary
- no made-up fantasy premise
- 2 to 4 short steps maximum
- something the child can understand immediately

Good simple examples:
- Draw a picture of your family.
- Use your crystal growing kit.
- Jump on the trampoline.
- Build a tower with blocks.
- Read a book in a cozy spot.
- Sort your cards.
- Play with Magnatiles.
- Make a paper airplane.
- Do a puzzle.
- Kick a soccer ball outside.

For simple activities, plain is good.
Do not make the idea more creative than it needs to be.
`;
  }

  async function handleGenerateKidActivities() {
    setKidMood(kidEnergyLevel);

    const activityStyle = kidActivityStyle;
    const styleInstruction = getKidActivityStyleInstruction(activityStyle);
    const energyInstruction = getKidEnergyInstruction(kidEnergyLevel);

    const generatedActivities = await handleGenerateActivities(
      `
The child chose activity style: ${activityStyle}.
${styleInstruction}

The child chose energy level: ${kidEnergyLevel}.
${energyInstruction}

Generate 3 activities that fit BOTH:
1. the child's chosen style and energy level
2. the current family moment

Very important:
If activityStyle is "simple", the activities should feel like normal things a kid might actually do at home.

Simple activity targets:
- "Draw a picture of your family"
- "Use your crystal growing kit"
- "Jump on the trampoline"
- "Build with blocks"
- "Read a book"
- "Do a puzzle"
- "Sort your cards"
- "Play catch outside"
- "Make a paper airplane"

For simple activities:
- use plain titles
- use plain summaries
- keep steps very short
- avoid elaborate missions
- avoid pretend roles
- avoid fantasy framing
- avoid making chores or crafts sound like quests
- do not over-explain

If activityStyle is "imaginative", playful quest language is okay.

Always obey currentMoment limits for time, mess, noise, supervision, and parent availability.
`
    );

    if (generatedActivities.length === 0) {
      navigate("/quest");
      return;
    }

    navigate("/quest");
  }

  async function handleStartSomethingForMe() {
    // Set the kid mood to surprise because this button means:
    // "I do not want to choose. Just give me something that works."
    setKidMood(kidEnergyLevel);

    // Clear any old active quest before starting a fresh one.
    setActiveActivity(null);

    // Generate activities and wait for the API response.
    // We use the returned activities directly instead of waiting for React state.
    const generatedActivities = await handleGenerateActivities(
      `
The child wants the app to choose and start something automatically.

Use the child's current energy level: ${kidEnergyLevel}.
${getKidEnergyInstruction(kidEnergyLevel)}

Use the child's preferred style: ${kidActivityStyle}.
${getKidActivityStyleInstruction(kidActivityStyle)}

Generate 3 safe, easy-to-start options that fit the current family moment.

If the preferred style is "simple":
- choose normal real-life activities
- prefer activities like drawing, reading, building, puzzles, trampoline, kits, cards, toys, or simple outdoor play
- avoid elaborate story framing
- avoid complicated missions
- avoid long lists of steps
- avoid turning everything into pretend play

Prioritize activities that require the least decision-making from the child.
`
    );

    // Pick the best option using the same scoring system as auto-pick.
    const selectedActivity = getBestActivityForCurrentMoment(generatedActivities);

    if (!selectedActivity) {
      showStatus("I could not start an activity automatically. Try choosing one instead.", "error");
      navigate("/quest");
      return;
    }

    // Start the activity immediately.
    handleStartActivity(selectedActivity);

    // Move the child to the activity page where the active timer panel lives.
    navigate("/quest");

    showStatus(`Started: "${selectedActivity.title}" because it fits right now.`, "success");
  }

  function saveActivityFeedback(activity, feedbackType) {
    const historyItem = {
      id: crypto.randomUUID(),
      title: activity.title,
      feedbackType,
      createdAt: new Date().toISOString(),

      // Context at the time of feedback.
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,

      // Activity traits.
      // These are what feedback-weighted scoring learns from later.
      activityStyle: normalizeActivityStyle(activity),

      energy: activity.energy || "medium",
      mess: activity.mess || "low",
      adultHelp: activity.adultHelp || "optional",
      estimatedMinutes: Number(activity.estimatedMinutes) || null,
      uses: Array.isArray(activity.uses) ? activity.uses : [],
      stepsCount: Array.isArray(activity.steps) ? activity.steps.length : 0,
    };

    setActivityHistory([...activityHistory, historyItem]);
  }

  function saveFavoriteActivity(activity) {
    const alreadySaved = savedActivities.some(
      (savedActivity) =>
        savedActivity.title.toLowerCase() === activity.title.toLowerCase()
    );

    if (alreadySaved) {
      showStatus(`"${activity.title}" is already saved.`, "error");
      return;
    }

    const favoriteActivity = {
      // This saved favorite gets its own ID.
      // That lets us delete it later without relying on the title.
      id: crypto.randomUUID(),

      // Main activity identity.
      title: activity.title,

      // Save whether this is a simple activity or an imaginative quest.
      // This matters when replaying saved activities later.
      activityStyle: normalizeActivityStyle(activity),

      theme: activity.theme || "",
      summary: activity.summary || "",

      // Older compatibility field.
      // Some older saved activities may still use kidMission.
      kidMission: activity.kidMission || "",

      // Newer quest structure.
      kidRole: activity.kidRole || "",
      mission: activity.mission || "",
      starterPrompts: Array.isArray(activity.starterPrompts)
        ? activity.starterPrompts
        : [],
      firstMoves: Array.isArray(activity.firstMoves)
        ? activity.firstMoves
        : [],
      roles: Array.isArray(activity.roles) ? activity.roles : [],
      steps: Array.isArray(activity.steps) ? activity.steps : [],
      extensionIdeas: Array.isArray(activity.extensionIdeas)
        ? activity.extensionIdeas
        : [],

      // Supplies.
      uses: Array.isArray(activity.uses) ? activity.uses : [],

      // Fit/scoring metadata.
      estimatedMinutes: Number(activity.estimatedMinutes) || null,
      energy: activity.energy || "medium",
      mess: activity.mess || "low",
      adultHelp: activity.adultHelp || "optional",
      whyItFits: activity.whyItFits || "",

      // Save timestamp.
      savedAt: new Date().toISOString(),
    };

    setSavedActivities([...savedActivities, favoriteActivity]);
    showStatus(`Saved favorite: "${activity.title}".`, "success");
  }

  function removeSavedActivity(activityId) {
    setSavedActivities(
      savedActivities.filter((activity) => activity.id !== activityId)
    );

    showStatus("Saved activity removed.", "success");
  }

  function handleReplaySavedActivity(savedActivity) {
    // Clear any previous completion summary.
    // Replaying a saved quest should put the user back into active quest mode.
    setLastCompletedQuest(null);

    // Clear old hints.
    // A hint from the previous quest should not appear on this replayed quest.
    setStepHint("");

    // Normalize the saved activity before replaying it.
    // Older saved activities may not have activityStyle because this field
    // was added later.
    const activityToReplay = {
      ...savedActivity,

      activityStyle: normalizeActivityStyle(savedActivity),
    };

    // Start the saved activity using the same existing start logic.
    // This gives it a fresh timer, fresh ID, and guided step state.
    handleStartActivity(activityToReplay);

    // Move the user to the active quest screen.
    navigate("/quest");

    showStatus(`Replaying saved activity: "${savedActivity.title}".`, "success");
  }

  function handleStartActivity(activity) {
    // Use the activity's own estimatedMinutes when available.
    // If that is missing, fall back to the parent's currentMoment time.
    // If that is missing too, use 20 minutes as a safe default.
    const durationMinutes =
      Number(activity.estimatedMinutes) ||
      Number(currentMoment.timeNeededMinutes) ||
      20;

    const activityToStart = {
      // Give this active quest a unique ID.
      id: crypto.randomUUID(),

      // Basic visible activity information.
      title: activity.title,

      // This tells the UI whether this is a plain simple activity
      // or an imaginative quest.
      activityStyle: normalizeActivityStyle(activity, kidActivityStyle),

      theme: activity.theme || "",
      summary: activity.summary || "",

      // Kid-facing quest structure.
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

      // Supplies.
      uses: Array.isArray(activity.uses) ? activity.uses : [],

      // Structured fit fields.
      estimatedMinutes: Number(activity.estimatedMinutes) || durationMinutes,
      energy: activity.energy || "medium",
      mess: activity.mess || "low",
      adultHelp: activity.adultHelp || "optional",
      whyItFits: activity.whyItFits || "",

      // New guided step state.
      // currentStepIndex starts at 0 because arrays start counting at 0.
      //
      // Example:
      // steps[0] is the first step.
      // steps[1] is the second step.
      currentStepIndex: 0,

      // completedStepIndexes stores which steps the kid has completed.
      //
      // Example:
      // [0, 1] means:
      // - step 1 is complete
      // - step 2 is complete
      //
      // We store indexes instead of step text because step text can be long.
      completedStepIndexes: [],

      // showAllSteps controls whether the full list is visible.
      // false means the kid mainly sees one step at a time.
      showAllSteps: false,

      // Timer fields.
      startedAt: Date.now(),
      durationMinutes,
    };

    // Clear any old step hint when a brand-new quest starts.
    // A hint from an old quest should not appear in a new quest.
    setStepHint("");

    // Clear the previous completed quest summary.
    // Starting a new quest means the old completion screen should disappear.
    setLastCompletedQuest(null);

    setActiveActivity(activityToStart);
    saveActivityFeedback(activity, "started");
    showStatus(`Started: "${activity.title}". Timer is running.`, "success");
  }

  function goToNextQuestStep() {
    // If there is no active quest, there is nothing to update.
    if (!activeActivity) {
      return;
    }

    // Make sure steps is always an array.
    const steps = Array.isArray(activeActivity.steps) ? activeActivity.steps : [];

    // If there are no steps, there is nothing to advance.
    if (steps.length === 0) {
      return;
    }

    // Get the current step index.
    const currentStepIndex = Number(activeActivity.currentStepIndex) || 0;

    // The last valid index is steps.length - 1.
    //
    // Example:
    // If there are 5 steps, indexes are:
    // 0, 1, 2, 3, 4
    const lastStepIndex = steps.length - 1;

    // Do not go past the final step.
    const nextStepIndex = Math.min(currentStepIndex + 1, lastStepIndex);

    // Make sure completedStepIndexes is always an array.
    const completedStepIndexes = Array.isArray(activeActivity.completedStepIndexes)
      ? activeActivity.completedStepIndexes
      : [];

    // If the current step is not already marked complete,
    // add it to the completed list.
    const updatedCompletedStepIndexes = completedStepIndexes.includes(currentStepIndex)
      ? completedStepIndexes
      : [...completedStepIndexes, currentStepIndex];

    // Clear the old hint when the child moves to a new step.
    setStepHint("");

    // Update activeActivity while keeping all the other quest data.
    setActiveActivity({
      ...activeActivity,
      currentStepIndex: nextStepIndex,
      completedStepIndexes: updatedCompletedStepIndexes,
    });
  }

  function goToPreviousQuestStep() {
    // If there is no active quest, there is nothing to update.
    if (!activeActivity) {
      return;
    }

    // Get the current step index.
    const currentStepIndex = Number(activeActivity.currentStepIndex) || 0;

    // Do not go below zero.
    const previousStepIndex = Math.max(currentStepIndex - 1, 0);

    setStepHint("");

    // Update activeActivity while keeping all the other quest data.
    setActiveActivity({
      ...activeActivity,
      currentStepIndex: previousStepIndex,
    });
  }

  function toggleQuestStepComplete(stepIndexToToggle) {
    // If there is no active quest, there is nothing to update.
    if (!activeActivity) {
      return;
    }

    // Make sure completedStepIndexes is always an array.
    const completedStepIndexes = Array.isArray(activeActivity.completedStepIndexes)
      ? activeActivity.completedStepIndexes
      : [];

    // Check whether this step is already complete.
    const stepIsAlreadyComplete = completedStepIndexes.includes(stepIndexToToggle);

    // If it is complete, remove it.
    // If it is not complete, add it.
    const updatedCompletedStepIndexes = stepIsAlreadyComplete
      ? completedStepIndexes.filter((stepIndex) => stepIndex !== stepIndexToToggle)
      : [...completedStepIndexes, stepIndexToToggle];

    // Save the updated completion list back into activeActivity.
    setActiveActivity({
      ...activeActivity,
      completedStepIndexes: updatedCompletedStepIndexes,
    });
  }

  function toggleShowAllQuestSteps() {
    // If there is no active quest, there is nothing to update.
    if (!activeActivity) {
      return;
    }

    // Flip showAllSteps from false to true, or true to false.
    setActiveActivity({
      ...activeActivity,
      showAllSteps: !activeActivity.showAllSteps,
    });
  }

  async function handleNeedStepHint() {
    // If there is no active quest, there is no step to help with.
    if (!activeActivity) {
      showStatus("Start an activity first, then ask for a hint.", "error");
      return;
    }

    // Make sure steps is always an array before reading from it.
    const steps = Array.isArray(activeActivity.steps) ? activeActivity.steps : [];

    // Get the current step index.
    // If currentStepIndex is missing, default to 0, which means step 1.
    const currentStepIndex = Number(activeActivity.currentStepIndex) || 0;

    // Pull out the current step text.
    const currentStep = steps[currentStepIndex];

    // If there is no current step, we cannot generate a useful hint.
    if (!currentStep) {
      showStatus("This activity does not have a current step to hint at.", "error");
      return;
    }

    // Start loading state for the hint button.
    setIsHintLoading(true);

    // Clear old error messages before trying.
    showStatus("");

    try {
      const hintRequest = {
        // The whole active activity gives the backend context.
        activeActivity,

        // The current step is the exact step the child needs help with.
        currentStep,

        // These numbers let the backend understand where the child is.
        currentStepNumber: currentStepIndex + 1,
        totalSteps: steps.length,

        // The current family moment keeps the hint appropriate.
        // Example:
        // If the moment says quiet, the hint should not suggest shouting.
        currentMoment,
      };

      const hint = await getQuestStepHint(hintRequest);

      setStepHint(hint);
    } catch (error) {
      console.error(error);
      showStatus("I could not make a hint right now.", "error");
    } finally {
      setIsHintLoading(false);
    }
  }
  // This starts one of the generated activities automatically.
  //
  // For now, we choose the first activity in the list.
  // Later, we can make this smarter by scoring activities based on:
  // - currentMoment
  // - mess level
  // - noise level
  // - adultHelp
  // - previous feedback
  // - child profile
  function handleAutoPickQuest() {
    // If there are no activities yet, there is nothing to start.
    if (activities.length === 0) {
      showStatus("No activities available yet. Choose something from Kid Mode first.", "error");
      return;
    }

    // Use the shared helper so auto-pick and fast-start choose the same way.
    const selectedActivity = getBestActivityForCurrentMoment(activities);

    if (!selectedActivity) {
      showStatus("I could not pick an activity yet. Try generating again.", "error");
      return;
    }

    // Start the selected activity using the existing start logic.
    handleStartActivity(selectedActivity);

    // Give the user clear feedback.
    showStatus(
      `Auto-picked: "${selectedActivity.title}" because it best fits right now.`,
      "success"
    );
  }

  function getBestActivityForCurrentMoment(activityOptions) {
    // If the caller gives us nothing, return null.
    if (!Array.isArray(activityOptions) || activityOptions.length === 0) {
      return null;
    }

    // Score every option using the same scoring function used by auto-pick.
    const scoredOptions = activityOptions.map((activity) => {
      return {
        activity,
        score: getTotalActivityScore(activity, currentMoment, activityHistory),
      };
    });

    // Sort highest score first.
    scoredOptions.sort((a, b) => b.score - a.score);

    logActivityScoreTable(scoredOptions, currentMoment, activityHistory);

    // Return only the winning activity.
    return scoredOptions[0].activity;
  }

  function finishActiveActivity() {
    // If there is no active quest, there is nothing to finish.
    if (!activeActivity) {
      return;
    }

    // Make sure steps is always an array before counting them.
    const steps = Array.isArray(activeActivity.steps) ? activeActivity.steps : [];

    // Make sure completedStepIndexes is always an array.
    const completedStepIndexes = Array.isArray(activeActivity.completedStepIndexes)
      ? activeActivity.completedStepIndexes
      : [];

    // If the kid is currently on a step, finishing the quest should count that
    // current step as completed too.
    const currentStepIndex = Number(activeActivity.currentStepIndex) || 0;

    const completedWithCurrentStep = completedStepIndexes.includes(currentStepIndex)
      ? completedStepIndexes
      : [...completedStepIndexes, currentStepIndex];

    // Remove duplicate indexes just in case.
    const uniqueCompletedStepIndexes = [...new Set(completedWithCurrentStep)];

    // Work out how many steps were completed.
    const completedStepCount = uniqueCompletedStepIndexes.length;

    // Work out how many total steps exist.
    const totalStepCount = steps.length;

    // Calculate how long the quest was active.
    const startedAt = Number(activeActivity.startedAt);
    const finishedAt = Date.now();

    const minutesWorked =
      Number.isFinite(startedAt) && startedAt > 0
        ? Math.max(1, Math.round((finishedAt - startedAt) / 1000 / 60))
        : null;

    // Build a summary object that the activity page can display.
    const completedQuestSummary = {
      id: crypto.randomUUID(),
      title: activeActivity.title,

      // Preserve whether this was a simple activity or an imaginative quest.
      activityStyle: normalizeActivityStyle(activeActivity),

      theme: activeActivity.theme || "",
      summary: activeActivity.summary || "",
      completedAt: new Date(finishedAt).toISOString(),

      // Progress summary.
      completedStepCount,
      totalStepCount,
      completedStepIndexes: uniqueCompletedStepIndexes,

      // Time summary.
      minutesWorked,

      // Useful quest metadata.
      uses: Array.isArray(activeActivity.uses) ? activeActivity.uses : [],
      energy: activeActivity.energy || "medium",
      mess: activeActivity.mess || "low",
      adultHelp: activeActivity.adultHelp || "optional",

      // Save the full quest too, because "More like this" needs context.
      activity: activeActivity,
    };

    const finishedHistoryItem = {
      id: crypto.randomUUID(),
      title: activeActivity.title,

      activityStyle: normalizeActivityStyle(activeActivity),

      feedbackType: "finished",
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,

      // Add richer completion data to history.
      completedStepCount,
      totalStepCount,
      minutesWorked,
      energy: activeActivity.energy || "medium",
      mess: activeActivity.mess || "low",
      adultHelp: activeActivity.adultHelp || "optional",
      estimatedMinutes: Number(activeActivity.estimatedMinutes) || null,
      uses: Array.isArray(activeActivity.uses) ? activeActivity.uses : [],
      stepsCount: Array.isArray(activeActivity.steps)
        ? activeActivity.steps.length
        : 0,
    };

    setActivityHistory([...activityHistory, finishedHistoryItem]);

    // Save the completion summary before clearing the active quest.
    setLastCompletedQuest(completedQuestSummary);

    // Clear the active quest and hint.
    setActiveActivity(null);
    setStepHint("");

    showStatus(`Finished: "${activeActivity.title}". Nice work.`, "success");
  }

  function cancelActiveActivity() {
    if (!activeActivity) {
      return;
    }

    const canceledHistoryItem = {
      id: crypto.randomUUID(),
      title: activeActivity.title,

      activityStyle: normalizeActivityStyle(activeActivity),

      feedbackType: "canceled",
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,
      energy: activeActivity.energy || "medium",
      mess: activeActivity.mess || "low",
      adultHelp: activeActivity.adultHelp || "optional",
      estimatedMinutes: Number(activeActivity.estimatedMinutes) || null,
      uses: Array.isArray(activeActivity.uses) ? activeActivity.uses : [],
      stepsCount: Array.isArray(activeActivity.steps)
        ? activeActivity.steps.length
        : 0,
    };

    setActivityHistory([...activityHistory, canceledHistoryItem]);

    // Canceling should not show a celebration summary.
    setLastCompletedQuest(null);

    setActiveActivity(null);
    setStepHint("");
    showStatus(`Canceled: "${activeActivity.title}".`, "info");
  }

  function handleTimerNotFinished() {
    if (!activeActivity) {
      return;
    }

    const notFinishedHistoryItem = {
      id: crypto.randomUUID(),
      title: activeActivity.title,

      activityStyle: normalizeActivityStyle(activeActivity),

      feedbackType: "not-finished",
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,
    };

    setActivityHistory([...activityHistory, notFinishedHistoryItem]);
    setActiveActivity(null);
    showStatus(
      `"${activeActivity.title}" was marked not finished. We'll use that to improve suggestions.`,
      "info"
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

      // Preserve whether the rejected activity was simple or imaginative.
      // This helps future scoring learn patterns like:
      // "Simple activities work better when the kid is tired."
      activityStyle: normalizeActivityStyle(activeActivity),

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

      // Preserve whether the liked activity was simple or imaginative.
      // This makes the feedback loop smarter later.
      activityStyle: normalizeActivityStyle(activeActivity),

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

  function clearLastCompletedQuest() {
    // This hides the completion summary.
    setLastCompletedQuest(null);
  }

  function handleCompletedQuestMoreLikeThis() {
    // If there is no completed quest summary, we cannot use it for feedback.
    if (!lastCompletedQuest?.activity) {
      showStatus("No completed activity to use yet.", "error");
      return;
    }

    const completedTitle = lastCompletedQuest.title;

    clearLastCompletedQuest();

    handleGenerateActivities(
      `The child completed "${completedTitle}" and liked it. Suggest 3 more activities with a similar feeling, but do not repeat the same title.`
    );

    navigate("/quest");
  }

  function handleCompletedQuestNeedAnotherIdea() {
    // If there is no completed quest summary, use a generic request.
    const completedTitle = lastCompletedQuest?.title || "the last activity";

    clearLastCompletedQuest();

    handleGenerateActivities(
      `The child finished "${completedTitle}" and wants something different now. Suggest 3 fresh activities that feel different from the completed one.`
    );

    navigate("/quest");
  }

  function clearActivityHistory() {
    setActivityHistory([]);
    showStatus("Activity history cleared.", "success");
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
    window.localStorage.removeItem("lastCompletedQuest");
    window.localStorage.removeItem("currentMoment");
    window.location.reload();
  }

  const appContextValue = {
    currentMoment,
    activeActivity,
    lastCompletedQuest,
    clearLastCompletedQuest,
    handleCompletedQuestMoreLikeThis,
    handleCompletedQuestNeedAnotherIdea,
    timerSecondsRemaining,
    finishActiveActivity,
    cancelActiveActivity,
    handleTimerNotFinished,
    handleTimerNeedAnotherIdea,
    handleTimerMoreLikeThis,
    goToNextQuestStep,
    goToPreviousQuestStep,
    toggleQuestStepComplete,
    toggleShowAllQuestSteps,
    stepHint,
    isHintLoading,
    handleNeedStepHint,
    formatTimer,
    activities,
    scoredActivities,
    isLoading,
    handleStartActivity,
    saveFavoriteActivity,
    handleTooMessy,
    handleTooHard,
    handleNeedQuieter,
    handleMoreLikeThis,
    handleAutoPickQuest,
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
    handleReplaySavedActivity,
    removeSavedActivity,
    activityHistory,
    clearActivityHistory,
    formatFeedbackLabel,
    resetSavedData,
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-header-brand">
          <p className="eyebrow">Family Activity Helper</p>
        </div>

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
            Activity
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Settings
          </NavLink>
        </nav>
      </header>

      {statusMessage && (
        <p className={`status-message status-message--${statusType}`}>
          {statusMessage}
        </p>
      )}

      <AppProvider value={appContextValue}>
        <Routes>
          <Route path="/" element={<Navigate to="/parent" replace />} />

          <Route
            path="/parent"
            element={
              <ParentPage
                defaultParentStatusPresets={defaultParentStatusPresets}
                customParentPresets={customParentPresets}
                getAvailabilityLabel={formatAvailabilityLabel}
                applyMomentDraft={applyMomentDraft}
                saveCustomParentPreset={saveCustomParentPreset}
                activePresetKey={activePresetKey}
                setActivePresetKey={setActivePresetKey}
              />
            }
          />

          <Route
            path="/kid"
            element={
              <KidPage
                currentMoment={currentMoment}
                kidEnergyLevel={kidEnergyLevel}
                setKidEnergyLevel={setKidEnergyLevel}
                kidActivityStyle={kidActivityStyle}
                setKidActivityStyle={setKidActivityStyle}
                handleGenerateKidActivities={handleGenerateKidActivities}
                handleStartSomethingForMe={handleStartSomethingForMe}
                isLoading={isLoading}
              />
            }
          />

          <Route path="/quest" element={<QuestPage />} />

          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppProvider>
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
      <p>{formatAvailabilityMessage(parentStatus.availability)}</p>
    </div>
  );
}

function parentStatusFromMoment(moment) {
  return {
    activity: moment.parentActivity,
    availability: moment.availability,
  };
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

export default App;