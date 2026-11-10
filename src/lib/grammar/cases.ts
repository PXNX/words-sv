import type { VocabularyGender } from '#lib/data/vocabulary.js';
import { featureKey, type FeatureKey } from './taxonomy.js';

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
  return word.length > 0 ? word[0]!.toLocaleUpperCase() + word.slice(1) : word;
}

// Weak masculine nouns (n-Deklination) take -n/-en in every case but the nominative singular:
// "der Junge", but "den Jungen", "dem Jungen". Listed by their last part, so compounds such as
// "Stammkunde" or "Familienname" follow their head noun. A plain word list, not a suffix rule:
// "-ent" and "-at" also end "Moment", "Monat" or "Salat", which decline normally.
const WEAK_MASCULINE_OBLIQUE: Record<string, string> = {
  affe: 'affen', architekt: 'architekten', assistent: 'assistenten', automat: 'automaten', bär: 'bären', bauer: 'bauern',
  biologe: 'biologen', bote: 'boten', buchstabe: 'buchstaben', christ: 'christen', däne: 'dänen', demonstrant: 'demonstranten',
  dozent: 'dozenten', elefant: 'elefanten', erbe: 'erben', experte: 'experten', fotograf: 'fotografen', franzose: 'franzosen',
  friede: 'frieden', gedanke: 'gedanken', glaube: 'glauben', graf: 'grafen', grieche: 'griechen', hase: 'hasen', held: 'helden',
  herr: 'herrn', journalist: 'journalisten', junge: 'jungen', kandidat: 'kandidaten', kollege: 'kollegen', komet: 'kometen',
  kunde: 'kunden', laie: 'laien', linguist: 'linguisten', löwe: 'löwen', mensch: 'menschen', nachbar: 'nachbarn', name: 'namen',
  neffe: 'neffen', patient: 'patienten', pilot: 'piloten', planet: 'planeten', pole: 'polen', polizist: 'polizisten',
  praktikant: 'praktikanten', präsident: 'präsidenten', prinz: 'prinzen', psychologe: 'psychologen', rabe: 'raben', riese: 'riesen',
  russe: 'russen', schwede: 'schweden', soldat: 'soldaten', student: 'studenten', tourist: 'touristen', türke: 'türken',
  wille: 'willen', zeuge: 'zeugen'
};

// Nouns made from adjectives decline like adjectives ("der Bekannte", but "ein Bekannter"), so
// a fixed noun form can't follow an indefinite article; the drills leave them out.
const ADJECTIVAL_NOUNS = new Set([
  'angestellte', 'arbeitslose', 'beamte', 'bekannte', 'deutsche', 'erwachsene', 'fremde', 'jugendliche', 'kranke', 'reisende',
  'verlobte', 'verwandte', 'vorgesetzte', 'vorsitzende', 'abgeordnete', 'alte', 'tote', 'überlebende'
]);

function weakHead(lower: string): string | undefined {
  return Object.keys(WEAK_MASCULINE_OBLIQUE).find((head) => lower === head || (lower.endsWith(head) && lower.length > head.length + 2));
}

/** Whether the noun keeps one fixed form after der/ein in the singular, so the drills can use it. */
export function isDeclinableNoun(noun: string): boolean {
  return !ADJECTIVAL_NOUNS.has(noun.toLocaleLowerCase());
}

/** The singular noun as it stands in a case: "Junge" becomes "Jungen" outside the nominative. */
export function declineNoun(noun: string, gender: VocabularyGender, grammarCase: GrammarCase): string {
  if (gender !== 'masculine' || grammarCase === 'nominative') return noun;
  const lower = noun.toLocaleLowerCase();
  const head = weakHead(lower);
  if (!head) return noun;
  // Keep the compound's own first letters (and their case), swap in the head's oblique form.
  const start = noun.length - head.length;
  return noun.slice(0, start + 1) + WEAK_MASCULINE_OBLIQUE[head]!.slice(1);
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

// `features` names the grammar features a German prompt tests, so a wrong answer can be logged
// against them (progress/events.ts, featureErrors).
export type GrammarPrompt = { before: string; after: string; correct: string; choices: string[]; question?: string; highlight?: string | undefined; features?: FeatureKey[] };

const CASE_FEATURE = { nominative: 'nominativ', accusative: 'akkusativ', dative: 'dativ' } as const satisfies Record<GrammarCase, string>;
const GENDER_FEATURE = { masculine: 'maskulin', feminine: 'feminin', neuter: 'neutrum' } as const satisfies Record<VocabularyGender, string>;
export const caseFeature = (grammarCase: GrammarCase): FeatureKey => featureKey('de', 'noun', 'case', CASE_FEATURE[grammarCase]);
export const genderFeature = (gender: VocabularyGender): FeatureKey => featureKey('de', 'noun', 'gender', GENDER_FEATURE[gender]);

export function pickCase(random: () => number): GrammarCase {
  return GRAMMAR_CASES[Math.floor(random() * GRAMMAR_CASES.length)]!;
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
  const { before, after } = templates[Math.floor(random() * templates.length)]!(declineNoun(noun, gender, grammarCase));
  return { before, after, correct, choices: shuffle(choices, random), features: [caseFeature(grammarCase), genderFeature(gender)] };
}

/** Ask for several properties at once instead of filling a sentence gap. */
export function buildNounPropertyPrompt(noun: string, gender: VocabularyGender, random: () => number, shuffle: <T>(values: T[], random: () => number) => T[]): GrammarPrompt {
  const grammarCase = pickCase(random);
  const article = definiteArticlesByCase[grammarCase][gender];
  const templates = templatesByCase[grammarCase];
  const declined = declineNoun(noun, gender, grammarCase);
  const sentence = templates[Math.floor(random() * templates.length)]!(declined);
  const before = sentence.before.length === 0 ? `${capitalize(article)} ` : `${sentence.before}${article} `;
  const labels: Record<GrammarCase, string> = { nominative: 'Nominativ', accusative: 'Akkusativ', dative: 'Dativ' };
  const genders: Record<VocabularyGender, string> = { masculine: 'Maskulinum', feminine: 'Femininum', neuter: 'Neutrum' };
  const correct = `${labels[grammarCase]} · ${genders[gender]} · Singular`;
  const choices = shuffle([
    correct,
    `${labels[grammarCase === 'nominative' ? 'accusative' : 'nominative']} · ${genders[gender]} · Singular`,
    `${labels[grammarCase]} · ${genders[gender === 'masculine' ? 'feminine' : 'masculine']} · Singular`,
    `${labels[grammarCase]} · ${genders[gender]} · Plural`
  ], random);
  const features = [caseFeature(grammarCase), genderFeature(gender), featureKey('de', 'noun', 'number', 'singular')];
  return random() < 0.5
    ? { before: `${capitalize(article)} `, after: declined, correct, choices, question: 'Bestimme Kasus, Genus und Numerus.', features }
    : { before, after: sentence.after, correct, choices, question: 'Bestimme Kasus, Genus und Numerus.', highlight: declined, features };
}
