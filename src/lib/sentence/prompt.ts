/**
 * Prompts for the two composition modes:
 *
 * - **Short sentence** — one or two sentences on a simple topic.
 * - **Full text** — a whole paragraph (or several) on a richer topic, with a
 *   reference text the learner can reveal as help.
 *
 * The grader in `grading.ts` uses the mode to pick its length and structure rules.
 */
export type SentencePrompt = {
  id: string;
  topic: string;
  hint?: string;
};

export type FullTextPrompt = {
  id: string;
  topic: string;
  /** A model answer the learner can reveal as a hint; never graded against word-for-word. */
  reference: string;
  hint?: string;
  /** Suggested number of words, used for the writing-tools progress bar. */
  targetWords: number;
};

const SHORT_PROMPTS: SentencePrompt[] = [
  {
    id: 'daily-routine',
    topic: 'Beschreibe deinen typischen Morgen.',
    hint: 'Nutze Zeitangaben (um 7 Uhr, dann, danach) und reflexive Verben (sich anziehen, sich waschen).'
  },
  {
    id: 'weekend-plans',
    topic: 'Was hast du am Wochenende vor?',
    hint: 'Zukunft mit werden oder Präsens (Ich werde … / Ich gehe …).'
  },
  {
    id: 'favorite-food',
    topic: 'Beschreibe dein Lieblingsessen.',
    hint: 'Adjektive mit richtiger Endung (lecker, scharf, süß) und Modalverben (ich mag, ich esse gern).'
  },
  {
    id: 'childhood-memory',
    topic: 'Erzähle eine kurze Erinnerung aus deiner Kindheit.',
    hint: 'Vergangenheit (Präteritum oder Perfekt): war, hatte, spielte, ging.'
  },
  {
    id: 'dream-job',
    topic: 'Was wäre dein Traumberuf und warum?',
    hint: 'Konjunktiv II (würde, könnte, möchte) und Nebensätze mit weil.'
  },
  {
    id: 'recent-trip',
    topic: 'Beschreibe eine Reise, die du kürzlich gemacht hast.',
    hint: 'Perfekt mit sein/haben, Ortspräpositionen (nach, in, nach Hause).'
  },
  {
    id: 'learning-german',
    topic: 'Warum lernst du Deutsch?',
    hint: 'Nutze weil, um … zu, Infinitivsätze (um Deutsch zu lernen).'
  },
  {
    id: 'apartment-house',
    topic: 'Beschreibe deine Wohnung oder dein Haus.',
    hint: 'Akkusativ-/Dativpräpositionen (in, auf, unter, neben), Möbelwortschatz.'
  },
  {
    id: 'shopping-dialog',
    topic: 'Schreibe einen kurzen Dialog in einer Bäckerei.',
    hint: 'Höfliche Formen (ich hätte gern, könnten Sie), Zahlen, Artikel.'
  },
  {
    id: 'weather-today',
    topic: 'Beschreibe das heutige Wetter und wie du dich dabei fühlst.',
    hint: 'Es ist + Adjektiv, es gibt + Nomen, mir ist kalt/warm.'
  }
];

const FULL_PROMPTS: FullTextPrompt[] = [
  {
    id: 'letter-to-a-friend',
    topic: 'Schreibe den Anfang eines Briefes an eine Freundin oder einen Freund.',
    reference:
      'Liebe Anna, wie geht es dir? Ich schreibe dir, weil ich dir von meiner neuen Wohnung erzählen möchte. Sie ist klein, aber sehr gemütlich, und ich fühle mich schon richtig zu Hause. Letzte Woche habe ich endlich die Küche eingerichtet. Schreib mir bald zurück! Viele Grüße, Tom.',
    hint: 'Anrede, persönliche Fragen, Perfekt für Erlebtes, Grußformel.',
    targetWords: 70
  },
  {
    id: 'describe-your-city',
    topic: 'Beschreibe ein Viertel deiner Stadt und seinen Charakter.',
    reference:
      'In meinem Viertel leben viele ältere Menschen, die jeden Tag zusammen Kaffee trinken. An der Ecke steht ein kleines Café, in dem es leckere Kuchen gibt. Das Wohngebiet ist sehr ruhig, aber die Hauptstraße ist manchmal laut. Ich mag diese Mischung aus Ruhe und Leben.',
    hint: 'Ortspräpositionen mit Dativ, Relativsätze, Adjektive für die Beschreibung.',
    targetWords: 65
  },
  {
    id: 'first-night-new-home',
    topic: 'Erzähle von der ersten Nacht in einem neuen Zuhause.',
    reference:
      'Am ersten Abend trat ich in das neue Haus ein. Draußen war es schon dunkel, nur die Straßenlaterne brannte noch. Ich kannte hier niemanden und war ein bisschen nervös. Doch als ich in die Küche ging und das Licht anmachte, dachte ich: Jetzt ist das mein Zuhause.',
    hint: 'Vergangenheitsformen, lokale Verben, Gefühle beschreiben.',
    targetWords: 60
  },
  {
    id: 'opinion-technology',
    topic: 'Sag deine Meinung zu einem technischen Thema und begründe sie.',
    reference:
      'Ich finde nicht, dass Technologie alles besser macht. Zum Beispiel können Computerspiele Kindern schaden, wenn sie zu viel spielen. Für die Arbeit brauche ich außerdem keine App, die ständig mein Handy kontrolliert. Manchmal glaube ich, dass wir zu viel von der Technik erwarten.',
    hint: 'Meinung mit finden/glauben, Argumente dafür und dagegen, Nebensätze.',
    targetWords: 60
  }
];

/** Stable per-day hash so the same prompt stays for the whole day. */
function dayHash(offset = 0): number {
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < today.length; i += 1) {
    hash = (hash * 31 + today.charCodeAt(i) + offset) % 2147483647;
  }
  return Math.abs(hash);
}

/** Index into the short prompt list for today. */
export function todaysShortIndex(): number {
  return dayHash(1) % SHORT_PROMPTS.length;
}

/** Index into the full-text prompt list for today. */
export function todaysFullIndex(): number {
  return dayHash(2) % FULL_PROMPTS.length;
}

export function shortPromptForToday(): SentencePrompt {
  return SHORT_PROMPTS[todaysShortIndex()]!;
}

export function fullPromptForToday(): FullTextPrompt {
  return FULL_PROMPTS[todaysFullIndex()]!;
}

/** All prompts, exposed for randomisation or tests. */
export { SHORT_PROMPTS, FULL_PROMPTS };
