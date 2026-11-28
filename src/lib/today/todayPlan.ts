// The home screen shows one recommendation instead of fourteen equal cards. The data already lives
// in localStorage, so the plan is a pure function over a small snapshot and can be unit tested.
import type { FeatureKey } from '#lib/grammar/taxonomy.js';

export type TodayReading = {
	id: string;
	title: string;
	answered: number;
	total: number;
};

export type TodayPlanInput = {
	dueWords: number;
	markedWords: number;
	reading: TodayReading | null;
	streakQualified: boolean;
	vocabCorrect: number;
	vocabularyGoal: number;
	/** The weakest grammar feature from the event log, if one is clearly weak. */
	weakFeature?: { feature: FeatureKey; accuracy: number; errors: number } | null;
};

/** Below this accuracy a grammar feature is worth a dedicated suggestion. */
export const WEAK_FEATURE_ACCURACY = 0.7;

export type TodayPlan =
	| { kind: 'due'; href: string; count: number }
	| { kind: 'reading'; href: string; count: number; answered: number; total: number; title: string }
	| { kind: 'streak'; href: string; count: number }
	| { kind: 'feature'; href: string; count: number; feature: FeatureKey }
	| { kind: 'marked'; href: string; count: number }
	| { kind: 'done'; href: string; count: 0 };

/** The word quiz opens straight into a ready-made review round, so one tap is enough to start. */
export const DUE_SESSION_HREF = '/vocab?due=1';

/** One deep link into the current learning language; the vocabulary route prioritises the same words. */
export function buildTodayPlan(input: TodayPlanInput): TodayPlan {
	if (input.dueWords > 0) return { kind: 'due', href: DUE_SESSION_HREF, count: input.dueWords };
	if (input.reading && input.reading.answered < input.reading.total) {
		return {
			kind: 'reading',
			href: `/reading?text=${encodeURIComponent(input.reading.id)}`,
			count: input.reading.total - input.reading.answered,
			answered: input.reading.answered,
			total: input.reading.total,
			title: input.reading.title
		};
	}
	if (!input.streakQualified) {
		return { kind: 'streak', href: DUE_SESSION_HREF, count: Math.max(1, input.vocabularyGoal - input.vocabCorrect) };
	}
	if (input.weakFeature && input.weakFeature.accuracy < WEAK_FEATURE_ACCURACY) {
		return { kind: 'feature', href: '/grammar', count: input.weakFeature.errors, feature: input.weakFeature.feature };
	}
	if (input.markedWords > 0) return { kind: 'marked', href: DUE_SESSION_HREF, count: input.markedWords };
	return { kind: 'done', href: '/progress', count: 0 };
}

/** A rough time estimate for the card; a review of three words is about a minute. */
export function estimatedMinutes(count: number): number {
	return Math.max(2, Math.ceil(count / 3));
}

export type TodaySession = { href: string; steps: number; minutes: number };

/**
 * The card's single action: the plan's ready-made round followed by the still-open steps of the
 * daily mix. Duplicate targets collapse, because the plan's word round and the mix's "see" step
 * often lead to the same exercise.
 */
export function todaySession(plan: TodayPlan, mix: readonly { href: string; done: boolean }[]): TodaySession {
	const open = [
		...(plan.kind === 'done' ? [] : [{ href: plan.href }]),
		...mix.filter((step) => !step.done).map((step) => ({ href: step.href }))
	];
	const unique = [...new Map(open.map((step) => [step.href, step])).values()];
	const firstCount = plan.kind === 'done' ? 3 : plan.count;
	return {
		href: unique[0]?.href ?? '/progress',
		steps: unique.length,
		minutes: unique.reduce((total, _step, index) => total + estimatedMinutes(index === 0 ? firstCount : 3), 0)
	};
}
