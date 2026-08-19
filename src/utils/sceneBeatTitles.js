/** Short story-beat names for scenes. Never the how-to itself. */

export const SCENE_BEAT_TITLES = {
  space: [
    "Mission Control Wakes Up",
    "A Signal Breaks Through",
    "The Mission Changes",
    "The Launch Window Opens",
    "One More Transmission",
    "Final Transmission",
  ],
  mystery: [
    "The Case Opens",
    "A Clue Changes Everything",
    "Follow the Trail",
    "A New Theory Appears",
    "One Last Detail",
    "The Big Reveal",
  ],
  rescue: [
    "The Call Comes In",
    "Rescue in Motion",
    "The Situation Changes",
    "A New Patient Arrives",
    "Everyone Pulls Together",
    "Everyone Makes It Home",
  ],
  expedition: [
    "Base Camp Opens",
    "The Trail Changes",
    "A Discovery!",
    "The Map Gets Interesting",
    "One Last Stretch",
    "Back to Base",
  ],
  science: [
    "The Lab Lights Up",
    "A Curious Result Appears",
    "Try Your Best Theory",
    "Something Unexpected Happens",
    "Final Test",
    "The Big Reveal",
  ],
  neighborhood: [
    "Doors Open",
    "The First Request Arrives",
    "Something Needs Your Idea",
    "A Surprise Joins In",
    "Almost Ready",
    "Grand Opening",
  ],
  fantasy: [
    "The World Wakes Up",
    "A Twist Appears",
    "Your Choice Changes Things",
    "The Story Turns",
    "One Last Surprise",
    "The Ending Is Yours",
  ],
  animals: [
    "The Animals Need You",
    "A New Visitor Arrives",
    "The Habitat Changes",
    "A Surprise Needs Solving",
    "Almost Home",
    "Happy Ending",
  ],
};

const THEME_ALIASES = {
  jungle: "expedition",
  detective: "mystery",
  building: "neighborhood",
  art: "fantasy",
};

const FALLBACK_BEATS = [
  "The Story Begins",
  "Something Changes",
  "Your Next Move",
  "A New Twist",
  "Almost There",
  "The Big Finish",
];

export function getSceneBeatTitle(visualTheme, index = 0) {
  const key = THEME_ALIASES[visualTheme] || visualTheme;
  const titles = SCENE_BEAT_TITLES[key] || FALLBACK_BEATS;
  const safeIndex = Number.isInteger(Number(index)) ? Number(index) : 0;
  return titles[Math.min(Math.max(safeIndex, 0), titles.length - 1)];
}
