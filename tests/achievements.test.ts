import { describe, expect, it } from 'vitest';
import { buildAchievements, unlockedCount } from '../src/lib/progress/achievements';
import type { ActivityEvent } from '../src/lib/progress/activity';

function events(count: number, kind: ActivityEvent['kind'], extra: Partial<ActivityEvent> = {}): ActivityEvent[] {
	return Array.from({ length: count }, (_, index) => ({ kind, at: index + 1, ...extra }));
}

const empty = { activity: [], bestStreak: 0, masteredWords: 0 };

describe('buildAchievements', () => {
	it('starts with everything locked on a fresh install', () => {
		const achievements = buildAchievements(empty);
		expect(achievements).toHaveLength(10);
		expect(unlockedCount(achievements)).toBe(0);
		expect(achievements.every((achievement) => achievement.value === 0)).toBe(true);
	});

	it('unlocks the first step after a single activity event', () => {
		const achievements = buildAchievements({ ...empty, activity: events(1, 'circle') });
		expect(achievements.find((achievement) => achievement.id === 'first_step')?.done).toBe(true);
	});

	it('counts distinct stories and texts, not repeated events', () => {
		const activity = [
			...events(3, 'story', { id: 'a' }),
			...events(2, 'story', { id: 'b' }),
			...events(1, 'reading', { id: 'x' })
		];
		const achievements = buildAchievements({ ...empty, activity });
		expect(achievements.find((achievement) => achievement.id === 'story_5')?.value).toBe(2);
		expect(achievements.find((achievement) => achievement.id === 'reading_5')?.value).toBe(1);
	});

	it('caps the displayed value at the target', () => {
		const achievements = buildAchievements({ ...empty, activity: events(150, 'vocab'), bestStreak: 30 });
		expect(achievements.find((achievement) => achievement.id === 'vocab_100')).toMatchObject({ value: 100, target: 100, done: true });
		expect(achievements.find((achievement) => achievement.id === 'streak_3')).toMatchObject({ value: 3, target: 3, done: true });
		expect(achievements.find((achievement) => achievement.id === 'streak_7')).toMatchObject({ value: 7, target: 7, done: true });
	});

	it('only counts perfect pronunciation attempts', () => {
		const activity = [...events(4, 'pronunciation'), ...events(2, 'pronunciation', { perfect: true })];
		const achievement = buildAchievements({ ...empty, activity }).find((entry) => entry.id === 'perfect_10');
		expect(achievement?.value).toBe(2);
	});

	it('tracks how many different modes have been tried', () => {
		const activity = [...events(1, 'vocab'), ...events(1, 'story'), ...events(1, 'wordle'), ...events(1, 'tricky_cleared')];
		const achievement = buildAchievements({ ...empty, activity }).find((entry) => entry.id === 'all_rounder');
		expect(achievement).toMatchObject({ value: 3, target: 10, done: false });
	});
});
