// Content that is loaded one language level at a time (stories, reading texts): keeps the levels
// that have arrived and fetches the missing ones on demand. Pure, so it can be tested; the
// reactive wrapper for the app is storyPacks.svelte.ts.
import { vocabularyLevels, type VocabularyLevel } from '#lib/data/vocabulary.js';

/** The levels a learner's choice covers: the level itself, plus every lower one when those are included. */
export function levelsNeeded(level: VocabularyLevel, includeLower: boolean): VocabularyLevel[] {
  return includeLower ? vocabularyLevels.slice(0, vocabularyLevels.indexOf(level) + 1) : [level];
}

export type LevelPacks<Item> = {
  /** Fetches the levels that are not there yet; resolves once all of them are. */
  load(levels: readonly VocabularyLevel[]): Promise<void>;
  has(level: VocabularyLevel): boolean;
  /** Everything loaded so far, lowest level first, in the order of the corpus. */
  items(): Item[];
};

export function createLevelPacks<Item extends { level: VocabularyLevel }>(
  loaders: Readonly<Record<VocabularyLevel, () => Promise<readonly Item[]>>>,
  onLoad: () => void = () => undefined
): LevelPacks<Item> {
  const loaded = new Map<VocabularyLevel, readonly Item[]>();
  const pending = new Map<VocabularyLevel, Promise<void>>();

  function loadLevel(level: VocabularyLevel): Promise<void> {
    if (loaded.has(level)) return Promise.resolve();
    const running = pending.get(level);
    if (running) return running;
    const request = loaders[level]().then(
      (items) => {
        // A loader may hand over more than its level (an unsliced corpus); only the level is kept.
        loaded.set(level, items.filter((item) => item.level === level));
        pending.delete(level);
        onLoad();
      },
      (error: unknown) => {
        pending.delete(level);
        throw error;
      }
    );
    pending.set(level, request);
    return request;
  }

  return {
    load: (levels) => Promise.all(levels.map(loadLevel)).then(() => undefined),
    has: (level) => loaded.has(level),
    items: () => vocabularyLevels.flatMap((level) => loaded.get(level) ?? [])
  };
}
