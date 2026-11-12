// The learner's stories and reading texts, loaded per level. The story pages wait for their
// level before they open (`ensureStoryPacks` in the route's load); after that `storiesFor` and
// `readingCatalog` answer at once from what is loaded. When the learner changes level or language
// on the page, the missing level is fetched in the background and whatever reads these functions
// reactively updates when it arrives; until then the nearest loaded level stands in.
import { vocabularyLevels, type Language, type VocabularyLevel } from '#lib/data/vocabulary.js';
import { createLevelPacks, levelsNeeded } from './levelPacks';
import { selectReadingTexts, selectStories } from './levelSelect';
import { readingCatalog as catalogOf, type ReadingItem } from './readingCatalog';
import { readingTextLoaders, storyLoaders } from './storyCorpus';
import type { Story } from './stories';

// Bumped whenever a level arrives, so reactive readers run again.
let arrivals = $state(0);
const stories = createLevelPacks(storyLoaders, () => { arrivals += 1; });
const readingTexts = createLevelPacks(readingTextLoaders, () => { arrivals += 1; });

/** Resolves once the stories and reading texts for this choice are loaded. */
export async function ensureStoryPacks(language: Language, level: VocabularyLevel, includeLower: boolean): Promise<void> {
  const levels = levelsNeeded(level, includeLower);
  await Promise.all([stories.load(levels), readingTexts.load(levels)]);
  // A level without a story for this language falls back to the nearest lower one that has some.
  for (let rank = vocabularyLevels.indexOf(level) - 1; rank >= 0 && selectStories(stories.items(), language, level, includeLower).length === 0; rank -= 1) {
    await stories.load([vocabularyLevels[rank]!]);
  }
}

function warm(language: Language, level: VocabularyLevel, includeLower: boolean) {
  if (levelsNeeded(level, includeLower).every((needed) => stories.has(needed) && readingTexts.has(needed))) return;
  void ensureStoryPacks(language, level, includeLower).catch(() => undefined);
}

/** The learner's stories (see `selectStories`), from the levels loaded so far. */
export function storiesFor(language: Language, level: VocabularyLevel, includeLower: boolean): Story[] {
  void arrivals;
  warm(language, level, includeLower);
  const pool = stories.items();
  const chosen = selectStories(pool, language, level, includeLower);
  // While the level is still on its way, any loaded story of the language is better than none.
  return chosen.length ? chosen : pool.filter((story) => !story.languages || story.languages.includes(language));
}

/** All texts available at the current level: the written texts first, then the stories as prose. */
export function readingCatalog(language: Language, level: VocabularyLevel, includeLower: boolean, name: string): ReadingItem[] {
  const levelStories = storiesFor(language, level, includeLower);
  return catalogOf(selectReadingTexts(readingTexts.items(), language, level, includeLower), levelStories, language, name);
}

/** The reading catalog once its levels are loaded, for pages that do not wait in a route load. */
export async function loadReadingCatalog(language: Language, level: VocabularyLevel, includeLower: boolean, name: string): Promise<ReadingItem[]> {
  await ensureStoryPacks(language, level, includeLower);
  return readingCatalog(language, level, includeLower, name);
}
