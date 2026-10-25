import { describe, expect, it } from 'vitest';
import { pickReviewSection } from '../src/lib/vocab/learning.ts';
import { normalizeReviewProgress, prioritizeLearningWords, updateReviewProgress } from '../src/lib/vocab/spacedRepetition.ts';
import { isReadingArticle, lookupReadingWord, matchReadingCharacter, readingArticleNoun, tokenizeReadingText } from '../src/lib/story/readingWords.ts';

describe('reading words', () => {
	/**
	 * @param {string} text
	 * @param {string} word
	 */
	function contextFor(text, word) {
		const token = tokenizeReadingText(text).find((entry) => entry.text === word);
		if (!token) throw new Error(`missing token ${word}`);
		return { text, start: token.start, end: token.end };
	}

	it('splits text into words and keeps every character and offset', () => {
		const text = 'Anna kauft Brot, Käse und Milch.';
		const tokens = tokenizeReadingText(text);
		expect(tokens.filter((token) => token.word).map((token) => token.text)).toEqual(['Anna', 'kauft', 'Brot', 'Käse', 'und', 'Milch']);
		expect(tokens.map((token) => token.text).join('')).toBe(text);
		for (const token of tokens) expect(text.slice(token.start, token.end)).toBe(token.text);
	});

	it('finds a noun with its article and all four case forms', () => {
		const info = lookupReadingWord('de', 'Wohnung');
		expect(info).toMatchObject({ word: 'WOHNUNG', spelling: 'Wohnung', article: 'die', gender: 'feminine', type: 'noun', number: 'singular' });
		expect(info?.definition).toContain('Räume');
		expect(info?.cases.map((entry) => `${entry.grammarCase}:${entry.article} ${entry.form}`)).toEqual([
			'nominative:die Wohnung',
			'genitive:der Wohnung',
			'dative:der Wohnung',
			'accusative:die Wohnung'
		]);
	});

	it('adds the genitive singular for masculine and neuter nouns', () => {
		const info = lookupReadingWord('de', 'Haus');
		expect(info?.cases.map((entry) => `${entry.grammarCase}:${entry.article} ${entry.form}`)).toEqual([
			'nominative:das Haus',
			'genitive:des Hauses',
			'dative:dem Haus',
			'accusative:das Haus'
		]);
	});

	it('keeps the plural of the tapped token instead of showing the singular', () => {
		const info = lookupReadingWord('de', 'Wohnungen');
		expect(info).toMatchObject({ word: 'WOHNUNG', spelling: 'Wohnung', article: 'die', number: 'plural', plural: 'Wohnungen' });
		expect(info?.display).toBe('die Wohnungen');
		expect(info?.cases.map((entry) => `${entry.grammarCase}:${entry.article} ${entry.form}`)).toEqual([
			'nominative:die Wohnungen',
			'genitive:der Wohnungen',
			'dative:den Wohnungen',
			'accusative:die Wohnungen'
		]);
	});

	it('rebuilds an umlaut plural from a dative plural token', () => {
		const text = 'Sie spielt mit den Kindern.';
		const info = lookupReadingWord('de', 'Kindern', contextFor(text, 'Kindern'));
		expect(info).toMatchObject({ word: 'KIND', number: 'plural', plural: 'Kinder', currentCase: 'dative' });
		expect(info?.cases.map((entry) => `${entry.grammarCase}:${entry.article} ${entry.form}`)).toContain('dative:den Kindern');
	});

	it('uses the determinant to tell an -s genitive from an -s plural', () => {
		const pluralText = 'Ich sehe Autos.';
		expect(lookupReadingWord('de', 'Autos', contextFor(pluralText, 'Autos'))).toMatchObject({ number: 'plural', plural: 'Autos' });

		const genitiveText = 'Das ist das Rad des Autos.';
		expect(lookupReadingWord('de', 'Autos', contextFor(genitiveText, 'Autos'))).toMatchObject({ number: 'singular', currentCase: 'genitive' });
	});

	it('highlights the case the word has in its sentence', () => {
		const text = 'Die Kinder spielen im Garten.';
		const info = lookupReadingWord('de', 'Kinder', contextFor(text, 'Kinder'));
		expect(info).toMatchObject({ number: 'plural', currentCase: 'nominative' });
	});

	it('treats weak nouns as singular after a singular article', () => {
		const text = 'Das ist das Haus des Kollegen.';
		const info = lookupReadingWord('de', 'Kollegen', contextFor(text, 'Kollegen'));
		expect(info).toMatchObject({ word: 'KOLLEGE', number: 'singular', currentCase: 'genitive' });
		expect(info?.cases.map((entry) => `${entry.grammarCase}:${entry.article} ${entry.form}`)).toContain('genitive:des Kollegen');
	});

	it('shows plural-only nouns in the plural', () => {
		const info = lookupReadingWord('de', 'Eltern');
		expect(info).toMatchObject({ word: 'ELTERN', number: 'plural', display: 'die Eltern' });
		expect(info?.cases.map((entry) => `${entry.grammarCase}:${entry.article} ${entry.form}`)).toContain('dative:den Eltern');
	});

	it('resolves conjugated, past and participle verb forms', () => {
		expect(lookupReadingWord('de', 'wohnt')?.word).toBe('WOHNEN');
		expect(lookupReadingWord('de', 'sieht')?.word).toBe('SEHEN');
		expect(lookupReadingWord('de', 'ging')?.word).toBe('GEHEN');
		expect(lookupReadingWord('de', 'gekauft')?.word).toBe('KAUFEN');
	});

	it('resolves an inflected adjective to its base form', () => {
		expect(lookupReadingWord('de', 'müdes')).toMatchObject({ word: 'MÜDE', spelling: 'müde', type: 'adjective' });
	});

	it('resolves English suffixes', () => {
		expect(lookupReadingWord('en', 'walked')?.word).toBe('WALK');
		expect(lookupReadingWord('en', 'stopping')?.word).toBe('STOP');
		expect(lookupReadingWord('en', 'planned')?.word).toBe('PLAN');
	});

	it('leaves words outside the vocabulary alone', () => {
		expect(lookupReadingWord('de', 'quakz')).toBeNull();
	});
});

