/*
 * A mock test for one language level, the same for every exam: reading (meanings of the level's
 * words), listening (words only heard), language (articles and grammar gaps, German) and writing
 * (a short text scored with the level rubric, sentence/levelRubric.ts), and speaking where the
 * browser can transcribe speech (a spoken answer scored with the spoken rubric). No feedback during the
 * test; every section is scored with formula scoring and counts the same. Pure and seeded.
 */
import type { Level } from '#lib/domain/types.js';
import { scoreRubric, scoreSpokenRubric } from '#lib/sentence/levelRubric.js';
import { articleItem, grammarItem, listeningItem, meaningItem, scoreExamLevel, type ExamAnswer, type ExamEntry, type ExamItem } from './examItems.js';

export type MockSection = 'reading' | 'listening' | 'language' | 'writing' | 'speaking';

export const MOCK_SIZES = { reading: 10, listening: 5, language: 6 } as const;
export const MOCK_PASS = 0.6;
/** A section under this share fails the test even when the average passes, as in the real exams. */
export const MOCK_SECTION_MIN = 0.35;
export const MOCK_RESULTS_KEY = 'wordcircle-mock-tests-v1';

export interface WritingTask {
  id: string;
  /** The task in the interface languages; the learner writes in the language they learn. */
  de: string;
  en: string;
}

// One task per level, growing from a note to an argued text like the writing parts of the exams.
const WRITING_TASKS: Record<Level, WritingTask[]> = {
  a1: [
    { id: 'a1-intro', de: 'Stell dich vor: Name, Herkunft, Wohnort und ein Hobby.', en: 'Introduce yourself: name, where you are from, where you live and a hobby.' },
    { id: 'a1-note', de: 'Schreib einer Freundin eine Nachricht: Du kommst heute später. Warum? Wann kommst du?', en: 'Write a friend a message: you are coming later today. Why? When will you come?' }
  ],
  a2: [
    { id: 'a2-weekend', de: 'Erzähl in einer E-Mail von deinem letzten Wochenende: Was hast du gemacht, mit wem, wie war es?', en: 'Tell a friend in an email about your last weekend: what you did, with whom, how it was.' },
    { id: 'a2-invite', de: 'Lade Freunde zu deinem Geburtstag ein: wann, wo, was gibt es, was sollen sie mitbringen?', en: 'Invite friends to your birthday: when, where, what there is, what they should bring.' }
  ],
  b1: [
    { id: 'b1-opinion', de: 'Viele Menschen arbeiten von zu Hause. Schreib deine Meinung dazu mit Gründen und einem Beispiel.', en: 'Many people work from home. Give your opinion on it with reasons and an example.' },
    { id: 'b1-complaint', de: 'Deine Bestellung kam kaputt an. Schreib dem Shop: Was ist passiert, was erwartest du?', en: 'Your order arrived broken. Write to the shop: what happened and what you expect.' }
  ],
  b2: [
    { id: 'b2-cities', de: 'Sollten Autos aus den Innenstädten verbannt werden? Wäge Vor- und Nachteile ab und zieh ein Fazit.', en: 'Should cars be banned from city centres? Weigh up the pros and cons and come to a conclusion.' },
    { id: 'b2-letter', de: 'Schreib einen Leserbrief zu einem Artikel über Handyverbote an Schulen.', en: 'Write a letter to the editor about an article on phone bans at schools.' }
  ],
  c1: [
    { id: 'c1-ai', de: 'Erörtere, wie künstliche Intelligenz das Lernen von Sprachen verändert. Beziehe Gegenpositionen ein.', en: 'Discuss how artificial intelligence changes language learning. Take opposing views into account.' },
    { id: 'c1-report', de: 'Schreib einen Bericht für deine Stadt: Wie ließe sich das Ehrenamt unter jungen Menschen stärken?', en: 'Write a report for your town: how could volunteering among young people be strengthened?' }
  ],
  c2: [
    { id: 'c2-essay', de: 'Essay: „Wer eine Sprache spricht, denkt anders.“ Setz dich kritisch mit dieser These auseinander.', en: 'Essay: "Speaking a language makes you think differently." Examine this claim critically.' },
    { id: 'c2-review', de: 'Schreib eine Rezension eines Buchs oder Films, die Inhalt, Form und Wirkung bewertet.', en: 'Write a review of a book or film that assesses its content, form and effect.' }
  ]
};

