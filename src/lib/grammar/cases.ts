import type { VocabularyGender } from '$lib/data/vocabulary';

export type GrammarCase = 'nominative' | 'accusative' | 'dative';
export type ArticleKind = 'definite' | 'indefinite';

export const GRAMMAR_CASES: GrammarCase[] = ['nominative', 'accusative', 'dative'];
const GENDERS: VocabularyGender[] = ['masculine', 'feminine', 'neuter'];

export const definiteArticlesByCase: Record<GrammarCase, Record<VocabularyGender, string>> = {
  nominative: { masculine: 'der', feminine: 'die', neuter: 'das' },
  accusative: { masculine: 'den', feminine: 'die', neuter: 'das' },
  dative: { masculine: 'dem', feminine: 'der', neuter: 'dem' }
};

export const indefiniteArticlesByCase: Record<GrammarCase, Record<VocabularyGender, string>> = {
  nominative: { masculine: 'ein', feminine: 'eine', neuter: 'ein' },
  accusative: { masculine: 'einen', feminine: 'eine', neuter: 'ein' },
  dative: { masculine: 'einem', feminine: 'einer', neuter: 'einem' }
};

export function articleTable(kind: ArticleKind) {
  return kind === 'definite' ? definiteArticlesByCase : indefiniteArticlesByCase;
}

export function capitalize(word: string) {
  return word.length > 0 ? word[0].toLocaleUpperCase() + word.slice(1) : word;
}

// Each template describes a full sentence built around the noun (already correctly
// cased); `before` is the sentence-initial lead-in (empty when the blank itself opens
// the sentence) and `after` is everything from the noun onward. The blank always
// stands for the case-appropriate article, so the verb in every template is chosen to
// genuinely require that case (e.g. `helfen`/`danken`/`gehören` all govern the dative).
type NounTemplate = (noun: string) => { before: string; after: string };

const templatesByCase: Record<GrammarCase, NounTemplate[]> = {
  nominative: [
    (noun) => ({ before: '', after: `${noun} ist wirklich schön.` }),
    (noun) => ({ before: '', after: `${noun} steht dort drüben.` }),
    (noun) => ({ before: 'Wo ist ', after: `${noun}?` }),
    (noun) => ({ before: '', after: `${noun} gehört mir.` }),
    (noun) => ({ before: 'Plötzlich war ', after: `${noun} verschwunden.` }),
    (noun) => ({ before: '', after: `${noun} macht mich glücklich.` })
  ],
  accusative: [
    (noun) => ({ before: 'Ich sehe ', after: `${noun}.` }),
    (noun) => ({ before: 'Wir brauchen ', after: `${noun} dringend.` }),
    (noun) => ({ before: 'Er kauft ', after: `${noun} morgen.` }),
    (noun) => ({ before: 'Sie sucht ', after: `${noun} schon lange.` }),
    (noun) => ({ before: 'Kannst du ', after: `${noun} bitte holen?` }),
    (noun) => ({ before: 'Ich habe ', after: `${noun} gestern verloren.` })
  ],
  dative: [
    (noun) => ({ before: 'Ich helfe ', after: `${noun} gern.` }),
    (noun) => ({ before: 'Das gehört ', after: `${noun}.` }),
    (noun) => ({ before: 'Er dankt ', after: `${noun} herzlich.` }),
    (noun) => ({ before: 'Mit ', after: `${noun} geht es leichter.` }),
    (noun) => ({ before: 'Von ', after: `${noun} habe ich schon gehört.` }),
    (noun) => ({ before: 'Wir folgen ', after: `${noun} langsam.` })
  ]
};

export type GrammarPrompt = { before: string; after: string; correct: string; choices: string[]; question?: string };

export function pickCase(random: () => number): GrammarCase {
  return GRAMMAR_CASES[Math.floor(random() * GRAMMAR_CASES.length)];
}

export function pickArticleKind(random: () => number): ArticleKind {
  return random() < 0.5 ? 'definite' : 'indefinite';
}

export function uniqueForms(kind: ArticleKind, gender: VocabularyGender): string[] {
  const table = articleTable(kind);
  return [...new Set(GRAMMAR_CASES.map((grammarCase) => table[grammarCase][gender]))];
}

export function uniqueEndingsAcrossGenders(endingsTable: Record<GrammarCase, Record<VocabularyGender, string>>): string[] {
  return [...new Set(GRAMMAR_CASES.flatMap((grammarCase) => GENDERS.map((gender) => endingsTable[grammarCase][gender])))];
}

export function buildNounCasePrompt(noun: string, gender: VocabularyGender, random: () => number, shuffle: <T>(values: T[], random: () => number) => T[]): GrammarPrompt {
  const grammarCase = pickCase(random);
  const articleKind = pickArticleKind(random);
  const correct = articleTable(articleKind)[grammarCase][gender];
  const choices = uniqueForms(articleKind, gender);
  const templates = templatesByCase[grammarCase];
  const { before, after } = templates[Math.floor(random() * templates.length)](noun);
  return { before, after, correct, choices: shuffle(choices, random) };
}

/** Ask for several properties at once instead of filling a sentence gap. */
export function buildNounPropertyPrompt(noun: string, gender: VocabularyGender, random: () => number, shuffle: <T>(values: T[], random: () => number) => T[]): GrammarPrompt {
  const grammarCase = pickCase(random);
  const labels: Record<GrammarCase, string> = { nominative: 'Nominativ', accusative: 'Akkusativ', dative: 'Dativ' };
  const genders: Record<VocabularyGender, string> = { masculine: 'Maskulinum', feminine: 'Femininum', neuter: 'Neutrum' };
  const correct = `${labels[grammarCase]} · ${genders[gender]} · Singular`;
  const choices = shuffle([
    correct,
    `${labels[grammarCase === 'nominative' ? 'accusative' : 'nominative']} · ${genders[gender]} · Singular`,
    `${labels[grammarCase]} · ${genders[gender === 'masculine' ? 'feminine' : 'masculine']} · Singular`,
    `${labels[grammarCase]} · ${genders[gender]} · Plural`
  ], random);
  return { before: '', after: noun, correct, choices, question: 'Bestimme Kasus, Genus und Numerus.' };
}
