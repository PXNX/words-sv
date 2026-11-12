// Which stories and reading texts a learner gets from a pool, by language and level. The pool is
// either the whole corpus or the levels loaded so far (see storyPacks.svelte.ts).
import { vocabularyLevels, type Language, type VocabularyLevel } from '#lib/data/vocabulary.js';

type Levelled = { level: VocabularyLevel; languages?: Language[] };

/**
 * Stories at the learner's level come first; when lower vocabulary is included, easier stories
 * follow. If nothing matches exactly (sparse levels), fall back to the nearest lower level.
 * Stories limited to other languages are left out.
 */
export function selectStories<Item extends Levelled>(pool: readonly Item[], language: Language, level: VocabularyLevel, includeLower: boolean): Item[] {
  const rank = vocabularyLevels.indexOf(level);
  const available = pool.filter((story) => !story.languages || story.languages.includes(language));
  const exact = available.filter((story) => story.level === level);
  const lower = available.filter((story) => vocabularyLevels.indexOf(story.level) < rank).sort((a, b) => vocabularyLevels.indexOf(b.level) - vocabularyLevels.indexOf(a.level));
  if (includeLower) return [...exact, ...lower];
  if (exact.length) return exact;
  const nearest = lower[0]?.level;
  return lower.filter((story) => story.level === nearest);
}

/** The level's reading texts, followed by the easier ones when lower vocabulary is included. */
export function selectReadingTexts<Item extends Levelled>(pool: readonly Item[], language: Language, level: VocabularyLevel, includeLower: boolean): Item[] {
  const available = pool.filter((text) => !text.languages || text.languages.includes(language));
  const rank = vocabularyLevels.indexOf(level);
  const exact = available.filter((text) => text.level === level);
  const lower = includeLower
    ? available
        .filter((text) => vocabularyLevels.indexOf(text.level) < rank)
        .sort((a, b) => vocabularyLevels.indexOf(b.level) - vocabularyLevels.indexOf(a.level))
    : [];
  return [...exact, ...lower];
}
