export const VOCABULARY_GOAL = 8;
export const GRAMMAR_GOAL = 5;
export const PRONUNCIATION_GOAL = 10;
export const ALLTAG_GOAL = 5;
export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;
export const DAILY_GOALS = [5, 8, 12];
export const REMINDER_LOCALES = ['de', 'en', 'fa', 'pt', 'ru', 'ar', 'uk', 'hi', 'ml'];

/**
 * A streak row as stored (snake_case, from MySQL) or as the client sends it (camelCase).
 * @typedef {object} StoredStreak
 * @property {string} [day_key]
 * @property {string} [dateKey]
 * @property {number} [vocab_correct]
 * @property {number} [vocabCorrect]
 * @property {boolean} [circle_completed]
 * @property {boolean} [circleCompleted]
 * @property {boolean} [definitions_completed]
 * @property {boolean} [definitionsCompleted]
 * @property {boolean} [wordle_completed]
 * @property {boolean} [wordleCompleted]
 * @property {boolean} [reading_completed]
 * @property {boolean} [readingCompleted]
 * @property {boolean} [story_completed]
 * @property {boolean} [storyCompleted]
 * @property {number} [grammar_correct]
 * @property {number} [grammarCorrect]
 * @property {boolean} [listen_completed]
 * @property {boolean} [listenCompleted]
 * @property {number} [pronunciation_attempts]
 * @property {number} [pronunciationAttempts]
 * @property {boolean} [hangman_completed]
 * @property {boolean} [hangmanCompleted]
 * @property {number} [alltag_correct]
 * @property {number} [alltagCorrect]
 * @property {boolean} [current_qualified]
 * @property {boolean} [qualified]
 * @property {number} [streak_count]
 * @property {number} [streakCount]
 * @property {string | null} [last_qualified_day]
 * @property {string | null} [lastQualifiedDay]
 * @property {number} [vocabulary_goal]
 * @property {number} [vocabularyGoal]
 * @property {number} [freezes]
 * @property {number} [qualified_days]
 * @property {number} [qualifiedDays]
 * @property {boolean} [reward_collected]
 * @property {boolean} [rewardCollected]
 * @property {number | null} [embers]
 * @property {number} [best_streak]
 * @property {number} [bestStreak]
 */

/**
 * The streak state for today, normalised to camelCase.
 * @typedef {object} StreakState
 * @property {string} dateKey
 * @property {number} vocabCorrect
 * @property {boolean} circleCompleted
 * @property {boolean} definitionsCompleted
 * @property {boolean} wordleCompleted
 * @property {boolean} readingCompleted
 * @property {boolean} storyCompleted
 * @property {number} grammarCorrect
 * @property {boolean} listenCompleted
 * @property {number} pronunciationAttempts
 * @property {boolean} hangmanCompleted
 * @property {number} alltagCorrect
 * @property {boolean} qualified
 * @property {number} streakCount
 * @property {string | null} lastQualifiedDay
 * @property {number} vocabularyGoal
 * @property {number} freezes
 * @property {number} qualifiedDays
 * @property {boolean} rewardCollected
 * @property {number} embers
 * @property {number} [bestStreak]
 */


/** @param {unknown} value */
export function normalizeReminderLocale(value) {
	const language = String(value ?? '').toLowerCase();
	const match = REMINDER_LOCALES.find((locale) => language === locale || language.startsWith(`${locale}-`));
	return match ?? 'en';
}

/** @param {unknown} value */
export function normalizeVocabularyGoal(value) {
	const numeric = Number(value);
	return DAILY_GOALS.includes(numeric) ? numeric : VOCABULARY_GOAL;
}

/** @param {string} timeZone */
export function isSupportedTimeZone(timeZone) {
	try {
		new Intl.DateTimeFormat('en-CA', { timeZone }).format();
		return true;
	} catch {
		return false;
	}
}

/** @param {string} timeZone @param {Date} [now] */
export function dateKeyFor(timeZone, now = new Date()) {
	const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
	const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
	return `${value.year}-${value.month}-${value.day}`;
}

