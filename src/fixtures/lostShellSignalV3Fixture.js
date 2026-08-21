/** Golden Activity Format V3 reference — The Lost Shell Signal. */

export const lostShellSignalV3Fixture = {
  activityFormatVersion: 3,
  title: "The Lost Shell Signal",
  activityStyle: "imaginative",
  visualTheme: "animals",
  story:
    "Three ocean clues washed up on shore, but nobody knows what they mean together. You are the Sea Signal Finder who must visit each station and decode the message before the tide changes.",
  summary:
    "Decode three face-down ocean clues at pillow stations and tell your stuffed-animal partner what the complete signal means.",
  roleGuide: {
    name: "Sea Signal Finder",
    description:
      "Visit each station, read one clue, and decide what it means before moving to the next.",
    childRoles: [],
  },
  ageFit: {
    minAge: 7,
    maxAge: 10,
    targetAges: [8],
    maturityLevel: "child",
    independenceLevel: "mostly-independent",
    ageFitReason: "Short walking, drawing, and talking steps a child can do alone.",
  },
  setupGuide: {
    needed: [
      "3 pieces of paper",
      "crayons",
      "1 stuffed animal",
      "3 pillows or folded blankets",
    ],
    steps: [
      "Put one pillow or folded blanket in three different parts of the room.",
      "Draw one ocean clue on each piece of paper.",
      "Put one clue face down at each station.",
      "Place your stuffed animal beside your starting spot.",
    ],
    readyWhen:
      "You can point to three stations and each station has one face-down clue.",
  },
  starterIdeas: [
    {
      title: "Storm warning",
      example: "Three slow taps could mean a storm is coming.",
      kind: "imagination",
    },
    {
      title: "Safe harbor",
      example: "A shell pointing left could mean swim toward the rocks.",
      kind: "choice",
    },
  ],
  stepDetails: [
    {
      title: "The First Signal",
      actions: [
        "Walk slowly to Station 1.",
        "Stand beside the pillow or blanket.",
        "Turn over the clue.",
        "Look at it for five seconds.",
        "Say what you think the clue means.",
        "Bring the clue back to your stuffed-animal partner.",
      ],
      starterIdeas: [
        {
          title: "Wave clue",
          example: "Draw three wavy lines to mean rough water.",
          kind: "drawing",
        },
      ],
      doneWhen:
        "The first clue is beside your stuffed animal and you have decided what it means.",
      ifStuck:
        "Say the name of the thing you drew and use that as the message.",
      roleInstructions: [],
    },
    {
      title: "The Second Signal",
      actions: [
        "Walk to Station 2.",
        "Turn over the second clue.",
        "Compare it to the first clue.",
        "Say how the two clues might connect.",
        "Place both clues beside your stuffed animal.",
      ],
      starterIdeas: [
        {
          title: "Fish clue",
          example: "Draw a fish swimming away from the waves.",
          kind: "drawing",
        },
      ],
      doneWhen:
        "Two clues are beside your stuffed animal and you said how they connect.",
      ifStuck: "Pick one word from each clue and say them in one sentence.",
      roleInstructions: [],
    },
    {
      title: "The Third Signal",
      actions: [
        "Walk to Station 3.",
        "Turn over the third clue.",
        "Line up all three clues in order.",
        "Say what the full signal might mean.",
      ],
      starterIdeas: [
        {
          title: "Storm story",
          example: "Say the clues mean a storm warning for the fish.",
          kind: "imagination",
        },
      ],
      doneWhen: "All three clues are lined up and you said what the full signal means.",
      ifStuck: "Start with the word storm, fish, or shell and build one sentence.",
      roleInstructions: [],
    },
    {
      title: "Report to Your Partner",
      actions: [
        "Sit beside your stuffed animal.",
        "Point to each clue in order.",
        "Tell your partner the complete signal in one short story.",
      ],
      starterIdeas: [
        {
          title: "One-sentence signal",
          example:
            "First rough waves, then fish swam away, so the shells warned of a storm.",
          kind: "choice",
        },
      ],
      doneWhen:
        "You told your stuffed animal one complete message using all three clues.",
      ifStuck: "Use this pattern: First ___, then ___, so now ___.",
      roleInstructions: [],
    },
  ],
  finishGuide: {
    action:
      "Put all three clues in order and tell your stuffed-animal partner what the complete signal means.",
    example:
      "The waves got rough, the fish swam away, and the shells were warning everyone about a storm.",
    doneWhen:
      "You have used all three clues to tell one complete message.",
    extensions: ["Draw the complete signal.", "Reset the stations with new clues."],
  },
  uses: ["paper", "crayons", "stuffed animal", "pillows or blankets"],
  energy: "low",
  mess: "low",
  adultHelp: "none",
  estimatedMinutes: 20,
  whyItFits: "Quiet movement and drawing with things already in the room.",
  categories: ["pretend", "creative"],
  traits: {
    setupEffort: "medium",
    structure: "guided",
    socialMode: "solo",
    creativity: "high",
    movement: "low",
  },
};
