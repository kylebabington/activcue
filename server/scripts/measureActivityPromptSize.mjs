/**
 * Offline prompt-size measurement for the activity suggestions performance pass.
 * Run: node server/scripts/measureActivityPromptSize.mjs
 */
import {
  buildActivitySuggestionsInput,
  buildActivitySuggestionsInstructions,
} from "../prompts/activitySuggestions.js";

function approxTokens(chars) {
  return Math.round(chars / 4);
}

const moment = {
  parentActivity: "cooking dinner",
  availability: "busy nearby",
  timeNeededMinutes: 20,
  space: "living room",
  messLevel: "low",
  noiseLevel: "quiet",
  supervisionLevel: "independent",
};

const safety = {
  screenFreeOnly: true,
  noFoodActivities: false,
  noWaterPlay: false,
  noSmallObjects: true,
  quietMode: true,
  maxActivityMinutes: 20,
  adultHelpAllowed: "none",
};

const childrenByBand = {
  under10: [{ name: "Sam", ageYears: 7, ageBand: "child", ageSource: "dob", interests: ["dinosaurs"], avoids: [], independenceLevel: "mostly-independent", needs: "" }],
  tween: [{ name: "Jordan", ageYears: 11, ageBand: "tween", ageSource: "dob", interests: ["building"], avoids: [], independenceLevel: "mostly-independent", needs: "" }],
  teen: [{ name: "Alex", ageYears: 14, ageBand: "teen", ageSource: "dob", interests: ["photography"], avoids: [], independenceLevel: "independent", needs: "" }],
};

const rows = [];

for (const style of ["simple", "imaginative"]) {
  for (const [band, children] of Object.entries(childrenByBand)) {
    const groupAgeContext = {
      youngestAge: children[0].ageYears,
      oldestAge: children[0].ageYears,
      ageSpan: 0,
      isMixedAge: false,
    };
    const instructions = buildActivitySuggestionsInstructions(style, "playroom", {
      childrenContext: children,
      groupAgeContext,
    });
    const input = buildActivitySuggestionsInput({
      safeCurrentMoment: moment,
      kidMood: "bored",
      locationPreference: "indoors",
      childAgeRange: `${children[0].ageYears}`,
      childrenContext: children,
      groupAgeContext,
      activeChildProfile: children[0],
      safeActivityStyle: style,
      activityMode: "single-child",
      safeSelectedChildProfiles: children,
      inventory: ["blocks", "paper", "pencils"],
      safeFeedbackContext: "",
      safePreviousActivityTitles: ["Old Idea"],
      safeSafetySettings: safety,
      playModeTheme: "playroom",
      activityPreferences: null,
    });

    rows.push({
      style,
      band,
      instructionChars: instructions.length,
      inputChars: input.length,
      instructionTokensApprox: approxTokens(instructions.length),
      inputTokensApprox: approxTokens(input.length),
      totalPromptTokensApprox: approxTokens(instructions.length + input.length),
    });
  }
}

console.log(JSON.stringify({ measuredAt: new Date().toISOString(), rows }, null, 2));

const maxInstructions = Math.max(...rows.map((r) => r.instructionChars));
const minInstructions = Math.min(...rows.map((r) => r.instructionChars));
console.log(
  `\nInstruction char range: ${minInstructions}–${maxInstructions} (was ~20,500 before trim)`
);
console.log(
  `Approx instruction tokens: ${approxTokens(minInstructions)}–${approxTokens(maxInstructions)} (was ~5,100)`
);
