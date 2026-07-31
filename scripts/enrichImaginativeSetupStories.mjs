/**
 * Enrich imaginative preset theme/summary/mission with richer setup stories.
 * Usage: node scripts/enrichImaginativeSetupStories.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, "generated", "imaginative-presets.json");

const enrichments = {
  "the-lost-shell-signal": {
    theme:
      "The deep ocean has gone strangely quiet, and three glowing shell stations no longer send their soft signals up to the surface.",
    summary:
      "Something odd happened under the waves: the shell signal network stopped singing. You are the Sea Signal Finder who must swim the quiet stations, listen for what went wrong, and bring the ocean's message home.",
    mission:
      "Last night the deep ocean went strangely quiet. The glowing shells that usually hum messages to the surface stopped one by one, and now three stations along the undersea path are dark. You are the Sea Signal Finder—calm, careful, and ready to listen. Travel from station to station, find each hidden clue the ocean left behind, and piece together what the shells are trying to say. When you return to base camp, tell the full story of the lost signal.",
  },
  "tiny-bakery-counter": {
    theme:
      "A tiny neighborhood bakery is opening for the morning rush, and the first customers are already peeking through the window.",
    summary:
      "The bakery lights are on and the counter is waiting. You are the baker and server who must take orders, make pretend treats, and keep every customer happy at the kitchen table.",
    mission:
      'This morning your tiny bakery is opening for the first time, and the neighborhood already smells like warm cookies. Customers will arrive soon with special requests, and the counter needs a baker who can listen carefully and create each treat. You are both baker and server today. Make a simple menu, take one order at a time, shape or draw each treat, and serve it with a friendly "Order ready!" Keep the bakery running until every customer leaves smiling.',
  },
  "the-quiet-clue-room": {
    theme:
      "A hush has fallen over the living room case files: one ordinary object does not belong, and the clues are waiting for a careful detective.",
    summary:
      "A tiny mystery has appeared among everyday things. You are the detective who must study the clues, find the odd object, and explain what really happened.",
    mission:
      "Earlier today, something strange happened in the Quiet Clue Room. Three ordinary objects were left out as evidence, but one of them does not fit the story. Soft footsteps, a tiny out-of-place detail, and a hush over the living room are all that remain. You are the detective in charge. Look closely, ask quiet questions, decide which object is the odd one out, and explain your answer like a real detective closing a case.",
  },
  "downtown-map-maker": {
    theme:
      "A brand-new downtown is about to be built, but the city still needs its first map before the roads and buildings can rise.",
    summary:
      "The empty planning desk is waiting for the city's first design. You are the map maker who will draw downtown, then build the parts you planned.",
    mission:
      "The mayor of Tiny Downtown has a problem: the city exists only as blank paper and a pile of blocks. Before anyone can travel or visit, the roads, buildings, and signs must be planned. You are the City Planner and Map Maker. Draw a clear downtown map with streets and important places, then build the main parts with blocks so the city finally comes to life. When you finish, give a short tour of your new downtown.",
  },
  "stuffed-pet-clinic": {
    theme:
      "A quiet bedroom clinic has opened for the day, and a line of stuffed animals is waiting for gentle checkups and kind care.",
    summary:
      "Your cozy clinic is open and the waiting room is full of soft patients. You are the pet doctor who will check each one, offer comfort, and write a tiny care note.",
    mission:
      "Today the Stuffed Pet Clinic is open, and several soft patients are feeling a little under the weather. Some need a checkup, some need a bandage or sticker, and all of them need a calm, kind doctor. You run this quiet bedroom clinic. Welcome each stuffed animal one by one, check how they feel, give gentle care, and write a tiny note so every patient goes home feeling better.",
  },
  "museum-of-lost-exhibits": {
    theme:
      "A living-room time-travel museum is about to open, but three precious exhibits have wandered off into nearby eras.",
    summary:
      "The museum doors will open soon, and three exhibits are missing. You are the Museum Finder who must recover them and restore the shelf before visitors arrive.",
    mission:
      "The Museum of Lost Exhibits opens in just a little while, but three treasures have slipped out of their displays and into the living room timeline. Without them, the museum tour cannot begin. You are the Museum Finder trusted with this rescue. Search carefully for each lost exhibit, carry it back with care, and place it on the museum shelf before the doors open again. When all three are home, announce that the museum is ready.",
  },
  "nature-magic-weather-map": {
    theme:
      "A little nature world is waiting for its first weather map, where each spot holds a different kind of quiet magic.",
    summary:
      "The garden sky needs a map before its weather magic can settle. You are the Map Maker who will chart three weather spots and decide what nature magic lives in each one.",
    mission:
      "In a tiny garden world, the weather has gone mixed-up: sunny corners, breezy paths, and cloudy nests are waiting to be named. Until someone charts them, the nature magic cannot find its place. You are the Map Maker of this cozy weather lab. Create a map with three weather spots, decide what kind of nature magic belongs in each one, and tell the story of what happens when you travel from spot to spot.",
  },
  "living-room-circus-show": {
    theme:
      "The living-room circus tent is glowing, the audience seats are ready, and the star performer still needs to plan a three-part show.",
    summary:
      "Tonight is showtime in the living room. You are the ringmaster performer who will choose your acts, get ready, and put on a dazzling three-part circus.",
    mission:
      "The Living Room Circus is about to begin, and the audience of pillows and toys is already waiting. There is no script yet—only an empty stage and a performer ready for the spotlight. You are the Ringmaster Performer. Plan a three-part show with a strong opening pose, a main act, and a big final bow. Practice each part, then perform the whole show as if the whole room came just to cheer for you.",
  },
  "hallway-map-courier": {
    theme:
      "Three important packages must travel an indoor route tonight, and only a careful courier with a clear map can deliver them in order.",
    summary:
      "The route is marked and the packages are waiting. You are the Map Courier who must follow each stop and deliver every package to the right place.",
    mission:
      "A quiet delivery network runs through the living room tonight. Three packages need to reach three different stops, and mixing up the route would send them to the wrong places. You are the Map Courier trusted with this job. Study your indoor map, follow the stops in order, and deliver each package carefully without losing the route. When the last package arrives, report that the delivery network is clear.",
  },
};

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

for (const activity of data.activities) {
  const next = enrichments[activity.slug];
  if (!next) {
    throw new Error(`Missing enrichment for ${activity.slug}`);
  }
  Object.assign(activity, next);
}

data.generatedAt = new Date().toISOString();
data.source = {
  ...(data.source || {}),
  enrichment: "richer-setup-stories-2026-07-30",
};

fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Enriched ${data.activities.length} imaginative presets`);