// Speaking, like the oral parts of the exams: a monologue that grows from introducing yourself to a
// short talk on a question.
const SPEAKING_TASKS: Record<Level, WritingTask[]> = {
  a1: [{ id: 'a1-speak-intro', de: 'Stell dich vor: Wie heißt du, woher kommst du, was machst du gern?', en: 'Introduce yourself: your name, where you are from, what you like doing.' }],
  a2: [{ id: 'a2-speak-day', de: 'Erzähl von deinem gestrigen Tag: Was hast du gemacht?', en: 'Talk about yesterday: what did you do?' }],
  b1: [{ id: 'b1-speak-plan', de: 'Ein Freund besucht dich. Schlag ein Programm für das Wochenende vor und begründe es.', en: 'A friend is visiting. Suggest a plan for the weekend and give reasons.' }],
  b2: [{ id: 'b2-speak-opinion', de: 'Sollten Schulen Hausaufgaben abschaffen? Nimm Stellung mit Argumenten.', en: 'Should schools abolish homework? Take a position with arguments.' }],
  c1: [{ id: 'c1-speak-talk', de: 'Halte einen kurzen Vortrag: Welche Rolle spielt Mehrsprachigkeit in deinem Leben?', en: 'Give a short talk: what role does speaking several languages play in your life?' }],
  c2: [{ id: 'c2-speak-debate', de: 'Diskutiere: Macht Technik uns freier oder abhängiger? Wäge ab und zieh ein Fazit.', en: 'Discuss: does technology make us freer or more dependent? Weigh it up and conclude.' }]
};

export interface MockTest {
  level: Level;
  items: Record<Exclude<MockSection, 'writing' | 'speaking'>, ExamItem[]>;
  writing: WritingTask;
  speaking: WritingTask;
}

export interface MockResult {
  at: number;
  lang: string;
  level: Level;
  /** 0..1 per section that had questions. */
  sections: Partial<Record<MockSection, number>>;
  total: number;
  passed: boolean;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other]!, copy[index]!];
  }
  return copy;
}

/** Builds the test for a level from its word entries; no word is asked twice. */
export function buildMockTest(language: string, level: Level, entries: Readonly<Record<string, ExamEntry>>, random: () => number): MockTest {
  const words = shuffle(Object.keys(entries).filter((word) => entries[word]!.definition), random);
  const used = new Set<string>();
  const take = (count: number, make: (word: string) => ExamItem | null): ExamItem[] => {
    const out: ExamItem[] = [];
    for (const word of words) {
      if (out.length >= count) break;
      if (used.has(word)) continue;
      const item = make(word);
      if (!item) continue;
      used.add(word);
      out.push(item);
    }
    return out;
  };
  const reading = take(MOCK_SIZES.reading, (word) => meaningItem(word, entries, level, random));
  const listening = take(MOCK_SIZES.listening, (word) => listeningItem(word, entries, level, random));
  const language_: ExamItem[] = [];
  if (language === 'de') {
    if (level === 'a1' || level === 'a2') language_.push(...take(2, (word) => articleItem(word, entries[word]!, level, random)));
    for (let attempt = 0; language_.length < MOCK_SIZES.language && attempt < 20; attempt += 1) {
      const item = grammarItem(level, entries, random);
      if (item && !language_.some((existing) => existing.id === item.id)) language_.push(item);
    }
  }
  const tasks = WRITING_TASKS[level];
  const spoken = SPEAKING_TASKS[level];
  return { level, items: { reading, listening, language: language_ }, writing: tasks[Math.floor(random() * tasks.length)]!, speaking: spoken[Math.floor(random() * spoken.length)]! };
}

/** The sections a test has, in the order they are taken; speaking only where speech can be transcribed. */
export function mockSections(test: MockTest, options: { speaking?: boolean } = {}): MockSection[] {
  return [...(['reading', 'listening', 'language'] as const).filter((section) => test.items[section].length), 'writing', ...(options.speaking ? ['speaking' as const] : [])];
}

/** Scores the answers per section and the writing text; the result passes at 60 % with no section under 35 %. */
export function scoreMockTest(test: MockTest, answers: Partial<Record<MockSection, readonly ExamAnswer[]>>, writing: string, lang: string, at = Date.now(), spoken?: string): MockResult {
  const sections: MockResult['sections'] = {};
  for (const section of ['reading', 'listening', 'language'] as const) {
    if (!test.items[section].length) continue;
    const given = answers[section] ?? [];
    // Unanswered questions count as "I don't know".
    const all = test.items[section].map((item) => given.find((answer) => answer.item.id === item.id) ?? { item, chosen: null });
    sections[section] = Math.max(0, scoreExamLevel(all).score);
  }
  sections.writing = scoreRubric(writing, lang, test.level).total;
  if (spoken !== undefined) sections.speaking = scoreSpokenRubric(spoken, lang, test.level).total;
  const values = Object.values(sections);
  const total = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { at, lang, level: test.level, sections, total, passed: total >= MOCK_PASS && values.every((value) => value >= MOCK_SECTION_MIN) };
}

export function parseMockResults(raw: string | null): MockResult[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is MockResult => typeof entry === 'object' && entry !== null && typeof (entry as MockResult).at === 'number' && typeof (entry as MockResult).level === 'string' && typeof (entry as MockResult).total === 'number');
  } catch {
    return [];
  }
}

/** Adds a result, keeping the last 30. */
export function appendMockResult(results: readonly MockResult[], result: MockResult): MockResult[] {
  return [...results, result].slice(-30);
}

/** The best earlier result for the language and level, for "your best so far". */
export function bestMockResult(results: readonly MockResult[], lang: string, level: Level): MockResult | null {
  return results.filter((entry) => entry.lang === lang && entry.level === level).reduce<MockResult | null>((best, entry) => (!best || entry.total > best.total ? entry : best), null);
}
