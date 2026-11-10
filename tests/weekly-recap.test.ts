import { describe, expect, test } from 'vitest';
import { activeMinutes, completedIds, countActivity, normalizeActivity, type ActivityEvent } from '../src/lib/progress/activity.js';
import { buildWeeklyRecap, readableItem } from '../src/lib/progress/weeklyRecap.js';
import type { ReviewLedger } from '../src/lib/review/ledger.js';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 26, 12, 0, 0);


describe('activity log', () => {
	test('ignores malformed entries but keeps the good ones', () => {
		const events = normalizeActivity([
			{ kind: 'vocab', at: NOW },
			{ kind: 'nope', at: NOW },
			{ kind: 'reading', id: 'im-supermarkt', at: NOW },
			null
		]);
		expect(events).toEqual([
			{ kind: 'vocab', at: NOW },
			{ kind: 'reading', id: 'im-supermarkt', at: NOW }
		]);
	});

	test('counts distinct completed texts only once', () => {
		const events: ActivityEvent[] = [
			{ kind: 'reading', at: NOW, id: 'a' },
			{ kind: 'reading', at: NOW + 1, id: 'a' },
			{ kind: 'reading', at: NOW + 2, id: 'b' },
			{ kind: 'story', at: NOW + 3, id: 'a' }
		];
		expect(completedIds(events, 'reading')).toEqual(['a', 'b']);
		expect(countActivity(events, 'reading')).toBe(3);
	});

	test('measures real practice time and breaks between sessions', () => {
		const events: ActivityEvent[] = [
			{ kind: 'vocab', at: NOW },
			{ kind: 'vocab', at: NOW + 2 * 60_000 },
			{ kind: 'grammar', at: NOW + 4 * 60_000 },
			// A long pause starts a new, one-minute session.
			{ kind: 'reading', at: NOW + 3 * HOUR }
		];
		expect(activeMinutes(events, NOW - HOUR, NOW + 4 * HOUR)).toBe(5);
		expect(activeMinutes(events, NOW + HOUR, NOW + 4 * HOUR)).toBe(1);
	});
});


describe('weekly recap', () => {
	const since = NOW - 7 * 24 * HOUR;

	test('counts words mastered this week, minutes and the hardest word', () => {
		const ledger: ReviewLedger = {
			'de:WOHNUNG': { repetitions: 20, dueAt: NOW, lapses: 2, source: 'vocab', updatedAt: NOW - HOUR },
			'de:ALT': { repetitions: 20, dueAt: NOW, lapses: 0, source: 'vocab', updatedAt: NOW - 10 * 24 * HOUR },
			'de:GRAMMAR:NOUN:BAHNHOF': { repetitions: 1, dueAt: NOW, lapses: 4, source: 'grammar', updatedAt: NOW - 2 * HOUR }
		};
		const activity: ActivityEvent[] = [
			{ kind: 'vocab', at: NOW - 2 * HOUR },
			{ kind: 'grammar', at: NOW - HOUR }
		];
		expect(buildWeeklyRecap({ ledger, activity, bestStreak: 9, since, now: NOW })).toEqual({
			wordsMastered: 1,
			// Two events an hour apart are two one-minute sessions, not one long stretch.
			minutes: 2,
			bestStreak: 9,
			hardestWord: 'BAHNHOF'
		});
	});

	test('grammar keys read as plain words', () => {
		expect(readableItem('GRAMMAR:NOUN:BAHNHOF')).toBe('BAHNHOF');
		expect(readableItem('WOHNUNG')).toBe('WOHNUNG');
	});
});
