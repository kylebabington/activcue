import { normalizeTextValue } from "./activityScoring";

const TEMPLATE_LIBRARY = [
  {
    id: "draw-picture",
    title: "Draw a picture",
    categories: ["Art supplies"],
    preferredItems: ["paper", "markers", "crayons", "colored pencils", "sketch pad"],
    mess: "low",
    energy: "low",
    adultHelp: "none",
    steps: ["Get paper and something to draw with.", "Draw whatever you feel like.", "Hang it up or show someone later."],
  },
  {
    id: "coloring",
    title: "Color a page",
    categories: ["Art supplies", "Quiet activities"],
    preferredItems: ["coloring books", "crayons", "markers", "dot markers"],
    mess: "low",
    energy: "low",
    adultHelp: "none",
    steps: ["Pick a coloring page.", "Color one section at a time.", "Fill in details if you want."],
  },
  {
    id: "play-doh",
    title: "Make Play-Doh shapes",
    categories: ["Art supplies", "Quiet activities"],
    preferredItems: ["Play-Doh", "Play-Doh tools", "modeling clay"],
    mess: "medium",
    energy: "low",
    adultHelp: "none",
    steps: ["Open your Play-Doh.", "Roll balls, snakes, or cookies.", "Make one finished shape."],
  },
  {
    id: "block-tower",
    title: "Build a tower",
    categories: ["Building toys"],
    preferredItems: ["wooden blocks", "LEGO", "Duplo", "Mega Bloks", "magnet tiles"],
    mess: "low",
    energy: "medium",
    adultHelp: "none",
    steps: ["Dump out your blocks.", "Build the tallest tower you can.", "See if you can add one more piece."],
  },
  {
    id: "magnet-tiles",
    title: "Build with magnet tiles",
    categories: ["Building toys"],
    preferredItems: ["magnet tiles"],
    mess: "low",
    energy: "medium",
    adultHelp: "none",
    steps: ["Start a flat square floor.", "Add walls.", "Make a roof or window."],
  },
  {
    id: "lego-build",
    title: "Free-build with LEGO",
    categories: ["Building toys"],
    preferredItems: ["LEGO", "Duplo"],
    mess: "low",
    energy: "medium",
    adultHelp: "none",
    steps: ["Pick a handful of bricks.", "Build anything you want.", "Give your build a name."],
  },
  {
    id: "puzzle",
    title: "Do a puzzle",
    categories: ["Board games", "Quiet activities"],
    preferredItems: ["jigsaw puzzles"],
    mess: "low",
    energy: "low",
    adultHelp: "none",
    steps: ["Dump the pieces.", "Find edge pieces first.", "Fill in the middle."],
  },
  {
    id: "card-game",
    title: "Play a simple card game",
    categories: ["Board games"],
    preferredItems: ["playing cards", "Uno", "memory game"],
    mess: "low",
    energy: "low",
    adultHelp: "optional",
    steps: ["Get your cards.", "Shuffle and deal.", "Play one round."],
  },
  {
    id: "stuffed-animals",
    title: "Stuffed animal picnic",
    categories: ["Pretend play", "Household-safe items"],
    preferredItems: ["stuffed animals", "blankets", "pillows", "toy dishes"],
    mess: "low",
    energy: "low",
    adultHelp: "none",
    steps: ["Lay down a blanket.", "Seat your stuffed animals.", "Serve a pretend snack."],
  },
  {
    id: "blanket-fort",
    title: "Build a cozy fort",
    categories: ["Household-safe items"],
    preferredItems: ["blankets", "pillows", "couch cushions", "chairs"],
    mess: "medium",
    energy: "medium",
    adultHelp: "optional",
    steps: ["Gather blankets and pillows.", "Drape a blanket over chairs or the couch.", "Crawl inside and get cozy."],
  },
  {
    id: "reading-nook",
    title: "Make a reading nook",
    categories: ["Books", "Household-safe items"],
    preferredItems: ["picture books", "chapter books", "pillows", "blankets"],
    mess: "low",
    energy: "low",
    adultHelp: "none",
    steps: ["Pick a book.", "Make a comfy spot with pillows.", "Read for a little while."],
  },
  {
    id: "outdoor-ball",
    title: "Ball play outside",
    categories: ["Outdoor gear"],
    preferredItems: ["soccer ball", "basketball", "tennis ball", "football"],
    mess: "low",
    energy: "high",
    adultHelp: "none",
    outdoor: true,
    steps: ["Grab a ball.", "Go to a safe play space.", "Kick, throw, or bounce for a while."],
  },
  {
    id: "bubbles",
    title: "Blow bubbles",
    categories: ["Outdoor gear"],
    preferredItems: ["bubbles"],
    mess: "low",
    energy: "medium",
    adultHelp: "none",
    outdoor: true,
    steps: ["Get the bubble bottle.", "Blow slow bubbles.", "Try to catch one without popping it."],
  },
  {
    id: "sidewalk-chalk",
    title: "Sidewalk chalk art",
    categories: ["Art supplies", "Outdoor gear"],
    preferredItems: ["sidewalk chalk", "chalk bucket"],
    mess: "medium",
    energy: "medium",
    adultHelp: "none",
    outdoor: true,
    steps: ["Take chalk outside.", "Draw a big picture.", "Add your name."],
  },
  {
    id: "action-figures",
    title: "Toy adventure",
    categories: ["Pretend play"],
    preferredItems: ["action figures", "toy cars", "dinosaur figures", "toy animals"],
    mess: "low",
    energy: "medium",
    adultHelp: "none",
    steps: ["Pick a few toys.", "Make up a short adventure.", "Act out the ending."],
  },
];

