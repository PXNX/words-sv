export const VOCABULARY_GOAL = 8;

export function isSupportedTimeZone(timeZone) {
	try {
		new Intl.DateTimeFormat('en-CA', { timeZone }).format();
		return true;
	} catch {
		return false;
	}
}

export function dateKeyFor(timeZone, now = new Date()) {
	const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
	const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
	return `${value.year}-${value.month}-${value.day}`;
}

export function previousDateKey(dateKey) {
	const date = new Date(`${dateKey}T12:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() - 1);
	return date.toISOString().slice(0, 10);
}

export function minutesUntilNextLocalDate(timeZone, now = new Date()) {
	const currentKey = dateKeyFor(timeZone, now);
	const start = now.getTime();
	let end = start + 27 * 60 * 60 * 1000;
	while (dateKeyFor(timeZone, new Date(end)) === currentKey) end += 6 * 60 * 60 * 1000;
	let low = start;
	let high = end;
	while (high - low > 1_000) {
		const middle = Math.floor((low + high) / 2);
		if (dateKeyFor(timeZone, new Date(middle)) === currentKey) low = middle;
		else high = middle;
	}
	return Math.max(0, Math.ceil((high - start) / 60_000));
}

export function stateForToday(stored, timeZone, now = new Date()) {
	const today = dateKeyFor(timeZone, now);
	const previousDay = previousDateKey(today);
	const storedDayKey = stored?.day_key ?? stored?.dateKey;
	const vocabCorrect = Number(stored?.vocab_correct ?? stored?.vocabCorrect) || 0;
	const circleCompleted = Boolean(stored?.circle_completed ?? stored?.circleCompleted);
	const wordleCompleted = Boolean(stored?.wordle_completed ?? stored?.wordleCompleted);
	const qualified = Boolean(stored?.current_qualified ?? stored?.qualified);
	const storedCount = Number(stored?.streak_count ?? stored?.streakCount) || 0;
	const lastQualifiedDay = stored?.last_qualified_day ?? stored?.lastQualifiedDay ?? null;
	if (storedDayKey === today) {
		return { dateKey: today, vocabCorrect, circleCompleted, wordleCompleted, qualified, streakCount: storedCount, lastQualifiedDay };
	}
	const streakCount = lastQualifiedDay && lastQualifiedDay < previousDay ? 0 : storedCount;
	return { dateKey: today, vocabCorrect: 0, circleCompleted: false, wordleCompleted: false, qualified: false, streakCount, lastQualifiedDay };
}

export function applyStreakEvent(stored, timeZone, event, now = new Date()) {
	const state = stateForToday(stored, timeZone, now);
	if (event === 'vocab_correct') state.vocabCorrect += 1;
	if (event === 'circle_completed') state.circleCompleted = true;
	if (event === 'wordle_completed') state.wordleCompleted = true;
	const nextQualified = state.vocabCorrect >= VOCABULARY_GOAL || state.circleCompleted || state.wordleCompleted;
	if (nextQualified && !state.qualified) {
		state.streakCount = state.lastQualifiedDay === previousDateKey(state.dateKey) ? state.streakCount + 1 : 1;
		state.lastQualifiedDay = state.dateKey;
	}
	state.qualified = nextQualified;
	return state;
}

export function streakSummary(stored, timeZone, now = new Date()) {
	const state = stateForToday(stored, timeZone, now);
	return {
		...state,
		vocabularyGoal: VOCABULARY_GOAL,
		minutesRemaining: minutesUntilNextLocalDate(timeZone, now),
		canProtectStreak: state.lastQualifiedDay === previousDateKey(state.dateKey) && !state.qualified
	};
}

export function reminderTypes(stored, timeZone, now = new Date()) {
	const summary = streakSummary(stored, timeZone, now);
	const types = [];
	if (summary.lastQualifiedDay === previousDateKey(summary.dateKey) && dateKeyFor(timeZone, new Date(now.getTime() - 2 * 60 * 60 * 1000)) !== summary.dateKey) types.push('new_day');
	if (summary.canProtectStreak && summary.minutesRemaining > 0 && summary.minutesRemaining <= 120) types.push('deadline');
	return { summary, types };
}
