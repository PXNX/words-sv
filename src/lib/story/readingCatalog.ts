import type { Language, VocabularyLevel } from '#lib/data/vocabulary.js';
import { characterNames, storiesFor, type CharacterId, type SceneId } from './stories';
import { readingTextsFor, type ReadingBlock } from './readingTexts';
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

/** All texts available at the current level: the written texts first, then the stories as prose. */
export function readingCatalog(language: Language, level: VocabularyLevel, includeLower: boolean, name: string): ReadingItem[] {
  const texts: ReadingItem[] = readingTextsFor(language, level, includeLower).map((text) => ({
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

  const stories: ReadingItem[] = storiesFor(language, level, includeLower)
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
