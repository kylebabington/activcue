// src/App.jsx

import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getActivitySuggestions, getQuestStepHint } from "./api/activityApi";
import { useLocalStorage } from "./hooks/useLocalStorage";
import ParentPage from "./pages/ParentPage";
import KidPage from "./pages/KidPage";
import QuestPage from "./pages/QuestPage";
import SettingsPage from "./pages/SettingsPage";
import "./App.css";

const defaultParentStatusPresets = [
  {
    label: "Cooking",
    activity: "Cooking dinner",
    availability: "helper-welcome",
    timeNeededMinutes: 20,
    space: "Kitchen table",
    messLevel: "low",
    noiseLevel: "normal",
    supervisionLevel: "nearby",
  },
  {
    label: "Cleaning",
    activity: "Cleaning the house",
    availability: "helper-welcome",
    timeNeededMinutes: 20,
    space: "Living room",
    messLevel: "low",
    noiseLevel: "normal",
    supervisionLevel: "nearby",
  },
  {
    label: "Work call",
    activity: "On a work call",
    availability: "do-not-interrupt",
    timeNeededMinutes: 30,
    space: "Living room",
    messLevel: "low",
    noiseLevel: "quiet",
    supervisionLevel: "independent",
  },
  {
    label: "Paying bills",
    activity: "Paying bills",
    availability: "ask-first",
    timeNeededMinutes: 20,
    space: "Kitchen table",
    messLevel: "low",
    noiseLevel: "quiet",
    supervisionLevel: "mostly-independent",
  },
  {
    label: "Resting",
    activity: "Resting",
    availability: "do-not-interrupt",
    timeNeededMinutes: 30,
    space: "Bedroom",
    messLevel: "low",
    noiseLevel: "quiet",
    supervisionLevel: "independent",
  },
  {
    label: "Yard work",
    activity: "Doing yard work",
    availability: "helper-welcome",
    timeNeededMinutes: 30,
    space: "Backyard",
    messLevel: "medium",
    noiseLevel: "normal",
    supervisionLevel: "nearby",
  },
  {
    label: "Errands",
    activity: "Handling errands",
    availability: "ask-first",
    timeNeededMinutes: 15,
    space: "Living room",
    messLevel: "low",
    noiseLevel: "normal",
    supervisionLevel: "mostly-independent",
  },
  {
    label: "Helping sibling",
    activity: "Helping someone else",
    availability: "ask-first",
    timeNeededMinutes: 20,
    space: "Living room",
    messLevel: "low",
    noiseLevel: "normal",
    supervisionLevel: "mostly-independent",
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

function normalizeTextValue(value) {
  // This helper makes text easier to compare.
  //
  // Example:
  // "Low" becomes "low"
  // "  LOW  " becomes "low"
  //
  // This protects us from capitalization or spacing weirdness.
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function getActivityDurationMinutes(activity) {
  // Prefer the new estimatedMinutes field from the backend.
  const estimatedMinutes = Number(activity.estimatedMinutes);

  // Number.isFinite checks that this is a real usable number.
  if (Number.isFinite(estimatedMinutes) && estimatedMinutes > 0) {
    return estimatedMinutes;
  }

  // Fallback: if no estimate exists, return null.
  // That lets the scoring function know it cannot judge duration.
  return null;
}

function scoreActivityForCurrentMoment(activity, currentMoment) {
  // Every activity starts at zero.
  // Good matches add points.
  // Bad matches subtract points.
  let score = 0;

  // Normalize values so comparisons are reliable.
  const activityMess = normalizeTextValue(activity.mess);
  const activityEnergy = normalizeTextValue(activity.energy);
  const activityAdultHelp = normalizeTextValue(activity.adultHelp);

  const momentMessLevel = normalizeTextValue(currentMoment?.messLevel);
  const momentNoiseLevel = normalizeTextValue(currentMoment?.noiseLevel);
  const momentSupervisionLevel = normalizeTextValue(
    currentMoment?.supervisionLevel
  );
  const momentAvailability = normalizeTextValue(currentMoment?.availability);

  const targetMinutes = Number(currentMoment?.timeNeededMinutes) || 20;
  const activityMinutes = getActivityDurationMinutes(activity);

  const steps = Array.isArray(activity.steps) ? activity.steps : [];
  const uses = Array.isArray(activity.uses) ? activity.uses : [];
  const firstMoves = Array.isArray(activity.firstMoves)
    ? activity.firstMoves
    : [];
  const starterPrompts = Array.isArray(activity.starterPrompts)
    ? activity.starterPrompts
    : [];

  // ------------------------------------------------------------
  // 1. Duration scoring
  // ------------------------------------------------------------
  // If the activity has an estimated time and fits inside the parent's
  // requested window, reward it.
  if (activityMinutes !== null && activityMinutes <= targetMinutes) {
    score += 4;
  }

  // If it is only a tiny bit longer, minor penalty.
  // Example: parent needs 20 minutes, activity says 25.
  if (activityMinutes !== null && activityMinutes > targetMinutes) {
    const minutesOver = activityMinutes - targetMinutes;

    if (minutesOver <= 5) {
      score -= 1;
    } else if (minutesOver <= 10) {
      score -= 3;
    } else {
      score -= 6;
    }
  }

  // If no duration exists, small penalty.
  // We do not completely reject it, because old activities may not have this field.
  if (activityMinutes === null) {
    score -= 1;
  }

  // ------------------------------------------------------------
  // 2. Mess scoring
  // ------------------------------------------------------------
  // Exact mess match is good.
  if (activityMess && activityMess === momentMessLevel) {
    score += 4;
  }

  // If parent asked for low mess, medium/high mess should be punished.
  if (momentMessLevel === "low") {
    if (activityMess === "medium") {
      score -= 3;
    }

    if (activityMess === "high") {
      score -= 7;
    }
  }

  // If parent allows medium mess, high mess is still a little risky.
  if (momentMessLevel === "medium" && activityMess === "high") {
    score -= 2;
  }

  // ------------------------------------------------------------
  // 3. Noise / energy scoring
  // ------------------------------------------------------------
  // Your backend uses energy: low | medium | high.
  // Your currentMoment uses noiseLevel: quiet | normal | loud.
  //
  // So we map:
  // quiet  -> prefer low energy
  // normal -> low or medium are okay
  // loud   -> high is okay
  if (momentNoiseLevel === "quiet") {
    if (activityEnergy === "low") {
      score += 5;
    }

    if (activityEnergy === "medium") {
      score -= 2;
    }

    if (activityEnergy === "high") {
      score -= 7;
    }
  }

  if (momentNoiseLevel === "normal") {
    if (activityEnergy === "low" || activityEnergy === "medium") {
      score += 3;
    }

    if (activityEnergy === "high") {
      score -= 2;
    }
  }

  if (momentNoiseLevel === "loud") {
    if (activityEnergy === "high") {
      score += 3;
    }

    if (activityEnergy === "medium") {
      score += 2;
    }

    if (activityEnergy === "low") {
      score += 1;
    }
  }

  // ------------------------------------------------------------
  // 4. Adult help / supervision scoring
  // ------------------------------------------------------------
  // If the current moment says independent, we strongly prefer no adult help.
  if (
    momentSupervisionLevel === "independent" ||
    momentAvailability === "do-not-interrupt"
  ) {
    if (activityAdultHelp === "none") {
      score += 6;
    }

    if (activityAdultHelp === "optional") {
      score += 1;
    }

    if (activityAdultHelp === "needed") {
      score -= 10;
    }
  }

  // If mostly independent, optional help is okay.
  if (momentSupervisionLevel === "mostly-independent") {
    if (activityAdultHelp === "none") {
      score += 4;
    }

    if (activityAdultHelp === "optional") {
      score += 3;
    }

    if (activityAdultHelp === "needed") {
      score -= 5;
    }
  }

  // If adult is nearby/helper-welcome, adult optional is fine.
  if (
    momentSupervisionLevel === "nearby" ||
    momentAvailability === "helper-welcome"
  ) {
    if (activityAdultHelp === "none") {
      score += 2;
    }

    if (activityAdultHelp === "optional") {
      score += 3;
    }

    if (activityAdultHelp === "needed") {
      score -= 1;
    }
  }

  // ------------------------------------------------------------
  // 5. Startability scoring
  // ------------------------------------------------------------
  // We want quests that are easy to begin.
  //
  // A child should not have to read a novel before doing step one.
  if (firstMoves.length > 0) {
    score += 2;
  }

  if (starterPrompts.length > 0) {
    score += 1;
  }

  if (steps.length > 0 && steps.length <= 5) {
    score += 2;
  }

  if (steps.length > 5) {
    score -= 1;
  }

  // ------------------------------------------------------------
  // 6. Supplies scoring
  // ------------------------------------------------------------
  // Activities using known supplies are usually more actionable.
  if (uses.length > 0) {
    score += 2;
  }

  if (uses.length > 3) {
    score -= 1;
  }

  // ------------------------------------------------------------
  // 7. Extra safety penalties based on words in the activity
  // ------------------------------------------------------------
  // This is a simple guardrail.
  // It catches obvious risky words even if the structured fields are imperfect.
  const searchableActivityText = [
    activity.title,
    activity.summary,
    activity.theme,
    activity.mission,
    ...(Array.isArray(activity.steps) ? activity.steps : []),
    ...(Array.isArray(activity.uses) ? activity.uses : []),
  ]
    .join(" ")
    .toLowerCase();

  if (momentMessLevel === "low") {
    const messyWords = ["paint", "glue", "water", "mud", "slime", "sand"];

    const hasMessyWord = messyWords.some((word) =>
      searchableActivityText.includes(word)
    );

    if (hasMessyWord) {
      score -= 4;
    }
  }

  if (momentNoiseLevel === "quiet") {
    const loudWords = ["race", "jump", "shout", "yell", "drum", "dance party"];

    const hasLoudWord = loudWords.some((word) =>
      searchableActivityText.includes(word)
    );

    if (hasLoudWord) {
      score -= 4;
    }
  }

  return score;
}

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

  const scoredActivities = activities
    .map((activity) => {
      // For each generated activity, calculate how well it matches
      // the current family moment.
      return {
        activity,
        score: scoreActivityForCurrentMoment(activity, currentMoment),
      };
    })
    .sort((a, b) => {
      // Sort highest score first.
      // Example:
      // score 22 comes before score 15.
      return b.score - a.score;
    });

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

  const [stepHint, setStepHint] = useState("");
  const [isHintLoading, setIsHintLoading] = useState(false);

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
    // Keep the old parentStatus state updated for now.
    // This prevents older parts of the app from breaking.
    setParentStatus({
      activity: preset.activity,
      availability: preset.availability,
    });

    // Update the new currentMoment object.
    // This is the new "source of truth" for the right-now family situation.
    setCurrentMoment({
      parentActivity: preset.activity,
      availability: preset.availability,
      timeNeededMinutes: preset.timeNeededMinutes || currentMoment.timeNeededMinutes,
      space: preset.space || currentMoment.space,
      messLevel: preset.messLevel || currentMoment.messLevel,
      noiseLevel: preset.noiseLevel || currentMoment.noiseLevel,
      supervisionLevel:
        preset.supervisionLevel || currentMoment.supervisionLevel,
    });

    setErrorMessage(`Current moment set to "${preset.label}".`);
  }
  // This helper updates one field inside currentMoment.
  //
  // Example:
  // updateCurrentMoment("space", "Backyard")
  //
  // That keeps the rest of currentMoment the same,
  // but changes only the space field.
  function updateCurrentMoment(fieldName, newValue) {
    setCurrentMoment({
      ...currentMoment,
      [fieldName]: newValue,
    });
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
      setErrorMessage("Something went wrong while generating ideas.");
      return [];
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

  async function handleStartSomethingForMe() {
    // Set the kid mood to surprise because this button means:
    // "I do not want to choose. Just give me something that works."
    setKidMood("surprise");

    // Clear any old active quest before starting a fresh one.
    setActiveActivity(null);

    // Generate activities and wait for the API response.
    // We use the returned activities directly instead of waiting for React state.
    const generatedActivities = await handleGenerateActivities(
      "The child wants the app to choose and start something automatically. Generate 3 safe, easy-to-start quests that fit the current family moment. Prioritize activities that require the least decision-making from the child."
    );

    // Pick the best option using the same scoring system as auto-pick.
    const selectedActivity = getBestActivityForCurrentMoment(generatedActivities);

    if (!selectedActivity) {
      setErrorMessage("I could not start a quest automatically. Try choosing a quest instead.");
      navigate("/quest");
      return;
    }

    // Start the quest immediately.
    handleStartActivity(selectedActivity);

    // Move the child to the Quest page where the active timer panel lives.
    navigate("/quest");

    setErrorMessage(`Started: "${selectedActivity.title}" because it fits right now.`);
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

      // Basic visible quest information.
      title: activity.title,
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

    setStepHint("");
    setActiveActivity(activityToStart);
    saveActivityFeedback(activity, "started");
    setErrorMessage(`Started: "${activity.title}". Timer is running.`);
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
      setErrorMessage("Start a quest first, then ask for a hint.");
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
      setErrorMessage("This quest does not have a current step to hint at.");
      return;
    }

    // Start loading state for the hint button.
    setIsHintLoading(true);

    // Clear old error messages before trying.
    setErrorMessage("");

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
      setErrorMessage("I could not make a hint right now.");
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
      setErrorMessage("No quests available yet. Choose something from Kid Mode first.");
      return;
    }

    // Use the shared helper so auto-pick and fast-start choose the same way.
    const selectedActivity = getBestActivityForCurrentMoment(activities);

    if (!selectedActivity) {
      setErrorMessage("I could not pick a quest yet. Try generating again.");
      return;
    }

    // Start the selected activity using the existing start logic.
    handleStartActivity(selectedActivity);

    // Give the user clear feedback.
    setErrorMessage(
      `Auto-picked: "${selectedActivity.title}" because it best fits right now.`
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
        score: scoreActivityForCurrentMoment(activity, currentMoment),
      };
    });

    // Sort highest score first.
    scoredOptions.sort((a, b) => b.score - a.score);

    // Useful while developing.
    // This lets you confirm the app is picking the correct quest.
    console.table(
      scoredOptions.map((item) => {
        return {
          title: item.activity.title,
          score: item.score,
          estimatedMinutes: item.activity.estimatedMinutes,
          mess: item.activity.mess,
          energy: item.activity.energy,
          adultHelp: item.activity.adultHelp,
        };
      })
    );

    // Return only the winning activity.
    return scoredOptions[0].activity;
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
        score: scoreActivityForCurrentMoment(activity, currentMoment),
      };
    });

    // Sort highest score first.
    scoredOptions.sort((a, b) => b.score - a.score);

    // Useful while developing.
    // This lets you confirm the app is picking the correct quest.
    console.table(
      scoredOptions.map((item) => {
        return {
          title: item.activity.title,
          score: item.score,
          estimatedMinutes: item.activity.estimatedMinutes,
          mess: item.activity.mess,
          energy: item.activity.energy,
          adultHelp: item.activity.adultHelp,
        };
      })
    );

    // Return only the winning activity.
    return scoredOptions[0].activity;
  }

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
    window.localStorage.removeItem("currentMoment");
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
              currentMoment={currentMoment}
              updateCurrentMoment={updateCurrentMoment}
              setCurrentMoment={setCurrentMoment}
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
              currentMoment={currentMoment}
              ParentStatusCard={ParentStatusCard}
              handleKidQuickChoice={handleKidQuickChoice}
              handleStartSomethingForMe={handleStartSomethingForMe}
              isLoading={isLoading}
            />
          }
        />

        <Route
          path="/quest"
          element={
            <QuestPage
              currentMoment={currentMoment}
              activeActivity={activeActivity}
              timerSecondsRemaining={timerSecondsRemaining}
              finishActiveActivity={finishActiveActivity}
              cancelActiveActivity={cancelActiveActivity}
              handleTimerNotFinished={handleTimerNotFinished}
              handleTimerNeedAnotherIdea={handleTimerNeedAnotherIdea}
              handleTimerMoreLikeThis={handleTimerMoreLikeThis}
              goToNextQuestStep={goToNextQuestStep}
              goToPreviousQuestStep={goToPreviousQuestStep}
              toggleQuestStepComplete={toggleQuestStepComplete}
              toggleShowAllQuestSteps={toggleShowAllQuestSteps}
              stepHint={stepHint}
              isHintLoading={isHintLoading}
              handleNeedStepHint={handleNeedStepHint}
              formatTimer={formatTimer}
              activities={activities}
              scoredActivities={scoredActivities}
              isLoading={isLoading}
              handleStartActivity={handleStartActivity}
              saveFavoriteActivity={saveFavoriteActivity}
              handleTooMessy={handleTooMessy}
              handleTooHard={handleTooHard}
              handleNeedQuieter={handleNeedQuieter}
              handleMoreLikeThis={handleMoreLikeThis}
              handleAutoPickQuest={handleAutoPickQuest}
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