describe('reading characters and articles', () => {
	/**
	 * @param {string} text
	 * @param {string} word
	 */
	function tokenFor(text, word) {
		const token = tokenizeReadingText(text).find((entry) => entry.text.toLocaleLowerCase() === word.toLocaleLowerCase());
		if (!token) throw new Error(`missing token ${word}`);
		return token;
	}

	it('matches cast names, including multi-word and genitive forms', () => {
		expect(matchReadingCharacter('de', ['mia', 'tom', 'paul', 'ludwig'], 'Mia')).toBe('mia');
		expect(matchReadingCharacter('de', ['mia', 'tom'], 'Mias')).toBe('mia');
		expect(matchReadingCharacter('de', ['mia', 'tom'], 'Toms')).toBe('tom');
		expect(matchReadingCharacter('de', ['paul'], 'Paul')).toBe('paul');
		expect(matchReadingCharacter('de', ['paul'], 'Herr')).toBeNull();
		expect(matchReadingCharacter('de', ['ludwig'], 'Ludwig')).toBe('ludwig');
		expect(matchReadingCharacter('de', ['ludwig'], 'König')).toBeNull();
		expect(matchReadingCharacter('de', ['mia'], 'Tom')).toBeNull();
	});

	it('matches localised names and ignores characters outside the cast', () => {
		expect(matchReadingCharacter('en', ['wirt'], 'innkeeper')).toBe('wirt');
		expect(matchReadingCharacter('en', ['wirt'], 'Mr Paul')).toBeNull();
	});

	it('treats only true articles and contractions as article taps', () => {
		expect(isReadingArticle('die')).toBe(true);
		expect(isReadingArticle('einem')).toBe(true);
		expect(isReadingArticle('im')).toBe(true);
		expect(isReadingArticle('viele')).toBe(false);
		expect(isReadingArticle('Haus')).toBe(false);
	});

	it('finds the noun an article belongs to and skips adjectives', () => {
		const text = 'Die alte Frau liest ein Buch.';
		const article = tokenFor(text, 'Die');
		expect(readingArticleNoun('de', text, article.start, article.end)?.text).toBe('Frau');

		const second = tokenizeReadingText(text).filter((token) => token.text === 'ein').at(-1);
		if (!second) throw new Error('missing second article');
		expect(readingArticleNoun('de', text, second.start, second.end)?.text).toBe('Buch');
	});

	it('resolves the noun after a contraction', () => {
		const text = 'Er sitzt im Garten.';
		const article = tokenFor(text, 'im');
		expect(readingArticleNoun('de', text, article.start, article.end)?.text).toBe('Garten');
	});

	it('shows the case the noun has in the sentence', () => {
		const text = 'Er hilft dem alten Mann.';
		const article = tokenFor(text, 'dem');
		const noun = readingArticleNoun('de', text, article.start, article.end);
		if (!noun) throw new Error('missing noun');
		expect(noun.text).toBe('Mann');
		expect(lookupReadingWord('de', noun.text, { text, start: noun.start, end: noun.end })?.currentCase).toBe('dative');
	});

	it('leaves an article without a following noun alone', () => {
		const text = 'Die zzz.';
		const article = tokenFor(text, 'Die');
		expect(readingArticleNoun('de', text, article.start, article.end)).toBeNull();
	});
});