function inventoryByCategory(inventory) {
  const map = new Map();

  (Array.isArray(inventory) ? inventory : []).forEach((item) => {
    const category = item?.category || "Other";
    const name = typeof item === "string" ? item : item?.name;

    if (!name) {
      return;
    }

    if (!map.has(category)) {
      map.set(category, []);
    }

    map.get(category).push(name);
  });

  return map;
}

function pickMatchingItems(template, inventory) {
  const inventoryNames = (Array.isArray(inventory) ? inventory : [])
    .map((item) => (typeof item === "string" ? item : item?.name))
    .filter(Boolean);

  const preferred = (template.preferredItems || []).filter((preferredItem) =>
    inventoryNames.some((name) => {
      const a = normalizeTextValue(name);
      const b = normalizeTextValue(preferredItem);
      return a.includes(b) || b.includes(a);
    })
  );

  if (preferred.length > 0) {
    return preferred.slice(0, 3);
  }

  const byCategory = inventoryByCategory(inventory);
  const categoryHits = [];

  (template.categories || []).forEach((category) => {
    const items = byCategory.get(category) || [];
    categoryHits.push(...items);
  });

  return [...new Set(categoryHits)].slice(0, 3);
}

function messAllowed(templateMess, momentMess) {
  if (momentMess === "low" && templateMess === "high") {
    return false;
  }

  if (momentMess === "low" && templateMess === "medium") {
    return false;
  }

  return true;
}

function energyAllowed(templateEnergy, momentNoise) {
  if (momentNoise === "quiet" && templateEnergy === "high") {
    return false;
  }

  return true;
}

function adultHelpAllowed(templateHelp, supervision, availability) {
  if (
    (supervision === "independent" || availability === "do-not-interrupt") &&
    templateHelp === "needed"
  ) {
    return false;
  }

  return true;
}

function spaceAllowsOutdoor(space) {
  const normalized = normalizeTextValue(space);
  return (
    normalized.includes("yard") ||
    normalized.includes("outside") ||
    normalized.includes("outdoor") ||
    normalized.includes("patio") ||
    normalized.includes("driveway")
  );
}

export function buildSimpleActivitiesFromTemplates({
  inventory,
  currentMoment,
  count = 3,
}) {
  const targetMinutes = Number(currentMoment?.timeNeededMinutes) || 20;
  const momentMess = normalizeTextValue(currentMoment?.messLevel) || "low";
  const momentNoise = normalizeTextValue(currentMoment?.noiseLevel) || "normal";
  const supervision = normalizeTextValue(currentMoment?.supervisionLevel);
  const availability = normalizeTextValue(currentMoment?.availability);
  const space = currentMoment?.space || "Living room";
  const outdoorOk = spaceAllowsOutdoor(space);

  const candidates = TEMPLATE_LIBRARY.map((template) => {
    const uses = pickMatchingItems(template, inventory);
    let score = uses.length * 3;

    if (uses.length === 0) {
      score -= 4;
    }

    if (!messAllowed(template.mess, momentMess)) {
      score -= 20;
    }

    if (!energyAllowed(template.energy, momentNoise)) {
      score -= 20;
    }

    if (!adultHelpAllowed(template.adultHelp, supervision, availability)) {
      score -= 20;
    }

    if (template.outdoor && !outdoorOk) {
      score -= 20;
    }

    if (momentNoise === "quiet" && template.energy === "low") {
      score += 3;
    }

    return { template, uses, score };
  })
    .filter((entry) => entry.score > -10)
    .sort((a, b) => b.score - a.score);

  const selected = candidates.slice(0, count);

  return selected.map(({ template, uses }) => ({
    title: template.title,
    activityStyle: "simple",
    theme: "",
    summary: `A quick simple activity using what you already have.`,
    kidRole: "",
    mission: "",
    starterPrompts: [],
    firstMoves: template.steps.slice(0, 1),
    steps: template.steps,
    roles: [],
    extensionIdeas: [],
    uses,
    verifiedUses: uses,
    energy: template.energy,
    mess: template.mess,
    adultHelp: template.adultHelp,
    estimatedMinutes: Math.min(targetMinutes, 20),
    whyItFits: `Fits the current moment in ${space} with supplies you own.`,
  }));
}
