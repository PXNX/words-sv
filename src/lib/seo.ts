// Per-route page metadata. Shared by the layout (document title during client navigation)
// and scripts/og.ts (static <head> tags and Open Graph images written after the build).

export const SITE_NAME = 'WordCircle';
export const DEFAULT_SITE_URL = 'https://words-sv.vercel.app';

export type PageMeta = {
  /** Page title without the site suffix. */
  title: string;
  /** Meta/OG description. */
  description: string;
  /** Small uppercase label on the OG image. */
  kicker: string;
  /** material-symbols icon name drawn on the OG image; null draws the brand mark. */
  icon: string | null;
  /** Slug of the OG image to reuse instead of generating one for this route. */
  image?: string;
};

const HOME: PageMeta = {
  title: 'Dein Worttraining',
  description: 'WordCircle – zweisprachiges Worttraining mit Wortkreis, Wordle, Hangman, Vokabelquiz und Grammatikübungen.',
  kicker: 'Spiel wählen',
  icon: null
};

export const pages: Record<string, PageMeta> = {
  '/': HOME,
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
  '/wordle': {
    title: 'Wordle',
    description: 'Finde das gesuchte Wort mit fünf Buchstaben.',
    kicker: 'Wortspiel',
    icon: 'spellcheck-rounded'
  },
  '/hangman': {
    title: 'Hangman',
    description: 'Errate das versteckte Wort Buchstabe für Buchstabe.',
    kicker: 'Wortspiel',
    icon: 'extension-rounded'
  },
  '/vocab': {
    title: 'Word Quiz',
    description: 'Wiederhole Wörter mit Ton und schnellen Auswahlfragen.',
    kicker: 'Vokabeln',
    icon: 'quiz-rounded'
  },
  '/placement': {
    title: 'Einstufungstest',
    description: 'Finde in drei Minuten heraus, welches Niveau zu dir passt.',
    kicker: 'Niveau',
    icon: 'fact-check-rounded'
  },
  '/store': {
    title: 'Laden',
    description: 'Gestalte deine Figur und unterstütze WordCircle mit Telegram Stars.',
    kicker: 'Figur',
    icon: 'storefront-rounded'
  },
  '/dictionary': {
    title: 'Wörterbuch',
    description: 'Schlag jedes Wort deiner Lernsprache nach, mit Formen und Zusammensetzungen – auch offline.',
    kicker: 'Nachschlagen',
    icon: 'menu-book-rounded'
  },
  '/changelog': {
    title: 'Was ist neu',
    description: 'Alle Versionen von WordCircle mit ihren Neuerungen und Korrekturen.',
    kicker: 'Versionen',
    icon: 'update-rounded'
  },
  '/sentence': {
    title: 'Kurzer Satz',
    description: 'Schreibe ein oder zwei deutsche Sätze zu einem Thema und lass sie bewerten.',
    kicker: 'Schreiben',
    icon: 'ink-pen-rounded'
  },
  '/sentence/full': {
    title: 'Ganzer Text',
    description: 'Schreibe einen ganzen deutschen Text zu einem Thema und lass ihn bewerten.',
    kicker: 'Schreiben',
    icon: 'article-rounded'
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
  '/stories': {
    title: 'Geschichten',
    description: 'Lies eine kurze Geschichte und rede mit.',
    kicker: 'Lesen',
    icon: 'auto-stories-rounded'
  },
  '/reading': {
    title: 'Lesen',
    description: 'Lies Geschichten und Lesetexte als zusammenhängenden Text.',
    kicker: 'Lesen',
    icon: 'menu-book-rounded'
  },
  '/listen': {
    title: 'Geschichten hören',
    description: 'Höre kurze Geschichten mit natürlichen Stimmen und steuere die Wiedergabe.',
    kicker: 'Hören',
    icon: 'headphones-rounded'
  },
  '/conversation': {
    title: 'Gespräch',
    description: 'Plaudere laut mit Figuren aus den Geschichten – komplett auf deinem Gerät – und übe Wörter deines Levels.',
    kicker: 'Geschichten',
    icon: 'forum-rounded'
  },
  '/repeat': {
    title: 'Wiederholen',
    description: 'Alle fälligen Wörter aus Vokabeln, Grammatik, Lesen und Aussprache in einer gemischten Wiederholung.',
    kicker: 'Wiederholung',
    icon: 'replay-rounded'
  },
  '/impressum': {
    title: 'Impressum',
    description: 'Anbieterkennzeichnung von WordCircle nach § 5 DDG.',
    kicker: 'Rechtliches',
    icon: 'gavel-rounded'
  },
  '/datenschutz': {
    title: 'Datenschutz',
    description: 'Welche Daten WordCircle, der Telegram-Bot und die Mini-App verarbeiten und welche Rechte du hast.',
    kicker: 'Rechtliches',
    icon: 'shield-person-rounded'
  },
  '/bedingungen': {
    title: 'Nutzungs- und Spendenbedingungen',
    description: 'Bedingungen für WordCircle und freiwillige Spenden mit Telegram Stars – ohne Rückerstattung.',
    kicker: 'Rechtliches',
    icon: 'description-rounded'
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

export function pageMeta(pathname: string): PageMeta {
  const path = pathname.replace(/\/+$/, '') || '/';
  return pages[path] ?? HOME;
}

export function pageTitle(pathname: string): string {
  // A route always has page metadata; the fallback keeps a missing entry from crashing.
  const path = pathname.replace(/\/+$/, '') || '/';
  const home = pageMeta('/');
  const current = pageMeta(path);
  return path === '/' ? `${SITE_NAME} – ${home.title}` : `${current.title} · ${SITE_NAME}`;
}

export function imageSlug(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  return pages[path]?.image ?? (path === '/' ? 'home' : path.slice(1).replaceAll('/', '-'));
}
