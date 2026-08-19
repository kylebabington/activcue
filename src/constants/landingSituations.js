// src/constants/landingSituations.js

/**
 * Sales-page situation cards that deep-link into /demo with sensible defaults.
 */

export const LANDING_SITUATIONS = Object.freeze([
  {
    id: "cook-dinner",
    quote: "I need 20 minutes to cook dinner.",
    momentId: "cooking",
    ages: [6],
    timeMinutes: 20,
    spaceMode: "inside",
    messLevel: "low",
    supervisionLevel: "nearby",
  },
  {
    id: "stuck-inside",
    quote: "We're stuck inside.",
    momentId: "resting",
    ages: [7],
    timeMinutes: 30,
    spaceMode: "inside",
    messLevel: "low",
    supervisionLevel: "independent",
  },
  {
    id: "bored-again",
    quote: "They're bored again.",
    momentId: "cleaning",
    ages: [8],
    timeMinutes: 20,
    spaceMode: "inside",
    messLevel: "low",
    supervisionLevel: "nearby",
  },
  {
    id: "no-cleanup",
    quote: "I want something with almost no cleanup.",
    momentId: "workCall",
    ages: [7],
    timeMinutes: 20,
    spaceMode: "inside",
    messLevel: "low",
    supervisionLevel: "independent",
  },
  {
    id: "not-babyish",
    quote: "I need something my 12-year-old won't think is babyish.",
    momentId: "workCall",
    ages: [12],
    timeMinutes: 30,
    spaceMode: "inside",
    messLevel: "low",
    supervisionLevel: "independent",
  },
  {
    id: "both-kids",
    quote: "I need something both kids can do.",
    momentId: "cooking",
    ages: [5, 9],
    timeMinutes: 20,
    spaceMode: "inside",
    messLevel: "low",
    supervisionLevel: "nearby",
  },
]);

/**
 * Build /demo URL with query params for DemoPage bootstrap.
 */
export function buildDemoUrl(situation) {
  if (!situation) return "/demo";

  const params = new URLSearchParams();
  if (situation.id) params.set("situation", situation.id);
  if (situation.momentId) params.set("moment", situation.momentId);
  if (situation.timeMinutes != null) {
    params.set("time", String(situation.timeMinutes));
  }
  if (situation.spaceMode) params.set("space", situation.spaceMode);
  if (situation.messLevel) params.set("mess", situation.messLevel);
  if (situation.supervisionLevel) {
    params.set("supervision", situation.supervisionLevel);
  }

  const query = params.toString();
  return query ? `/demo?${query}` : "/demo";
}

export function getLandingSituation(id) {
  return LANDING_SITUATIONS.find((item) => item.id === id) || null;
}
