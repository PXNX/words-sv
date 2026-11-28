// A one-minute placement for onboarding: three real words and one invented word per level (A1–B1),
// answered yes/no. Fewer items than the full test in placement.ts, enough to pick a sensible start
// level before the learner plays their first round. Pure and seeded, so it is easy to test.
import type { Level } from '#lib/domain/types.js';
import { PLACEMENT_LEVELS, pseudoWords, scoreLevel, type PlacementItem } from './placement.js';

export const QUICK_LEVELS: readonly Level[] = PLACEMENT_LEVELS.slice(0, 3);
export const QUICK_REAL_PER_LEVEL = 3;
export const QUICK_FAKE_PER_LEVEL = 1;

export type QuickPlacementItem = PlacementItem & { level: Level };

function shuffle<T>(items: readonly T[], random: () => number): T[] {
	const copy = [...items];
	for (let index = copy.length - 1; index > 0; index -= 1) {
		const other = Math.floor(random() * (index + 1));
		[copy[index], copy[other]] = [copy[other]!, copy[index]!];
	}
	return copy;
}

/** One short round per level; invented words punish guessing just as in the full test. */
export function quickPlacementItems(
	pools: Partial<Record<Level, readonly string[]>>,
	corpus: readonly string[],
	random: () => number,
	exclude: ReadonlySet<string> = new Set()
): QuickPlacementItem[] {
	const items: QuickPlacementItem[] = [];
	for (const level of QUICK_LEVELS) {
		const words = (pools[level] ?? []).filter((word) => /^\p{L}[\p{L}\-']*$/u.test(word));
		const real = shuffle(words, random).slice(0, QUICK_REAL_PER_LEVEL).map((text) => ({ text, real: true, level }));
		const fakes = pseudoWords(corpus, QUICK_FAKE_PER_LEVEL, random, exclude).map((text) => ({ text, real: false, level }));
		items.push(...shuffle([...real, ...fakes], random));
	}
	return items;
}

/** Highest level passed; an unpassed level stops the ladder at the one before it. */
export function quickPlacementResult(answers: ReadonlyArray<QuickPlacementItem & { known: boolean }>): Level {
	let level: Level = QUICK_LEVELS[0]!;
	for (const candidate of QUICK_LEVELS) {
		const score = scoreLevel(answers.filter((answer) => answer.level === candidate));
		if (!score.passed) break;
		level = candidate;
	}
	return level;
}
