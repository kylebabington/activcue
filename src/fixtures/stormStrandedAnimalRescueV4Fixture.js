/** Golden Activity Format V4 reference — Storm-Stranded Animal Rescue. */

import { QUALITY_CONTRACT_VERSION } from "../../server/utils/activityFormatConstants.js";

export const stormStrandedAnimalRescueV4Fixture = {
  activityFormatVersion: 4,
  qualityContractVersion: QUALITY_CONTRACT_VERSION,
  title: "Storm-Stranded Animal Rescue",
  activityStyle: "imaginative",
  visualTheme: "rescue",
  story:
    "Overnight, a thunderstorm tore through Pinecone Wildlife Sanctuary and flooded the creek beside the animal shelter. " +
    "Three young stuffed animals are still inside the shelter, but the water is rising and another storm is forecast before sunset. " +
    "The wooden bridge washed away, so nobody can reach the shelter from the main trail until a safe crossing is built. " +
    "You are the rescue ranger who must reach them, move them safely to the ranger station, and get everyone inside before the weather worsens. " +
    "If the animals stay stranded when the next storm hits, the rising water could reach the shelter door.",
  summary:
    "Build a safe creek crossing, carry an injured fox on a stretcher, and find an alternate trail to the ranger station.",
  roleGuide: {
    name: "Rescue Ranger",
    description:
      "Reach the stranded animals, solve each obstacle the storm left behind, and get everyone to safety.",
    childRoles: [],
  },
  ageFit: {
    minAge: 6,
    maxAge: 8,
    targetAges: [7],
    maturityLevel: "child",
    independenceLevel: "mostly-independent",
    ageFitReason:
      "Short building, carrying, and walking steps a child can do with couch cushions and stuffed animals.",
  },
  setupGuide: {
    needed: [
      "3 stuffed animals",
      "4 couch cushions or pillows",
      "1 small towel",
      "2 chairs",
      "1 blanket",
    ],
    steps: [
      "Put the three stuffed animals on a pillow at one end of the room — this is the flooded shelter.",
      "Place two couch cushions about three feet apart to mark the creek banks.",
      "Put the ranger station blanket on a chair at the opposite end of the room.",
      "Lay the towel flat beside the creek as a spare supply.",
    ],
    readyWhen:
      "You can point to the shelter, the creek, and the ranger station chair.",
  },
  starterIdeas: [
    {
      title: "Fox friend",
      example: "Name the smallest animal Fox and let it be the one who gets hurt.",
      kind: "imagination",
    },
    {
      title: "Storm sounds",
      example:
        "Hum quietly like wind while you work so it feels like the storm is still nearby.",
      kind: "imagination",
    },
  ],
  stepDetails: [
    {
      title: "Cross the Flooded Creek",
      sceneSetup:
        "The wooden bridge washed away in the storm, and the rushing creek blocks the path to the shelter. You cannot reach the animals until you build a safe crossing.",
      actions: [
        "Place two couch cushions about three feet apart to mark the creek banks.",
        "Put pillows between them to make stepping stones across the water.",
        "Test the path by stepping across without touching the floor.",
        "Carry one stuffed animal across and set it on the far bank.",
        "Carry the other two animals across the same way.",
      ],
      starterIdeas: [
        {
          title: "Wide stepping stones",
          example: "Use the biggest pillows first so the path feels steady.",
          kind: "building",
        },
      ],
      doneWhen:
        "All three animals are on the far side of the creek and none are touching the floor.",
      sceneOutcome:
        "Everyone makes it across, but the smallest fox is limping. It hurt its paw on a loose branch during the storm and cannot walk the rocky trail ahead.",
      ifStuck:
        "Make the stepping stones closer together and hop from pillow to pillow.",
      roleInstructions: [],
    },
    {
      title: "Help the Injured Fox",
      sceneSetup:
        "The fox cannot walk on its hurt paw, so the rescue team must carry it the rest of the way. You need a stretcher before anyone can move farther.",
      actions: [
        "Lay the towel flat on the floor.",
        "Place a small pillow in the center of the towel.",
        "Set the injured fox on the pillow.",
        "Fold the towel ends up on both sides like handles.",
        "Practice lifting the stretcher a few inches without dropping the fox.",
      ],
      starterIdeas: [
        {
          title: "Gentle carry",
          example: "Move slowly and say 'easy does it' each time you lift.",
          kind: "imagination",
        },
      ],
      doneWhen:
        "The fox rests on the stretcher and you can lift it without it sliding off.",
      sceneOutcome:
        "The stretcher works, but a fallen tree now blocks the main trail between you and the ranger station.",
      ifStuck:
        "Roll the towel tighter around the pillow so the fox stays in place.",
      roleInstructions: [],
    },
    {
      title: "Find the Alternate Trail",
      sceneSetup:
        "The fallen tree blocks the normal route, so you must find a safe alternate path around it to reach the ranger station before the next storm hits.",
      actions: [
        "Walk along the wall to see if there is a clear path around the tree.",
        "Move one cushion to mark the first turn in the new route.",
        "Place another cushion where the path turns again toward the ranger station.",
        "Carry the stretcher along the new route slowly.",
        "Set the stretcher beside the ranger station chair.",
      ],
      starterIdeas: [
        {
          title: "Trail markers",
          example: "Tap each cushion as you pass it so you remember the turns.",
          kind: "choice",
        },
      ],
      doneWhen:
        "The stretcher with the fox is beside the ranger station chair.",
      sceneOutcome:
        "You reach the ranger station just as thunder rumbles again — there is no time left to wait outside.",
      ifStuck:
        "Make the alternate path wider by moving the cushions farther apart.",
      roleInstructions: [],
    },
  ],
  finishGuide: {
    resolution:
      "All three animals are safe inside the ranger station before the next storm arrives, and the flooded shelter is empty.",
    action:
      "Place all three animals on the ranger station blanket and cover them with the edge of the blanket.",
    example:
      "Tuck each animal in and say 'The rescue is complete — everyone is safe inside.'",
    doneWhen:
      "All three animals rest on the ranger station blanket and you announced the rescue is complete.",
    extensions: [
      "Draw a map of the route you used.",
      "Reset the creek and trail for another rescue.",
    ],
  },
  uses: [
    "stuffed animals",
    "couch cushions or pillows",
    "towel",
    "chairs",
    "blanket",
  ],
  energy: "medium",
  mess: "low",
  adultHelp: "none",
  estimatedMinutes: 25,
  whyItFits:
    "Active rescue play using cushions and stuffed animals already in the room.",
  categories: ["pretend", "movement"],
  traits: {
    setupEffort: "medium",
    structure: "guided",
    socialMode: "solo",
    creativity: "medium",
    movement: "medium",
  },
};
