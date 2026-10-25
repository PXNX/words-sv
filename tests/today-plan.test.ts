import { describe, expect, test } from 'vitest';
import { buildTodayPlan, estimatedMinutes, type TodayPlanInput } from '../src/lib/today/todayPlan.js';

function input(overrides: Partial<TodayPlanInput> = {}): TodayPlanInput {
	return {
		dueWords: 0,
		markedWords: 0,
		reading: null,
		streakQualified: true,
		vocabCorrect: 8,
		vocabularyGoal: 8,
		...overrides
	};
}

describe('buildTodayPlan', () => {
	test('due reviews come first', () => {
		const plan = buildTodayPlan(input({ dueWords: 5, reading: { id: 'text-1', title: 'Im Supermarkt', answered: 2, total: 5 } }));
		expect(plan).toEqual({ kind: 'due', href: '/vocab', count: 5 });
	});

	test('an unfinished text deep links to its next question', () => {
		const plan = buildTodayPlan(input({ reading: { id: 'im supermarkt', title: 'Im Supermarkt', answered: 2, total: 6 } }));
		expect(plan).toEqual({ kind: 'reading', href: '/reading?text=im%20supermarkt', count: 4, answered: 2, total: 6, title: 'Im Supermarkt' });
	});

	test('a finished text does not count as unfinished', () => {
		const plan = buildTodayPlan(input({ reading: { id: 'done', title: 'Fertig', answered: 4, total: 4 } }));
		expect(plan.kind).toBe('done');
	});

	test('an unqualified streak asks for the missing words', () => {
		const plan = buildTodayPlan(input({ streakQualified: false, vocabCorrect: 5, vocabularyGoal: 8 }));
		expect(plan).toEqual({ kind: 'streak', href: '/vocab', count: 3 });
	});

	test('a full goal never asks for zero words', () => {
		const plan = buildTodayPlan(input({ streakQualified: false, vocabCorrect: 0, vocabularyGoal: 5 }));
		expect(plan.count).toBe(5);
	});

	test('marked words are repeated once the day is qualified', () => {
		const plan = buildTodayPlan(input({ markedWords: 4 }));
		expect(plan).toEqual({ kind: 'marked', href: '/vocab', count: 4 });
	});

	test('nothing left points at the progress page', () => {
		expect(buildTodayPlan(input())).toEqual({ kind: 'done', href: '/progress', count: 0 });
	});
});

test('estimatedMinutes stays useful for small reviews and grows with the pile', () => {
	expect(estimatedMinutes(0)).toBe(2);
	expect(estimatedMinutes(3)).toBe(2);
	expect(estimatedMinutes(12)).toBe(4);
});
