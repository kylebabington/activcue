// Static Activity V2 sample for landing preview (no AI).
export const LANDING_ACTIVITY_PREVIEW = {
  activityFormatVersion: 2,
  activityStyle: "imaginative",
  visualTheme: "mystery",
  kicker: "Here's what “20 quiet minutes while I cook” looks like",
  title: "Secret Agent Kitchen Watch",
  theme: "A quiet kitchen mission while dinner happens",
  summary: "Protect the kitchen while dinner is prepared — no grown-up needed to run it.",
  mission:
    "You're a secret agent protecting the kitchen while dinner is prepared. Watch for clues, keep the room calm, and build a case file before the grown-up is done.",
  roleGuide: {
    name: "Kitchen Agent",
    description: "You keep watch and collect clues without making a mess.",
    goal: "Finish one case file before dinner is ready.",
    firstAction: "Pick three objects in the room and decide which one hides the secret message.",
  },
  kidRole: "Kitchen Agent",
  uses: ["paper", "pencil", "3 household objects"],
  firstMove:
    "Pick three objects in the room. Decide which one contains the secret message.",
  ifStuck: "Start with something red.",
  finish: "Present your case file to the grown-up when dinner is ready.",
  meta: ["20 min", "age 8", "independent", "almost no cleanup"],
  situationId: "cook-dinner",
  starterIdeas: [
    {
      title: "Code name",
      example: "Call the mission Operation Quiet Spoon.",
      kind: "imagination",
    },
    {
      title: "Pick a lookout",
      example: "A chair becomes Agent Watchtower.",
      kind: "choice",
    },
  ],
  stepDetails: [
    {
      title: "Find the secret message",
      instruction:
        "Pick three objects in the room. Decide which one contains the secret message.",
      starterIdeas: [
        {
          title: "Start with red",
          example: "The red thing is always the first clue.",
          kind: "choice",
        },
      ],
      examples: ["A spoon", "A napkin", "A lid"],
      doneWhen: "You can point to the object that holds the secret message.",
      ifStuck: "Start with something red.",
      roleInstructions: [],
    },
  ],
  estimatedMinutes: 20,
  energy: "calm",
  mess: "low",
  adultHelp: "none",
};
