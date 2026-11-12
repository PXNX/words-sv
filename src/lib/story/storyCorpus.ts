// The story and reading corpora as one chunk per language level. `?level=<level>` makes the build
// cut the corpus file down to that level's entries (scripts/level-slice.ts), so a page fetches
// only the levels the learner reads, like the per-level word files in src/lib/data/.
import type { VocabularyLevel } from '#lib/data/vocabulary.js';
import type { Story } from './stories';
import type { ReadingText } from './readingTexts';

type Loader<Item> = () => Promise<Item[]>;
// Each glob names exactly one file, so it holds exactly one loader.
const only = <Item>(modules: Record<string, Loader<Item>>): Loader<Item> => () => Object.values(modules)[0]!();

export const storyLoaders: Record<VocabularyLevel, Loader<Story>> = {
  a1: only(import.meta.glob<Story[]>('./stories.ts', { query: '?level=a1', import: 'stories' })),
  a2: only(import.meta.glob<Story[]>('./stories.ts', { query: '?level=a2', import: 'stories' })),
  b1: only(import.meta.glob<Story[]>('./stories.ts', { query: '?level=b1', import: 'stories' })),
  b2: only(import.meta.glob<Story[]>('./stories.ts', { query: '?level=b2', import: 'stories' })),
  c1: only(import.meta.glob<Story[]>('./stories.ts', { query: '?level=c1', import: 'stories' })),
  c2: only(import.meta.glob<Story[]>('./stories.ts', { query: '?level=c2', import: 'stories' }))
};

export const readingTextLoaders: Record<VocabularyLevel, Loader<ReadingText>> = {
  a1: only(import.meta.glob<ReadingText[]>('./readingTexts.ts', { query: '?level=a1', import: 'readingTexts' })),
  a2: only(import.meta.glob<ReadingText[]>('./readingTexts.ts', { query: '?level=a2', import: 'readingTexts' })),
  b1: only(import.meta.glob<ReadingText[]>('./readingTexts.ts', { query: '?level=b1', import: 'readingTexts' })),
  b2: only(import.meta.glob<ReadingText[]>('./readingTexts.ts', { query: '?level=b2', import: 'readingTexts' })),
  c1: only(import.meta.glob<ReadingText[]>('./readingTexts.ts', { query: '?level=c1', import: 'readingTexts' })),
  c2: only(import.meta.glob<ReadingText[]>('./readingTexts.ts', { query: '?level=c2', import: 'readingTexts' }))
};
