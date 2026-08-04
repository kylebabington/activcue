-- supabase/migrations/20260804000000_expand_preset_activities_with_agefit.sql

/*
 * Expand preset_activities with ageFit / categories / traits metadata and
 * many new curated simple + imaginative presets (~80–90 total library).
 *
 * - Existing 18 slugs: jsonb-merge enrichment onto full_content
 * - New slugs: insert with full content (idempotent via ON CONFLICT)
 */

begin;

/*
 * EXISTING PRESETS — merge ageFit / categories / traits
 * =====================================================
 */

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 5,
      "maxAge": 12,
      "targetAges": [
        5,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "independent",
      "ageFitReason": "Familiar quiet drawing works across early school ages."
    },
    "categories": [
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "open-ended",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    }
  }
  $$::jsonb,
  updated_at = now()
where slug = 'draw-a-picture';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 5,
      "maxAge": 12,
      "targetAges": [
        5,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "independent",
      "ageFitReason": "Coloring is clear and calm for a wide age band."
    },
    "categories": [
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "low"
    }
  }
  $$::jsonb,
  updated_at = now()
where slug = 'color-a-page';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 4,
      "maxAge": 9,
      "targetAges": [
        4,
        7,
        9
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Block towers fit younger builders without complex planning."
    },
    "categories": [
      "building"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "open-ended",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "low"
    }
  }
  $$::jsonb,
  updated_at = now()
where slug = 'build-a-tower';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 5,
      "maxAge": 12,
      "targetAges": [
        5,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "independent",
      "ageFitReason": "Puzzle difficulty can flex across elementary ages."
    },
    "categories": [
      "puzzle"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "low",
      "movement": "low"
    }
  }
  $$::jsonb,
  updated_at = now()
where slug = 'do-a-puzzle';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 5,
      "maxAge": 12,
      "targetAges": [
        5,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "independent",
      "ageFitReason": "A cozy reading spot suits independent quiet time for many ages."
    },
    "categories": [
      "reading"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "open-ended",
      "socialMode": "solo",
      "creativity": "low",
      "movement": "low"
    }
  }
  $$::jsonb,
  updated_at = now()
where slug = 'make-a-reading-nook';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 5,
      "maxAge": 12,
      "targetAges": [
        5,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "some-help",
      "ageFitReason": "Simple card rules work for kids who can take turns."
    },
    "categories": [
      "social-game"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "cooperative",
      "creativity": "low",
      "movement": "low"
    }
  }
  $$::jsonb,
  updated_at = now()
where slug = 'play-a-simple-card-game';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 4,
      "maxAge": 9,
      "targetAges": [
        4,
        7,
        9
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Blanket forts are a sweet spot for younger builders."
    },
    "categories": [
      "building",
      "pretend"
    ],
    "traits": {
      "setupEffort": "medium",
      "structure": "open-ended",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "medium"
    }
  }
  $$::jsonb,
  updated_at = now()
where slug = 'build-a-cozy-fort';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 4,
      "maxAge": 9,
      "targetAges": [
        4,
        7,
        9
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Play-Doh play is hands-on and self-directed for younger kids."
    },
    "categories": [
      "sensory",
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "open-ended",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    }
  }
  $$::jsonb,
  updated_at = now()
where slug = 'make-play-doh-shapes';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 5,
      "maxAge": 12,
      "targetAges": [
        5,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "independent",
      "ageFitReason": "Outdoor ball play burns energy across elementary ages."
    },
    "categories": [
      "movement"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "open-ended",
      "socialMode": "solo",
      "creativity": "low",
      "movement": "high"
    }
  }
  $$::jsonb,
  updated_at = now()
where slug = 'ball-play-outside';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Quiet undersea story missions fit early elementary explorers."
    },
    "categories": [
      "pretend",
      "nature"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "medium"
    },
    "visualTheme": "expedition"
  }
  $$::jsonb,
  updated_at = now()
where slug = 'the-lost-shell-signal';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Bakery pretend play matches kitchen-table ages 5–10."
    },
    "categories": [
      "pretend",
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "neighborhood"
  }
  $$::jsonb,
  updated_at = now()
where slug = 'tiny-bakery-counter';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Gentle detective clues suit quiet independent play."
    },
    "categories": [
      "pretend",
      "puzzle"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "low"
    },
    "visualTheme": "detective"
  }
  $$::jsonb,
  updated_at = now()
where slug = 'the-quiet-clue-room';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 8,
      "maxAge": 13,
      "targetAges": [
        8,
        11,
        13
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Map-then-build planning rewards older elementary and tweens."
    },
    "categories": [
      "building",
      "creative"
    ],
    "traits": {
      "setupEffort": "medium",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "building"
  }
  $$::jsonb,
  updated_at = now()
where slug = 'downtown-map-maker';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Nurturing pet clinic play fits caring early elementary kids."
    },
    "categories": [
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "low"
    },
    "visualTheme": "animals"
  }
  $$::jsonb,
  updated_at = now()
where slug = 'stuffed-pet-clinic';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 8,
      "maxAge": 13,
      "targetAges": [
        8,
        11,
        13
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Exhibit recovery missions suit more independent explorers."
    },
    "categories": [
      "pretend",
      "puzzle"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "medium"
    },
    "visualTheme": "expedition"
  }
  $$::jsonb,
  updated_at = now()
where slug = 'museum-of-lost-exhibits';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 6,
      "maxAge": 11,
      "targetAges": [
        6,
        9,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Weather-map storytelling fits mid-elementary curiosity."
    },
    "categories": [
      "nature",
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "jungle"
  }
  $$::jsonb,
  updated_at = now()
where slug = 'nature-magic-weather-map';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 6,
      "maxAge": 11,
      "targetAges": [
        6,
        9,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Circus acts give mid-age kids a playful movement stage."
    },
    "categories": [
      "movement",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "open-ended",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "high"
    },
    "visualTheme": "fantasy"
  }
  $$::jsonb,
  updated_at = now()
where slug = 'living-room-circus-show';

