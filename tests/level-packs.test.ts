import { describe, expect, it, vi } from 'vitest';
import { createLevelPacks, levelsNeeded } from '../src/lib/story/levelPacks.js';
import { selectReadingTexts, selectStories } from '../src/lib/story/levelSelect.js';
import { readingTextLoaders, storyLoaders } from '../src/lib/story/storyCorpus.js';
import { stories, storiesFor } from '../src/lib/story/stories.js';
import { readingTexts, readingTextsFor } from '../src/lib/story/readingTexts.js';
import { vocabularyLevels, type Language, type VocabularyLevel } from '../src/lib/data/vocabulary.js';

type Item = { id: string; level: VocabularyLevel; languages?: Language[] };
const corpus: Item[] = [
  { id: 'a1-one', level: 'a1' },
  { id: 'a2-one', level: 'a2' },
  { id: 'a2-german', level: 'a2', languages: ['de'] },
  { id: 'b2-german', level: 'b2', languages: ['de'] }
];
function setup() {
  const calls: VocabularyLevel[] = [];
  const onLoad = vi.fn();
  const loaders = Object.fromEntries(vocabularyLevels.map((level) => [level, () => { calls.push(level); return Promise.resolve(corpus); }])) as Record<VocabularyLevel, () => Promise<Item[]>>;
  return { calls, onLoad, packs: createLevelPacks(loaders, onLoad) };
}

describe('levelsNeeded', () => {
  it('is the level alone, or every level up to it when lower ones are included', () => {
    expect(levelsNeeded('b1', false)).toEqual(['b1']);
    expect(levelsNeeded('b1', true)).toEqual(['a1', 'a2', 'b1']);
    expect(levelsNeeded('a1', true)).toEqual(['a1']);
  });
});

describe('createLevelPacks', () => {
  it('fetches only the asked levels, each once, and keeps only that level from a loader', async () => {
    const { calls, onLoad, packs } = setup();
    await packs.load(['a2']);
    await Promise.all([packs.load(['a2']), packs.load(['a2', 'a1'])]);
    expect(calls).toEqual(['a2', 'a1']);
    expect(onLoad).toHaveBeenCalledTimes(2);
    expect(packs.has('a2')).toBe(true);
    expect(packs.has('b1')).toBe(false);
    expect(packs.items().map((item) => item.id)).toEqual(['a1-one', 'a2-one', 'a2-german']);
  });

  it('lets a failed download be tried again', async () => {
    let online = false;
    const loader = vi.fn(() => (online ? Promise.resolve(corpus) : Promise.reject(new Error('offline'))));
    const packs = createLevelPacks(Object.fromEntries(vocabularyLevels.map((level) => [level, loader])) as unknown as Record<VocabularyLevel, () => Promise<Item[]>>);
    await expect(packs.load(['a1'])).rejects.toThrow('offline');
    expect(packs.has('a1')).toBe(false);
    online = true;
    await packs.load(['a1']);
    expect(packs.items().map((item) => item.id)).toEqual(['a1-one']);
  });
});

describe('selecting from a pool', () => {
  it('puts the level first, then the lower ones from the nearest down', () => {
    expect(selectStories(corpus, 'de', 'b2', true).map((item) => item.id)).toEqual(['b2-german', 'a2-one', 'a2-german', 'a1-one']);
    expect(selectReadingTexts(corpus, 'de', 'b2', true).map((item) => item.id)).toEqual(['b2-german', 'a2-one', 'a2-german', 'a1-one']);
  });

  it('leaves out entries written for other languages', () => {
    expect(selectStories(corpus, 'en', 'a2', false).map((item) => item.id)).toEqual(['a2-one']);
  });

  it('falls back to the nearest lower level for stories, but not for reading texts', () => {
    expect(selectStories(corpus, 'en', 'b2', false).map((item) => item.id)).toEqual(['a2-one']);
    expect(selectReadingTexts(corpus, 'en', 'b2', false)).toEqual([]);
  });
});

describe('the corpus loaders', () => {
  it('give the same stories and texts per level as the whole corpus', async () => {
    const storyPacks = createLevelPacks(storyLoaders);
    const textPacks = createLevelPacks(readingTextLoaders);
    await Promise.all([storyPacks.load(vocabularyLevels), textPacks.load(vocabularyLevels)]);
    expect(storyPacks.items().map((story) => story.id).sort()).toEqual(stories.map((story) => story.id).sort());
    expect(textPacks.items().map((text) => text.id).sort()).toEqual(readingTexts.map((text) => text.id).sort());
    for (const level of vocabularyLevels) {
      expect(selectStories(storyPacks.items(), 'de', level, true).map((story) => story.id)).toEqual(storiesFor('de', level, true).map((story) => story.id));
      expect(selectReadingTexts(textPacks.items(), 'en', level, false).map((text) => text.id)).toEqual(readingTextsFor('en', level, false).map((text) => text.id));
    }
  });

  it('need only the learner’s level when lower levels are off', async () => {
    const storyPacks = createLevelPacks(storyLoaders);
    await storyPacks.load(levelsNeeded('b1', false));
    expect(selectStories(storyPacks.items(), 'de', 'b1', false).map((story) => story.id)).toEqual(storiesFor('de', 'b1', false).map((story) => story.id));
  });
});
