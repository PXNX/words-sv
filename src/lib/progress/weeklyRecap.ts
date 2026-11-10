/*
 * The weekly recap: words mastered, minutes practised, best streak and the hardest word of the
 * week. A pure function over the data the app already keeps (activity log, review ledger, streak),
 * so it is easy to test and never invents progress.
 */
import { MASTERY_THRESHOLD } from '#lib/vocab/spacedRepetition.js';
import type { ReviewLedger } from '#lib/review/ledger.js';
import { activeMinutes, type ActivityEvent } from './activity.js';

const DAY_MS = 24 * 60 * 60 * 1000;

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
