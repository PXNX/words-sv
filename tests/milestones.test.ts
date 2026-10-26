import { describe, expect, test } from 'vitest';
import { activeMinutes, completedIds, countActivity, normalizeActivity, type ActivityEvent } from '../src/lib/progress/activity.js';
import { buildMilestones, buildWeeklyRecap, milestonePercent, nextMilestone, readableItem, type MilestoneInput } from '../src/lib/progress/milestones.js';
import type { ReviewLedger } from '../src/lib/review/ledger.js';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 26, 12, 0, 0);

function input(overrides: Partial<MilestoneInput> = {}): MilestoneInput {
	return {
		textsRead: 0,
		storiesCompleted: 0,
		perfectPronunciations: 0,
		masteredWords: 0,
		bestStreak: 0,
		a1TextsRead: 0,
		a1TextsTotal: 6,
		trickyCleared: 0,
		...overrides
	};
}

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

describe('milestones', () => {
	test('the first small wins are reachable one step at a time', () => {
		const milestones = buildMilestones(input({ textsRead: 1, storiesCompleted: 1 }));
		expect(milestones[0]).toEqual({ id: 'first_text', value: 1, target: 1, done: true });
		expect(milestones[1]).toEqual({ id: 'first_story', value: 1, target: 1, done: true });
		expect(nextMilestone(milestones)?.id).toBe('perfect_pronunciation');
	});

	test('the next milestone carries a capped progress value', () => {
		const milestone = buildMilestones(input({ bestStreak: 9, textsRead: 2, storiesCompleted: 2, perfectPronunciations: 1 }))[3];
		expect(milestone).toEqual({ id: 'streak_7', value: 7, target: 7, done: true });
		expect(milestonePercent({ id: 'streak_7', value: 3, target: 7, done: false })).toBe(43);
	});

	test('all A1 texts never look finished without an A1 text', () => {
		const milestones = buildMilestones(input({ a1TextsRead: 0, a1TextsTotal: 0 }));
		expect(milestones.find((milestone) => milestone.id === 'all_a1_texts')).toMatchObject({ value: 0, target: 1, done: false });
	});

	test('every milestone done means no next step', () => {
		const milestones = buildMilestones(input({
			textsRead: 1,
			storiesCompleted: 1,
			perfectPronunciations: 1,
			masteredWords: 100,
			bestStreak: 7,
			a1TextsRead: 6,
			a1TextsTotal: 6,
			trickyCleared: 10
		}));
		expect(milestones.every((milestone) => milestone.done)).toBe(true);
		expect(nextMilestone(milestones)).toBeNull();
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
