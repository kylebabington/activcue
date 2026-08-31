# Activity Format V4 — Causal Storytelling

## Why V4 exists

V3 imaginative activities could pass validation with `storyBeat` text while scenes remained reorderable themed tasks (build, find, crawl, etc.). V4 introduces explicit causal structure: every scene must explain **why** the child acts (`sceneSetup`) and **what changes** because they succeeded (`sceneOutcome`).

**V4 is imaginative-only.** Simple activities remain on V3.

## Required fields (V4)

- `activityFormatVersion: 4`
- `qualityContractVersion: 1`
- `activityStyle: "imaginative"`
- `stepDetails[].sceneSetup` — why action is necessary now
- `stepDetails[].sceneOutcome` — story consequence that causes the next scene
- `finishGuide.resolution` — how the opening problem was resolved (distinct from `action` and `doneWhen`)

## Quality validation

- `validateActivityNarrative` — structural checks (required fields, generic filler, finish field ownership)
- `validateActivityQuality` — orchestrates clarity, narrative, display, age fit
- Semantic causality is measured by the offline eval suite (`scripts/eval/`), not regex

## Cache behavior

1. Query narrative-valid V4 cache
2. Generate V4 for remaining slots
3. Legacy V3/V2 imaginative only if still short

## Golden fixture

`src/fixtures/stormStrandedAnimalRescueV4Fixture.js`

## Running tests

```bash
npm test -- server/utils/activityNarrativeValidation.test.js
npm test -- server/schemas/activitySuggestionsSchemaV4.test.js
```