/** @param {string} dateKey */
export function previousDateKey(dateKey) {
	const date = new Date(`${dateKey}T12:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() - 1);
	return date.toISOString().slice(0, 10);
}

/** @param {string} earlier
 * @param {string} later */
function daysBetween(earlier, later) {
	const start = Date.parse(`${earlier}T12:00:00.000Z`);
	const end = Date.parse(`${later}T12:00:00.000Z`);
	return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

/** @param {unknown} value @param {number} [fallback] */
function numberField(value, fallback = 0) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
}

// Rows from before the daily reward keep their progress toward the next freeze.
/** @param {StoredStreak | null | undefined} stored */
function embersField(stored) {
	const embers = stored?.embers;
	return embers === undefined || embers === null ? numberField(stored?.qualified_days ?? stored?.qualifiedDays) % FREEZE_EVERY : Math.min(FREEZE_EVERY, numberField(embers));
}

/** @param {string} timeZone @param {Date} [now] */
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

/** @param {StoredStreak | null | undefined} stored @param {string} timeZone @param {Date} [now] @returns {StreakState} */
export function stateForToday(stored, timeZone, now = new Date()) {
	const today = dateKeyFor(timeZone, now);
	const previousDay = previousDateKey(today);
	const storedDayKey = stored?.day_key ?? stored?.dateKey;
	const vocabularyGoal = normalizeVocabularyGoal(stored?.vocabulary_goal ?? stored?.vocabularyGoal);
	if (storedDayKey === today) {
		return {
			dateKey: today,
			vocabCorrect: numberField(stored?.vocab_correct ?? stored?.vocabCorrect),
			circleCompleted: Boolean(stored?.circle_completed ?? stored?.circleCompleted),
			definitionsCompleted: Boolean(stored?.definitions_completed ?? stored?.definitionsCompleted),
			wordleCompleted: Boolean(stored?.wordle_completed ?? stored?.wordleCompleted),
			readingCompleted: Boolean(stored?.reading_completed ?? stored?.readingCompleted),
			storyCompleted: Boolean(stored?.story_completed ?? stored?.storyCompleted),
			grammarCorrect: numberField(stored?.grammar_correct ?? stored?.grammarCorrect),
			listenCompleted: Boolean(stored?.listen_completed ?? stored?.listenCompleted),
			pronunciationAttempts: numberField(stored?.pronunciation_attempts ?? stored?.pronunciationAttempts),
			hangmanCompleted: Boolean(stored?.hangman_completed ?? stored?.hangmanCompleted),
			alltagCorrect: numberField(stored?.alltag_correct ?? stored?.alltagCorrect),
			qualified: Boolean(stored?.current_qualified ?? stored?.qualified),
			streakCount: numberField(stored?.streak_count ?? stored?.streakCount),
			lastQualifiedDay: stored?.last_qualified_day ?? stored?.lastQualifiedDay ?? null,
			vocabularyGoal,
			freezes: Math.min(MAX_FREEZES, numberField(stored?.freezes)),
			qualifiedDays: numberField(stored?.qualified_days ?? stored?.qualifiedDays),
			rewardCollected: Boolean(stored?.reward_collected ?? stored?.rewardCollected),
			embers: embersField(stored)
		};
	}
	let lastQualifiedDay = stored?.last_qualified_day ?? stored?.lastQualifiedDay ?? null;
	let freezes = Math.min(MAX_FREEZES, numberField(stored?.freezes));
	if (lastQualifiedDay && lastQualifiedDay < previousDay && daysBetween(lastQualifiedDay, previousDay) === 1 && freezes > 0) {
		freezes -= 1;
		lastQualifiedDay = previousDay;
	}
	const streakCount = lastQualifiedDay && lastQualifiedDay >= previousDay ? numberField(stored?.streak_count ?? stored?.streakCount) : 0;
	return {
		dateKey: today,
		vocabCorrect: 0,
		circleCompleted: false,
		definitionsCompleted: false,
		wordleCompleted: false,
		readingCompleted: false,
		storyCompleted: false,
		grammarCorrect: 0,
		listenCompleted: false,
		pronunciationAttempts: 0,
		hangmanCompleted: false,
		alltagCorrect: 0,
		qualified: false,
		streakCount,
		lastQualifiedDay,
		vocabularyGoal,
		freezes,
		qualifiedDays: numberField(stored?.qualified_days ?? stored?.qualifiedDays),
		rewardCollected: false,
		embers: embersField(stored)
	};
}

/** @param {StreakState} state */
export function qualifiesToday(state) {
	return (
		state.vocabCorrect >= state.vocabularyGoal ||
		state.circleCompleted ||
		state.definitionsCompleted ||
		state.wordleCompleted ||
		state.readingCompleted ||
		state.storyCompleted ||
		state.grammarCorrect >= GRAMMAR_GOAL ||
		state.listenCompleted ||
		state.pronunciationAttempts >= PRONUNCIATION_GOAL ||
		state.hangmanCompleted ||
		state.alltagCorrect >= ALLTAG_GOAL
	);
}

/** @param {StreakState} state @returns {StreakState} */
function settleQualification(state) {
	const qualifies = qualifiesToday(state) || state.qualified;
	const next = { ...state, qualified: qualifies };
	if (!qualifies || state.qualified) {
		if (next.streakCount > (next.bestStreak ?? 0)) next.bestStreak = next.streakCount;
		return next;
	}
	next.qualifiedDays = state.qualifiedDays + 1;
	next.streakCount = state.lastQualifiedDay === previousDateKey(state.dateKey) ? state.streakCount + 1 : 1;
	next.lastQualifiedDay = state.dateKey;
	next.bestStreak = Math.max(state.bestStreak ?? 0, next.streakCount);
	return next;
}

/** Collects today's ember once; a full set turns into a freeze as soon as there is room for one.
 * @param {StreakState} state @returns {StreakState} */
export function collectReward(state) {
	if (!state.qualified || state.rewardCollected) return state;
	const next = { ...state, rewardCollected: true, embers: Math.min(FREEZE_EVERY, state.embers + 1) };
	if (next.embers >= FREEZE_EVERY && next.freezes < MAX_FREEZES) {
		next.freezes += 1;
		next.embers = 0;
	}
	return next;
}

/** @param {StoredStreak | null | undefined} stored @param {string} timeZone @param {string} event @param {Date} [now] @returns {StreakState} */
export function applyStreakEvent(stored, timeZone, event, now = new Date()) {
	const state = stateForToday(stored, timeZone, now);
	if (event === 'vocab_correct') state.vocabCorrect += 1;
	if (event === 'circle_completed') state.circleCompleted = true;
	if (event === 'definitions_completed') state.definitionsCompleted = true;
	if (event === 'wordle_completed') state.wordleCompleted = true;
	if (event === 'reading_completed') state.readingCompleted = true;
	if (event === 'story_completed') state.storyCompleted = true;
	if (event === 'grammar_correct') state.grammarCorrect += 1;
	if (event === 'listen_completed') state.listenCompleted = true;
	if (event === 'pronunciation_practised') state.pronunciationAttempts += 1;
	if (event === 'hangman_completed') state.hangmanCompleted = true;
	if (event === 'alltag_correct') state.alltagCorrect += 1;
	if (event === 'reward_collected') return collectReward(state);
	return settleQualification(state);
}

/** @param {StoredStreak | null | undefined} stored @param {string} timeZone @param {Date} [now] */
export function streakSummary(stored, timeZone, now = new Date()) {
	const state = stateForToday(stored, timeZone, now);
	return {
		...state,
		bestStreak: numberField(stored?.best_streak ?? stored?.bestStreak, state.streakCount),
		minutesRemaining: minutesUntilNextLocalDate(timeZone, now),
		canProtectStreak: state.lastQualifiedDay === previousDateKey(state.dateKey) && !state.qualified
	};
}

/** A device gets at most one reminder a day, so the most urgent type wins. */
/** @param {StoredStreak | null | undefined} stored @param {string} timeZone @param {Date} [now] */
export function reminderTypes(stored, timeZone, now = new Date()) {
	const summary = streakSummary(stored, timeZone, now);
	/** @type {string[]} */
	const types = [];
	if (summary.canProtectStreak && summary.minutesRemaining > 0 && summary.minutesRemaining <= 120) types.push('deadline');
	else if (summary.lastQualifiedDay === previousDateKey(summary.dateKey) && dateKeyFor(timeZone, new Date(now.getTime() - 2 * 60 * 60 * 1000)) !== summary.dateKey) types.push('new_day');
	return { summary, types };
}

/** @type {Record<string, (type: string, minutes: number) => { title: string, body: string }>} */
const NOTIFICATIONS = {
	en: (type, minutes) => type === 'deadline'
		? { title: 'Keep your WordCircle streak', body: `Only ${minutes} minutes remain to qualify today.` }
		: { title: 'Continue your WordCircle streak', body: 'A new learning day has started.' },
	de: (type, minutes) => type === 'deadline'
		? { title: 'Deine WordCircle-Serie wartet', body: `Nur noch ${minutes} Minuten bis Mitternacht, um heute zu qualifizieren.` }
		: { title: 'Weiter mit deiner WordCircle-Serie', body: 'Ein neuer Lerntag hat begonnen.' },
	ar: (type, minutes) => type === 'deadline'
		? { title: 'سلسلتك في WordCircle تنتظر', body: `تبقّى ${minutes} دقيقة حتى منتصف الليل لتُكمل اليوم.` }
		: { title: 'واصل سلسلة WordCircle', body: 'بدأ يوم تعلّم جديد.' },
	fa: (type, minutes) => type === 'deadline'
		? { title: 'زنجیره WordCircle شما منتظر است', body: `فقط ${minutes} دقیقه تا نیمه‌شب برای امروز باقی مانده است.` }
		: { title: 'زنجیره WordCircle خود را ادامه بده', body: 'روز یادگیری تازه‌ای آغاز شد.' },
	hi: (type, minutes) => type === 'deadline'
		? { title: 'आपकी WordCircle लय प्रतीक्षा में है', body: `आज पूरा करने के लिए मध्यरात्रि तक ${minutes} मिनट बाकी हैं।` }
		: { title: 'अपनी WordCircle लय जारी रखें', body: 'नया सीखने का दिन शुरू हुआ।' },
	ml: (type, minutes) => type === 'deadline'
		? { title: 'നിങ്ങളുടെ WordCircle തുടർച്ച കാത്തിരിക്കുന്നു', body: `ഇന്ന് പൂർത്തിയാക്കാൻ അർധരാത്രി വരെ ${minutes} മിനിറ്റ് ബാക്കി.` }
		: { title: 'നിങ്ങളുടെ WordCircle തുടർച്ച തുടരുക', body: 'പുതിയ പഠന ദിവസം തുടങ്ങി.' },
	pt: (type, minutes) => type === 'deadline'
		? { title: 'A sua sequência WordCircle está à espera', body: `Restam ${minutes} minutos até à meia-noite para qualificar hoje.` }
		: { title: 'Continue a sua sequência WordCircle', body: 'Começou um novo dia de aprendizagem.' },
	ru: (type, minutes) => type === 'deadline'
		? { title: 'Ваша серия WordCircle ждёт', body: `До полуночи осталось ${minutes} минут, чтобы засчитать сегодняшний день.` }
		: { title: 'Продолжите серию WordCircle', body: 'Начался новый учебный день.' },
	uk: (type, minutes) => type === 'deadline'
		? { title: 'Ваша серія WordCircle чекає', body: `До опівночі залишилося ${minutes} хвилин, щоб зарахувати сьогодні.` }
		: { title: 'Продовжте серію WordCircle', body: 'Почався новий навчальний день.' }
};

/** @param {string} type @param {string} locale @param {number} minutesRemaining */
export function reminderNotification(type, locale, minutesRemaining) {
	return (NOTIFICATIONS[normalizeReminderLocale(locale)] ?? NOTIFICATIONS.en)(type, minutesRemaining);
}
