-- supabase/migrations/20260728_001_create_preset_activity_library.sql

/*
 * FAMILYFLOW PRESET ACTIVITY LIBRARY
 * ==================================
 *
 * This migration creates:
 *
 * 1. profiles
 *    Stores one application profile for each Supabase Auth user.
 *
 * 2. preset_activities
 *    Stores the 9 simple and 9 imaginative preset activities.
 *
 * 3. subscriptions
 *    Stores trusted subscription status.
 *
 * Anonymous users may:
 *
 * - use every simple preset
 * - unlock one imaginative preset
 *
 * Only paid users may:
 *
 * - use every imaginative preset
 * - call OpenAI-backed routes
 */

begin;

/*
 * Supabase normally includes pgcrypto, but this ensures
 * gen_random_uuid() is available.
 */
create extension if not exists pgcrypto;

/*
 * PROFILES
 * --------
 *
 * user_id matches the user's UUID in auth.users.
 *
 * free_imaginative_activity_id is the one imaginative preset
 * selected by an unpaid user.
 */
create table if not exists public.profiles (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  is_anonymous boolean not null default true,

  free_imaginative_activity_id uuid null,

  stripe_customer_id text unique null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

/*
 * These ALTER statements make the migration safer if an earlier version
 * of the profiles table was already created.
 */
alter table public.profiles
  add column if not exists is_anonymous boolean not null default true;

alter table public.profiles
  add column if not exists free_imaginative_activity_id uuid null;

alter table public.profiles
  add column if not exists stripe_customer_id text null;

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

/*
 * PRESET ACTIVITIES
 * -----------------
 *
 * Preview-safe information lives in normal columns.
 *
 * Locked instructions live in full_content so Express can decide whether
 * the current user is allowed to receive them.
 */
create table if not exists public.preset_activities (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,

  title text not null,

  summary text not null,

  theme text not null default '',

  estimated_minutes integer not null
    check (
      estimated_minutes >= 1
      and estimated_minutes <= 480
    ),

  activity_style text not null
    check (
      activity_style in ('simple', 'imaginative')
    ),

  full_content jsonb not null,

  is_active boolean not null default true,

  display_order integer not null default 0,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

/*
 * Add the profile's free-activity foreign key after preset_activities exists.
 */
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_free_imaginative_activity_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_free_imaginative_activity_id_fkey
      foreign key (free_imaginative_activity_id)
      references public.preset_activities(id)
      on delete set null;
  end if;
end
$$;

/*
 * SUBSCRIPTIONS
 * -------------
 *
 * Later, verified Stripe webhooks will update this table.
 *
 * The browser must never directly change subscription status.
 */
create table if not exists public.subscriptions (
  user_id uuid primary key
    references public.profiles(user_id)
    on delete cascade,

  stripe_customer_id text unique null,

  stripe_subscription_id text unique null,

  stripe_price_id text null,

  status text not null default 'inactive'
    check (
      status in (
        'inactive',
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'paused'
      )
    ),

  current_period_end timestamptz null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

/*
 * INDEXES
 */
create index if not exists preset_activities_style_active_idx
  on public.preset_activities(
    activity_style,
    is_active,
    display_order
  );

create index if not exists subscriptions_status_idx
  on public.subscriptions(status);

/*
 * UPDATED_AT TRIGGER
 */
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at
  on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists preset_activities_set_updated_at
  on public.preset_activities;

create trigger preset_activities_set_updated_at
before update on public.preset_activities
for each row
execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at
  on public.subscriptions;

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

/*
 * ROW LEVEL SECURITY
 *
 * React will not read these tables directly.
 *
 * React talks to Express.
 * Express checks authorization.
 * Express uses the server-only secret key for trusted database access.
 */
alter table public.profiles
  enable row level security;

alter table public.preset_activities
  enable row level security;

alter table public.subscriptions
  enable row level security;

/*
 * Remove direct browser table permissions.
 *
 * Anonymous Supabase Auth users use the authenticated Postgres role,
 * not the unauthenticated anon role.
 */
revoke all on table public.profiles
  from anon, authenticated;

revoke all on table public.preset_activities
  from anon, authenticated;

revoke all on table public.subscriptions
  from anon, authenticated;

/*
 * The trusted backend role receives access.
 */
grant all on table public.profiles
  to service_role;

grant all on table public.preset_activities
  to service_role;

grant all on table public.subscriptions
  to service_role;

/*
 * SIMPLE PRESET ACTIVITIES
 * ========================
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
values
(
  'draw-a-picture',
  'Draw a picture',
  'Get paper and draw whatever you feel like.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Get paper and something to draw with."
    ],
    "steps": [
      "Get paper and something to draw with.",
      "Draw whatever you feel like.",
      "Hang it up or show someone later."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "paper",
      "markers",
      "crayons"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "It is quiet, familiar, and needs very little setup."
  }
  $$::jsonb,
  true,
  1
),
(
  'color-a-page',
  'Color a page',
  'Pick a coloring page and fill it in section by section.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Pick a coloring page."
    ],
    "steps": [
      "Pick a coloring page.",
      "Color one section at a time.",
      "Fill in details if you want."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "coloring books",
      "crayons",
      "markers"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "It is calm, clear, and uses art supplies you already have."
  }
  $$::jsonb,
  true,
  2
),
(
  'build-a-tower',
  'Build a tower',
  'Dump out your blocks and build the tallest tower you can.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Dump out your blocks."
    ],
    "steps": [
      "Dump out your blocks.",
      "Build the tallest tower you can.",
      "See if you can add one more piece."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "wooden blocks",
      "LEGO",
      "magnet tiles"
    ],
    "energy": "medium",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "It is easy to begin and uses a familiar building toy."
  }
  $$::jsonb,
  true,
  3
),
(
  'do-a-puzzle',
  'Do a puzzle',
  'Dump the pieces, find the edges, and fill in the middle.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Dump the pieces."
    ],
    "steps": [
      "Dump the pieces.",
      "Find edge pieces first.",
      "Fill in the middle."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "jigsaw puzzles"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "It is structured, screen-free, and easy to understand."
  }
  $$::jsonb,
  true,
  4
),
(
  'make-a-reading-nook',
  'Make a reading nook',
  'Pick a book, make a comfy spot, and read for a little while.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Pick a book."
    ],
    "steps": [
      "Pick a book.",
      "Make a comfy spot with pillows.",
      "Read for a little while."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "picture books",
      "pillows",
      "blankets"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "It gives a calm activity that can last as long as needed."
  }
  $$::jsonb,
  true,
  5
),
(
  'play-a-simple-card-game',
  'Play a simple card game',
  'Get your cards, shuffle and deal, and play one round.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Get your cards."
    ],
    "steps": [
      "Get your cards.",
      "Shuffle and deal.",
      "Play one round."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "playing cards",
      "Uno",
      "memory game"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "It uses an existing collection and provides a clear task."
  }
  $$::jsonb,
  true,
  6
),
(
  'build-a-cozy-fort',
  'Build a cozy fort',
  'Gather blankets and pillows and make a cozy fort to crawl into.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Gather blankets and pillows."
    ],
    "steps": [
      "Gather blankets and pillows.",
      "Drape a blanket over chairs or the couch.",
      "Crawl inside and get cozy."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "blankets",
      "pillows",
      "couch cushions"
    ],
    "energy": "medium",
    "mess": "medium",
    "adultHelp": "optional",
    "whyItFits": "It turns ordinary household items into a clear building project."
  }
  $$::jsonb,
  true,
  7
),
(
  'make-play-doh-shapes',
  'Make Play-Doh shapes',
  'Open your Play-Doh and make balls, snakes, cookies, or one finished shape.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Open your Play-Doh."
    ],
    "steps": [
      "Open your Play-Doh.",
      "Roll balls, snakes, or cookies.",
      "Make one finished shape."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "Play-Doh",
      "Play-Doh tools"
    ],
    "energy": "low",
    "mess": "medium",
    "adultHelp": "none",
    "whyItFits": "It is hands-on, contained, and easy to start alone."
  }
  $$::jsonb,
  true,
  8
),
(
  'ball-play-outside',
  'Ball play outside',
  'Grab a ball, go to a safe play space, and kick, throw, or bounce.',
  '',
  20,
  'simple',
  $$
  {
    "kidRole": "",
    "mission": "",
    "starterPrompts": [],
    "firstMoves": [
      "Grab a ball."
    ],
    "steps": [
      "Grab a ball.",
      "Go to a safe play space.",
      "Kick, throw, or bounce for a while."
    ],
    "roles": [],
    "extensionIdeas": [],
    "uses": [
      "soccer ball",
      "basketball",
      "tennis ball"
    ],
    "energy": "high",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "It gives an energetic child a simple activity with clear boundaries."
  }
  $$::jsonb,
  true,
  9
)
on conflict (slug)
do update set
  title = excluded.title,
  summary = excluded.summary,
  theme = excluded.theme,
  estimated_minutes = excluded.estimated_minutes,
  activity_style = excluded.activity_style,
  full_content = excluded.full_content,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

/*
 * IMAGINATIVE PRESET ACTIVITIES
 * =============================
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
values
(
  'the-lost-shell-signal',
  'The Lost Shell Signal',
  'You are listening for shell signals in the deep ocean. Move quietly around the room, find the clues, and send back your discovery report.',
  'A calm underwater search for lost shell signals and hidden sea clues.',
  18,
  'imaginative',
  $$
  {
    "kidRole": "Sea Signal Finder",
    "mission": "Search the undersea stations, find the hidden clues, and report what the ocean is telling you.",
    "starterPrompts": [
      "What kind of signal are you listening for?",
      "Which place in the room feels like a sea station?",
      "What do you think the ocean clue will be?"
    ],
    "firstMoves": [
      "Hide three paper clues or pictures around the room before you start, or place them in open sight.",
      "Choose a stuffed animal to be your listening partner.",
      "Move to the first station on tiptoe or with slow swimming steps.",
      "Pick up each clue and say what ocean thing it reminds you of."
    ],
    "steps": [
      "Travel from one station to the next using slow, quiet movement.",
      "At each station, pretend to listen to the sea and find the clue.",
      "Name the clue and make up a tiny ocean message for it.",
      "When all clues are found, sit at base camp and tell the full story of the deep-sea signal."
    ],
    "roles": [
      "Sea Signal Finder"
    ],
    "extensionIdeas": [
      "Draw the three clues you found.",
      "Make up a new signal path and follow it again.",
      "Retell the adventure using your stuffed animal as the captain."
    ],
    "uses": [
      "paper",
      "crayons",
      "stuffed animals",
      "blankets",
      "pillows"
    ],
    "energy": "medium",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "This fits do-not-interrupt time because the child can start it alone, keep it quiet, and stay in the living room. It uses no water, no small objects, and no screens, while still feeling like a real undersea exploration story with movement and clear missions."
  }
  $$::jsonb,
  true,
  101
),
(
  'tiny-bakery-counter',
  'Tiny Bakery Counter',
  'You are the baker at your own little bakery. Take orders, make pretend treats, and serve them at the table.',
  'A cozy kitchen-table bakery where you take orders, build treats, and serve customers with toy dishes and paper menus.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Baker and server",
    "mission": "Bake pretend treats, fill customer orders, and serve them neatly at the kitchen table.",
    "starterPrompts": [
      "What kind of bakery are you running today?",
      "What treat does your first customer want?",
      "What should you do if the bakery gets busy?"
    ],
    "firstMoves": [
      "Put on the apron or drape a towel like a bakery apron.",
      "Set out toy dishes and paper on the kitchen table.",
      "Draw 2 or 3 pretend menu items on paper.",
      "Choose your first customer order and start making it with Play-Doh."
    ],
    "steps": [
      "Make a simple menu with 3 pretend treats, like a cookie, cupcake, and pie.",
      "Take one order at a time and shape the treat with Play-Doh or draw it on paper.",
      "Put each finished treat on a toy dish and say, 'Order ready!'",
      "After serving, clean the counter and start a new order."
    ],
    "roles": [
      "Baker",
      "Server"
    ],
    "extensionIdeas": [
      "Make a new menu with different treats.",
      "Open a second round of orders for more customers."
    ],
    "uses": [
      "Play-Doh",
      "paper",
      "markers",
      "toy dishes",
      "apron or towel"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "This matches the child's interest in bakery and restaurant play, stays at the kitchen table, uses only the items on hand, and works well while a parent is cooking. It is imaginative but calm, low-mess, and independent for ages 5–8."
  }
  $$::jsonb,
  true,
  102
),
(
  'the-quiet-clue-room',
  'The Quiet Clue Room',
  'You are the detective in charge of finding out which object does not belong and how it moved.',
  'A calm living-room mystery where everyday objects become clues in a tiny case to solve.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Detective",
    "mission": "Look at the clues, figure out the odd object, and explain your answer like a real detective.",
    "starterPrompts": [
      "Which object looks the most different from the others?",
      "What small detail makes you think that?",
      "If that clue could talk, what would it say?"
    ],
    "firstMoves": [
      "Pick three safe household objects and place them on the floor or couch.",
      "Use the flashlight or magnifying glass to look closely at each one.",
      "Choose one object to be the odd clue and one to be the helper clue.",
      "Draw a quick note on paper showing your guess."
    ],
    "steps": [
      "Set up a small clue scene with three safe household objects in the living room.",
      "Study the clues quietly and notice size, shape, color, and where each item is placed.",
      "Make your best detective guess and say why each clue matters.",
      "Check your guess by changing one object and seeing if the story still makes sense."
    ],
    "roles": [
      "Detective"
    ],
    "extensionIdeas": [
      "Switch the odd object and solve it again.",
      "Make a second clue scene with a new rule, like biggest, softest, or roundest."
    ],
    "uses": [
      "paper",
      "pencil",
      "flashlight or phone light",
      "magnifying glass or empty toilet paper tube",
      "three safe household objects"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "This matches the child's love of detective mystery play, stays quiet and low-mess in the living room, uses only ordinary household items, and can be started independently while the parent pays bills."
  }
  $$::jsonb,
  true,
  103
),
(
  'downtown-map-maker',
  'Downtown Map Maker',
  'You are the map maker. Draw a simple city plan, then build the parts you drew.',
  'A living-room planning desk where you map out roads, buildings, and city signs for a tiny downtown.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "City Planner",
    "mission": "Make a downtown map on paper and build the main parts in blocks.",
    "starterPrompts": [
      "What should go on your downtown map first?",
      "Where will the roads go?",
      "Which building should be the tallest?"
    ],
    "firstMoves": [
      "Take a sheet of paper and a crayon.",
      "Draw a few roads, one park, and three building spots.",
      "Build the first building with blocks or magnet tiles.",
      "Place a toy car on the road and follow the map."
    ],
    "steps": [
      "Draw a simple top-down map with roads and labeled spots.",
      "Build the map in real life with blocks and tiles.",
      "Add city details like a bridge, a parking area, or a crosswalk.",
      "Move the car around and see if the roads make sense."
    ],
    "roles": [
      "City Planner"
    ],
    "extensionIdeas": [
      "Make a new neighborhood on another sheet of paper.",
      "Add one special building like a library, store, or fire station.",
      "Change the road layout and rebuild the map."
    ],
    "uses": [
      "paper",
      "crayon",
      "wooden blocks",
      "magnet tiles",
      "toy cars"
    ],
    "energy": "medium",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "This gives the child a clear planning job, uses the living room as a build-and-draw space, keeps setup simple, and fits the requested construction/city planner theme with no small or messy materials."
  }
  $$::jsonb,
  true,
  104
),
(
  'stuffed-pet-clinic',
  'Stuffed Pet Clinic',
  'You are the pet doctor in your cozy bedroom clinic. Your stuffed animals come one by one for careful checkups, stickers, and kind care.',
  'A quiet bedroom clinic where stuffed animals come in for gentle checkups, bandages, and comfort.',
  25,
  'imaginative',
  $$
  {
    "kidRole": "Pet Doctor",
    "mission": "Take care of your stuffed animals by checking how they feel, giving them a bandage or sticker if needed, and writing a tiny care note for each one.",
    "starterPrompts": [
      "Which stuffed animal is first in line?",
      "What seems to be wrong: a hurt paw, a sad face, or a sleepy tail?",
      "What kind of care will help this pet feel better?"
    ],
    "firstMoves": [
      "Lay a blanket on the bed as your clinic bed.",
      "Pick one stuffed animal to be your first patient.",
      "Look closely and decide what kind of care it needs.",
      "Get a paper and crayon ready for your care notes."
    ],
    "steps": [
      "Check each stuffed animal gently and say what you notice.",
      "Choose a sticker or bandage for any pet that needs extra care.",
      "Draw a tiny care card for each pet with its name and what helped it feel better."
    ],
    "roles": [
      "Pet Doctor",
      "Pet Nurse",
      "Pet Keeper"
    ],
    "extensionIdeas": [
      "Make a waiting line of stuffed animals and call them in one at a time.",
      "Give each pet a follow-up visit and say how they are feeling now."
    ],
    "uses": [
      "stuffed animals",
      "blanket",
      "bandaids or stickers",
      "paper",
      "crayons"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "This fits the child’s love of pet care, stays quiet and low-mess in the bedroom, and can be started independently with only stuffed animals, blanket, bandages or stickers, paper, and crayons."
  }
  $$::jsonb,
  true,
  105
),
(
  'museum-of-lost-exhibits',
  'Museum of Lost Exhibits',
  'You are the museum finder. Search the living room for three lost exhibits, bring each one back, and place it on the museum shelf.',
  'A time-travel museum in the living room has three missing exhibits, and you must find them and return them to the museum shelf.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Museum Finder",
    "mission": "Find the three lost exhibits hidden around the living room and return them to the museum shelf before the museum opens again.",
    "starterPrompts": [
      "Which exhibit do you want to hunt for first: the oldest, the shiniest, or the oddest?",
      "What clue will help you remember where each exhibit was found?",
      "When you bring one back, will you give it a name tag or a museum spot?"
    ],
    "firstMoves": [
      "Pick three safe household objects to be the lost exhibits.",
      "Choose one chair or table as the museum shelf.",
      "Hide the three exhibits in different easy spots in the living room.",
      "Start searching for the first exhibit and carry it back carefully."
    ],
    "steps": [
      "Search the living room for one lost exhibit at a time.",
      "Each time you find one, bring it to the museum shelf and place it in a special spot.",
      "Keep going until all three exhibits are returned, then give the museum a final check to make sure nothing is missing."
    ],
    "roles": [],
    "extensionIdeas": [
      "Time yourself and try to beat your own return time.",
      "Draw a small museum sign for each exhibit on paper.",
      "Hide the three exhibits again in new spots for another round."
    ],
    "uses": [
      "three safe household objects",
      "chair or table",
      "paper",
      "markers"
    ],
    "energy": "medium",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "This matches the child’s love of time-travel museum scavenger hunts and keeps the main play as finding and returning lost exhibits. It works in the living room, needs only safe household objects plus paper and markers, stays low mess, and can be done mostly independently while the parent handles errands."
  }
  $$::jsonb,
  true,
  106
),
(
  'nature-magic-weather-map',
  'Nature Magic Weather Map',
  'You are drawing a magic weather map for a little nature world.',
  'A cozy map-making lab where you chart a magical garden sky and tiny weather spots.',
  25,
  'imaginative',
  $$
  {
    "kidRole": "Map Maker",
    "mission": "Create a map with three weather spots and decide what kind of nature magic lives in each one.",
    "starterPrompts": [
      "What places will be on your magic map?",
      "Which spot has sun, clouds, wind, or rain?",
      "What tiny nature magic lives there?"
    ],
    "firstMoves": [
      "Place a sheet of paper on the table.",
      "Draw a simple map shape with a path, hill, tree, or garden square.",
      "Pick three weather spots and mark them with colors or symbols.",
      "Write or say a tiny name for each spot."
    ],
    "steps": [
      "Make a cloud hill, a windy path, and a sunny garden corner on your map.",
      "Add one nature magic detail to each place, like sparkling leaves, sleepy flowers, or breezy grass.",
      "Draw arrows or swirls to show how the weather moves across the map.",
      "Walk your finger around the map and tell the story of what happens in each place."
    ],
    "roles": [],
    "extensionIdeas": [
      "Add a fourth spot if you still want to play.",
      "Make a second map for a different season.",
      "Tell the map story from the point of view of the wind."
    ],
    "uses": [
      "paper",
      "crayons",
      "markers"
    ],
    "energy": "low",
    "mess": "low",
    "adultHelp": "none",
    "whyItFits": "This is a calm craft-story activity that matches the kitchen table, quiet mode, and low-mess rules. It uses only paper and drawing tools, gives the child a clear imaginative role, and keeps the play independent and focused on weather and nature magic."
  }
  $$::jsonb,
  true,
  107
),
(
  'living-room-circus-show',
  'Living Room Circus Show',
  'You are the star of your own circus show. Pick your acts, get dressed up, and perform for the living room audience.',
  'A bright circus stage in the living room where one performer gets ready for a big show.',
  25,
  'imaginative',
  $$
  {
    "kidRole": "Ringmaster Performer",
    "mission": "Put on a 3-part circus show with an opening pose, a main act, and a big final bow.",
    "starterPrompts": [
      "What is your circus name?",
      "Will your first act be dancing, balancing, or funny faces?",
      "What is your big final pose?"
    ],
    "firstMoves": [
      "Choose a scarf or dress-up piece for your costume.",
      "Clear a small space in the living room as your stage.",
      "Stand at one end and announce your show to the room.",
      "Practice one strong opening pose."
    ],
    "steps": [
      "Create your circus name and costume.",
      "Perform three short acts: a dance, a pose, and a silly or dramatic ending.",
      "Take a bow and freeze for applause at the end.",
      "If you want, repeat the show with a new costume or new acts."
    ],
    "roles": [
      "Performer"
    ],
    "extensionIdeas": [
      "Make a second show with a different name.",
      "Add one new act and perform the whole show again."
    ],
    "uses": [
      "dress-up clothes or scarf",
      "blankets"
    ],
    "energy": "high",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "This matches the child's interest in circus and stage performance, uses the living room, stays screen-free and low-mess, and works well with independent play while the parent is busy nearby doing yard work."
  }
  $$::jsonb,
  true,
  108
),
(
  'hallway-map-courier',
  'Hallway Map Courier',
  'You are the route courier. Read your map, follow the stops, and deliver each package to the right place in the living room.',
  'A cozy indoor route where you study a simple map, follow stops around the living room, and deliver tiny packages in order.',
  20,
  'imaginative',
  $$
  {
    "kidRole": "Map Courier",
    "mission": "Deliver the three packages to their correct stops by following your indoor map without mixing up the route.",
    "starterPrompts": [
      "Where is your start point on the map?",
      "Which stop should come first: sofa, chair, or table?",
      "What will you say when a delivery is complete?"
    ],
    "firstMoves": [
      "Draw a simple living-room map on paper.",
      "Mark a start spot and three delivery stops with little symbols.",
      "Place one safe package in the small box or bag.",
      "Walk the route once with your finger before you carry the package."
    ],
    "steps": [
      "Look at the map and choose the first stop.",
      "Carry one package to that stop and place it down.",
      "Return to the map, find the next stop, and repeat until all packages are delivered."
    ],
    "roles": [
      "You are the courier and map reader."
    ],
    "extensionIdeas": [
      "Add one more stop and redraw the route.",
      "Make a return route back to the start.",
      "Deliver the packages in reverse order the second time."
    ],
    "uses": [
      "paper",
      "crayon or pencil",
      "small box or bag",
      "three small safe objects as packages"
    ],
    "energy": "medium",
    "mess": "low",
    "adultHelp": "optional",
    "whyItFits": "This fits the child's love of delivery routes and indoor map play, uses only the living room, stays mostly independent, and works with the paper and safe package items already available. It is screen-free, low-mess, and easy to do while a parent is cleaning nearby."
  }
  $$::jsonb,
  true,
  109
)
on conflict (slug)
do update set
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
