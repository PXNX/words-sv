// Per-route page metadata. Shared by the layout (document title during client navigation)
// and scripts/og.mjs (static <head> tags and Open Graph images written after the build).

export const SITE_NAME = 'WordCircle';
export const DEFAULT_SITE_URL = 'https://words-sv.vercel.app';

/**
 * @typedef {object} PageMeta
 * @property {string} title Page title without the site suffix.
 * @property {string} description Meta/OG description.
 * @property {string} kicker Small uppercase label on the OG image.
 * @property {string | null} icon material-symbols icon name drawn on the OG image; null draws the brand mark.
 * @property {string} [image] Slug of the OG image to reuse instead of generating one for this route.
 */

/** @type {Record<string, PageMeta>} */
export const pages = {
	'/': {
		title: 'Dein Worttraining',
		description: 'WordCircle – zweisprachiges Worttraining mit Wortkreis, Wordle, Hangman, Vokabelquiz und Grammatikübungen.',
		kicker: 'Spiel wählen',
		icon: null
	},
	'/circle': {
		title: 'Circle',
		description: 'Ziehe Buchstaben im Wortkreis zu Wörtern und löse das verbundene Kreuzworträtsel.',
		kicker: 'Wortspiel',
		icon: 'crossword-rounded'
	},
	'/circle/definitions': {
		title: 'Kreuzwort',
		description: 'Das Kreuzworträtsel mit Definitionen: Tippe auf ein Feld, um die Bedeutung des Wortes zu sehen.',
		kicker: 'Wortspiel',
		icon: 'fact-check-rounded'
	},
	'/circle/tutorial': {
		title: 'Circle – Tutorial',
		description: 'Lerne an einem Übungsrätsel, wie du im Wortkreis Buchstaben zu Wörtern verbindest.',
		kicker: 'Tutorial',
		icon: 'crossword-rounded',
		image: 'circle'
	},
	'/wordle': {
		title: 'Wordle',
		description: 'Finde das gesuchte Wort mit fünf Buchstaben.',
		kicker: 'Wortspiel',
		icon: 'spellcheck-rounded'
	},
	'/wordle/tutorial': {
		title: 'Wordle – Tutorial',
		description: 'So funktioniert Wordle: Farben zeigen dir, welche Buchstaben richtig sind und wo sie hingehören.',
		kicker: 'Tutorial',
		icon: 'spellcheck-rounded',
		image: 'wordle'
	},
	'/hangman': {
		title: 'Hangman',
		description: 'Errate das versteckte Wort Buchstabe für Buchstabe.',
		kicker: 'Wortspiel',
		icon: 'extension-rounded'
	},
	'/hangman/tutorial': {
		title: 'Hangman – Tutorial',
		description: 'So funktioniert Hangman: Rate Buchstaben, bevor dir die Versuche ausgehen.',
		kicker: 'Tutorial',
		icon: 'extension-rounded',
		image: 'hangman'
	},
	'/vocab': {
		title: 'Word Quiz',
		description: 'Wiederhole Wörter mit Ton und schnellen Auswahlfragen.',
		kicker: 'Vokabeln',
		icon: 'quiz-rounded'
	},
	'/pronunciation': {
		title: 'Aussprache',
		description: 'Höre Aufnahmen und übe die Aussprache neuer Wörter.',
		kicker: 'Vokabeln',
		icon: 'mic-rounded'
	},
	'/alltag': {
		title: 'Emoji',
		description: 'Präpositionen, Zahlen und Farben für den Alltag.',
		kicker: 'Vokabeln',
		icon: 'sentiment-satisfied-rounded'
	},
	'/grammar': {
		title: 'Grammatik',
		description: 'Lücken füllen, Formen bestimmen, Sätze bauen und falsche Freunde erkennen.',
		kicker: 'Grammatik',
		icon: 'edit-note-rounded'
	},
	'/story': {
		title: 'Geschichten',
		description: 'Lies eine kurze Geschichte und rede mit.',
		kicker: 'Lesen',
		icon: 'auto-stories-rounded'
	},
	'/progress': {
		title: 'Dein Fortschritt',
		description: 'Deine tägliche Serie und dein Lernfortschritt auf einen Blick.',
		kicker: 'Fortschritt',
		icon: 'local-fire-department-rounded'
	},
	'/settings': {
		title: 'Einstellungen',
		description: 'Lernsprache, Oberflächensprache, Niveau und Darstellung anpassen.',
		kicker: 'WordCircle',
		icon: 'settings-rounded'
	}
};

/** @param {string} pathname */
export function pageMeta(pathname) {
	const path = pathname.replace(/\/+$/, '') || '/';
	return pages[path] ?? pages['/'];
}

/** @param {string} pathname */
export function pageTitle(pathname) {
	const path = pathname.replace(/\/+$/, '') || '/';
	return path === '/' ? `${SITE_NAME} – ${pages['/'].title}` : `${pageMeta(path).title} · ${SITE_NAME}`;
}

/** @param {string} pathname */
export function imageSlug(pathname) {
	const path = pathname.replace(/\/+$/, '') || '/';
	return pages[path]?.image ?? (path === '/' ? 'home' : path.slice(1).replaceAll('/', '-'));
}
