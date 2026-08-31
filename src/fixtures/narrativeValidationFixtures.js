/** Negative narrative-quality fixtures — should fail V4 imaginative validation. */

import { QUALITY_CONTRACT_VERSION } from "../../server/utils/activityFormatConstants.js";

const baseV4Imaginative = {
  activityFormatVersion: 4,
  qualityContractVersion: QUALITY_CONTRACT_VERSION,
  activityStyle: "imaginative",
  visualTheme: "animals",
  title: "Placeholder",
  summary: "Placeholder summary for negative fixture.",
  roleGuide: {
    name: "Helper",
    description: "Help with the activity.",
    childRoles: [],
  },
  ageFit: {
    minAge: 6,
    maxAge: 8,
    targetAges: [7],
    maturityLevel: "child",
    independenceLevel: "mostly-independent",
    ageFitReason: "Test fixture.",
  },
  setupGuide: {
    needed: ["pillows", "stuffed animals"],
    steps: ["Place pillows in the room."],
    readyWhen: "Pillows are placed.",
  },
  starterIdeas: [],
  uses: ["pillows", "stuffed animals"],
  energy: "medium",
  mess: "low",
  adultHelp: "none",
  estimatedMinutes: 20,
  categories: ["pretend"],
  traits: {
    setupEffort: "low",
    structure: "guided",
    socialMode: "solo",
    creativity: "medium",
    movement: "medium",
  },
  finishGuide: {
    resolution: "The animals are safe and the original problem is solved.",
    action: "Place the animals on the safe blanket.",
    example: "Say the rescue is complete.",
    doneWhen: "All animals are on the blanket.",
    extensions: [],
  },
};

/** Themed mini-games with no causal chain — scenes are reorderable. */
export const genericThemedTaskListFixture = {
  ...baseV4Imaginative,
  title: "Generic Animal Rescue Tasks",
  story: "Some animals need rescuing before the storm comes.",
  stepDetails: [
    {
      title: "Build a Bridge",
      sceneSetup: "You need to build a bridge.",
      actions: ["Stack pillows.", "Walk across.", "Test the bridge."],
      starterIdeas: [],
      doneWhen: "The bridge is built.",
      sceneOutcome: "The bridge is done.",
      ifStuck: "Use more pillows.",
      roleInstructions: [],
    },
    {
      title: "Find Three Clues",
      sceneSetup: "Now find three clues.",
      actions: [
        "Search under the table.",
        "Look behind the couch.",
        "Check the shelf.",
      ],
      starterIdeas: [],
      doneWhen: "You found three clues.",
      sceneOutcome: "You found the clues.",
      ifStuck: "Look in one more spot.",
      roleInstructions: [],
    },
    {
      title: "Crawl Under the Table",
      sceneSetup: "Crawl under the table.",
      actions: ["Get low.", "Crawl under.", "Stand up on the other side."],
      starterIdeas: [],
      doneWhen: "You crawled through.",
      sceneOutcome: "You made it through.",
      ifStuck: "Go slower.",
      roleInstructions: [],
    },
    {
      title: "Make a Shelter",
      sceneSetup: "Make a shelter for the animals.",
      actions: ["Drape a blanket.", "Add pillows inside.", "Put animals in."],
      starterIdeas: [],
      doneWhen: "The shelter is ready.",
      sceneOutcome: "The animals have a shelter.",
      ifStuck: "Use a chair to hold the blanket up.",
      roleInstructions: [],
    },
  ],
};

/** Decorative story wrapper — action does not solve the stated problem. */
export const decorativeStoryWrapperFixture = {
  ...baseV4Imaginative,
  title: "Kingdom Needs Help",
  story:
    "The kingdom desperately needs help. A great danger threatens everyone and only you can save the day before night falls.",
  stepDetails: [
    {
      title: "Draw a Picture",
      sceneSetup: "The kingdom needs a picture to understand what is happening.",
      actions: [
        "Get paper and crayons.",
        "Draw the castle.",
        "Add the danger.",
        "Show the picture.",
      ],
      starterIdeas: [],
      doneWhen: "The picture is finished.",
      sceneOutcome: "You finished the picture.",
      ifStuck: "Draw one big shape first.",
      roleInstructions: [],
    },
  ],
};

/** Generic transition filler in scene outcomes. */
export const genericTransitionFillerFixture = {
  ...baseV4Imaginative,
  title: "Adventure With Filler Transitions",
  story:
    "A storm flooded the creek beside the animal shelter at Pinecone Wildlife Sanctuary. " +
    "Three young animals are stranded inside and the water is still rising. " +
    "You are the rescue ranger who must reach them before the next storm arrives. " +
    "Each obstacle the storm left behind must be solved in order.",
  stepDetails: [
    {
      title: "Reach the Shelter",
      sceneSetup:
        "The creek flooded the trail, so you cannot walk directly to the shelter door.",
      actions: [
        "Place cushions as stepping stones.",
        "Cross carefully.",
        "Open the shelter.",
      ],
      starterIdeas: [],
      doneWhen: "You are at the shelter door.",
      sceneOutcome: "A new challenge appears.",
      ifStuck: "Move the cushions closer.",
      roleInstructions: [],
    },
    {
      title: "Move the Animals",
      sceneSetup: "Now it is time for the next part.",
      actions: [
        "Pick up one animal.",
        "Carry it to safety.",
        "Go back for the next.",
      ],
      starterIdeas: [],
      doneWhen: "All animals are moved.",
      sceneOutcome: "The adventure continues.",
      ifStuck: "Carry one at a time.",
      roleInstructions: [],
    },
  ],
};
