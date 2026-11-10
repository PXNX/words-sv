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

/** One deep link into the current learning language; the vocabulary route prioritises the same words. */
export function buildTodayPlan(input: TodayPlanInput): TodayPlan {
	if (input.dueWords > 0) return { kind: 'due', href: '/vocab', count: input.dueWords };
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
		return { kind: 'streak', href: '/vocab', count: Math.max(1, input.vocabularyGoal - input.vocabCorrect) };
	}
	if (input.weakFeature && input.weakFeature.accuracy < WEAK_FEATURE_ACCURACY) {
		return { kind: 'feature', href: '/grammar', count: input.weakFeature.errors, feature: input.weakFeature.feature };
	}
	if (input.markedWords > 0) return { kind: 'marked', href: '/vocab', count: input.markedWords };
	return { kind: 'done', href: '/progress', count: 0 };
}

/** A rough time estimate for the card; a review of three words is about a minute. */
export function estimatedMinutes(count: number): number {
	return Math.max(2, Math.ceil(count / 3));
}
