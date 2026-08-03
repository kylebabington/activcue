// Static Activity V2 sample for landing preview (no AI).
export const LANDING_ACTIVITY_PREVIEW = {
  activityFormatVersion: 2,
  activityStyle: "imaginative",
  visualTheme: "space",
  title: "Moon Kitchen Rescue",
  theme: "A tiny kitchen on the dark side of the moon",
  summary: "Help the moon crew cook quiet snacks before bedtime orbit.",
  mission:
    "The Moon Kitchen is almost ready for bedtime orbit. You are the Night Chef who keeps everything calm, tidy, and a little magical.",
  roleGuide: {
    name: "Night Chef",
    description: "You cook soft moon snacks and keep the kitchen quiet.",
    goal: "Finish one quiet snack tray before the bedtime light blinks.",
    firstAction: "Put on your imaginary chef hat and check the moon fridge.",
  },
  kidRole: "Night Chef",
  starterIdeas: [
    {
      title: "Name the snack",
      example: "Call it Stardust Toast or Crater Cookies.",
      kind: "imagination",
    },
    {
      title: "Choose a helper",
      example: "Invite a stuffed animal as sous-chef.",
      kind: "choice",
    },
    {
      title: "Quiet kitchen voice",
      example: "Speak like the moon is sleeping nearby.",
      kind: "dialogue",
    },
    {
      title: "Draw the menu",
      example: "Sketch three tiny moon meals on paper.",
      kind: "drawing",
    },
    {
      title: "Build the counter",
      example: "Stack pillows into a soft moon counter.",
      kind: "building",
    },
  ],
  stepDetails: [
    {
      title: "Open the moon fridge",
      instruction: "Find three quiet ingredients from around you.",
      examples: ["A cup", "A napkin", "A stuffed helper"],
      doneWhen: "You lined up three ingredients.",
      ifStuck: "Pick any three soft things and pretend they are moon food.",
      roleInstructions: [],
    },
  ],
  estimatedMinutes: 20,
  energy: "calm",
  mess: "low",
  adultHelp: "optional",
};