describe('review priority', () => {
	const now = 1_000_000;

	it('treats missing lapse counts as zero', () => {
		expect(normalizeReviewProgress({ repetitions: 2, dueAt: 5 })).toEqual({ repetitions: 2, dueAt: 5, lapses: 0 });
	});

	it('puts marked words ahead of unseen ones', () => {
		const progress = {
			BROT: { repetitions: 4, dueAt: now + 500_000, lapses: 2 },
			MILCH: { repetitions: 0, dueAt: 0, lapses: 0 }
		};
		expect(prioritizeLearningWords(['MILCH', 'BROT'], progress, now)).toEqual(['BROT', 'MILCH']);
	});

	it('adds a lapse on a wrong answer and earns it back on a right one', () => {
		/** @type {Record<string, import('../src/lib/vocab/spacedRepetition.ts').ReviewProgress>} */
		let progress = { BROT: { repetitions: 3, dueAt: now, lapses: 0 } };
		progress = updateReviewProgress(progress, 'BROT', false, now);
		expect(progress.BROT).toMatchObject({ repetitions: 0, lapses: 1 });
		progress = updateReviewProgress(progress, 'BROT', true, now);
		expect(progress.BROT.lapses).toBe(0);
		progress = updateReviewProgress(progress, 'BROT', true, now);
		expect(progress.BROT.lapses).toBe(0);
	});

	it('gives marked words a slot in the next practice section', () => {
		const words = ['BROT', 'MILCH', 'KÄSE', 'APFEL', 'BIRNE', 'REIS', 'SALZ'];
		const progress = { KÄSE: { repetitions: 0, dueAt: 0, lapses: 2 } };
		const section = pickReviewSection(words, progress, () => 0.1, 6);
		expect(section[0]).toBe('KÄSE');
		expect(section).toHaveLength(6);
		expect(new Set(section).size).toBe(6);
	});

	it('fills a section from the whole pool when nothing is marked', () => {
		const words = ['BROT', 'MILCH', 'KÄSE', 'APFEL', 'BIRNE', 'REIS', 'SALZ'];
		const section = pickReviewSection(words, {}, () => 0.1, 6);
		expect(section).toHaveLength(6);
		expect(section.every((word) => words.includes(word))).toBe(true);
	});
});
