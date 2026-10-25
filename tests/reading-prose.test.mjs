import { describe, expect, it } from 'vitest';
import { readingCatalog } from '../src/lib/story/readingCatalog.ts';
import { readingParagraphs } from '../src/lib/story/prose.ts';

/** @type {import('../src/lib/data/vocabulary.ts').Language[]} */
const languages = ['de', 'en', 'fr', 'it', 'es', 'pt', 'uk'];
/** @type {import('../src/lib/data/vocabulary.ts').VocabularyLevel[]} */
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const placeholder = /\{[^{}]+\}/;

/** @param {import('../src/lib/story/readingCatalog.ts').ReadingItem} item */
function readableText(item) {
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
		const paragraphs = readingParagraphs(item.blocks, item.language, 'Alex');
		expect(paragraphs.length).toBeGreaterThan(0);
		expect(paragraphs.some((paragraph) => paragraph.includes('„'))).toBe(true);
		expect(paragraphs.some((paragraph) => paragraph.startsWith('Der Morgen'))).toBe(false);
		for (const paragraph of paragraphs) expect(paragraph.length).toBeGreaterThan(0);
	});
});