update public.preset_activities
set
  full_content = full_content || $$
  {
    "ageFit": {
      "minAge": 8,
      "maxAge": 13,
      "targetAges": [
        8,
        11,
        13
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Courier routes reward kids who can follow multi-stop missions."
    },
    "categories": [
      "movement",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "high"
    },
    "visualTheme": "neighborhood"
  }
  $$::jsonb,
  updated_at = now()
where slug = 'hallway-map-courier';

/*
 * NEW PRESETS — insert or update by slug
 * ======================================
 */

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'kitchen-comic-studio',
  'Kitchen Comic Studio',
  'Draw a three-panel comic about tonight’s dinner while the kitchen hums.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Fold paper into three comic panels."
    ],
    "steps": [
      "Fold paper into three comic panels.",
      "Sketch a silly dinner scene in each panel.",
      "Add speech bubbles and a punchline ending."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "paper",
      "markers",
      "pencil"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "nearby",
    "whyItFits": "Keeps a child creatively busy at the table while dinner is underway.",
    "ageFit": {
      "minAge": 7,
      "maxAge": 12,
      "targetAges": [
        7,
        10,
        12
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 7–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  10
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'countertop-design-challenge',
  'Countertop Design Challenge',
  'Arrange safe kitchen tools into the coolest countertop sculpture you can.',
  '',
  15,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Gather 5–8 safe kitchen tools from a parent-approved pile."
    ],
    "steps": [
      "Gather 5–8 safe kitchen tools from a parent-approved pile.",
      "Build a standing sculpture on a placemat.",
      "Photograph or sketch your design before cleanup."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "wooden spoons",
      "measuring cups",
      "placemat"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "nearby",
    "whyItFits": "Hands-busy kitchen play that stays contained while a parent cooks.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 9,
      "targetAges": [
        5,
        7,
        9
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 5–9 with the independence and complexity this activity needs."
    },
    "categories": [
      "building",
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  11
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'taste-test-scientist',
  'Taste-Test Scientist',
  'Compare two safe snacks and write a tiny science verdict.',
  '',
  15,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Get two parent-approved snack samples."
    ],
    "steps": [
      "Get two parent-approved snack samples.",
      "Taste each and note crunch, sweetness, and favorite.",
      "Write a one-sentence scientist verdict."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "paper",
      "pencil",
      "two snack samples"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "required",
    "whyItFits": "Turns waiting in the kitchen into a structured tasting experiment.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 11,
      "targetAges": [
        6,
        9,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "adult-led",
      "ageFitReason": "Fits ages 6–11 with the independence and complexity this activity needs."
    },
    "categories": [
      "science",
      "helping"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  12
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'phone-photography-challenge',
  'Phone Photography Challenge',
  'Capture ten quiet detail photos around the house on a borrowed phone.',
  '',
  25,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Ask to borrow a phone on camera-only mode."
    ],
    "steps": [
      "Ask to borrow a phone on camera-only mode.",
      "Shoot ten close-up detail photos of ordinary objects.",
      "Pick your favorite three and name each shot."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "phone camera"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Independent, quiet, and absorbing during a work call.",
    "ageFit": {
      "minAge": 10,
      "maxAge": 16,
      "targetAges": [
        10,
        13,
        16
      ],
      "maturityLevel": "tween",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 10–16 with the independence and complexity this activity needs."
    },
    "categories": [
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  13
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'quiet-clue-desk',
  'Quiet Clue Desk',
  'Build a desk mystery with three objects and solve which one does not belong.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Place three safe objects on a desk or table."
    ],
    "steps": [
      "Place three safe objects on a desk or table.",
      "Decide a secret rule for which one is the odd clue.",
      "Write your case notes and announce the solution."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "three household objects",
      "paper",
      "pencil"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Silent desk detective work for do-not-interrupt moments.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 11,
      "targetAges": [
        6,
        9,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 6–11 with the independence and complexity this activity needs."
    },
    "categories": [
      "puzzle",
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  14
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'sock-basketball',
  'Sock Basketball',
  'Roll socks into balls and sink as many laundry-basket shots as you can.',
  '',
  15,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Roll 6–10 clean socks into soft balls."
    ],
    "steps": [
      "Roll 6–10 clean socks into soft balls.",
      "Set a laundry basket as the hoop.",
      "Take turns shooting from three marked spots."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "socks",
      "laundry basket"
    ],
    "energy": "high",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Indoor energy burn with almost no setup or mess.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 12,
      "targetAges": [
        5,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 5–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "movement"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "open-ended",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "high"
    }
  }
  $$::jsonb,
  true,
  15
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'hallway-hopscotch-map',
  'Hallway Hopscotch Map',
  'Tape a hopscotch path and race your own best time.',
  '',
  15,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Use painter’s tape to mark hopscotch squares."
    ],
    "steps": [
      "Use painter’s tape to mark hopscotch squares.",
      "Practice the pattern once slowly.",
      "Time three full runs and beat your score."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "painter's tape",
      "timer or clock"
    ],
    "energy": "high",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Quick indoor movement when kids need to burn energy.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 5–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "movement"
    ],
    "traits": {
      "setupEffort": "medium",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "high"
    }
  }
  $$::jsonb,
  true,
  16
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'pillow-fort-broadcast',
  'Pillow Fort Broadcast',
  'Build a pillow booth and host a five-minute radio show.',
  '',
  25,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Stack pillows into a broadcast booth."
    ],
    "steps": [
      "Stack pillows into a broadcast booth.",
      "Write a short show script with three segments.",
      "Perform the broadcast in a soft voice."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "pillows",
      "blanket",
      "paper",
      "pencil"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "optional",
    "whyItFits": "Combines building and storytelling for a rainy stretch.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 11,
      "targetAges": [
        6,
        9,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 6–11 with the independence and complexity this activity needs."
    },
    "categories": [
      "building",
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "medium"
    }
  }
  $$::jsonb,
  true,
  17
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'rainy-window-gallery',
  'Rainy Window Gallery',
  'Tape paper to a window and paint the weather you see outside.',
  '',
  30,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Tape paper to a window at kid height."
    ],
    "steps": [
      "Tape paper to a window at kid height.",
      "Draw or paint the rain, sky, and outdoor shapes.",
      "Title your gallery piece and leave it to dry."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "paper",
      "tape",
      "markers or washable paints"
    ],
    "energy": "low",
    "mess": "medium",
    "adultHelp": "optional",
    "whyItFits": "Turns a rainy afternoon into a focused art session.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 5–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "creative",
      "nature"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  18
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'bedtime-story-map',
  'Bedtime Story Map',
  'Draw a tiny map of tonight’s story world before lights-out.',
  '',
  15,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Choose a bedtime story or make one up."
    ],
    "steps": [
      "Choose a bedtime story or make one up.",
      "Draw three places from the story on one page.",
      "Trace a dotted path that a character will travel."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "paper",
      "crayon",
      "pencil"
    ],
    "energy": "calm",
    "mess": "low",
    "adultHelp": "nearby",
    "whyItFits": "Wind-down creative ritual that stays quiet and short.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 5–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "creative",
      "reading"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  19
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'shadow-theater-lights-out',
  'Shadow Theater Lights-Out',
  'Make hand shadows on the wall and put on a soft bedtime show.',
  '',
  15,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Dim the room and use a flashlight or lamp."
    ],
    "steps": [
      "Dim the room and use a flashlight or lamp.",
      "Practice three animal or character shadows.",
      "Tell a one-minute shadow story before bed."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "flashlight or lamp",
      "blank wall"
    ],
    "energy": "calm",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Calming, low-mess bedtime play with almost no cleanup.",
    "ageFit": {
      "minAge": 4,
      "maxAge": 8,
      "targetAges": [
        4,
        6,
        8
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 4–8 with the independence and complexity this activity needs."
    },
    "categories": [
      "creative",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  20
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'sibling-obstacle-relay',
  'Sibling Obstacle Relay',
  'Design a living-room obstacle course and race it as a team.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Set up four safe stations with pillows and chairs."
    ],
    "steps": [
      "Set up four safe stations with pillows and chairs.",
      "Agree on the course route together.",
      "Race once as rivals, then once as a cooperative team."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "pillows",
      "chairs",
      "tape markers"
    ],
    "energy": "high",
    "mess": "medium",
    "adultHelp": "nearby",
    "whyItFits": "Gives siblings a shared physical challenge with clear turns.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 12,
      "targetAges": [
        6,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 6–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "movement",
      "social-game"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "cooperative",
      "creativity": "medium",
      "movement": "high"
    }
  }
  $$::jsonb,
  true,
  21
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'two-kid-tower-treaty',
  'Two-Kid Tower Treaty',
  'Build one shared tower where each sibling adds every other block.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Dump out blocks and clear a build zone."
    ],
    "steps": [
      "Dump out blocks and clear a build zone.",
      "Take turns adding one piece without knocking it down.",
      "Name the finished tower and celebrate the treaty."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "blocks",
      "LEGO",
      "magnet tiles"
    ],
    "energy": "medium",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Structured turn-taking building that reduces sibling friction.",
    "ageFit": {
      "minAge": 4,
      "maxAge": 9,
      "targetAges": [
        4,
        7,
        9
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 4–9 with the independence and complexity this activity needs."
    },
    "categories": [
      "building",
      "social-game"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "cooperative",
      "creativity": "medium",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  22
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'couch-camp-reset',
  'Couch Camp Reset',
  'Make a tiny couch camp and do three quiet reset stations.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Claim a couch corner with a blanket."
    ],
    "steps": [
      "Claim a couch corner with a blanket.",
      "Complete three calm stations: stretch, sip water, doodle.",
      "Rate how your body feels after the reset."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "blanket",
      "paper",
      "pencil",
      "water bottle"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Independent low-energy play when a parent is exhausted.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 11,
      "targetAges": [
        5,
        8,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 5–11 with the independence and complexity this activity needs."
    },
    "categories": [
      "sensory",
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  23
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'sticker-story-strip',
  'Sticker Story Strip',
  'Tell a whole story using only stickers on one strip of paper.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Cut or fold a long paper strip."
    ],
    "steps": [
      "Cut or fold a long paper strip.",
      "Place stickers left to right like comic frames.",
      "Whisper the story to yourself from start to finish."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "stickers",
      "paper"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Quiet, contained, and easy when energy is low or someone is sick.",
    "ageFit": {
      "minAge": 4,
      "maxAge": 8,
      "targetAges": [
        4,
        6,
        8
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 4–8 with the independence and complexity this activity needs."
    },
    "categories": [
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  24
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'blanket-burrito-listen',
  'Blanket Burrito Listen',
  'Wrap up cozy and listen to an audiobook chapter or soft playlist.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Wrap yourself in a soft blanket burrito."
    ],
    "steps": [
      "Wrap yourself in a soft blanket burrito.",
      "Start one audiobook chapter or calm playlist.",
      "Stay still until the chapter ends."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "blanket",
      "audiobook or music player"
    ],
    "energy": "calm",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Restorative quiet time for sick days or low-energy afternoons.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 12,
      "targetAges": [
        5,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 5–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "reading",
      "sensory"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "open-ended",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  25
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'open-afternoon-invention-lab',
  'Open Afternoon Invention Lab',
  'Invent a helpful gadget from cardboard and tape, then demo it.',
  '',
  40,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Name a household problem your invention will solve."
    ],
    "steps": [
      "Name a household problem your invention will solve.",
      "Build a prototype from cardboard, tape, and scrap.",
      "Demo the invention in a one-minute pitch."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "cardboard",
      "tape",
      "scissors",
      "markers"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "optional",
    "whyItFits": "Flexible open-afternoon maker project with a clear finish line.",
    "ageFit": {
      "minAge": 8,
      "maxAge": 14,
      "targetAges": [
        8,
        11,
        14
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 8–14 with the independence and complexity this activity needs."
    },
    "categories": [
      "building",
      "science"
    ],
    "traits": {
      "setupEffort": "medium",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  26
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'living-room-museum-labels',
  'Living Room Museum Labels',
  'Turn ordinary objects into museum exhibits with handwritten labels.',
  '',
  30,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Choose five ordinary objects as exhibits."
    ],
    "steps": [
      "Choose five ordinary objects as exhibits.",
      "Write a museum label for each one.",
      "Lead a short tour for anyone who walks by."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "paper",
      "tape",
      "markers",
      "household objects"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Self-paced creative play for an open afternoon at home.",
    "ageFit": {
      "minAge": 7,
      "maxAge": 12,
      "targetAges": [
        7,
        10,
        12
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 7–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "creative",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  27
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'tidy-up-treasure-sort',
  'Tidy-Up Treasure Sort',
  'Sort a messy zone into treasure, keep, and put-away piles.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Pick one small messy zone with a parent."
    ],
    "steps": [
      "Pick one small messy zone with a parent.",
      "Make three piles: treasure, keep nearby, put away.",
      "Return put-away items and celebrate the clear space."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "three baskets or boxes"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "nearby",
    "whyItFits": "Turns cleaning into a clear sorting game kids can finish.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 5–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "helping"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "low",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  28
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'sock-match-speed-run',
  'Sock Match Speed Run',
  'Race the clock to match every sock in the laundry pile.',
  '',
  15,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Dump clean socks into one pile."
    ],
    "steps": [
      "Dump clean socks into one pile.",
      "Start a timer and match pairs as fast as you can.",
      "Fold matched pairs and stack them neatly."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "clean laundry socks",
      "timer"
    ],
    "energy": "medium",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Helpful cleaning chore wrapped in a speedy challenge.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 12,
      "targetAges": [
        6,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 6–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "helping",
      "social-game"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "medium"
    }
  }
  $$::jsonb,
  true,
  29
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'teen-playlist-curator',
  'Teen Playlist Curator',
  'Build a 30-minute mood playlist and write liner notes for three tracks.',
  '',
  30,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Pick a mood theme for the playlist."
    ],
    "steps": [
      "Pick a mood theme for the playlist.",
      "Add 8–12 songs that fit the theme.",
      "Write short liner notes for your top three tracks."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "music app",
      "paper or notes app"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Independent teen-friendly creative work during quiet parent time.",
    "ageFit": {
      "minAge": 12,
      "maxAge": 16,
      "targetAges": [
        12,
        14,
        16
      ],
      "maturityLevel": "tween",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 12–16 with the independence and complexity this activity needs."
    },
    "categories": [
      "music",
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "open-ended",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  30
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'teen-room-reset-sprint',
  'Teen Room Reset Sprint',
  'Reset your room in three timed 7-minute sprints with a before/after photo.',
  '',
  25,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Take a quick before photo."
    ],
    "steps": [
      "Take a quick before photo.",
      "Do three 7-minute resets: floor, surfaces, backpack zone.",
      "Take an after photo and note what still needs a pass."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "phone camera",
      "timer",
      "trash bag"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "none",
    "whyItFits": "Teen-scale cleaning that feels like a challenge, not a lecture.",
    "ageFit": {
      "minAge": 12,
      "maxAge": 16,
      "targetAges": [
        12,
        14,
        16
      ],
      "maturityLevel": "tween",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 12–16 with the independence and complexity this activity needs."
    },
    "categories": [
      "helping"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "low",
      "movement": "medium"
    }
  }
  $$::jsonb,
  true,
  31
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'magazine-mashup-collage',
  'Magazine Mashup Collage',
  'Cut and glue a dream-world collage from old magazines.',
  '',
  35,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Flip through magazines and tear out inspiring scraps."
    ],
    "steps": [
      "Flip through magazines and tear out inspiring scraps.",
      "Arrange a dream-world scene before gluing.",
      "Glue it down and give the collage a title."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "old magazines",
      "scissors",
      "glue",
      "paper"
    ],
    "energy": "low",
    "mess": "medium",
    "adultHelp": "optional",
    "whyItFits": "Absorbing rainy-day creative work with flexible pacing.",
    "ageFit": {
      "minAge": 8,
      "maxAge": 14,
      "targetAges": [
        8,
        11,
        14
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 8–14 with the independence and complexity this activity needs."
    },
    "categories": [
      "creative",
      "art"
    ],
    "traits": {
      "setupEffort": "medium",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  32
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'indoor-yoga-animal-flow',
  'Indoor Yoga Animal Flow',
  'Move through a short animal yoga flow to shake out big energy.',
  '',
  12,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Clear a small mat-sized floor space."
    ],
    "steps": [
      "Clear a small mat-sized floor space.",
      "Hold cat, downward dog, frog, and flamingo for a few breaths each.",
      "Finish with a quiet mountain pose and one deep breath."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "yoga mat or towel"
    ],
    "energy": "medium",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Quick indoor movement reset without toys or noise.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 12,
      "targetAges": [
        5,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 5–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "movement",
      "sensory"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "medium"
    }
  }
  $$::jsonb,
  true,
  33
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'dinner-helper-chop-station',
  'Dinner Helper Chop Station',
  'Wash and prep parent-approved ingredients at a kid chop station.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Wash hands and claim a cutting board station."
    ],
    "steps": [
      "Wash hands and claim a cutting board station.",
      "Wash produce and tear lettuce or soft herbs.",
      "Arrange prepped pieces in bowls for the cook."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "cutting board",
      "bowl",
      "salad spinner or colander"
    ],
    "energy": "low",
    "mess": "medium",
    "adultHelp": "nearby",
    "whyItFits": "Real kitchen helping that keeps kids useful during dinner prep.",
    "ageFit": {
      "minAge": 7,
      "maxAge": 13,
      "targetAges": [
        7,
        10,
        13
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 7–13 with the independence and complexity this activity needs."
    },
    "categories": [
      "helping"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "low",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  34
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'work-call-origami-desk',
  'Work-Call Origami Desk',
  'Fold three quiet paper creatures at a desk while a call runs.',
  '',
  25,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Set out square paper at a quiet desk."
    ],
    "steps": [
      "Set out square paper at a quiet desk.",
      "Fold three simple shapes from a printed guide or memory.",
      "Line them up as a tiny desk zoo."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "square paper",
      "optional origami guide"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Silent fine-motor focus that does not interrupt a work call.",
    "ageFit": {
      "minAge": 8,
      "maxAge": 14,
      "targetAges": [
        8,
        11,
        14
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 8–14 with the independence and complexity this activity needs."
    },
    "categories": [
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "low"
    }
  }
  $$::jsonb,
  true,
  35
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'secret-spice-lab',
  'Secret Spice Lab',
  'Run a pretend spice lab that invents safe dinner scents for tonight’s chef.',
  'A top-secret kitchen lab opens only while dinner is cooking.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Spice Scientist",
    "mission": "The kitchen chef needs three new aroma ideas before plating. You are the Spice Scientist. Set up a smelling lab with safe jars or spoons, invent three scent stories, and deliver a tasting-menu card to the cook.",
    "starterPrompts": [
      "What scent would make broccoli heroic?",
      "Which jar is the rarest spice?",
      "How will you present your menu card?"
    ],
    "firstMoves": [
      "Claim a placemat lab station.",
      "Line up three safe smelling jars or spoons.",
      "Name each scent invention out loud."
    ],
    "steps": [
      "Build your spice lab: Set up three smelling stations.",
      "Invent aromas: Name each scent and what meal it belongs to.",
      "Deliver the menu: Hand the cook a tasting-menu card."
    ],
    "roles": [
      "Spice Scientist",
      "Menu Courier"
    ],
    "extensionIdeas": [
      "Invent a dessert aroma sequel.",
      "Draw packaging for each spice."
    ],
    "uses": [
      "paper",
      "markers",
      "safe spice jars or spoons",
      "placemat"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "nearby",
    "whyItFits": "Kitchen-adjacent pretend science that stays out of the hot zone.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 11,
      "targetAges": [
        6,
        9,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 6–11 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "science"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "science",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Spice Scientist",
      "description": "You invent safe dinner aromas and document them like a lab.",
      "goal": "Deliver three aroma inventions on a tasting-menu card.",
      "firstAction": "Claim a placemat as your lab bench.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Hero broccoli mist",
        "example": "A scent that makes veggies feel brave.",
        "kind": "imagination"
      },
      {
        "title": "Midnight garlic signal",
        "example": "A rare jar that only opens at dinner.",
        "kind": "choice"
      },
      {
        "title": "Sunny lemon flare",
        "example": "A bright scent for tired cooks.",
        "kind": "imagination"
      }
    ],
    "stepDetails": [
      {
        "title": "Build your spice lab",
        "instruction": "Set up three smelling stations on a placemat.",
        "examples": [
          "Use empty spice jars or clean spoons."
        ],
        "doneWhen": "Three stations are labeled.",
        "ifStuck": "Use sticky notes as jar labels.",
        "roleInstructions": []
      },
      {
        "title": "Invent aromas",
        "instruction": "Name each scent and what meal it belongs to.",
        "examples": [
          "Hero broccoli mist for greens."
        ],
        "doneWhen": "You have three named inventions.",
        "ifStuck": "Copy a real spice name and twist it.",
        "roleInstructions": []
      },
      {
        "title": "Deliver the menu",
        "instruction": "Hand the cook a tasting-menu card.",
        "examples": [
          "Three lines, one aroma each."
        ],
        "doneWhen": "The cook has your card.",
        "ifStuck": "Read the menu aloud from across the kitchen.",
        "roleInstructions": [
          {
            "roleName": "Menu Courier",
            "instruction": "Carry the card without touching hot pans."
          }
        ]
      }
    ]
  }
  $$::jsonb,
  true,
  110
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'dinner-news-desk',
  'Dinner News Desk',
  'Anchor a kitchen news desk that reports on dinner progress in quiet whispers.',
  'Breaking news from the dinner counter needs a calm reporter.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Kitchen News Anchor",
    "mission": "Dinner is underway and the household needs a calm update every few minutes. You are the Kitchen News Anchor. Build a tiny news desk, observe safely from a distance, and deliver three whispered news briefs.",
    "starterPrompts": [
      "What is the lead dinner headline?",
      "Who is your co-anchor?",
      "What weather is happening above the stove steam?"
    ],
    "firstMoves": [
      "Stack books into a news desk.",
      "Make a paper microphone.",
      "Write three short headlines."
    ],
    "steps": [
      "Build the news desk: Stack a desk and paper mic.",
      "Write three briefs: Observe dinner from a safe distance.",
      "Whisper the broadcast: Deliver each update quietly."
    ],
    "roles": [
      "Kitchen News Anchor",
      "Weather Reporter"
    ],
    "extensionIdeas": [
      "Add a commercial break for napkins.",
      "Interview a wooden spoon."
    ],
    "uses": [
      "paper",
      "pencil",
      "books",
      "stuffed co-anchor"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "nearby",
    "whyItFits": "Gives a cooking parent updates without needing conversation mid-stir.",
    "ageFit": {
      "minAge": 7,
      "maxAge": 12,
      "targetAges": [
        7,
        10,
        12
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 7–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "neighborhood",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Kitchen News Anchor",
      "description": "You deliver calm dinner updates without interrupting the cook.",
      "goal": "Deliver three whispered news briefs about dinner.",
      "firstAction": "Build a tiny news desk from books.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Steam rising bulletin",
        "example": "Steam means the pot is working hard.",
        "kind": "observation"
      },
      {
        "title": "Chopping soundtrack",
        "example": "Knife sounds mean prep is still going.",
        "kind": "observation"
      },
      {
        "title": "Timer countdown alert",
        "example": "A timer beep becomes breaking news.",
        "kind": "choice"
      }
    ],
    "stepDetails": [
      {
        "title": "Build the news desk",
        "instruction": "Stack a desk and paper mic.",
        "examples": [
          "Two books + rolled paper mic."
        ],
        "doneWhen": "You have a sitting broadcast spot.",
        "ifStuck": "Use the kitchen table corner.",
        "roleInstructions": []
      },
      {
        "title": "Write three briefs",
        "instruction": "Observe dinner from a safe distance and jot headlines.",
        "examples": [
          "Steam rising bulletin."
        ],
        "doneWhen": "Three headlines exist.",
        "ifStuck": "Use smell, sound, and timer as your sources.",
        "roleInstructions": []
      },
      {
        "title": "Whisper the broadcast",
        "instruction": "Deliver each update quietly.",
        "examples": [
          "Hold the paper mic and whisper."
        ],
        "doneWhen": "All three briefs are delivered.",
        "ifStuck": "Read them to a stuffed co-anchor.",
        "roleInstructions": [
          {
            "roleName": "Weather Reporter",
            "instruction": "Describe stove steam as weather."
          }
        ]
      }
    ]
  }
  $$::jsonb,
  true,
  111
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'silent-space-relay',
  'Silent Space Relay',
  'Run a silent moon-base message relay that never needs a parent’s voice.',
  'A moon base must pass three urgent notes without making a sound.',
  25,
  'imaginative',
  $$
  {
    "kidRole": "Silent Relay Captain",
    "mission": "Night crew is sleeping and Mission Control is on a call. You are Silent Relay Captain. Build a message station, write three urgent moon notes, and deliver them to pillow drop zones without speaking.",
    "starterPrompts": [
      "What is the first urgent moon note?",
      "Where is Drop Zone Alpha?",
      "How will you move without sound?"
    ],
    "firstMoves": [
      "Claim a desk as Mission Control.",
      "Label three pillow drop zones.",
      "Write note one in pencil."
    ],
    "steps": [
      "Build Mission Control: Make a quiet message desk.",
      "Write three notes: Create urgent moon messages.",
      "Silent delivery: Place each note on a pillow drop zone."
    ],
    "roles": [
      "Silent Relay Captain",
      "Drop Zone Runner"
    ],
    "extensionIdeas": [
      "Add a fourth emergency note.",
      "Draw a moon-base floor plan."
    ],
    "uses": [
      "paper",
      "pencil",
      "pillows",
      "books"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Near-silent imaginative play for work-call independence.",
    "ageFit": {
      "minAge": 7,
      "maxAge": 12,
      "targetAges": [
        7,
        10,
        12
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 7–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "space",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Silent Relay Captain",
      "description": "You keep moon communications alive without speaking.",
      "goal": "Deliver three silent notes to pillow drop zones.",
      "firstAction": "Claim a desk as Mission Control.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Oxygen tank check",
        "example": "Ask night crew to check tank pressure.",
        "kind": "imagination"
      },
      {
        "title": "Lost rover ping",
        "example": "A rover needs a quiet beacon.",
        "kind": "choice"
      },
      {
        "title": "Earth hello",
        "example": "Send a calm hello back to Earth.",
        "kind": "imagination"
      }
    ],
    "stepDetails": [
      {
        "title": "Build Mission Control",
        "instruction": "Make a quiet message desk.",
        "examples": [
          "Books as radio towers."
        ],
        "doneWhen": "You have a writing spot.",
        "ifStuck": "Use a chair seat as the desk.",
        "roleInstructions": []
      },
      {
        "title": "Write three notes",
        "instruction": "Create urgent moon messages.",
        "examples": [
          "Oxygen tank check."
        ],
        "doneWhen": "Three notes are written.",
        "ifStuck": "Draw picture notes instead.",
        "roleInstructions": []
      },
      {
        "title": "Silent delivery",
        "instruction": "Place each note on a pillow drop zone.",
        "examples": [
          "Tip-toe to Drop Zone Alpha."
        ],
        "doneWhen": "All notes are delivered.",
        "ifStuck": "Slide notes along the floor quietly.",
        "roleInstructions": [
          {
            "roleName": "Drop Zone Runner",
            "instruction": "Confirm each pillow zone with a silent thumbs-up."
          }
        ]
      }
    ]
  }
  $$::jsonb,
  true,
  112
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'quiet-clue-desk-case',
  'Quiet Clue Desk Case',
  'Solve a whisper-only detective case from a desk while adults are on calls.',
  'A hush case file opens on a living-room desk.',
  25,
  'imaginative',
  $$
  {
    "kidRole": "Desk Detective",
    "mission": "Three clues were left during the quiet hours, and one does not belong. You are Desk Detective. Study the evidence without interrupting anyone, write a case verdict, and close the file.",
    "starterPrompts": [
      "Which clue looks oddest?",
      "What rule makes one clue different?",
      "How will you announce the verdict silently?"
    ],
    "firstMoves": [
      "Place three safe objects on the desk.",
      "Draw a case file header.",
      "Circle your first suspect clue."
    ],
    "steps": [
      "Set the evidence: Place three desk clues.",
      "Study quietly: Note size, color, and purpose.",
      "Close the case: Write and reveal your verdict."
    ],
    "roles": [
      "Desk Detective"
    ],
    "extensionIdeas": [
      "Swap the odd clue and re-solve.",
      "Make a second case file for a sibling."
    ],
    "uses": [
      "three household objects",
      "paper",
      "pencil",
      "flashlight optional"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Perfect do-not-interrupt detective play for work-call windows.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 11,
      "targetAges": [
        6,
        9,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 6–11 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "puzzle"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "detective",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Desk Detective",
      "description": "You solve hush cases without needing adult help.",
      "goal": "Identify the odd clue and write a quiet verdict.",
      "firstAction": "Place three safe objects on the desk.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Odd shape rule",
        "example": "Two are round; one is not.",
        "kind": "choice"
      },
      {
        "title": "Odd job rule",
        "example": "Two are tools; one is a toy.",
        "kind": "choice"
      },
      {
        "title": "Odd color rule",
        "example": "Two match; one breaks the pattern.",
        "kind": "observation"
      }
    ],
    "stepDetails": [
      {
        "title": "Set the evidence",
        "instruction": "Place three desk clues.",
        "examples": [
          "Pencil, spoon, toy car."
        ],
        "doneWhen": "Three objects are lined up.",
        "ifStuck": "Ask silently for any three safe items nearby.",
        "roleInstructions": []
      },
      {
        "title": "Study quietly",
        "instruction": "Note size, color, and purpose.",
        "examples": [
          "Write one observation per clue."
        ],
        "doneWhen": "You have notes for each object.",
        "ifStuck": "Use a flashlight to look closer.",
        "roleInstructions": []
      },
      {
        "title": "Close the case",
        "instruction": "Write and reveal your verdict.",
        "examples": [
          "The spoon is the odd job."
        ],
        "doneWhen": "A verdict sentence is written.",
        "ifStuck": "Point to the odd clue and mime a gavel.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  113
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'indoor-jungle-expedition',
  'Indoor Jungle Expedition',
  'Map a living-room jungle and recover three lost trail markers before dusk.',
  'Rain traps the expedition indoors, but the jungle still needs mapping.',
  35,
  'imaginative',
  $$
  {
    "kidRole": "Trail Cartographer",
    "mission": "Storm clouds closed the outdoor trail, so the jungle moved inside. You are Trail Cartographer. Hide three trail markers, draw a room map, and recover each marker before imaginary dusk.",
    "starterPrompts": [
      "Where does the jungle canopy begin?",
      "What do your trail markers look like?",
      "What animal sound warns of dusk?"
    ],
    "firstMoves": [
      "Hide three paper trail markers.",
      "Draw a rough room map.",
      "Put on an explorer scarf or hat."
    ],
    "steps": [
      "Hide the markers: Place three trail markers around the room.",
      "Map the jungle: Draw paths between landmarks.",
      "Recover before dusk: Find each marker using your map."
    ],
    "roles": [
      "Trail Cartographer",
      "Jungle Scout"
    ],
    "extensionIdeas": [
      "Add a river crossing of pillows.",
      "Sketch a newly discovered plant."
    ],
    "uses": [
      "paper",
      "markers",
      "pillows",
      "scarf or hat"
    ],
    "energy": "medium",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Active rainy-day adventure that stays indoors and flexible.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 11,
      "targetAges": [
        6,
        9,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 6–11 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "nature",
      "movement"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "medium"
    },
    "visualTheme": "jungle",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Trail Cartographer",
      "description": "You map the indoor jungle and protect the trail markers.",
      "goal": "Recover three trail markers using your room map.",
      "firstAction": "Hide three paper trail markers.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Canopy corner",
        "example": "A curtain becomes thick leaves.",
        "kind": "imagination"
      },
      {
        "title": "River pillows",
        "example": "Pillows are a river you must hop.",
        "kind": "choice"
      },
      {
        "title": "Dusk drumbeat",
        "example": "Clap quietly when dusk arrives.",
        "kind": "choice"
      }
    ],
    "stepDetails": [
      {
        "title": "Hide the markers",
        "instruction": "Place three trail markers around the room.",
        "examples": [
          "Paper circles labeled A, B, C."
        ],
        "doneWhen": "Markers are hidden but findable.",
        "ifStuck": "Ask a sibling to hide them.",
        "roleInstructions": [
          {
            "roleName": "Jungle Scout",
            "instruction": "Hide one marker in a tougher spot."
          }
        ]
      },
      {
        "title": "Map the jungle",
        "instruction": "Draw paths between landmarks.",
        "examples": [
          "Couch = canopy base camp."
        ],
        "doneWhen": "Map shows three marker zones.",
        "ifStuck": "Trace the room outline first.",
        "roleInstructions": []
      },
      {
        "title": "Recover before dusk",
        "instruction": "Find each marker using your map.",
        "examples": [
          "Check canopy corner first."
        ],
        "doneWhen": "All three markers are recovered.",
        "ifStuck": "Use animal sounds as location hints.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  114
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'storm-fort-command',
  'Storm Fort Command',
  'Build a storm fort HQ and keep a rainy-day weather log for three storms.',
  'A living-room fort becomes storm command for the afternoon.',
  40,
  'imaginative',
  $$
  {
    "kidRole": "Storm Commander",
    "mission": "Rain is pounding outside and Command needs a safe HQ. You are Storm Commander. Build a fort headquarters, track three pretend storm waves, and keep a weather log until skies clear.",
    "starterPrompts": [
      "Where is the safest fort wall?",
      "What does storm wave two sound like?",
      "Who is on radio duty?"
    ],
    "firstMoves": [
      "Drape blankets over chairs.",
      "Bring a flashlight into the fort.",
      "Start a weather log page."
    ],
    "steps": [
      "Build HQ: Make a storm fort from blankets.",
      "Log three storms: Track each wave in your weather log.",
      "All-clear signal: Announce skies are clearing."
    ],
    "roles": [
      "Storm Commander",
      "Radio Operator"
    ],
    "extensionIdeas": [
      "Invent a fourth surprise storm.",
      "Draw a storm map of the house."
    ],
    "uses": [
      "blankets",
      "chairs",
      "flashlight",
      "paper",
      "pencil"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "optional",
    "whyItFits": "Long rainy-afternoon build-and-story play with a clear mission arc.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 5–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "building",
      "pretend",
      "nature"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "medium"
    },
    "visualTheme": "expedition",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Storm Commander",
      "description": "You run storm fort HQ and keep everyone weather-ready.",
      "goal": "Log three storm waves from inside the fort.",
      "firstAction": "Drape blankets over chairs for HQ walls.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Lightning tap code",
        "example": "Tap the floor for distant lightning.",
        "kind": "choice"
      },
      {
        "title": "Wind whistle watch",
        "example": "Listen for wind between updates.",
        "kind": "observation"
      },
      {
        "title": "Supply check",
        "example": "Count snacks and flashlights.",
        "kind": "choice"
      }
    ],
    "stepDetails": [
      {
        "title": "Build HQ",
        "instruction": "Make a storm fort from blankets.",
        "examples": [
          "Chairs + blanket roof."
        ],
        "doneWhen": "You can sit fully inside.",
        "ifStuck": "Use the couch as one fort wall.",
        "roleInstructions": []
      },
      {
        "title": "Log three storms",
        "instruction": "Track each wave in your weather log.",
        "examples": [
          "Wave 1: light rain."
        ],
        "doneWhen": "Three log entries exist.",
        "ifStuck": "Use real window weather as inspiration.",
        "roleInstructions": [
          {
            "roleName": "Radio Operator",
            "instruction": "Call out each storm name before logging."
          }
        ]
      },
      {
        "title": "All-clear signal",
        "instruction": "Announce skies are clearing.",
        "examples": [
          "Flash the light three times."
        ],
        "doneWhen": "You give an all-clear.",
        "ifStuck": "Draw a sun on the log page.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  115
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'hallway-rescue-sprint',
  'Hallway Rescue Sprint',
  'Sprint a hallway rescue route to save three stuffed animals before the timer ends.',
  'A hallway becomes an emergency rescue corridor.',
  15,
  'imaginative',
  $$
  {
    "kidRole": "Rescue Runner",
    "mission": "Three stuffed animals are stranded along the hallway and the timer is ticking. You are Rescue Runner. Plan a safe route, sprint each rescue without crashing, and bring every patient to base camp.",
    "starterPrompts": [
      "Where is base camp?",
      "Which animal is hardest to reach?",
      "What is your rescue call sign?"
    ],
    "firstMoves": [
      "Place three stuffed animals along the hallway.",
      "Mark base camp with a pillow.",
      "Set a two-minute timer for round one."
    ],
    "steps": [
      "Stage the rescue: Place three stranded animals.",
      "Sprint and save: Bring each one to base camp.",
      "Medic check: Give each patient a quick care line."
    ],
    "roles": [
      "Rescue Runner",
      "Base Camp Medic"
    ],
    "extensionIdeas": [
      "Add a fourth stranded animal.",
      "Try a no-hands carry challenge."
    ],
    "uses": [
      "stuffed animals",
      "pillow",
      "timer"
    ],
    "energy": "high",
    "mess": "low",
    "adultHelp": "nearby",
    "whyItFits": "High-movement indoor rescue play when kids need to burn energy.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 5–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "movement",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "high"
    },
    "visualTheme": "rescue",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Rescue Runner",
      "description": "You race the hallway to save stranded stuffed patients.",
      "goal": "Rescue three stuffed animals before the timer ends.",
      "firstAction": "Place three stuffed animals along the hallway.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Far-end stranded fox",
        "example": "The farthest animal needs priority.",
        "kind": "choice"
      },
      {
        "title": "Doorway hazard",
        "example": "Slow down at door frames.",
        "kind": "observation"
      },
      {
        "title": "Two-minute round",
        "example": "Beat the clock, then reset.",
        "kind": "choice"
      }
    ],
    "stepDetails": [
      {
        "title": "Stage the rescue",
        "instruction": "Place three stranded animals.",
        "examples": [
          "Near, mid, and far hallway spots."
        ],
        "doneWhen": "Animals are placed and base camp is marked.",
        "ifStuck": "Use socks as stand-in patients.",
        "roleInstructions": []
      },
      {
        "title": "Sprint and save",
        "instruction": "Bring each one to base camp.",
        "examples": [
          "One animal per sprint."
        ],
        "doneWhen": "All three are at base camp.",
        "ifStuck": "Walk-run if the floor is slippery.",
        "roleInstructions": []
      },
      {
        "title": "Medic check",
        "instruction": "Give each patient a quick care line.",
        "examples": [
          "You are safe now."
        ],
        "doneWhen": "Each animal gets a care sentence.",
        "ifStuck": "Pat each one once as a check.",
        "roleInstructions": [
          {
            "roleName": "Base Camp Medic",
            "instruction": "Line patients up for check-in."
          }
        ]
      }
    ]
  }
  $$::jsonb,
  true,
  116
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'living-room-olympic-trials',
  'Living Room Olympic Trials',
  'Host three Olympic trial events with scorecards and a medal ceremony.',
  'The living room stadium opens for kid Olympic trials.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Athlete and Judge",
    "mission": "Trials day has arrived and the stadium lights are on. You are Athlete and Judge. Set three safe events, score each attempt, and award a medal to yourself or a sibling.",
    "starterPrompts": [
      "Which three events will you host?",
      "How do you score a perfect 10?",
      "What song plays at the medal ceremony?"
    ],
    "firstMoves": [
      "Clear a safe event lane.",
      "Make a paper scorecard.",
      "Invent a medal from foil or paper."
    ],
    "steps": [
      "Set the stadium: Mark three event stations.",
      "Compete: Complete each event and score it.",
      "Medal ceremony: Award the winner with a short speech."
    ],
    "roles": [
      "Athlete",
      "Judge",
      "Medal Bearer"
    ],
    "extensionIdeas": [
      "Add a relay finale.",
      "Invite a stuffed animal coach."
    ],
    "uses": [
      "paper",
      "pencil",
      "tape lane markers",
      "foil or paper medal"
    ],
    "energy": "high",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Structured high-energy movement with a clear beginning and end.",
    "ageFit": {
      "minAge": 7,
      "maxAge": 13,
      "targetAges": [
        7,
        10,
        13
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 7–13 with the independence and complexity this activity needs."
    },
    "categories": [
      "movement",
      "social-game"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "cooperative",
      "creativity": "high",
      "movement": "high"
    },
    "visualTheme": "fantasy",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Athlete and Judge",
      "description": "You run and score the living-room Olympic trials.",
      "goal": "Finish three events and hold a medal ceremony.",
      "firstAction": "Clear a safe event lane.",
      "childRoles": [
        {
          "childName": "Older sibling",
          "age": 11,
          "roleTitle": "Head Judge",
          "responsibility": "Keep the scorecard honest.",
          "firstAction": "Write event names on the card."
        },
        {
          "childName": "Younger sibling",
          "age": 7,
          "roleTitle": "Sprint Athlete",
          "responsibility": "Run the movement events.",
          "firstAction": "Practice the starting pose."
        }
      ]
    },
    "starterIdeas": [
      {
        "title": "Sock shot put",
        "example": "Toss a sock ball for distance.",
        "kind": "choice"
      },
      {
        "title": "Balance beam tape",
        "example": "Walk a taped line heel-to-toe.",
        "kind": "choice"
      },
      {
        "title": "Pillow hurdle hop",
        "example": "Hop over two pillow hurdles.",
        "kind": "choice"
      }
    ],
    "stepDetails": [
      {
        "title": "Set the stadium",
        "instruction": "Mark three event stations.",
        "examples": [
          "Tape line, pillow hurdles, sock toss."
        ],
        "doneWhen": "All three stations are ready.",
        "ifStuck": "Use furniture legs as lane markers.",
        "roleInstructions": [
          {
            "roleName": "Head Judge",
            "instruction": "Label each station on the scorecard."
          }
        ]
      },
      {
        "title": "Compete",
        "instruction": "Complete each event and score it.",
        "examples": [
          "Score 1–10 per event."
        ],
        "doneWhen": "All events have scores.",
        "ifStuck": "Do one practice try that does not count.",
        "roleInstructions": [
          {
            "roleName": "Sprint Athlete",
            "instruction": "Cheer yourself after each event."
          }
        ]
      },
      {
        "title": "Medal ceremony",
        "instruction": "Award the winner with a short speech.",
        "examples": [
          "For bravery on the balance beam..."
        ],
        "doneWhen": "A medal is awarded.",
        "ifStuck": "Both athletes get participant medals.",
        "roleInstructions": [
          {
            "roleName": "Medal Bearer",
            "instruction": "Place the medal gently and bow."
          }
        ]
      }
    ]
  }
  $$::jsonb,
  true,
  117
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'moonlight-library-patrol',
  'Moonlight Library Patrol',
  'Patrol a bedtime library of pillows and tuck three story characters in for the night.',
  'A soft moonlight library needs a gentle night patrol.',
  15,
  'imaginative',
  $$
  {
    "kidRole": "Night Librarian",
    "mission": "The moonlight library is almost closed, but three story characters are still awake. You are Night Librarian. Visit each pillow shelf, share a tiny calm line, and tuck every character in before lights-out.",
    "starterPrompts": [
      "Which character is still awake?",
      "What calm line helps them sleep?",
      "Where is the last pillow shelf?"
    ],
    "firstMoves": [
      "Arrange three pillow shelves.",
      "Choose three stuffed characters.",
      "Dim the lights a little."
    ],
    "steps": [
      "Open the library: Arrange pillow shelves and characters.",
      "Night patrol: Visit each character with a calm line.",
      "Lights-out: Tuck everyone in and close the library."
    ],
    "roles": [
      "Night Librarian"
    ],
    "extensionIdeas": [
      "Add a fourth sleepy visitor.",
      "Whisper a one-sentence epilogue."
    ],
    "uses": [
      "pillows",
      "stuffed animals",
      "soft lamp"
    ],
    "energy": "calm",
    "mess": "low",
    "adultHelp": "nearby",
    "whyItFits": "Gentle imaginative wind-down that ends naturally at bedtime.",
    "ageFit": {
      "minAge": 4,
      "maxAge": 8,
      "targetAges": [
        4,
        6,
        8
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 4–8 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "reading"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "fantasy",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Night Librarian",
      "description": "You gently close the moonlight library for bedtime.",
      "goal": "Tuck three story characters in before lights-out.",
      "firstAction": "Arrange three pillow shelves.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Sleepy dragon",
        "example": "The dragon needs one quiet compliment.",
        "kind": "imagination"
      },
      {
        "title": "Lost bookmark fox",
        "example": "The fox cannot find tomorrow’s page.",
        "kind": "imagination"
      },
      {
        "title": "Star owl",
        "example": "The owl wants one last constellation story.",
        "kind": "choice"
      }
    ],
    "stepDetails": [
      {
        "title": "Open the library",
        "instruction": "Arrange pillow shelves and characters.",
        "examples": [
          "One character per pillow."
        ],
        "doneWhen": "Three characters are seated.",
        "ifStuck": "Use folded shirts as pillows.",
        "roleInstructions": []
      },
      {
        "title": "Night patrol",
        "instruction": "Visit each character with a calm line.",
        "examples": [
          "Tomorrow’s story will wait for you."
        ],
        "doneWhen": "Each character hears a calm line.",
        "ifStuck": "Hum one soft note instead.",
        "roleInstructions": []
      },
      {
        "title": "Lights-out",
        "instruction": "Tuck everyone in and close the library.",
        "examples": [
          "Blanket over each pillow shelf."
        ],
        "doneWhen": "All characters are tucked in.",
        "ifStuck": "Turn the lamp one notch darker.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  118
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'dream-ship-boarding',
  'Dream Ship Boarding',
  'Board a bedtime dream ship and pack three calm cargo items for the night voyage.',
  'A quiet dream ship docks at the bed for tonight’s voyage.',
  15,
  'imaginative',
  $$
  {
    "kidRole": "Dream Captain",
    "mission": "The dream ship is ready to sail into sleep, but cargo still needs packing. You are Dream Captain. Choose three calm cargo items, stow them by the pillow, and give the all-aboard whisper.",
    "starterPrompts": [
      "What calm cargo helps you sleep?",
      "Where is the ship’s pillow helm?",
      "What is your all-aboard whisper?"
    ],
    "firstMoves": [
      "Sit on the bed as the ship deck.",
      "Pick three calm cargo items.",
      "Place them near the pillow helm."
    ],
    "steps": [
      "Board the ship: Sit on the bed deck.",
      "Pack calm cargo: Stow three comfort items.",
      "All-aboard whisper: Close the voyage for sleep."
    ],
    "roles": [
      "Dream Captain",
      "Cargo Keeper"
    ],
    "extensionIdeas": [
      "Draw a tiny ship log.",
      "Name tomorrow’s destination dream."
    ],
    "uses": [
      "bed",
      "pillow",
      "three small comfort items"
    ],
    "energy": "calm",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Bedtime ritual play that channels imagination into settling down.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 9,
      "targetAges": [
        5,
        7,
        9
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 5–9 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "expedition",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Dream Captain",
      "description": "You prepare the dream ship for a calm night voyage.",
      "goal": "Pack three calm cargo items and whisper all-aboard.",
      "firstAction": "Sit on the bed as the ship deck.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Soft lighthouse",
        "example": "A nightlight becomes the ship lighthouse.",
        "kind": "imagination"
      },
      {
        "title": "Memory map",
        "example": "A drawing is the voyage map.",
        "kind": "choice"
      },
      {
        "title": "Courage pebble",
        "example": "A small object holds brave dreams.",
        "kind": "imagination"
      }
    ],
    "stepDetails": [
      {
        "title": "Board the ship",
        "instruction": "Sit on the bed deck.",
        "examples": [
          "Pillow is the helm."
        ],
        "doneWhen": "You are seated at the helm.",
        "ifStuck": "Sit beside the bed if climbing is hard.",
        "roleInstructions": []
      },
      {
        "title": "Pack calm cargo",
        "instruction": "Stow three comfort items.",
        "examples": [
          "Stuffed friend, book, water bottle."
        ],
        "doneWhen": "Three items are by the pillow.",
        "ifStuck": "Choose any three soft things.",
        "roleInstructions": [
          {
            "roleName": "Cargo Keeper",
            "instruction": "Name each item as it is stowed."
          }
        ]
      },
      {
        "title": "All-aboard whisper",
        "instruction": "Close the voyage for sleep.",
        "examples": [
          "Whisper: Dream ship departing."
        ],
        "doneWhen": "You give the whisper and lie down.",
        "ifStuck": "Count three soft breaths instead.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  119
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'sibling-detective-bureau',
  'Sibling Detective Bureau',
  'Open a two-agent detective bureau and crack one shared household mystery.',
  'A sibling detective bureau opens for one important case.',
  30,
  'imaginative',
  $$
  {
    "kidRole": "Lead Detective",
    "mission": "A household mystery needs two detectives with different jobs. You and your sibling open the bureau, gather three clues, and agree on one case solution before filing the report.",
    "starterPrompts": [
      "What mystery will you solve today?",
      "Who is Lead Detective and who is Evidence Runner?",
      "Where is the bureau desk?"
    ],
    "firstMoves": [
      "Claim a bureau desk together.",
      "Write the case title.",
      "Assign Lead Detective and Evidence Runner."
    ],
    "steps": [
      "Open the bureau: Assign roles and write the case title.",
      "Gather clues: Collect three pieces of evidence.",
      "Agree and file: Decide one solution and file the report."
    ],
    "roles": [
      "Lead Detective",
      "Evidence Runner"
    ],
    "extensionIdeas": [
      "Open a second case with swapped roles.",
      "Make badge stickers."
    ],
    "uses": [
      "paper",
      "pencil",
      "three clue objects",
      "stickers optional"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Cooperative mystery play that gives each sibling a real role.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 12,
      "targetAges": [
        6,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 6–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "puzzle",
      "social-game"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "cooperative",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "detective",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Lead Detective",
      "description": "You and your sibling crack one shared case with clear jobs.",
      "goal": "Gather three clues and agree on one solution.",
      "firstAction": "Claim a bureau desk together.",
      "childRoles": [
        {
          "childName": "Sibling A",
          "age": 10,
          "roleTitle": "Lead Detective",
          "responsibility": "Write the case theory.",
          "firstAction": "Write the case title."
        },
        {
          "childName": "Sibling B",
          "age": 7,
          "roleTitle": "Evidence Runner",
          "responsibility": "Fetch and label clues.",
          "firstAction": "Find the first clue object."
        }
      ]
    },
    "starterIdeas": [
      {
        "title": "Missing sock case",
        "example": "Where did the lonely sock go?",
        "kind": "choice"
      },
      {
        "title": "Mystery snack crumb",
        "example": "Who left a crumb trail?",
        "kind": "imagination"
      },
      {
        "title": "Silent toy relocation",
        "example": "Why did a toy move rooms?",
        "kind": "choice"
      }
    ],
    "stepDetails": [
      {
        "title": "Open the bureau",
        "instruction": "Assign roles and write the case title.",
        "examples": [
          "Missing sock case."
        ],
        "doneWhen": "Roles and title are clear.",
        "ifStuck": "Flip a coin for Lead Detective.",
        "roleInstructions": [
          {
            "roleName": "Lead Detective",
            "instruction": "Write the case title in big letters."
          },
          {
            "roleName": "Evidence Runner",
            "instruction": "Ready three sticky labels for clues."
          }
        ]
      },
      {
        "title": "Gather clues",
        "instruction": "Collect three pieces of evidence.",
        "examples": [
          "Object, location note, witness guess."
        ],
        "doneWhen": "Three clues are labeled.",
        "ifStuck": "Use stuffed animals as witnesses.",
        "roleInstructions": [
          {
            "roleName": "Evidence Runner",
            "instruction": "Bring each clue to the bureau desk."
          }
        ]
      },
      {
        "title": "Agree and file",
        "instruction": "Decide one solution and file the report.",
        "examples": [
          "Both detectives must agree."
        ],
        "doneWhen": "A shared verdict is written.",
        "ifStuck": "Each proposes one idea, then pick together.",
        "roleInstructions": [
          {
            "roleName": "Lead Detective",
            "instruction": "Write the final sentence both accept."
          }
        ]
      }
    ]
  }
  $$::jsonb,
  true,
  120
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'two-captain-spaceship',
  'Two-Captain Spaceship',
  'Build a cardboard spaceship where each sibling captains a different station.',
  'A household spaceship needs two captains to leave the living-room dock.',
  35,
  'imaginative',
  $$
  {
    "kidRole": "Navigation Captain",
    "mission": "Launch window is open, but the ship cannot fly with only one captain. You and your sibling each run a station—navigation and engineering—then complete three launch checks together.",
    "starterPrompts": [
      "Who runs navigation and who runs engineering?",
      "What does the ship need before launch?",
      "Where is the living-room docking bay?"
    ],
    "firstMoves": [
      "Stack cushions or cardboard into a ship outline.",
      "Label Navigation and Engineering stations.",
      "Write a three-item launch checklist."
    ],
    "steps": [
      "Build the ship: Outline stations with cushions or cardboard.",
      "Run launch checks: Complete three checklist items together.",
      "Launch: Countdown and declare mission success."
    ],
    "roles": [
      "Navigation Captain",
      "Engineering Captain"
    ],
    "extensionIdeas": [
      "Add a science officer role.",
      "Fly a second mission to a new planet."
    ],
    "uses": [
      "cushions or cardboard",
      "tape",
      "paper",
      "markers"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "optional",
    "whyItFits": "Sibling co-op building with complementary responsibilities.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 12,
      "targetAges": [
        6,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 6–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "building",
      "pretend",
      "social-game"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "cooperative",
      "creativity": "high",
      "movement": "medium"
    },
    "visualTheme": "space",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Navigation Captain",
      "description": "You and your sibling each captain a ship station.",
      "goal": "Complete three launch checks and leave the docking bay.",
      "firstAction": "Label Navigation and Engineering stations.",
      "childRoles": [
        {
          "childName": "Sibling A",
          "age": 11,
          "roleTitle": "Navigation Captain",
          "responsibility": "Plot the route and countdown.",
          "firstAction": "Draw a simple star map."
        },
        {
          "childName": "Sibling B",
          "age": 8,
          "roleTitle": "Engineering Captain",
          "responsibility": "Power checks and ship repairs.",
          "firstAction": "Tape one ship panel securely."
        }
      ]
    },
    "starterIdeas": [
      {
        "title": "Moon grocery run",
        "example": "Mission: pick up moon milk.",
        "kind": "imagination"
      },
      {
        "title": "Asteroid dodge drill",
        "example": "Practice three dodge calls.",
        "kind": "choice"
      },
      {
        "title": "Earth postcard",
        "example": "Send a postcard before launch.",
        "kind": "imagination"
      }
    ],
    "stepDetails": [
      {
        "title": "Build the ship",
        "instruction": "Outline stations with cushions or cardboard.",
        "examples": [
          "Couch = bridge, floor cushions = engine."
        ],
        "doneWhen": "Both stations are labeled.",
        "ifStuck": "Use tape lines on the floor as stations.",
        "roleInstructions": [
          {
            "roleName": "Engineering Captain",
            "instruction": "Secure one panel with tape."
          }
        ]
      },
      {
        "title": "Run launch checks",
        "instruction": "Complete three checklist items together.",
        "examples": [
          "Fuel, map, seatbelts."
        ],
        "doneWhen": "All three checks are checked off.",
        "ifStuck": "Read the checklist aloud together.",
        "roleInstructions": [
          {
            "roleName": "Navigation Captain",
            "instruction": "Confirm the star map is ready."
          }
        ]
      },
      {
        "title": "Launch",
        "instruction": "Countdown and declare mission success.",
        "examples": [
          "10…9… liftoff!"
        ],
        "doneWhen": "You both agree the ship launched.",
        "ifStuck": "Clap once for liftoff.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  121
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'solo-animal-embassy',
  'Solo Animal Embassy',
  'Open a quiet animal embassy and welcome three stuffed diplomats without needing an adult.',
  'A soft-spoken animal embassy opens in the living room.',
  25,
  'imaginative',
  $$
  {
    "kidRole": "Embassy Host",
    "mission": "Three animal diplomats need a calm welcome while grown-ups rest. You are Embassy Host. Set a greeting desk, welcome each diplomat, and write one kindness treaty line for every guest.",
    "starterPrompts": [
      "Which diplomat arrives first?",
      "What kindness treaty will you offer?",
      "Where is the embassy desk?"
    ],
    "firstMoves": [
      "Set a towel or placemat as the embassy desk.",
      "Line up three stuffed diplomats.",
      "Write Embassy Open on paper."
    ],
    "steps": [
      "Open the embassy: Set the greeting desk.",
      "Welcome diplomats: Greet each guest kindly.",
      "Write treaties: One kindness line per diplomat."
    ],
    "roles": [
      "Embassy Host"
    ],
    "extensionIdeas": [
      "Add a fourth diplomat from another land.",
      "Draw embassy flags."
    ],
    "uses": [
      "stuffed animals",
      "paper",
      "pencil",
      "towel or placemat"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Fully independent quiet pretend play for exhausted-parent stretches.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 5–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "animals",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Embassy Host",
      "description": "You welcome animal diplomats without needing adult help.",
      "goal": "Welcome three diplomats and write kindness treaty lines.",
      "firstAction": "Set a towel as the embassy desk.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Bear from Blanket Land",
        "example": "Loves soft greetings.",
        "kind": "imagination"
      },
      {
        "title": "Owl from Quiet Peak",
        "example": "Prefers whispered welcomes.",
        "kind": "imagination"
      },
      {
        "title": "Fox from Puzzle Grove",
        "example": "Brings a riddle gift.",
        "kind": "choice"
      }
    ],
    "stepDetails": [
      {
        "title": "Open the embassy",
        "instruction": "Set the greeting desk.",
        "examples": [
          "Towel desk + Open sign."
        ],
        "doneWhen": "Desk and sign are ready.",
        "ifStuck": "Use a chair seat as the desk.",
        "roleInstructions": []
      },
      {
        "title": "Welcome diplomats",
        "instruction": "Greet each guest kindly.",
        "examples": [
          "Welcome, Bear from Blanket Land."
        ],
        "doneWhen": "All three are greeted.",
        "ifStuck": "Shake a paw instead of speaking much.",
        "roleInstructions": []
      },
      {
        "title": "Write treaties",
        "instruction": "One kindness line per diplomat.",
        "examples": [
          "We share quiet corners."
        ],
        "doneWhen": "Three treaty lines exist.",
        "ifStuck": "Draw a heart next to each name.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  122
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'independent-museum-night',
  'Independent Museum Night',
  'Curate a one-kid museum night with three exhibits and a silent opening.',
  'A private museum opens for a silent evening showing.',
  30,
  'imaginative',
  $$
  {
    "kidRole": "Night Curator",
    "mission": "The museum must open tonight, but staff are resting. You are Night Curator. Choose three exhibits, write labels, and host a silent opening tour for stuffed visitors.",
    "starterPrompts": [
      "What three exhibits matter tonight?",
      "Who are your stuffed visitors?",
      "What is the museum’s silent rule?"
    ],
    "firstMoves": [
      "Choose a shelf or table as the gallery.",
      "Pick three exhibit objects.",
      "Write label cards."
    ],
    "steps": [
      "Curate exhibits: Choose and place three objects.",
      "Write labels: Add title and one-sentence history.",
      "Silent opening: Tour stuffed visitors without loud talking."
    ],
    "roles": [
      "Night Curator",
      "Docent"
    ],
    "extensionIdeas": [
      "Add a gift-shop drawing table.",
      "Create a second gallery wing."
    ],
    "uses": [
      "three household objects",
      "paper",
      "tape",
      "stuffed visitors"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Self-contained quiet curation when parents need true rest.",
    "ageFit": {
      "minAge": 8,
      "maxAge": 13,
      "targetAges": [
        8,
        11,
        13
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 8–13 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "mystery",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Night Curator",
      "description": "You open a silent museum night entirely on your own.",
      "goal": "Display three labeled exhibits and host a silent opening.",
      "firstAction": "Choose a shelf or table as the gallery.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Ancient spoon relic",
        "example": "A kitchen spoon from the Year of Soup.",
        "kind": "imagination"
      },
      {
        "title": "Lost sock artifact",
        "example": "Evidence of the Laundry Era.",
        "kind": "imagination"
      },
      {
        "title": "Tiny vehicle of tomorrow",
        "example": "A toy car from the future.",
        "kind": "choice"
      }
    ],
    "stepDetails": [
      {
        "title": "Curate exhibits",
        "instruction": "Choose and place three objects.",
        "examples": [
          "Leave space between each."
        ],
        "doneWhen": "Three exhibits are placed.",
        "ifStuck": "Use books as display risers.",
        "roleInstructions": []
      },
      {
        "title": "Write labels",
        "instruction": "Add title and one-sentence history.",
        "examples": [
          "Ancient spoon relic."
        ],
        "doneWhen": "Each exhibit has a label.",
        "ifStuck": "Title only is enough to start.",
        "roleInstructions": []
      },
      {
        "title": "Silent opening",
        "instruction": "Tour stuffed visitors without loud talking.",
        "examples": [
          "Point and whisper one fact."
        ],
        "doneWhen": "All visitors finish the tour.",
        "ifStuck": "Point silently to each label.",
        "roleInstructions": [
          {
            "roleName": "Docent",
            "instruction": "Guide visitors from exhibit one to three."
          }
        ]
      }
    ]
  }
  $$::jsonb,
  true,
  123
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'couch-clinic-radio',
  'Couch Clinic Radio',
  'Host a soft couch clinic radio show that cheers up stuffed patients.',
  'A couch clinic broadcasts gentle care messages to tired patients.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Clinic DJ",
    "mission": "Patients are low-energy and need soft encouragement. You are Clinic DJ. Set up a couch broadcast corner, welcome three stuffed patients, and deliver three kind radio messages.",
    "starterPrompts": [
      "What song or message helps a tired patient?",
      "Who is patient number one?",
      "Where is the broadcast pillow?"
    ],
    "firstMoves": [
      "Pile pillows into a couch clinic corner.",
      "Seat three stuffed patients.",
      "Make a paper microphone."
    ],
    "steps": [
      "Open clinic radio: Build a couch broadcast corner.",
      "Welcome patients: Seat three stuffed guests.",
      "Broadcast kindness: Deliver three soft messages."
    ],
    "roles": [
      "Clinic DJ",
      "Comfort Nurse"
    ],
    "extensionIdeas": [
      "Replay the show with new messages.",
      "Draw patient smile stickers."
    ],
    "uses": [
      "pillows",
      "stuffed animals",
      "paper",
      "optional soft music"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Low-movement comforting play for sick or low-energy days.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 5–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "music"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "animals",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Clinic DJ",
      "description": "You broadcast gentle care from a couch clinic.",
      "goal": "Deliver three kind radio messages to stuffed patients.",
      "firstAction": "Pile pillows into a couch clinic corner.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Feel-better jingle",
        "example": "A tiny hummed jingle.",
        "kind": "music"
      },
      {
        "title": "Water break reminder",
        "example": "Remind patients to sip water.",
        "kind": "choice"
      },
      {
        "title": "Brave rest award",
        "example": "Resting counts as brave.",
        "kind": "imagination"
      }
    ],
    "stepDetails": [
      {
        "title": "Open clinic radio",
        "instruction": "Build a couch broadcast corner.",
        "examples": [
          "Pillow desk + paper mic."
        ],
        "doneWhen": "You have a sitting broadcast spot.",
        "ifStuck": "Use one pillow as the whole station.",
        "roleInstructions": []
      },
      {
        "title": "Welcome patients",
        "instruction": "Seat three stuffed guests.",
        "examples": [
          "Line them facing the DJ."
        ],
        "doneWhen": "Three patients are seated.",
        "ifStuck": "Use socks as stand-in patients.",
        "roleInstructions": [
          {
            "roleName": "Comfort Nurse",
            "instruction": "Tuck a blanket edge over each patient."
          }
        ]
      },
      {
        "title": "Broadcast kindness",
        "instruction": "Deliver three soft messages.",
        "examples": [
          "Brave rest award."
        ],
        "doneWhen": "Three messages are delivered.",
        "ifStuck": "Whisper one word: comfort.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  124
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'blanket-planetarium',
  'Blanket Planetarium',
  'Turn a blanket fort into a planetarium and name five calm constellations.',
  'A blanket planetarium opens for quiet star naming.',
  25,
  'imaginative',
  $$
  {
    "kidRole": "Star Guide",
    "mission": "The sky is soft and close tonight under a blanket dome. You are Star Guide. Build a low planetarium, place five paper stars, and tell a calm story about each constellation.",
    "starterPrompts": [
      "What is your first constellation name?",
      "Where does the planetarium entrance face?",
      "Which star is the guide star?"
    ],
    "firstMoves": [
      "Drape a blanket over a couch corner.",
      "Cut or tear five paper stars.",
      "Tape stars inside the fort ceiling."
    ],
    "steps": [
      "Build the planetarium: Make a blanket dome.",
      "Place five stars: Tape paper stars inside.",
      "Name constellations: Tell a calm story for each."
    ],
    "roles": [
      "Star Guide"
    ],
    "extensionIdeas": [
      "Add a shooting-star wish.",
      "Invite a sibling for a second show."
    ],
    "uses": [
      "blanket",
      "paper",
      "tape",
      "flashlight optional"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Cozy low-energy imaginative science for recovery days.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 11,
      "targetAges": [
        6,
        9,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 6–11 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "science"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "space",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Star Guide",
      "description": "You host a calm blanket planetarium show.",
      "goal": "Name five constellations under the blanket dome.",
      "firstAction": "Drape a blanket over a couch corner.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Sleepy teapot",
        "example": "Stars shaped like a tiny teapot.",
        "kind": "imagination"
      },
      {
        "title": "Kind fox trail",
        "example": "A star path a fox follows home.",
        "kind": "imagination"
      },
      {
        "title": "Quiet lighthouse",
        "example": "One bright guide star.",
        "kind": "choice"
      }
    ],
    "stepDetails": [
      {
        "title": "Build the planetarium",
        "instruction": "Make a blanket dome.",
        "examples": [
          "Couch corner + blanket roof."
        ],
        "doneWhen": "You can sit underneath.",
        "ifStuck": "Drape the blanket over your own head and knees.",
        "roleInstructions": []
      },
      {
        "title": "Place five stars",
        "instruction": "Tape paper stars inside.",
        "examples": [
          "Spread them out."
        ],
        "doneWhen": "Five stars are placed.",
        "ifStuck": "Draw stars on sticky notes.",
        "roleInstructions": []
      },
      {
        "title": "Name constellations",
        "instruction": "Tell a calm story for each.",
        "examples": [
          "Sleepy teapot."
        ],
        "doneWhen": "All five have names/stories.",
        "ifStuck": "Name them after pets or snacks.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  125
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'neighborhood-invention-fair',
  'Neighborhood Invention Fair',
  'Invent two helpful household gadgets and host a mini fair for stuffed neighbors.',
  'A neighborhood invention fair opens in the living room.',
  45,
  'imaginative',
  $$
  {
    "kidRole": "Inventor Host",
    "mission": "Neighbors are coming to see new helpful gadgets. You are Inventor Host. Build two cardboard inventions, write booth signs, and host a fair tour for stuffed neighbors.",
    "starterPrompts": [
      "What household problem will you solve first?",
      "What is your fair booth name?",
      "Who are the stuffed neighbors?"
    ],
    "firstMoves": [
      "Gather cardboard and tape.",
      "Name invention one.",
      "Sketch a quick booth layout."
    ],
    "steps": [
      "Invent two gadgets: Build cardboard prototypes.",
      "Make booth signs: Label each invention.",
      "Host the fair: Tour stuffed neighbors through both booths."
    ],
    "roles": [
      "Inventor Host",
      "Booth Guide"
    ],
    "extensionIdeas": [
      "Add a third invention.",
      "Award a ribbon to the best idea."
    ],
    "uses": [
      "cardboard",
      "tape",
      "markers",
      "stuffed animals"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "optional",
    "whyItFits": "Long open-afternoon maker play with a social pretend payoff.",
    "ageFit": {
      "minAge": 8,
      "maxAge": 13,
      "targetAges": [
        8,
        11,
        13
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 8–13 with the independence and complexity this activity needs."
    },
    "categories": [
      "building",
      "pretend",
      "science"
    ],
    "traits": {
      "setupEffort": "medium",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "neighborhood",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Inventor Host",
      "description": "You invent helpful gadgets and host a neighborhood fair.",
      "goal": "Build two inventions and tour stuffed neighbors.",
      "firstAction": "Gather cardboard and tape.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Sock finder claw",
        "example": "A grabber for lost socks.",
        "kind": "imagination"
      },
      {
        "title": "Quiet reminder bell",
        "example": "A soft bell for chore reminders.",
        "kind": "choice"
      },
      {
        "title": "Snack ferry cart",
        "example": "A cardboard cart for snack delivery.",
        "kind": "imagination"
      }
    ],
    "stepDetails": [
      {
        "title": "Invent two gadgets",
        "instruction": "Build cardboard prototypes.",
        "examples": [
          "Sock finder claw."
        ],
        "doneWhen": "Two prototypes stand on their own.",
        "ifStuck": "Start with taped cardboard shapes.",
        "roleInstructions": []
      },
      {
        "title": "Make booth signs",
        "instruction": "Label each invention.",
        "examples": [
          "Name + one benefit."
        ],
        "doneWhen": "Both booths have signs.",
        "ifStuck": "Write names only first.",
        "roleInstructions": [
          {
            "roleName": "Booth Guide",
            "instruction": "Place signs where visitors can see them."
          }
        ]
      },
      {
        "title": "Host the fair",
        "instruction": "Tour stuffed neighbors through both booths.",
        "examples": [
          "Demo each invention once."
        ],
        "doneWhen": "Neighbors visit both booths.",
        "ifStuck": "Do a one-minute combined demo.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  126
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'backyard-border-expedition',
  'Backyard Border Expedition',
  'Map the edge of your indoor-outdoor world and collect five nature clues.',
  'An expedition charts the border between home and the wild outdoors.',
  40,
  'imaginative',
  $$
  {
    "kidRole": "Border Explorer",
    "mission": "The border between house and outdoors needs a fresh map. You are Border Explorer. Sketch the route, collect five safe nature clues, and present a short expedition report.",
    "starterPrompts": [
      "Where does the border begin?",
      "What counts as a nature clue?",
      "How will you present the report?"
    ],
    "firstMoves": [
      "Draw a starting map frame.",
      "Choose a collection bag or box.",
      "Mark base camp by the door."
    ],
    "steps": [
      "Map the border: Sketch doors, porch, or window edges.",
      "Collect five clues: Gather safe nature finds or window observations.",
      "Report back: Present a short expedition summary."
    ],
    "roles": [
      "Border Explorer",
      "Specimen Recorder"
    ],
    "extensionIdeas": [
      "Press one leaf between paper.",
      "Add weather notes to the report."
    ],
    "uses": [
      "paper",
      "pencil",
      "bag or box",
      "optional magnifying glass"
    ],
    "energy": "medium",
    "mess": "low",
    "adultHelp": "nearby",
    "whyItFits": "Open-afternoon exploration that can flex indoors or to a yard.",
    "ageFit": {
      "minAge": 7,
      "maxAge": 12,
      "targetAges": [
        7,
        10,
        12
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 7–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "nature",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "medium"
    },
    "visualTheme": "expedition",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Border Explorer",
      "description": "You chart the home-to-outdoors border and collect clues.",
      "goal": "Collect five nature clues and present a report.",
      "firstAction": "Draw a starting map frame.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Doorstep moss island",
        "example": "A tiny green patch near the door.",
        "kind": "observation"
      },
      {
        "title": "Cloud convoy",
        "example": "Clouds moving like ships.",
        "kind": "observation"
      },
      {
        "title": "Leaf message",
        "example": "A leaf that looks like a letter.",
        "kind": "imagination"
      }
    ],
    "stepDetails": [
      {
        "title": "Map the border",
        "instruction": "Sketch doors, porch, or window edges.",
        "examples": [
          "Mark base camp by the door."
        ],
        "doneWhen": "Map frame has three landmarks.",
        "ifStuck": "Draw only the door and one window.",
        "roleInstructions": []
      },
      {
        "title": "Collect five clues",
        "instruction": "Gather safe nature finds or window observations.",
        "examples": [
          "Leaf, pebble, cloud note."
        ],
        "doneWhen": "Five clues are listed or collected.",
        "ifStuck": "Do all five as window drawings.",
        "roleInstructions": [
          {
            "roleName": "Specimen Recorder",
            "instruction": "Number each clue 1–5."
          }
        ]
      },
      {
        "title": "Report back",
        "instruction": "Present a short expedition summary.",
        "examples": [
          "Three sentences is enough."
        ],
        "doneWhen": "Report is shared aloud or written.",
        "ifStuck": "Read the five clue names only.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  127
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'secret-animal-rescue-cleanout',
  'Secret Animal Rescue',
  'Rescue stuffed animals trapped in a messy room zone while tidying their habitat.',
  'A secret animal rescue opens inside a messy room habitat.',
  25,
  'imaginative',
  $$
  {
    "kidRole": "Rescue Ranger",
    "mission": "Stuffed animals are stuck under clutter and need a clear habitat. You are Rescue Ranger. Clear one zone, rescue each animal, and rebuild a tidy habitat nest.",
    "starterPrompts": [
      "Which animal is trapped first?",
      "What does a tidy habitat look like?",
      "Where is the rescue base?"
    ],
    "firstMoves": [
      "Pick one messy zone as the habitat.",
      "Spot three trapped stuffed animals.",
      "Set a laundry basket as rescue base."
    ],
    "steps": [
      "Survey the habitat: Spot trapped animals in one messy zone.",
      "Rescue and tidy: Clear clutter while saving each animal.",
      "Rebuild the nest: Make a tidy habitat for rescued animals."
    ],
    "roles": [
      "Rescue Ranger",
      "Habitat Builder"
    ],
    "extensionIdeas": [
      "Rescue a second zone.",
      "Make habitat name signs."
    ],
    "uses": [
      "stuffed animals",
      "laundry basket",
      "timer optional"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "nearby",
    "whyItFits": "Cleaning disguised as a rescue mission kids want to finish.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 5–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "helping",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "medium"
    },
    "visualTheme": "rescue",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Rescue Ranger",
      "description": "You free stuffed animals by tidying their habitat.",
      "goal": "Clear one zone and rebuild a tidy animal nest.",
      "firstAction": "Pick one messy zone as the habitat.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Couch cushion cave-in",
        "example": "Animals under cushions need air.",
        "kind": "imagination"
      },
      {
        "title": "Toy landslide",
        "example": "Toys buried the nest entrance.",
        "kind": "choice"
      },
      {
        "title": "Blanket tangle",
        "example": "A blanket trapped soft animals.",
        "kind": "imagination"
      }
    ],
    "stepDetails": [
      {
        "title": "Survey the habitat",
        "instruction": "Spot trapped animals in one messy zone.",
        "examples": [
          "Count three to rescue."
        ],
        "doneWhen": "Rescue targets are named.",
        "ifStuck": "Ask a parent to point at the zone.",
        "roleInstructions": []
      },
      {
        "title": "Rescue and tidy",
        "instruction": "Clear clutter while saving each animal.",
        "examples": [
          "Put-away pile + rescue basket."
        ],
        "doneWhen": "Zone is clearer and animals are freed.",
        "ifStuck": "Set a 10-minute timer and do your best.",
        "roleInstructions": [
          {
            "roleName": "Habitat Builder",
            "instruction": "Sort clutter into keep and put-away."
          }
        ]
      },
      {
        "title": "Rebuild the nest",
        "instruction": "Make a tidy habitat for rescued animals.",
        "examples": [
          "Blanket nest on a clear spot."
        ],
        "doneWhen": "Animals have a clean nest.",
        "ifStuck": "Line them on a cleared shelf.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  128
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'dust-bunny-detective',
  'Dust Bunny Detective',
  'Track dust-bunny suspects and clean their hideouts as you close each case.',
  'Dust-bunny suspects are hiding in corners across the house.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Dust Detective",
    "mission": "Dust bunnies have gone into hiding and only a detective can find them. You are Dust Detective. Inspect three hideouts, clean each one, and stamp the case closed.",
    "starterPrompts": [
      "Where do dust bunnies hide?",
      "What tool is your evidence brush?",
      "How do you stamp a case closed?"
    ],
    "firstMoves": [
      "Grab a cloth or small dustpan.",
      "List three suspect hideouts.",
      "Make a paper Closed stamp."
    ],
    "steps": [
      "List hideouts: Choose three dusty corners.",
      "Inspect and clean: Clear each hideout carefully.",
      "Close cases: Stamp each location closed."
    ],
    "roles": [
      "Dust Detective"
    ],
    "extensionIdeas": [
      "Draw the captured dust bunny.",
      "Inspect a fourth hideout."
    ],
    "uses": [
      "cleaning cloth",
      "dustpan optional",
      "paper",
      "pencil"
    ],
    "energy": "medium",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Light cleaning framed as a satisfying detective sweep.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 11,
      "targetAges": [
        6,
        9,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 6–11 with the independence and complexity this activity needs."
    },
    "categories": [
      "helping",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "medium"
    },
    "visualTheme": "mystery",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Dust Detective",
      "description": "You track dust-bunny suspects and clean their hideouts.",
      "goal": "Clean three hideouts and close each case.",
      "firstAction": "List three suspect hideouts.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Under-chair tunnel",
        "example": "A classic dust-bunny lair.",
        "kind": "choice"
      },
      {
        "title": "Shelf shadow alley",
        "example": "Dust hides in shelf corners.",
        "kind": "observation"
      },
      {
        "title": "Baseboard border",
        "example": "A long thin escape route.",
        "kind": "choice"
      }
    ],
    "stepDetails": [
      {
        "title": "List hideouts",
        "instruction": "Choose three dusty corners.",
        "examples": [
          "Under chair, shelf corner, baseboard."
        ],
        "doneWhen": "Three hideouts are written down.",
        "ifStuck": "Ask where dust usually gathers.",
        "roleInstructions": []
      },
      {
        "title": "Inspect and clean",
        "instruction": "Clear each hideout carefully.",
        "examples": [
          "Wipe, then check again."
        ],
        "doneWhen": "All three look cleaner.",
        "ifStuck": "Spend two minutes per hideout.",
        "roleInstructions": []
      },
      {
        "title": "Close cases",
        "instruction": "Stamp each location closed.",
        "examples": [
          "Paper Closed badge.",
          "Checkmark on your list."
        ],
        "doneWhen": "All three cases are marked closed.",
        "ifStuck": "Say Case closed aloud once per spot.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  129
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'teen-mystery-podcast-booth',
  'Teen Mystery Podcast Booth',
  'Produce a five-minute mystery podcast episode from a DIY booth.',
  'A bedroom podcast booth launches a brand-new mystery series.',
  35,
  'imaginative',
  $$
  {
    "kidRole": "Podcast Producer",
    "mission": "Episode one needs a hook, two clues, and a cliffhanger. You are Podcast Producer. Build a pillow booth, write a short script, and record or perform a five-minute mystery episode.",
    "starterPrompts": [
      "What is your mystery series title?",
      "What cliffhanger ends episode one?",
      "Who is your co-host if any?"
    ],
    "firstMoves": [
      "Build a pillow or desk podcast booth.",
      "Write a three-beat outline.",
      "Practice the cold open once."
    ],
    "steps": [
      "Build the booth: Make a recording corner.",
      "Script episode one: Hook, clues, cliffhanger.",
      "Perform or record: Deliver the five-minute episode."
    ],
    "roles": [
      "Podcast Producer",
      "Sound Designer"
    ],
    "extensionIdeas": [
      "Design cover art.",
      "Outline episode two."
    ],
    "uses": [
      "paper",
      "pencil",
      "phone voice memo optional",
      "pillows"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Teen-friendly creative production that stays independent and quiet-ish.",
    "ageFit": {
      "minAge": 12,
      "maxAge": 16,
      "targetAges": [
        12,
        14,
        16
      ],
      "maturityLevel": "tween",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 12–16 with the independence and complexity this activity needs."
    },
    "categories": [
      "creative",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "mystery",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Podcast Producer",
      "description": "You produce a short mystery podcast episode independently.",
      "goal": "Script and perform a five-minute mystery episode.",
      "firstAction": "Build a pillow or desk podcast booth.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Locker code cold case",
        "example": "A school locker code changes overnight.",
        "kind": "imagination"
      },
      {
        "title": "Missing playlist",
        "example": "A favorite playlist vanishes from a device.",
        "kind": "choice"
      },
      {
        "title": "Neighborhood flashlight signals",
        "example": "Odd flashes across the street.",
        "kind": "imagination"
      }
    ],
    "stepDetails": [
      {
        "title": "Build the booth",
        "instruction": "Make a recording corner.",
        "examples": [
          "Pillows for sound dampening."
        ],
        "doneWhen": "You have a seated mic spot.",
        "ifStuck": "Use a closet for quieter sound.",
        "roleInstructions": []
      },
      {
        "title": "Script episode one",
        "instruction": "Write hook, clues, and cliffhanger.",
        "examples": [
          "Three short beats on paper."
        ],
        "doneWhen": "Outline has three beats.",
        "ifStuck": "Fill in: Who, what vanished, what next.",
        "roleInstructions": [
          {
            "roleName": "Sound Designer",
            "instruction": "Note one sound effect per beat."
          }
        ]
      },
      {
        "title": "Perform or record",
        "instruction": "Deliver the five-minute episode.",
        "examples": [
          "Voice memo or live performance."
        ],
        "doneWhen": "Episode is performed once through.",
        "ifStuck": "Read the outline dramatically.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  130
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'tween-city-budget-sim',
  'Tween City Budget Sim',
  'Run a paper city for a week of pretend decisions with a limited budget.',
  'A tiny paper city needs a tween mayor with hard budget choices.',
  30,
  'imaginative',
  $$
  {
    "kidRole": "City Mayor",
    "mission": "The paper city has only ten budget tokens and three urgent needs. You are City Mayor. Map the city, allocate tokens, and explain your tradeoffs in a short mayor briefing.",
    "starterPrompts": [
      "What are the three urgent city needs?",
      "What gets funded first?",
      "What do you leave underfunded and why?"
    ],
    "firstMoves": [
      "Draw a simple city map.",
      "Make ten paper budget tokens.",
      "List three urgent needs."
    ],
    "steps": [
      "Map the city: Draw districts and needs.",
      "Allocate budget: Place ten tokens with tradeoffs.",
      "Mayor briefing: Explain your choices in three sentences."
    ],
    "roles": [
      "City Mayor",
      "Budget Analyst"
    ],
    "extensionIdeas": [
      "Run a second week with new needs.",
      "Add a citizen complaint letter."
    ],
    "uses": [
      "paper",
      "pencil",
      "scissors"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Tween-level strategy play that feels grown-up and independent.",
    "ageFit": {
      "minAge": 10,
      "maxAge": 14,
      "targetAges": [
        10,
        12,
        14
      ],
      "maturityLevel": "tween",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 10–14 with the independence and complexity this activity needs."
    },
    "categories": [
      "puzzle",
      "creative",
      "social-game"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "medium",
      "movement": "low"
    },
    "visualTheme": "building",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "City Mayor",
      "description": "You allocate a limited city budget and defend your choices.",
      "goal": "Fund three needs with ten tokens and brief your choices.",
      "firstAction": "Draw a simple city map.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Park repairs",
        "example": "Broken swings need funding.",
        "kind": "choice"
      },
      {
        "title": "Library late nights",
        "example": "Keep the library open later.",
        "kind": "choice"
      },
      {
        "title": "Snack cart for helpers",
        "example": "Fund helpers who clean the square.",
        "kind": "imagination"
      }
    ],
    "stepDetails": [
      {
        "title": "Map the city",
        "instruction": "Draw districts and needs.",
        "examples": [
          "Park, library, snack cart."
        ],
        "doneWhen": "Three needs are on the map.",
        "ifStuck": "Use three labeled boxes.",
        "roleInstructions": []
      },
      {
        "title": "Allocate budget",
        "instruction": "Place ten tokens with tradeoffs.",
        "examples": [
          "5 / 3 / 2 split."
        ],
        "doneWhen": "All ten tokens are placed.",
        "ifStuck": "Start with equal shares then adjust.",
        "roleInstructions": [
          {
            "roleName": "Budget Analyst",
            "instruction": "Challenge one allocation and propose a swap."
          }
        ]
      },
      {
        "title": "Mayor briefing",
        "instruction": "Explain your choices in three sentences.",
        "examples": [
          "I funded parks first because..."
        ],
        "doneWhen": "Briefing is spoken or written.",
        "ifStuck": "Answer: what, why, what waits.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  131
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'mixed-age-rescue-hq',
  'Mixed-Age Rescue HQ',
  'Run a rescue HQ where younger kids do hands-on tasks and older kids plan routes.',
  'A family rescue HQ needs planners and runners working together.',
  30,
  'imaginative',
  $$
  {
    "kidRole": "Operations Lead",
    "mission": "Three rescue jobs arrived at once and ages differ on the team. Older kids plan routes while younger kids gather supplies. Complete all three rescues and debrief as one crew.",
    "starterPrompts": [
      "Who plans and who gathers?",
      "What are the three rescue jobs?",
      "Where is HQ?"
    ],
    "firstMoves": [
      "Mark HQ with a blanket.",
      "Write three rescue job cards.",
      "Assign planner and gatherer roles."
    ],
    "steps": [
      "Stand up HQ: Assign mixed-age roles.",
      "Run three rescues: Plan, gather, complete.",
      "Crew debrief: Share one win each."
    ],
    "roles": [
      "Operations Lead",
      "Supply Runner",
      "Route Planner"
    ],
    "extensionIdeas": [
      "Add a fourth surprise rescue.",
      "Swap roles for round two."
    ],
    "uses": [
      "paper",
      "blanket",
      "stuffed animals",
      "bag for supplies"
    ],
    "energy": "medium",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Designed for mixed ages with complementary jobs that reduce conflict.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 13,
      "targetAges": [
        5,
        9,
        13
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 5–13 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "social-game",
      "movement"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "cooperative",
      "creativity": "high",
      "movement": "medium"
    },
    "visualTheme": "rescue",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Operations Lead",
      "description": "You coordinate mixed-age rescue jobs with fair roles.",
      "goal": "Complete three rescues and debrief as one crew.",
      "firstAction": "Mark HQ with a blanket.",
      "childRoles": [
        {
          "childName": "Older kid",
          "age": 12,
          "roleTitle": "Route Planner",
          "responsibility": "Draw the path for each rescue.",
          "firstAction": "Sketch route one."
        },
        {
          "childName": "Younger kid",
          "age": 6,
          "roleTitle": "Supply Runner",
          "responsibility": "Gather bandage cloths and water bottles.",
          "firstAction": "Fill the supply bag."
        }
      ]
    },
    "starterIdeas": [
      {
        "title": "Stuffed cat in a tree",
        "example": "A toy on a chair seat.",
        "kind": "imagination"
      },
      {
        "title": "Lost map courier",
        "example": "A paper map under the couch.",
        "kind": "choice"
      },
      {
        "title": "Thirsty plant emergency",
        "example": "A plant needs a water run.",
        "kind": "choice"
      }
    ],
    "stepDetails": [
      {
        "title": "Stand up HQ",
        "instruction": "Assign mixed-age roles.",
        "examples": [
          "Planner + runner."
        ],
        "doneWhen": "Everyone knows their job.",
        "ifStuck": "Older plans, younger gathers—simple rule.",
        "roleInstructions": [
          {
            "roleName": "Route Planner",
            "instruction": "Write the three job names."
          },
          {
            "roleName": "Supply Runner",
            "instruction": "Bring the supply bag to HQ."
          }
        ]
      },
      {
        "title": "Run three rescues",
        "instruction": "Plan, gather, complete.",
        "examples": [
          "One rescue at a time."
        ],
        "doneWhen": "All three jobs are done.",
        "ifStuck": "Do the easiest rescue first.",
        "roleInstructions": []
      },
      {
        "title": "Crew debrief",
        "instruction": "Share one win each.",
        "examples": [
          "I liked how we took turns."
        ],
        "doneWhen": "Each person shares one win.",
        "ifStuck": "High-five and name the team.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  132
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'tiny-dinner-theater',
  'Tiny Dinner Theater',
  'Stage a napkin-puppet dinner theater while the real meal cooks.',
  'A napkin theater opens beside the dinner prep zone.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Dinner Playwright",
    "mission": "The kitchen needs entertainment before plating. Write a tiny three-scene play with napkin puppets and perform it once before dinner is served.",
    "starterPrompts": [
      "Who are your napkin characters?",
      "What happens in scene two?",
      "How does the play end before dinner?"
    ],
    "firstMoves": [
      "Fold two napkin puppets.",
      "Draw faces if allowed.",
      "Write three scene titles."
    ],
    "steps": [
      "Make napkin puppets: Fold two napkin characters.",
      "Write three short scenes: Title each beat on paper.",
      "Perform the play: Act it once before dinner is served."
    ],
    "roles": [
      "Dinner Playwright",
      "Puppeteer"
    ],
    "extensionIdeas": [
      "Add a musical intermission hum.",
      "Invite a spoon cameo."
    ],
    "uses": [
      "napkins",
      "markers optional",
      "paper"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "nearby",
    "whyItFits": "Creative kitchen-adjacent play that stays out of the cook’s way.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 10,
      "targetAges": [
        6,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 6–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "art",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Dinner Playwright",
      "description": "You write and stage a napkin puppet play beside dinner prep.",
      "goal": "Perform a three-scene napkin play before plating.",
      "firstAction": "Fold two napkin puppets.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Spoon hero entrance",
        "example": "A spoon character saves the salad.",
        "kind": "imagination"
      },
      {
        "title": "Napkin villain twist",
        "example": "A crumpled napkin tries to steal dessert.",
        "kind": "choice"
      },
      {
        "title": "Happy ending toast",
        "example": "Characters cheer for dinner.",
        "kind": "imagination"
      }
    ],
    "stepDetails": [
      {
        "title": "Make napkin puppets",
        "instruction": "Fold two napkin characters.",
        "examples": [
          "Draw faces if markers are allowed."
        ],
        "doneWhen": "Two puppets are ready.",
        "ifStuck": "Use clean socks as stand-in puppets.",
        "roleInstructions": []
      },
      {
        "title": "Write three short scenes",
        "instruction": "Title each beat on paper.",
        "examples": [
          "Entrance, problem, toast."
        ],
        "doneWhen": "Three scene titles exist.",
        "ifStuck": "Use beginning, middle, end.",
        "roleInstructions": [
          {
            "roleName": "Puppeteer",
            "instruction": "Practice one silent puppet move per scene."
          }
        ]
      },
      {
        "title": "Perform the play",
        "instruction": "Act it once before dinner is served.",
        "examples": [
          "Keep voices soft near the cook."
        ],
        "doneWhen": "The play is performed once through.",
        "ifStuck": "Narrate the titles while moving puppets.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  133
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'counter-cafe-orders',
  'Counter Cafe Orders',
  'Run a pretend cafe that takes orders for the real dinner cook.',
  'A tiny cafe window opens on the kitchen counter.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Cafe Server",
    "mission": "Customers keep arriving with special requests. Take three pretend orders, prepare paper plate meals, and announce each order ready without blocking the cook.",
    "starterPrompts": [
      "What is today’s special?",
      "Who is your first customer?",
      "How do you call out Order ready?"
    ],
    "firstMoves": [
      "Set paper plates on a placemat.",
      "Make a three-item menu.",
      "Choose a stuffed first customer."
    ],
    "steps": [
      "Write a three-item menu.",
      "Take and prepare three orders.",
      "Announce each order ready."
    ],
    "roles": [
      "Cafe Server",
      "Chef"
    ],
    "extensionIdeas": [
      "Open a dessert window.",
      "Add a loyalty stamp card."
    ],
    "uses": [
      "paper plates",
      "markers",
      "stuffed customers",
      "placemat"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "nearby",
    "whyItFits": "Classic kitchen pretend play during dinner prep.",
    "ageFit": {
      "minAge": 4,
      "maxAge": 8,
      "targetAges": [
        4,
        6,
        8
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 4–8 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "neighborhood"
  }
  $$::jsonb,
  true,
  134
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'whisper-train-dispatch',
  'Whisper Train Dispatch',
  'Dispatch whisper-quiet train routes across the living room during a call.',
  'A whisper train network must stay silent while adults talk.',
  25,
  'imaginative',
  $$
  {
    "kidRole": "Train Dispatcher",
    "mission": "Three whisper trains need routes that never interrupt a call. Draw routes, move trains silently between stations, and log each arrival.",
    "starterPrompts": [
      "Where is Station Whisper?",
      "What cargo is too loud to carry?",
      "How do you signal arrival silently?"
    ],
    "firstMoves": [
      "Mark three stations with paper.",
      "Choose toy trains or sock trains.",
      "Draw a simple route map."
    ],
    "steps": [
      "Mark three whisper stations.",
      "Move trains silently along routes.",
      "Log each quiet arrival."
    ],
    "roles": [
      "Train Dispatcher"
    ],
    "extensionIdeas": [
      "Add a night route.",
      "Build a paper tunnel."
    ],
    "uses": [
      "paper",
      "toy trains or socks",
      "pencil"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Quiet movement-and-story play for work-call independence.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 9,
      "targetAges": [
        5,
        7,
        9
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 5–9 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "building"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "building"
  }
  $$::jsonb,
  true,
  135
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'library-card-quest',
  'Library Card Quest',
  'Earn a pretend library card by completing three quiet reading quests.',
  'A living-room library issues cards only to quiet quest completers.',
  25,
  'imaginative',
  $$
  {
    "kidRole": "Library Questor",
    "mission": "The library will issue your card after three quiet quests: find a book, read a stretch, and recommend it on a card. Stay whisper-soft the whole time.",
    "starterPrompts": [
      "What book will you quest for?",
      "What makes a great recommendation?",
      "Where do you stamp your card?"
    ],
    "firstMoves": [
      "Make a blank library card.",
      "Choose a reading nook.",
      "Pick a book target."
    ],
    "steps": [
      "Find your quest book.",
      "Read a quiet stretch.",
      "Write a recommendation and stamp your card."
    ],
    "roles": [
      "Library Questor"
    ],
    "extensionIdeas": [
      "Quest for a second book.",
      "Design a library stamp."
    ],
    "uses": [
      "book",
      "paper",
      "pencil",
      "pillows"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Quiet work-call activity that blends reading and pretend.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 11,
      "targetAges": [
        6,
        9,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 6–11 with the independence and complexity this activity needs."
    },
    "categories": [
      "reading",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "mystery"
  }
  $$::jsonb,
  true,
  136
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'rainy-day-robot-lab',
  'Rainy Day Robot Lab',
  'Build a cardboard helper robot and teach it three rainy-day jobs.',
  'A rainy-day robot lab opens when outdoor plans wash out.',
  40,
  'imaginative',
  $$
  {
    "kidRole": "Robot Engineer",
    "mission": "Outdoor missions are canceled, so the lab needs a helper robot. Build one from cardboard, teach it three jobs, and run a demo for a stuffed audience.",
    "starterPrompts": [
      "What should your robot be named?",
      "Which rainy-day job matters most?",
      "How does the robot say hello?"
    ],
    "firstMoves": [
      "Gather cardboard boxes.",
      "Sketch a robot face.",
      "List three jobs on paper."
    ],
    "steps": [
      "Build the robot body: Assemble a cardboard helper.",
      "Teach three rainy-day jobs: Label each job on paper.",
      "Demo for a stuffed audience: Show all three jobs once."
    ],
    "roles": [
      "Robot Engineer"
    ],
    "extensionIdeas": [
      "Add a remote-control story.",
      "Build a robot pet sidekick."
    ],
    "uses": [
      "cardboard",
      "tape",
      "markers",
      "scissors"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "optional",
    "whyItFits": "Maker-focused rainy afternoon project with a playful payoff.",
    "ageFit": {
      "minAge": 7,
      "maxAge": 12,
      "targetAges": [
        7,
        10,
        12
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 7–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "building",
      "science",
      "pretend"
    ],
    "traits": {
      "setupEffort": "medium",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "science",
    "activityFormatVersion": 2,
    "roleGuide": {
      "name": "Robot Engineer",
      "description": "You build a rainy-day helper robot and teach it jobs.",
      "goal": "Build one robot, teach three jobs, and demo them.",
      "firstAction": "Gather cardboard boxes.",
      "childRoles": []
    },
    "starterIdeas": [
      {
        "title": "Sock sorter arm",
        "example": "A job for matching socks.",
        "kind": "choice"
      },
      {
        "title": "Story reader buddy",
        "example": "A job for holding a picture book.",
        "kind": "imagination"
      },
      {
        "title": "Window weather scout",
        "example": "A job for checking the rain.",
        "kind": "choice"
      }
    ],
    "stepDetails": [
      {
        "title": "Build the robot body",
        "instruction": "Assemble a cardboard helper.",
        "examples": [
          "Box body + paper face."
        ],
        "doneWhen": "The robot stands or sits upright.",
        "ifStuck": "Start with one box and drawn buttons.",
        "roleInstructions": []
      },
      {
        "title": "Teach three rainy-day jobs",
        "instruction": "Label each job on paper.",
        "examples": [
          "Sock sorter arm."
        ],
        "doneWhen": "Three job labels are attached or listed.",
        "ifStuck": "Write jobs on sticky notes.",
        "roleInstructions": []
      },
      {
        "title": "Demo for a stuffed audience",
        "instruction": "Show all three jobs once.",
        "examples": [
          "Move the robot to each job station."
        ],
        "doneWhen": "Audience sees three demos.",
        "ifStuck": "Narrate the jobs without moving much.",
        "roleInstructions": []
      }
    ]
  }
  $$::jsonb,
  true,
  137
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'puddle-forecast-studio',
  'Puddle Forecast Studio',
  'Host a living-room weather studio that forecasts puddle adventures.',
  'A weather studio tracks puddles, clouds, and cozy indoor plans.',
  25,
  'imaginative',
  $$
  {
    "kidRole": "Puddle Forecaster",
    "mission": "Viewers need a puddle forecast and indoor backup plan. Observe the window weather, draw a forecast map, and present a two-minute broadcast.",
    "starterPrompts": [
      "Are puddles growing or shrinking?",
      "What is the indoor backup adventure?",
      "Who is watching your forecast?"
    ],
    "firstMoves": [
      "Look out a window for one minute.",
      "Draw a cloud and puddle map.",
      "Write two forecast lines."
    ],
    "steps": [
      "Observe window weather.",
      "Draw the puddle forecast map.",
      "Present a two-minute broadcast."
    ],
    "roles": [
      "Puddle Forecaster"
    ],
    "extensionIdeas": [
      "Do an evening update.",
      "Invent a puddle rating scale."
    ],
    "uses": [
      "paper",
      "markers",
      "window view"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Calm rainy-day science storytelling with a clear broadcast finish.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 11,
      "targetAges": [
        6,
        9,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 6–11 with the independence and complexity this activity needs."
    },
    "categories": [
      "science",
      "nature",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "jungle"
  }
  $$::jsonb,
  true,
  138
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'zoom-animal-olympics',
  'Zoom Animal Olympics',
  'Compete as animal athletes in three living-room Olympic events.',
  'Animal athletes gather for a high-energy living-room Olympics.',
  15,
  'imaginative',
  $$
  {
    "kidRole": "Animal Athlete",
    "mission": "Opening ceremonies are done and events begin now. Choose an animal identity, complete three movement events, and award yourself a paper medal.",
    "starterPrompts": [
      "Which animal are you today?",
      "What is your signature move?",
      "How do you celebrate a personal best?"
    ],
    "firstMoves": [
      "Pick an animal identity.",
      "Clear a safe lane.",
      "Make a paper medal."
    ],
    "steps": [
      "Choose your animal athlete identity.",
      "Complete three movement events.",
      "Award a paper medal ceremony."
    ],
    "roles": [
      "Animal Athlete"
    ],
    "extensionIdeas": [
      "Invite a sibling animal rival.",
      "Invent a fourth event."
    ],
    "uses": [
      "paper",
      "tape lane optional"
    ],
    "energy": "high",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Fast imaginative energy burn with animal character flair.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 5–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "movement",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "high"
    },
    "visualTheme": "animals"
  }
  $$::jsonb,
  true,
  139
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'pillow-lava-courier',
  'Pillow Lava Courier',
  'Deliver three packages across a pillow-safe lava floor course.',
  'The floor is lava and urgent packages must cross by pillow path.',
  15,
  'imaginative',
  $$
  {
    "kidRole": "Lava Courier",
    "mission": "Three packages must reach base camp without touching lava. Build a pillow path, deliver each package, and reset the route if it collapses.",
    "starterPrompts": [
      "Where is lava hottest?",
      "What is inside package two?",
      "How do you rebuild a collapsed path?"
    ],
    "firstMoves": [
      "Lay pillow stepping stones.",
      "Place three paper packages.",
      "Mark base camp with a basket."
    ],
    "steps": [
      "Build a pillow path.",
      "Deliver three packages to base camp.",
      "Rebuild any collapsed route and finish."
    ],
    "roles": [
      "Lava Courier"
    ],
    "extensionIdeas": [
      "Add a timed round.",
      "Deliver oversized soft packages."
    ],
    "uses": [
      "pillows",
      "paper packages",
      "basket"
    ],
    "energy": "high",
    "mess": "medium",
    "adultHelp": "nearby",
    "whyItFits": "Classic high-energy floor-is-lava play with a courier mission.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 5–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "movement",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "high"
    },
    "visualTheme": "expedition"
  }
  $$::jsonb,
  true,
  140
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'bedtime-constellation-mail',
  'Bedtime Constellation Mail',
  'Write three constellation postcards and mail them to the morning.',
  'A bedtime post office sends mail along constellation routes.',
  15,
  'imaginative',
  $$
  {
    "kidRole": "Star Mail Carrier",
    "mission": "Morning needs three constellation postcards before sleep. Draw star routes, write short notes, and place them on a morning mail pillow.",
    "starterPrompts": [
      "Who receives postcard one?",
      "What constellation carries the mail?",
      "What do you tell morning?"
    ],
    "firstMoves": [
      "Cut or fold three postcard papers.",
      "Draw a tiny constellation on each.",
      "Choose a morning mail pillow."
    ],
    "steps": [
      "Make three constellation postcards.",
      "Write a short note on each.",
      "Mail them to the morning pillow."
    ],
    "roles": [
      "Star Mail Carrier"
    ],
    "extensionIdeas": [
      "Read one postcard aloud softly.",
      "Add a stamp doodle."
    ],
    "uses": [
      "paper",
      "pencil",
      "pillow"
    ],
    "energy": "calm",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Soft bedtime creativity that ends with lights-out mailing.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 9,
      "targetAges": [
        5,
        7,
        9
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 5–9 with the independence and complexity this activity needs."
    },
    "categories": [
      "creative",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "space"
  }
  $$::jsonb,
  true,
  141
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'goodnight-garden-patrol',
  'Goodnight Garden Patrol',
  'Patrol a bedroom plant-and-stuffed garden and wish each one goodnight.',
  'A tiny indoor garden needs a gentle goodnight patrol.',
  12,
  'imaginative',
  $$
  {
    "kidRole": "Garden Night Guard",
    "mission": "The indoor garden is ready for sleep. Visit each plant or stuffed flower, give a goodnight wish, and close the garden gate.",
    "starterPrompts": [
      "Which plant is sleepiest?",
      "What is your goodnight wish?",
      "Where is the garden gate?"
    ],
    "firstMoves": [
      "Line up plants or stuffed stand-ins.",
      "Make a paper garden gate.",
      "Dim the light slightly."
    ],
    "steps": [
      "Line up the garden visitors.",
      "Wish each one goodnight.",
      "Close the paper garden gate."
    ],
    "roles": [
      "Garden Night Guard"
    ],
    "extensionIdeas": [
      "Sing one soft garden hum.",
      "Water with pretend droplets."
    ],
    "uses": [
      "houseplants or stuffed stand-ins",
      "paper"
    ],
    "energy": "calm",
    "mess": "low",
    "adultHelp": "nearby",
    "whyItFits": "Short bedtime nurture ritual that settles bodies and voices.",
    "ageFit": {
      "minAge": 4,
      "maxAge": 7,
      "targetAges": [
        4,
        6,
        7
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 4–7 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "nature"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "jungle"
  }
  $$::jsonb,
  true,
  142
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'brother-sister-bakery-shift',
  'Brother-Sister Bakery Shift',
  'Share a bakery shift where one sibling bakes and the other serves.',
  'A sibling bakery opens for one busy afternoon shift.',
  30,
  'imaginative',
  $$
  {
    "kidRole": "Head Baker",
    "mission": "The bakery cannot run alone. One sibling shapes pretend treats while the other takes orders and serves, then you swap for round two.",
    "starterPrompts": [
      "Who bakes first?",
      "What is the bakery name?",
      "When do you swap roles?"
    ],
    "firstMoves": [
      "Set a table bakery counter.",
      "Make a three-item menu.",
      "Assign baker and server."
    ],
    "steps": [
      "Open the bakery and assign roles.",
      "Complete three orders.",
      "Swap roles and run a second round."
    ],
    "roles": [
      "Head Baker",
      "Front Server"
    ],
    "extensionIdeas": [
      "Add a pastry of the day.",
      "Open a second location on the floor."
    ],
    "uses": [
      "Play-Doh or paper treats",
      "toy dishes",
      "paper menu"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Sibling cooperative play with clear alternating jobs.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 11,
      "targetAges": [
        5,
        8,
        11
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 5–11 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "social-game"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "cooperative",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "neighborhood"
  }
  $$::jsonb,
  true,
  143
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'fort-embassy-summit',
  'Fort Embassy Summit',
  'Build two pillow embassies and negotiate a sibling peace treaty.',
  'Two pillow embassies meet for a living-room peace summit.',
  30,
  'imaginative',
  $$
  {
    "kidRole": "Ambassador",
    "mission": "Two embassies disagree about fort space. Build both embassies, exchange three requests, and sign one peace treaty both siblings accept.",
    "starterPrompts": [
      "What does each embassy want?",
      "What request is easy to grant?",
      "Where do you sign the treaty?"
    ],
    "firstMoves": [
      "Build two pillow embassy zones.",
      "Write three requests each.",
      "Place a treaty paper in the middle."
    ],
    "steps": [
      "Build two embassy zones.",
      "Exchange three requests each.",
      "Sign one shared peace treaty."
    ],
    "roles": [
      "Ambassador A",
      "Ambassador B"
    ],
    "extensionIdeas": [
      "Add a third neutral mediator stuffed animal.",
      "Redraw embassy borders."
    ],
    "uses": [
      "pillows",
      "blankets",
      "paper",
      "pencil"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "optional",
    "whyItFits": "Conflict-practice play that ends in a negotiated sibling agreement.",
    "ageFit": {
      "minAge": 7,
      "maxAge": 12,
      "targetAges": [
        7,
        10,
        12
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 7–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "building",
      "social-game",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "cooperative",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "fantasy"
  }
  $$::jsonb,
  true,
  144
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'solo-story-arcade',
  'Solo Story Arcade',
  'Design three paper mini-games and play a solo arcade session.',
  'A one-player story arcade opens when adults need quiet rest.',
  30,
  'imaginative',
  $$
  {
    "kidRole": "Arcade Designer",
    "mission": "The arcade must entertain you without interrupting anyone. Invent three paper mini-games, play each once, and crown a high-score champion game.",
    "starterPrompts": [
      "What is game one called?",
      "How do you score points?",
      "Which game becomes champion?"
    ],
    "firstMoves": [
      "Fold three game boards.",
      "Write simple rules for game one.",
      "Make a paper token."
    ],
    "steps": [
      "Invent three paper mini-games.",
      "Play each game once.",
      "Crown the high-score champion."
    ],
    "roles": [
      "Arcade Designer"
    ],
    "extensionIdeas": [
      "Invite a sibling later.",
      "Design cover art for the arcade."
    ],
    "uses": [
      "paper",
      "pencil",
      "coins or buttons as tokens"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Independent creative play for exhausted-parent windows.",
    "ageFit": {
      "minAge": 8,
      "maxAge": 13,
      "targetAges": [
        8,
        11,
        13
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 8–13 with the independence and complexity this activity needs."
    },
    "categories": [
      "creative",
      "puzzle"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "art"
  }
  $$::jsonb,
  true,
  145
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'quiet-kingdom-census',
  'Quiet Kingdom Census',
  'Count and catalog every stuffed subject in a quiet bedroom kingdom.',
  'A quiet kingdom needs a careful census while the castle rests.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Royal Census Taker",
    "mission": "The king is napping and the kingdom still needs numbers. Count stuffed subjects, sort them by job, and deliver a one-page census to the pillow throne.",
    "starterPrompts": [
      "Who sits on the pillow throne?",
      "What jobs do subjects have?",
      "How do you mark counted citizens?"
    ],
    "firstMoves": [
      "Gather stuffed subjects.",
      "Make tally columns on paper.",
      "Choose a pillow throne."
    ],
    "steps": [
      "Gather and count stuffed subjects.",
      "Sort them by job categories.",
      "Deliver the census to the pillow throne."
    ],
    "roles": [
      "Royal Census Taker"
    ],
    "extensionIdeas": [
      "Draw a kingdom map.",
      "Appoint a new mayor stuffed animal."
    ],
    "uses": [
      "stuffed animals",
      "paper",
      "pencil",
      "pillow"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Soft independent organizing play when energy and supervision are low.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 9,
      "targetAges": [
        5,
        7,
        9
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 5–9 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "puzzle"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "fantasy"
  }
  $$::jsonb,
  true,
  146
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'healing-herb-apothecary',
  'Healing Herb Apothecary',
  'Run a gentle pretend apothecary that mixes kindness remedies for soft patients.',
  'A quiet apothecary opens for low-energy patients needing kindness remedies.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Apothecary",
    "mission": "Patients need calm remedies, not loud adventures. Mix three pretend kindness potions from paper labels and soft materials, then dose each stuffed patient gently.",
    "starterPrompts": [
      "What does a courage sip taste like?",
      "Which patient needs rest remedy?",
      "How do you label each potion?"
    ],
    "firstMoves": [
      "Set a towel apothecary table.",
      "Make three paper potion labels.",
      "Seat stuffed patients nearby."
    ],
    "steps": [
      "Set up the apothecary table.",
      "Mix three kindness remedies.",
      "Dose each patient gently."
    ],
    "roles": [
      "Apothecary"
    ],
    "extensionIdeas": [
      "Invent a fourth remedy.",
      "Write refill instructions."
    ],
    "uses": [
      "paper",
      "cups or bowls",
      "towel",
      "stuffed animals"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Nurturing low-energy play for sick days or quiet recovery.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 5–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "pretend",
      "sensory"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "fantasy"
  }
  $$::jsonb,
  true,
  147
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'cloud-watching-oracle',
  'Cloud Watching Oracle',
  'Read cloud shapes from a window and write three gentle prophecies.',
  'A window oracle reads clouds for soft afternoon prophecies.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Cloud Oracle",
    "mission": "The sky is speaking in shapes. Watch clouds or sky color, invent three gentle prophecies, and record them in an oracle notebook.",
    "starterPrompts": [
      "What animal do you see in the clouds?",
      "What gentle prophecy fits today?",
      "How do oracles end a reading?"
    ],
    "firstMoves": [
      "Sit by a window.",
      "Open an oracle notebook page.",
      "Watch the sky for one quiet minute."
    ],
    "steps": [
      "Watch the sky quietly.",
      "Write three gentle prophecies.",
      "Close the oracle notebook with a final line."
    ],
    "roles": [
      "Cloud Oracle"
    ],
    "extensionIdeas": [
      "Illustrate one prophecy.",
      "Do a sunset sequel reading."
    ],
    "uses": [
      "window",
      "paper",
      "pencil"
    ],
    "energy": "calm",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "Ultra-low-energy imaginative observation for sick or rest days.",
    "ageFit": {
      "minAge": 7,
      "maxAge": 13,
      "targetAges": [
        7,
        10,
        13
      ],
      "maturityLevel": "child",
      "independenceLevel": "independent",
      "ageFitReason": "Fits ages 7–13 with the independence and complexity this activity needs."
    },
    "categories": [
      "nature",
      "creative"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "mystery"
  }
  $$::jsonb,
  true,
  148
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'afternoon-treasure-cartographers',
  'Afternoon Treasure Cartographers',
  'Draw a multi-room treasure map and hide one prize for a later hunt.',
  'An open afternoon needs cartographers and a single hidden treasure.',
  35,
  'imaginative',
  $$
  {
    "kidRole": "Chief Cartographer",
    "mission": "A treasure exists somewhere in the house and only your map can find it. Draw rooms, hide one prize, then either hunt it yourself later or invite a sibling.",
    "starterPrompts": [
      "What is the treasure?",
      "Which room is most suspicious?",
      "What symbol marks danger?"
    ],
    "firstMoves": [
      "Sketch the main rooms.",
      "Choose a small treasure.",
      "Mark an X lightly in pencil."
    ],
    "steps": [
      "Draw a multi-room map.",
      "Hide one treasure.",
      "Hunt using the map or share it with a sibling."
    ],
    "roles": [
      "Chief Cartographer"
    ],
    "extensionIdeas": [
      "Add riddle clues.",
      "Make a second decoy map."
    ],
    "uses": [
      "paper",
      "pencil",
      "small treasure object"
    ],
    "energy": "medium",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "Flexible open-afternoon mapping adventure with replay value.",
    "ageFit": {
      "minAge": 7,
      "maxAge": 12,
      "targetAges": [
        7,
        10,
        12
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 7–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "creative",
      "pretend",
      "puzzle"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "medium"
    },
    "visualTheme": "expedition"
  }
  $$::jsonb,
  true,
  149
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'cardboard-colony-founders',
  'Cardboard Colony Founders',
  'Found a cardboard colony with houses, jobs, and a town square.',
  'A brand-new cardboard colony needs founders before sundown.',
  45,
  'imaginative',
  $$
  {
    "kidRole": "Colony Founder",
    "mission": "Empty cardboard is waiting to become a colony. Build three structures, assign jobs to toy citizens, and open the town square with a short speech.",
    "starterPrompts": [
      "What is the colony named?",
      "Who gets which job?",
      "Where is the town square?"
    ],
    "firstMoves": [
      "Gather boxes and tape.",
      "Name the colony.",
      "Build the first house shell."
    ],
    "steps": [
      "Build three colony structures.",
      "Assign jobs to toy citizens.",
      "Open the town square with a short speech."
    ],
    "roles": [
      "Colony Founder",
      "Town Crier"
    ],
    "extensionIdeas": [
      "Add a second street.",
      "Hold elections for mayor."
    ],
    "uses": [
      "cardboard boxes",
      "tape",
      "markers",
      "small toys"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "optional",
    "whyItFits": "Long open-afternoon construction narrative with a civic finish.",
    "ageFit": {
      "minAge": 8,
      "maxAge": 13,
      "targetAges": [
        8,
        11,
        13
      ],
      "maturityLevel": "child",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 8–13 with the independence and complexity this activity needs."
    },
    "categories": [
      "building",
      "pretend"
    ],
    "traits": {
      "setupEffort": "medium",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "low"
    },
    "visualTheme": "building"
  }
  $$::jsonb,
  true,
  150
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'laundry-dragon-taming',
  'Laundry Dragon Taming',
  'Tame the laundry dragon by sorting and folding its chaotic scales.',
  'A laundry dragon sheds sock scales across the floor.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Dragon Tamer",
    "mission": "The laundry dragon is restless until its scales are sorted. Sort colors or types, fold what you can, and declare the dragon calm when the pile is tamed.",
    "starterPrompts": [
      "What color are the dragon’s scales today?",
      "Which pile calms the dragon fastest?",
      "How do you know the dragon is tamed?"
    ],
    "firstMoves": [
      "Face the laundry pile.",
      "Name the dragon.",
      "Make two or three sort zones."
    ],
    "steps": [
      "Name the laundry dragon.",
      "Sort scales into calm piles.",
      "Fold what you can and declare the dragon tamed."
    ],
    "roles": [
      "Dragon Tamer"
    ],
    "extensionIdeas": [
      "Match sock scales into pairs.",
      "Deliver folded stacks as tribute."
    ],
    "uses": [
      "laundry pile",
      "baskets"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "optional",
    "whyItFits": "Cleaning chore transformed into a finishable fantasy quest.",
    "ageFit": {
      "minAge": 6,
      "maxAge": 12,
      "targetAges": [
        6,
        9,
        12
      ],
      "maturityLevel": "mixed-age",
      "independenceLevel": "some-help",
      "ageFitReason": "Fits ages 6–12 with the independence and complexity this activity needs."
    },
    "categories": [
      "helping",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "medium"
    },
    "visualTheme": "fantasy"
  }
  $$::jsonb,
  true,
  151
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.preset_activities (
  slug,
  title,
  summary,
  theme,
  estimated_minutes,
  activity_style,
  full_content,
  is_active,
  display_order
)
values (
  'toy-city-sanitation-crew',
  'Toy City Sanitation Crew',
  'Clear toy clutter as a sanitation crew restoring city streets.',
  'Toy City’s streets are blocked and sanitation is on duty.',
  25,
  'imaginative',
  $$
  {
    "kidRole": "Sanitation Captain",
    "mission": "Toy City cannot open until streets are clear. Sort toys into neighborhoods, return them to bins, and reopen Main Street with a ribbon-cutting cheer.",
    "starterPrompts": [
      "Where is Main Street?",
      "Which neighborhood bin is which?",
      "What is your sanitation crew call?"
    ],
    "firstMoves": [
      "Mark Main Street on the floor.",
      "Set out toy bins as neighborhoods.",
      "Start a before photo if allowed."
    ],
    "steps": [
      "Map Toy City neighborhoods with bins.",
      "Clear streets into the right bins.",
      "Reopen Main Street with a cheer."
    ],
    "roles": [
      "Sanitation Captain"
    ],
    "extensionIdeas": [
      "Add recycling vs landfill sorts.",
      "Issue a clean-city certificate."
    ],
    "uses": [
      "toy bins",
      "toys on floor"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "nearby",
    "whyItFits": "Room cleanup framed as civic duty kids can complete.",
    "ageFit": {
      "minAge": 5,
      "maxAge": 10,
      "targetAges": [
        5,
        8,
        10
      ],
      "maturityLevel": "child",
      "independenceLevel": "mostly-independent",
      "ageFitReason": "Fits ages 5–10 with the independence and complexity this activity needs."
    },
    "categories": [
      "helping",
      "pretend"
    ],
    "traits": {
      "setupEffort": "low",
      "structure": "guided",
      "socialMode": "solo",
      "creativity": "high",
      "movement": "medium"
    },
    "visualTheme": "neighborhood"
  }
  $$::jsonb,
  true,
  152
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

commit;
