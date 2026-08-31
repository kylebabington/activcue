/**
 * Shared under-10 opening story thresholds for V4 prompt + validator alignment.
 */
export const UNDER10_OPENING_STORY = {
  minSentences: 3,
  minWords: 50,
  maxWords: 140,
  targetSentences: "3–5",
  targetWords: "55–90",
};

export const UNDER10_OPENING_STORY_PROMPT = `
Opening story (under-10, hard): Write ${UNDER10_OPENING_STORY.targetSentences} sentences (~${UNDER10_OPENING_STORY.targetWords} words).
Establish WHERE this happens, WHAT happened before play began, the current PROBLEM/need/mystery, WHY it matters, and WHY the child/children are needed.
Meaningful backstory — not filler words.
`.trim();
