// src/constants/demoMoments.js

/**
 * Canonical landing /demo moments.
 * Moment field names match live scoring (activityScoring / sessionFitScore).
 */
export const DEMO_MOMENTS = Object.freeze({
  dinner: {
    id: "dinner",
    label: "I'm making dinner",
    shortLabel: "Making dinner",
    description: "20 min · low mess · mostly independent",
    moment: {
      parentActivity: "Cooking dinner",
      availability: "helper-welcome",
      timeNeededMinutes: 20,
      space: "Kitchen table",
      messLevel: "low",
      noiseLevel: "normal",
      supervisionLevel: "nearby",
    },
  },
  workCall: {
    id: "workCall",
    label: "I'm on a work call",
    shortLabel: "Work call",
    description: "30 min · quiet · no interruptions",
    moment: {
      parentActivity: "On a work call",
      availability: "do-not-interrupt",
      timeNeededMinutes: 30,
      space: "Living room",
      messLevel: "low",
      noiseLevel: "quiet",
      supervisionLevel: "independent",
    },
  },
  burnEnergy: {
    id: "burnEnergy",
    label: "They need to burn energy",
    shortLabel: "Burn energy",
    description: "15 min · movement · indoors",
    moment: {
      parentActivity: "Available nearby",
      availability: "ask-first",
      timeNeededMinutes: 15,
      space: "Living room",
      messLevel: "low",
      noiseLevel: "normal",
      supervisionLevel: "nearby",
    },
  },
  meltdown: {
    id: "meltdown",
    label: "Everyone is melting down",
    shortLabel: "Meltdown",
    description: "10 min · calming · almost no setup",
    moment: {
      parentActivity: "Resetting the house",
      availability: "do-not-interrupt",
      timeNeededMinutes: 10,
      space: "Living room",
      messLevel: "low",
      noiseLevel: "quiet",
      supervisionLevel: "nearby",
    },
  },
  rainyAfternoon: {
    id: "rainyAfternoon",
    label: "Rainy afternoon",
    shortLabel: "Rainy day",
    description: "45 min · flexible mess · creative",
    moment: {
      parentActivity: "Home for the afternoon",
      availability: "helper-welcome",
      timeNeededMinutes: 45,
      space: "Living room",
      messLevel: "medium",
      noiseLevel: "normal",
      supervisionLevel: "mostly-independent",
    },
  },
  siblings: {
    id: "siblings",
    label: "Sibling activity",
    shortLabel: "Siblings",
    description: "30 min · two kids · cooperative",
    moment: {
      parentActivity: "Helping someone else",
      availability: "ask-first",
      timeNeededMinutes: 30,
      space: "Living room",
      messLevel: "low",
      noiseLevel: "normal",
      supervisionLevel: "mostly-independent",
    },
  },
  bedtime: {
    id: "bedtime",
    label: "Winding down before bed",
    shortLabel: "Before bed",
    description: "15 min · calm · quiet",
    moment: {
      parentActivity: "Bedtime routine",
      availability: "ask-first",
      timeNeededMinutes: 15,
      space: "Bedroom",
      messLevel: "low",
      noiseLevel: "quiet",
      supervisionLevel: "nearby",
    },
  },
  exhausted: {
    id: "exhausted",
    label: "I'm exhausted",
    shortLabel: "Exhausted",
    description: "20 min · independent · low mess",
    moment: {
      parentActivity: "Resting",
      availability: "do-not-interrupt",
      timeNeededMinutes: 20,
      space: "Living room",
      messLevel: "low",
      noiseLevel: "quiet",
      supervisionLevel: "independent",
    },
  },
});

export const DEMO_MOMENT_LIST = Object.freeze(Object.values(DEMO_MOMENTS));

export function getDemoMoment(id) {
  return DEMO_MOMENTS[id] || DEMO_MOMENTS.dinner;
}
