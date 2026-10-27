/*
 * Achievements are the badges on the profile page. Like the milestones they are a pure view over
 * data the app already keeps (activity log, streak, vocabulary progress), so nothing is invented
 * and a fresh install simply has everything still locked.
 */
import { completedIds, countActivity, type ActivityEvent, type ActivityKind } from './activity.js';

export type AchievementId =
	| 'first_step'
	| 'vocab_100'
	| 'story_5'
	| 'reading_5'
	| 'grammar_50'
	| 'perfect_10'
	| 'streak_3'
	| 'streak_7'
	| 'mastered_50'
	| 'all_rounder';

export type Achievement = {
	id: AchievementId;
	value: number;
	target: number;
	done: boolean;
};

export type AchievementInput = {
	activity: ActivityEvent[];
	bestStreak: number;
	masteredWords: number;
};

// Every mode that leaves an event in the activity log; clearing tricky words is a bonus, not a mode.
const MODES: ActivityKind[] = ['vocab', 'grammar', 'reading', 'story', 'listen', 'pronunciation', 'circle', 'wordle', 'hangman', 'alltag'];

function distinctModes(activity: ActivityEvent[]): number {
	const seen = new Set<ActivityKind>();
	for (const event of activity) if (MODES.includes(event.kind)) seen.add(event.kind);
	return seen.size;
}

// Quick wins first, so the grid fills up early and the long roads stay motivating.
const ORDER: { id: AchievementId; target: number; value: (input: AchievementInput) => number }[] = [
	{ id: 'first_step', target: 1, value: (input) => input.activity.length },
	{ id: 'streak_3', target: 3, value: (input) => input.bestStreak },
	{ id: 'vocab_100', target: 100, value: (input) => countActivity(input.activity, 'vocab') },
	{ id: 'story_5', target: 5, value: (input) => completedIds(input.activity, 'story').length },
	{ id: 'reading_5', target: 5, value: (input) => completedIds(input.activity, 'reading').length },
	{ id: 'perfect_10', target: 10, value: (input) => countActivity(input.activity, 'pronunciation', 0, Number.MAX_SAFE_INTEGER, (event) => event.perfect === true) },
	{ id: 'streak_7', target: 7, value: (input) => input.bestStreak },
	{ id: 'grammar_50', target: 50, value: (input) => countActivity(input.activity, 'grammar') },
	{ id: 'mastered_50', target: 50, value: (input) => input.masteredWords },
	{ id: 'all_rounder', target: MODES.length, value: (input) => distinctModes(input.activity) }
];

export function buildAchievements(input: AchievementInput): Achievement[] {
	return ORDER.map(({ id, target, value }) => {
		const current = Math.max(0, value(input));
		return { id, value: Math.min(current, target), target, done: current >= target };
	});
}

export function unlockedCount(achievements: Achievement[]): number {
	return achievements.filter((achievement) => achievement.done).length;
}
