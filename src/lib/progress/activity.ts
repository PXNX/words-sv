/*
 * A light daily activity log. Every mode drops a timestamped event here, so "minutes practised"
 * and "what did I actually finish" come from real interactions instead of a guessed average.
 * The log is a plain ring buffer in localStorage; it is never synced and never leaves the device.
 */
export type ActivityKind =
	| 'vocab'
	| 'grammar'
	| 'reading'
	| 'story'
	| 'listen'
	| 'pronunciation'
	| 'circle'
	| 'wordle'
	| 'tricky_cleared';

export type ActivityEvent = {
	kind: ActivityKind;
	at: number;
	// A finished text or story, so the same one is not counted twice.
	id?: string;
	// Pronunciation only: the attempt was scored as correct.
	perfect?: boolean;
};

export const ACTIVITY_KEY = 'wordcircle-activity-v1';
const MAX_EVENTS = 4000;
const SESSION_GAP_MS = 5 * 60 * 1000;

const KINDS: ActivityKind[] = ['vocab', 'grammar', 'reading', 'story', 'listen', 'pronunciation', 'circle', 'wordle', 'tricky_cleared'];

export function normalizeActivityEvent(value: unknown): ActivityEvent | null {
	if (!value || typeof value !== 'object') return null;
	const event = value as Partial<ActivityEvent>;
	if (!KINDS.includes(event.kind as ActivityKind)) return null;
	const at = Number(event.at);
	if (!Number.isSafeInteger(at) || at < 0) return null;
	return {
		kind: event.kind as ActivityKind,
		at,
		...(typeof event.id === 'string' && event.id ? { id: event.id } : {}),
		...(event.perfect === true ? { perfect: true } : {})
	};
}

export function normalizeActivity(value: unknown): ActivityEvent[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry) => {
		const event = normalizeActivityEvent(entry);
		return event ? [event] : [];
	});
}

export function readActivity(): ActivityEvent[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		return normalizeActivity(JSON.parse(localStorage.getItem(ACTIVITY_KEY) ?? '[]'));
	} catch {
		return [];
	}
}

export function writeActivity(events: ActivityEvent[]) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(ACTIVITY_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
	} catch {
		// A full quota must not stop the learner from practising.
	}
}

export function recordActivity(kind: ActivityKind, extra: { id?: string; perfect?: boolean } = {}, now: number = Date.now(), events: ActivityEvent[] = readActivity()): ActivityEvent[] {
	const next: ActivityEvent = { kind, at: now, ...(extra.id ? { id: extra.id } : {}), ...(extra.perfect ? { perfect: true } : {}) };
	const updated = [...events, next];
	writeActivity(updated);
	return updated;
}

/** Distinct ids of finished texts/stories, in completion order. */
export function completedIds(events: ActivityEvent[], kind: ActivityKind): string[] {
	const ids = new Set<string>();
	for (const event of events) if (event.kind === kind && event.id) ids.add(event.id);
	return [...ids];
}

export function countActivity(events: ActivityEvent[], kind: ActivityKind, since = 0, until = Number.MAX_SAFE_INTEGER, predicate?: (event: ActivityEvent) => boolean): number {
	return events.filter((event) => event.kind === kind && event.at >= since && event.at <= until && (!predicate || predicate(event))).length;
}

/**
 * Minutes actually spent, measured as the span between consecutive events. A gap longer than
 * five minutes starts a new session, so a forgotten tab does not count as practice time. Every
 * session counts at least one minute.
 */
export function activeMinutes(events: ActivityEvent[], since = 0, until = Number.MAX_SAFE_INTEGER): number {
	const times = events
		.map((event) => event.at)
		.filter((at) => at >= since && at <= until)
		.sort((left, right) => left - right);
	if (times.length === 0) return 0;
	let total = 0;
	let sessionStart = times[0];
	let previous = times[0];
	for (const at of times.slice(1)) {
		if (at - previous > SESSION_GAP_MS) {
			total += Math.max(1, Math.round((previous - sessionStart) / 60_000));
			sessionStart = at;
		}
		previous = at;
	}
	total += Math.max(1, Math.round((previous - sessionStart) / 60_000));
	return total;
}
