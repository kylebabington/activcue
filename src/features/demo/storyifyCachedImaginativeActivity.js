import { resolveDoneWhen, resolveSceneInstruction, resolveSceneTitle } from "../../utils/questStepCopy";

const YOUNGER_INTROS = {
  space: [
    "A crackle runs through Mission Control—something needs your attention.",
    "Blink! A brand-new signal just appeared on the console.",
    "Hold on—the mission just changed, and only you can decide the next move.",
    "The countdown is moving, and the whole mission is waiting for this part.",
  ],
  mystery: [
    "A case file just slid onto your desk, and the first clue is waiting.",
    "A fresh clue just changed what you thought you knew.",
    "The trail is getting interesting—this is where your detective brain gets to take over.",
    "The answer is close enough to feel. One more move could crack the case.",
  ],
  rescue: [
    "A rescue call just came in, and your team is counting on you.",
    "Good catch—the situation changed while you were working.",
    "A new problem popped up, and your next move matters.",
    "Everyone is almost safe. Bring this rescue home.",
  ],
  expedition: [
    "Base camp just got an update: the adventure starts right here.",
    "The trail takes an unexpected turn, and there is something new to notice.",
    "You spotted something worth investigating—nice timing, explorer.",
    "One last stretch will bring the whole expedition home.",
  ],
  science: [
    "Click! The lab lights are on, and today’s experiment is waiting for you.",
    "Well, that is interesting—a new result just showed up.",
    "Now comes the fun part: test the idea that makes you most curious.",
    "The lab is ready for the big reveal. Show what you discovered.",
  ],
  neighborhood: [
    "The doors are opening, and the very first request has landed with you.",
    "Another request just came in—and this one needs your special touch.",
    "Surprise! Something changed, so you get to invent the next part.",
    "Opening time is almost here. Give this story its big finish.",
  ],
  fantasy: [
    "The world just woke up, and somehow you are exactly the person it needed.",
    "Wait—something unexpected just changed the story.",
    "This choice is yours, and it decides what happens next.",
    "The ending is waiting for you to make it real.",
  ],
  animals: [
    "Psst—the animals have a situation, and they picked you to help.",
    "A new visitor just arrived with a problem of their own.",
    "The habitat changed while you were busy. Time for your best idea.",
    "Almost everyone is settled. Give them the ending they deserve.",
  ],
};

