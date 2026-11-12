import { describe, expect, it } from 'vitest';
import type { Language, VocabularyLevel } from '../src/lib/data/vocabulary.js';
import { readingCatalog as catalogOf, type ReadingItem } from '../src/lib/story/readingCatalog.js';
import { readingTextsFor } from '../src/lib/story/readingTexts.js';
import { storiesFor } from '../src/lib/story/stories.js';

// The catalog over the whole corpus; the app builds it from the levels it has loaded.
const readingCatalog = (language: Language, level: VocabularyLevel, includeLower: boolean, name: string) =>
	catalogOf(readingTextsFor(language, level, includeLower), storiesFor(language, level, includeLower), language, name);
import { readingParagraphs } from '../src/lib/story/prose.js';

const languages: Language[] = ['de', 'en', 'fr', 'it', 'es', 'pt', 'uk'];
const levels: VocabularyLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const placeholder = /\{[^{}]+\}/;

function readableText(item: ReadingItem): string[] {
	const paragraphs = readingParagraphs(item.blocks, item.language, 'Alex');
	return [
		...item.blocks.map((block) => block.text),
		...paragraphs,
		...item.questions.flatMap((question) => [question.prompt, question.answer, ...question.options])
	];
}

describe('reading prose', () => {
	it('resolves every story detail before the text and its options are built', () => {
		for (const language of languages) {
			for (const level of levels) {
				for (const item of readingCatalog(language, level, true, 'Alex')) {
					for (const text of readableText(item)) {
						expect(text, `${item.id} (${language})`).not.toMatch(placeholder);
					}
				}
			}
		}
	});

	it('draws the same details on every visit', () => {
		const catalog = readingCatalog('de', 'a1', true, 'Alex');
		const first = catalog.find((item) => item.kind === 'story');
		if (!first) throw new Error('no story in the a1 catalog');
		const before = readingParagraphs(first.blocks, first.language, 'Alex');
		const again = readingCatalog('de', 'a1', true, 'Alex').find((item) => item.id === first.id);
		if (!again) throw new Error('the story disappeared from the a1 catalog');
		expect(readingParagraphs(again.blocks, again.language, 'Alex')).toEqual(before);
	});

	it('folds headings and dialogue into one continuous flow', () => {
		const [item] = readingCatalog('de', 'a1', true, 'Alex');
		if (!item) throw new Error('no a1 reading text');
		const paragraphs = readingParagraphs(item.blocks, item.language, 'Alex');
		expect(paragraphs.length).toBeGreaterThan(0);
		expect(paragraphs.some((paragraph) => paragraph.includes('„'))).toBe(true);
		expect(paragraphs.some((paragraph) => paragraph.startsWith('Der Morgen'))).toBe(false);
		for (const paragraph of paragraphs) expect(paragraph.length).toBeGreaterThan(0);
	});
});
