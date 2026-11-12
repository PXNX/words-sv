import type { Language, VocabularyLevel } from '#lib/data/vocabulary.js';
import type { CharacterId, SceneId, Story } from './stories';
import type { ReadingBlock, ReadingText } from './readingTexts';
import { characterNames } from './storyKit';
import { questionView, storyProse, type ReadingQuestionView } from './prose';

export type ReadingItem = {
  id: string;
  kind: 'text' | 'story';
  level: VocabularyLevel;
  scene: SceneId;
  cast: CharacterId[];
  title: string;
  subtitle: string;
  language: Language;
  blocks: ReadingBlock[];
  questions: ReadingQuestionView[];
  keyWords: string[];
};

/**
 * The learner's texts as one catalog: the written texts first, then the stories as prose. Both
 * lists are already chosen for the language and level (see levelSelect.ts); this file stays free
 * of the corpus so pages that only need the catalog's shape do not load every story.
 */
export function readingCatalog(readingTexts: readonly ReadingText[], levelStories: readonly Story[], language: Language, name: string): ReadingItem[] {
  const texts: ReadingItem[] = readingTexts.map((text) => ({
    id: text.id,
    kind: 'text',
    level: text.level,
    scene: text.scene,
    cast: text.cast,
    title: text.title,
    subtitle: text.subtitle,
    language,
    blocks: text.blocks,
    questions: text.questions.map((question, index) => questionView(question.prompt, question.options, `${text.id}:${index}`)),
    keyWords: text.keyWords ?? []
  }));

  const stories: ReadingItem[] = levelStories
    .filter((story) => !story.generated)
    .map((story) => {
      const prose = storyProse(story, language, name);
      return {
        id: `story:${story.id}`,
        kind: 'story',
        level: story.level,
        scene: story.scene,
        cast: story.cast,
        title: story.title[language],
        subtitle: story.cast.map((member) => characterNames[member][language]).join(' · '),
        language,
        blocks: prose.blocks,
        questions: prose.questions,
        keyWords: []
      } satisfies ReadingItem;
    });

  return [...texts, ...stories];
}
