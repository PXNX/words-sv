/*
 * Learning milestones and the weekly recap. Both are pure functions over the data the app already
 * keeps (activity log, review ledger, streak), so they are easy to test and never invent progress.
 */
import { MASTERY_THRESHOLD } from '#lib/vocab/spacedRepetition.js';
import type { ReviewLedger } from '#lib/review/ledger.js';
import { activeMinutes, type ActivityEvent } from './activity.js';

export type MilestoneId =
	| 'first_text'
	| 'first_story'
	| 'perfect_pronunciation'
	| 'streak_7'
	| 'tricky_10'
	| 'all_a1_texts'
	| 'mastered_100';

export type Milestone = {
	id: MilestoneId;
	value: number;
	target: number;
	done: boolean;
};

export type MilestoneInput = {
	textsRead: number;
	storiesCompleted: number;
	perfectPronunciations: number;
	masteredWords: number;
	bestStreak: number;
	a1TextsRead: number;
	a1TextsTotal: number;
	trickyCleared: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Small first wins come before the long roads, so the list reads like a learning path.
const ORDER: { id: MilestoneId; target: (input: MilestoneInput) => number; value: (input: MilestoneInput) => number }[] = [
	{ id: 'first_text', target: () => 1, value: (input) => input.textsRead },
	{ id: 'first_story', target: () => 1, value: (input) => input.storiesCompleted },
	{ id: 'perfect_pronunciation', target: () => 1, value: (input) => input.perfectPronunciations },
	{ id: 'streak_7', target: () => 7, value: (input) => input.bestStreak },
	{ id: 'tricky_10', target: () => 10, value: (input) => input.trickyCleared },
	// A language without A1 texts should not present an already-finished milestone.
	{ id: 'all_a1_texts', target: (input) => Math.max(1, input.a1TextsTotal), value: (input) => input.a1TextsRead },
	{ id: 'mastered_100', target: () => 100, value: (input) => input.masteredWords }
];

export function buildMilestones(input: MilestoneInput): Milestone[] {
	return ORDER.map(({ id, target, value }) => {
		const goal = target(input);
		const current = Math.max(0, value(input));
		return { id, value: Math.min(current, goal), target: goal, done: current >= goal };
	});
}

export function nextMilestone(milestones: Milestone[]): Milestone | null {
	return milestones.find((milestone) => !milestone.done) ?? null;
}

export function milestonePercent(milestone: Milestone): number {
	if (milestone.target <= 0) return 100;
	return Math.min(100, Math.round((milestone.value / milestone.target) * 100));
}

export type WeeklyRecap = {
	wordsMastered: number;
	minutes: number;
	bestStreak: number;
	hardestWord: string | null;
};

export type WeeklyRecapInput = {
	ledger: ReviewLedger;
	activity: ActivityEvent[];
	bestStreak: number;
	since: number;
	now?: number;
};

/** `GRAMMAR:NOUN:WOHNUNG` and `WOHNUNG` should read the same in the recap. */
export function readableItem(item: string): string {
	const parts = item.split(':');
	return parts[parts.length - 1] ?? item;
}

export function buildWeeklyRecap({ ledger, activity, bestStreak, since, now = Date.now() }: WeeklyRecapInput): WeeklyRecap {
	let wordsMastered = 0;
	let hardestWord: string | null = null;
	let hardestLapses = 0;
	for (const [key, entry] of Object.entries(ledger)) {
		const item = key.slice(key.indexOf(':') + 1);
		if (entry.repetitions >= MASTERY_THRESHOLD && entry.updatedAt >= since && entry.updatedAt <= now) wordsMastered += 1;
		if (entry.lapses > hardestLapses) {
			hardestLapses = entry.lapses;
			hardestWord = readableItem(item);
		}
	}
	return {
		wordsMastered,
		minutes: activeMinutes(activity, since, now),
		bestStreak,
		hardestWord
	};
}

export function weekStart(now = new Date()): Date {
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	// Monday-based week, matching the recap copy.
	const day = (start.getDay() + 6) % 7;
	start.setDate(start.getDate() - day);
	return start;
}

export function weekStartTimestamp(now = new Date()): number {
	return weekStart(now).getTime();
}

export { DAY_MS };
