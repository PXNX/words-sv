/*
 * One review ledger for every mode. Each entry is keyed by `language:item` and keeps the same
 * scheduling vocabulary the vocabulary store already used, plus the mode that last touched it.
 * The older per-mode stores stay readable; this ledger is what the Repeat hub and the mixed
 * session read, so marked reading words, grammar answers and pronunciation results meet there.
 */
export type ReviewSource = 'vocab' | 'reading' | 'grammar' | 'pronunciation' | 'story' | 'listening';

export type ReviewEntry = {
	repetitions: number;
	dueAt: number;
	lapses: number;
	source: ReviewSource;
	updatedAt: number;
};

export type ReviewLedger = Record<string, ReviewEntry>;

export const REVIEW_LEDGER_KEY = 'wordcircle-review-ledger-v1';
export const REVIEW_SOURCES: ReviewSource[] = ['vocab', 'reading', 'grammar', 'pronunciation', 'story', 'listening'];

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS = [1, 2, 4, 8, 16, 32];

export function reviewKey(language: string, item: string): string {
	return `${language}:${item.trim().toLocaleUpperCase()}`;
}

export function splitReviewKey(key: string): { language: string; item: string } | null {
	const separator = key.indexOf(':');
	if (separator <= 0) return null;
	const language = key.slice(0, separator);
	const item = key.slice(separator + 1);
	return item ? { language, item } : null;
}

function safeNumber(value: unknown, fallback = 0): number {
	const number = Number(value);
	return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
}

export function normalizeReviewEntry(value: unknown): ReviewEntry | null {
	if (!value || typeof value !== 'object') return null;
	const entry = value as Partial<ReviewEntry>;
	const source = REVIEW_SOURCES.includes(entry.source as ReviewSource) ? (entry.source as ReviewSource) : 'vocab';
	return {
		repetitions: safeNumber(entry.repetitions),
		dueAt: safeNumber(entry.dueAt),
		lapses: safeNumber(entry.lapses),
		source,
		updatedAt: safeNumber(entry.updatedAt)
	};
}

export function readReviewLedger(): ReviewLedger {
	if (typeof localStorage === 'undefined') return {};
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(REVIEW_LEDGER_KEY) ?? '{}');
		if (!parsed || typeof parsed !== 'object') return {};
		const ledger: ReviewLedger = {};
		for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
			const entry = normalizeReviewEntry(value);
			if (entry) ledger[key] = entry;
		}
		return ledger;
	} catch {
		return {};
	}
}

export function writeReviewLedger(ledger: ReviewLedger) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(REVIEW_LEDGER_KEY, JSON.stringify(ledger));
	} catch {
		// A full quota must not stop the learner from answering.
	}
}

/** Pure scheduling step, so tests can advance the clock without touching storage. */
export function applyReview(
	ledger: ReviewLedger,
	language: string,
	item: string,
	correct: boolean,
	source: ReviewSource,
	now: number = Date.now()
): ReviewLedger {
	const key = reviewKey(language, item);
	const current = normalizeReviewEntry(ledger[key]) ?? { repetitions: 0, dueAt: 0, lapses: 0, source, updatedAt: 0 };
	const repetitions = correct ? current.repetitions + 1 : 0;
	const lapses = correct ? Math.max(0, current.lapses - 1) : current.lapses + 1;
	const intervalDays = correct ? INTERVAL_DAYS[Math.min(repetitions - 1, INTERVAL_DAYS.length - 1)] : 1;
	return {
		...ledger,
		[key]: { repetitions, lapses, dueAt: now + intervalDays * DAY_MS, source, updatedAt: now }
	};
}

export function recordReview(language: string, item: string, correct: boolean, source: ReviewSource, now: number = Date.now()): ReviewLedger {
	const ledger = applyReview(readReviewLedger(), language, item, correct, source, now);
	writeReviewLedger(ledger);
	return ledger;
}

/** Marks an item as hard without an answer, e.g. from the reading word sheet. */
export function markReviewItem(language: string, item: string, source: ReviewSource, now: number = Date.now()): ReviewLedger {
	return recordReview(language, item, false, source, now);
}

/** Takes a manual mark back and returns the item to normal rotation. */
export function clearReviewItem(language: string, item: string): ReviewLedger {
	const ledger = readReviewLedger();
	const key = reviewKey(language, item);
	const current = normalizeReviewEntry(ledger[key]);
	if (!current) return ledger;
	ledger[key] = { ...current, repetitions: 0, dueAt: 0, lapses: 0, updatedAt: Date.now() };
	writeReviewLedger(ledger);
	return ledger;
}

export function ledgerEntriesFor(ledger: ReviewLedger, language: string): { key: string; item: string; entry: ReviewEntry }[] {
	return Object.entries(ledger).flatMap(([key, entry]) => {
		const parts = splitReviewKey(key);
		if (!parts || parts.language !== language) return [];
		return [{ key, item: parts.item, entry }];
	});
}

/** Items worth repeating now: marked as hard or past their due date. */
export function dueReviewEntries(language: string, now: number = Date.now(), ledger: ReviewLedger = readReviewLedger()) {
	return ledgerEntriesFor(ledger, language)
		.filter(({ entry }) => entry.lapses > 0 || (entry.dueAt > 0 && entry.dueAt <= now))
		.sort((left, right) => {
			if (left.entry.lapses !== right.entry.lapses) return right.entry.lapses - left.entry.lapses;
			return left.entry.dueAt - right.entry.dueAt;
		});
}

export function dueReviewCount(language: string, now: number = Date.now()): number {
	return dueReviewEntries(language, now).length;
}

export type ReviewGroup = { source: ReviewSource; count: number };

export function groupReviewEntries(entries: { entry: ReviewEntry }[]): ReviewGroup[] {
	return REVIEW_SOURCES.flatMap((source) => {
		const count = entries.filter(({ entry }) => entry.source === source).length;
		return count > 0 ? [{ source, count }] : [];
	});
}
