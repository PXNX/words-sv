import { describe, expect, test } from 'vitest';
import { applyReview, groupReviewEntries, ledgerEntriesFor, normalizeReviewEntry, reviewKey, splitReviewKey, type ReviewLedger } from '../src/lib/review/ledger.js';

const NOW = Date.UTC(2026, 9, 26, 9, 0, 0);

describe('review ledger', () => {
	test('keys are language-scoped and case-insensitive', () => {
		expect(reviewKey('de', '  wohnung ')).toBe('de:WOHNUNG');
		expect(splitReviewKey('de:WOHNUNG')).toEqual({ language: 'de', item: 'WOHNUNG' });
		expect(splitReviewKey('broken')).toBeNull();
	});

	test('a correct answer grows the interval and clears a lapse', () => {
		let ledger: ReviewLedger = applyReview({}, 'de', 'Wohnung', false, 'vocab', NOW);
		expect(ledger['de:WOHNUNG']).toMatchObject({ repetitions: 0, lapses: 1, source: 'vocab', dueAt: NOW + 24 * 60 * 60 * 1000 });
		ledger = applyReview(ledger, 'de', 'Wohnung', true, 'vocab', NOW + 1);
		expect(ledger['de:WOHNUNG']).toMatchObject({ repetitions: 1, lapses: 0, dueAt: NOW + 1 + 24 * 60 * 60 * 1000 });
		ledger = applyReview(ledger, 'de', 'Wohnung', true, 'vocab', NOW + 2);
		expect(ledger['de:WOHNUNG']).toMatchObject({ repetitions: 2, dueAt: NOW + 2 + 2 * 24 * 60 * 60 * 1000 });
	});

	test('the source records the mode that last touched an item', () => {
		let ledger: ReviewLedger = applyReview({}, 'de', 'Wohnung', false, 'reading', NOW);
		expect(ledger['de:WOHNUNG']?.source).toBe('reading');
		ledger = applyReview(ledger, 'de', 'Wohnung', true, 'grammar', NOW + 5);
		expect(ledger['de:WOHNUNG']?.source).toBe('grammar');
	});

	test('entries are scoped to the requested language', () => {
		const ledger = applyReview(applyReview({}, 'de', 'Wohnung', false, 'reading', NOW), 'en', 'house', false, 'story', NOW);
		expect(ledgerEntriesFor(ledger, 'de').map(({ item }) => item)).toEqual(['WOHNUNG']);
		expect(ledgerEntriesFor(ledger, 'en').map(({ item }) => item)).toEqual(['HOUSE']);
	});

	test('groups report only sources that still have due items', () => {
		const entries = [
			{ entry: normalizeReviewEntry({ repetitions: 0, dueAt: 0, lapses: 1, source: 'reading', updatedAt: NOW })! },
			{ entry: normalizeReviewEntry({ repetitions: 0, dueAt: 0, lapses: 2, source: 'reading', updatedAt: NOW })! },
			{ entry: normalizeReviewEntry({ repetitions: 0, dueAt: 0, lapses: 1, source: 'grammar', updatedAt: NOW })! }
		];
		expect(groupReviewEntries(entries)).toEqual([
			{ source: 'reading', count: 2 },
			{ source: 'grammar', count: 1 }
		]);
	});
});