const OLDER_INTROS = {
  space: [
    "Mission Control is live, and the first call is yours.",
    "A new signal just changed the plan.",
    "Now you get to decide how the mission adapts.",
    "The final move is yours to shape.",
  ],
  mystery: [
    "The cold open is yours to set.",
    "A new detail just complicated the case.",
    "This is where your theory gets interesting.",
    "Bring the case home your way.",
  ],
  science: [
    "The experiment is live, and the first variable is yours.",
    "A new result just landed.",
    "Now test the idea you actually find interesting.",
    "Turn the experiment into a result that feels like yours.",
  ],
  neighborhood: [
    "The project is live, and the first decision is yours.",
    "A new request just changed the brief.",
    "Now make the part only you would think of.",
    "Finish it in a way that feels like yours.",
  ],
  expedition: [
    "The route is open, and you control the first move.",
    "A new detail just changed the route.",
    "This is where your read of the situation matters.",
    "Bring the expedition home your way.",
  ],
  rescue: [
    "The situation is live, and the first call is yours.",
    "The conditions just changed.",
    "Now decide how the team adapts.",
    "Bring the operation home your way.",
  ],
  fantasy: [
    "The setup is yours to define.",
    "A new twist just changed the story.",
    "Your choice decides where this goes.",
    "Land the ending your way.",
  ],
  animals: [
    "The scenario is live, and you control the first move.",
    "A new detail just changed the setup.",
    "Now decide how the situation adapts.",
    "Finish it in a way that feels like yours.",
  ],
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeKind(kind) {
  if (["imagination", "choice", "dialogue", "drawing", "building"].includes(kind)) {
    return kind;
  }
  if (kind === "music") return "dialogue";
  return "choice";
}

function inferTheme(activity) {
  if (activity?.visualTheme) return activity.visualTheme;
  const text = `${activity?.slug || ""} ${activity?.title || ""}`.toLowerCase();
  if (/(space|moon|planet|star|constellation|ship)/.test(text)) return "space";
  if (/(detective|clue|mystery|case|oracle)/.test(text)) return "mystery";
  if (/(rescue|clinic|medic|hospital|pet)/.test(text)) return "rescue";
  if (/(jungle|expedition|border|nature|garden|cloud|weather)/.test(text)) return "expedition";
  if (/(robot|lab|spice|invention|science)/.test(text)) return "science";
  if (/(dragon|kingdom|apothecary|treasure|colony|dream|embassy)/.test(text)) return "fantasy";
  if (/(animal|zoo|habitat)/.test(text)) return "animals";
  return "neighborhood";
}

function sceneIntro(theme, index, olderVoice) {
  const library = olderVoice ? OLDER_INTROS : YOUNGER_INTROS;
  const intros = library[theme] || (olderVoice
    ? [
        "Here is the setup, and you control the first move.",
        "New development: the story just shifted.",
        "Your call: decide what happens next.",
        "Final move: finish it your way.",
      ]
    : [
        "Something interesting is already happening, and you are right in the middle of it.",
        "Plot twist! The story just changed.",
        "This is your moment to decide what happens next.",
        "The big finish is close—make this last part yours.",
      ]);
  return intros[Math.min(index, intros.length - 1)];
}

function legacyStepDetails(activity) {
  return safeArray(activity?.steps).map((instruction) => {
    const text = String(instruction || "").trim();
    return {
      title: "",
      instruction: text,
      starterIdeas: [],
      examples: [],
      doneWhen: resolveDoneWhen({ instruction: text, title: text }),
      ifStuck: "",
      roleInstructions: [],
    };
  });
}

function synthesizeStepStarters(step, olderVoice) {
  const existing = safeArray(step?.starterIdeas)
    .filter((idea) => idea && (idea.title || idea.example))
    .map((idea) => ({
      title: "",
      example: String(idea.example || idea.title || "").trim(),
      kind: normalizeKind(idea.kind),
    }));
  if (existing.length >= 2) return existing.slice(0, 3);

  const fromExamples = safeArray(step?.examples)
    .filter(Boolean)
    .slice(0, 3)
    .map((example) => ({
      title: "",
      example: String(example),
      kind: "imagination",
    }));

  const fillers = olderVoice
    ? [
        {
          title: "",
          example: "Do the simplest version of this move first.",
          kind: "choice",
        },
        {
          title: "",
          example: "Give yourself one rule that makes it more interesting.",
          kind: "imagination",
        },
        {
          title: "",
          example: "Draw a tiny plan before you commit.",
          kind: "drawing",
        },
      ]
    : [
        {
          title: "",
          example: "Turn the closest object into part of the scene.",
          kind: "choice",
        },
        {
          title: "",
          example: "Add one silly detail nobody expects.",
          kind: "imagination",
        },
        {
          title: "",
          example: "Make a quick symbol on scrap paper.",
          kind: "drawing",
        },
      ];

  const combined = [...existing, ...fromExamples];
  for (const filler of fillers) {
    if (combined.length >= 3) break;
    combined.push(filler);
  }
  return combined.slice(0, 3);
}

function buildStarterIdeas(activity, stepDetails, olderVoice) {
  const starters = safeArray(activity?.starterIdeas).map((idea) => ({
    title: "",
    example:
      idea?.example ||
      idea?.title ||
      "Choose the version that sounds most interesting to you.",
    kind: normalizeKind(idea?.kind),
  }));

  safeArray(activity?.starterPrompts).forEach((prompt) => {
    if (starters.length >= 5) return;
    starters.push({
      title: "",
      example: prompt,
      kind: starters.length % 2 === 0 ? "imagination" : "choice",
    });
  });

  safeArray(activity?.firstMoves).forEach((move) => {
    if (starters.length >= 5) return;
    starters.push({
      title: "",
      example: move,
      kind: "choice",
    });
  });

  stepDetails.forEach((step) => {
    if (starters.length >= 5) return;
    starters.push({
      title: "",
      example: step.instruction,
      kind: "choice",
    });
  });

  while (starters.length < 5) {
    starters.push({
      title: "",
      example: olderVoice
        ? "Add one detail, constraint, joke, or twist that makes this feel like your version."
        : "Add one silly, surprising, mysterious, or wonderful detail that makes this story feel like yours.",
      kind: "imagination",
    });
  }

  return starters.slice(0, 5);
}

export function storyifyCachedImaginativeActivity(activity) {
  if (!activity || activity.activityStyle !== "imaginative") return activity;
  if (Number(activity.storyVoiceVersion) >= 1) return activity;

  const theme = inferTheme(activity);
  const maxAge = Number(activity?.ageFit?.maxAge) || 0;
  const maturity = activity?.ageFit?.maturityLevel || "child";
  const olderVoice = maxAge >= 12 || maturity === "tween" || maturity === "teen";
  const sourceSteps = safeArray(activity.stepDetails).length > 0
    ? safeArray(activity.stepDetails)
    : legacyStepDetails(activity);

  const stepDetails = sourceSteps.map((step, index) => {
    const originalAction =
      step?.instruction ||
      step?.title ||
      "Choose one small move that pushes the story forward.";
    const action = resolveSceneInstruction(
      { ...step, instruction: originalAction },
      activity,
      index
    );
    const doneWhen = resolveDoneWhen({
      ...step,
      instruction: originalAction,
      title: step?.title,
    });
    const ifStuck = step?.ifStuck
      ? `${olderVoice ? "Quick reset" : "Can't decide"}: ${step.ifStuck}`
      : olderVoice
        ? "Quick reset: choose the easiest version of this move and start there."
        : "Can't decide? Pick the easiest little version of this move and start there.";

    return {
      ...step,
      title: resolveSceneTitle(
        { ...step, instruction: action },
        { ...activity, visualTheme: theme },
        index
      ),
      instruction: `${sceneIntro(theme, index, olderVoice)} ${action}`,
      starterIdeas: synthesizeStepStarters(step, olderVoice),
      examples: safeArray(step?.examples),
      doneWhen,
      ifStuck,
      roleInstructions: safeArray(step?.roleInstructions),
    };
  });

  const starterIdeas = buildStarterIdeas(activity, stepDetails, olderVoice);
  const roleName = activity?.roleGuide?.name || activity?.kidRole || (olderVoice ? "Creative Lead" : "Story Maker");
  const firstAction = activity?.roleGuide?.firstAction
    || safeArray(activity?.firstMoves)[0]
    || stepDetails[0]?.instruction
    || "Pick one story starter and make the first move.";
  let mission = activity?.mission || activity?.theme || activity?.summary || activity?.title || "";

  if (mission.length < 220) {
    mission = olderVoice
      ? `Here’s the setup: ${mission} You decide how it unfolds.`
      : `Something interesting is already happening. ${mission} You are the one who gets to decide how this story goes.`;
  }

  return {
    ...activity,
    activityFormatVersion: 2,
    activityStyle: "imaginative",
    storyVoiceVersion: 1,
    visualTheme: theme,
    mission,
    roleGuide: {
      name: roleName,
      description: activity?.roleGuide?.description
        || (olderVoice
          ? `You are the ${roleName}. You control the choices, the style, and how this activity unfolds.`
          : `You are the ${roleName} at the center of this story. Your ideas are what make the world move.`),
      goal: activity?.roleGuide?.goal || activity?.summary || "Carry the story to a finish that feels like yours.",
      firstAction,
      childRoles: safeArray(activity?.roleGuide?.childRoles),
    },
    starterIdeas,
    starterPrompts: starterIdeas.map((idea) => idea.example),
    firstMoves: stepDetails.slice(0, 3).map((step) => step.instruction),
    stepDetails,
    steps: stepDetails.map((step) => step.instruction),
  };
}
