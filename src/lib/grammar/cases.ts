import { nounClass, type NounClass } from './nounClasses.js';
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

// One set of sentences per kind of noun (nounClasses.ts): people act and are helped, things are
// bought and lost, and every other noun (a percentage, an appointment, an idea) gets sentences
// that are true of any word.
const templatesByClass: Record<NounClass, Record<GrammarCase, NounTemplate[]>> = {
  person: {
    nominative: [
      (noun) => ({ before: '', after: `${noun} wohnt nebenan.` }),
      (noun) => ({ before: '', after: `${noun} kommt heute später.` }),
      (noun) => ({ before: 'Wo ist ', after: `${noun}?` }),
      (noun) => ({ before: 'Plötzlich stand ', after: `${noun} vor der Tür.` }),
      (noun) => ({ before: '', after: `${noun} arbeitet in Berlin.` }),
      (noun) => ({ before: '', after: `${noun} lacht gern.` })
    ],
    accusative: [
      (noun) => ({ before: 'Ich sehe ', after: `${noun} jeden Tag.` }),
      (noun) => ({ before: 'Wir besuchen ', after: `${noun} morgen.` }),
      (noun) => ({ before: 'Kennst du ', after: `${noun} schon?` }),
      (noun) => ({ before: 'Sie sucht ', after: `${noun} schon lange.` }),
      (noun) => ({ before: 'Kannst du ', after: `${noun} bitte anrufen?` }),
      (noun) => ({ before: 'Ich habe ', after: `${noun} gestern getroffen.` })
    ],
    dative: [
      (noun) => ({ before: 'Ich helfe ', after: `${noun} gern.` }),
      (noun) => ({ before: 'Das gehört ', after: `${noun}.` }),
      (noun) => ({ before: 'Er dankt ', after: `${noun} herzlich.` }),
      (noun) => ({ before: 'Wir sprechen mit ', after: `${noun}.` }),
      (noun) => ({ before: 'Ich schreibe ', after: `${noun} eine Nachricht.` }),
      (noun) => ({ before: 'Wir folgen ', after: `${noun} langsam.` })
    ]
  },
  thing: {
    nominative: [
      (noun) => ({ before: '', after: `${noun} ist wirklich schön.` }),
      (noun) => ({ before: '', after: `${noun} ist ganz neu.` }),
      (noun) => ({ before: 'Wo ist ', after: `${noun}?` }),
      (noun) => ({ before: '', after: `${noun} gehört mir.` }),
      (noun) => ({ before: '', after: `${noun} gefällt mir sehr.` }),
      (noun) => ({ before: '', after: `${noun} war nicht teuer.` })
    ],
    accusative: [
      (noun) => ({ before: 'Ich sehe ', after: `${noun}.` }),
      (noun) => ({ before: 'Wir brauchen ', after: `${noun} dringend.` }),
      (noun) => ({ before: 'Er zeigt mir ', after: `${noun}.` }),
      (noun) => ({ before: 'Sie sucht ', after: `${noun} schon lange.` }),
      (noun) => ({ before: 'Ich finde ', after: `${noun} toll.` }),
      (noun) => ({ before: 'Wir fotografieren ', after: `${noun}.` })
    ],
    dative: [
      (noun) => ({ before: 'Ich bin mit ', after: `${noun} sehr zufrieden.` }),
      (noun) => ({ before: 'Wir träumen von ', after: `${noun}.` }),
      (noun) => ({ before: 'Was machst du mit ', after: `${noun}?` }),
      (noun) => ({ before: 'Er erzählt gern von ', after: `${noun}.` }),
      (noun) => ({ before: 'Wir stehen vor ', after: `${noun}.` }),
      (noun) => ({ before: 'Neben ', after: `${noun} ist noch Platz.` })
    ]
  },
  other: {
    nominative: [
      (noun) => ({ before: '', after: `${noun} ist heute unser Thema.` }),
      (noun) => ({ before: 'Das ist ', after: `${noun}.` }),
      (noun) => ({ before: 'Was bedeutet ', after: `${noun} für dich?` }),
      (noun) => ({ before: '', after: `${noun} ist mir wichtig.` })
    ],
    accusative: [
      (noun) => ({ before: 'Wir sprechen heute über ', after: `${noun}.` }),
      (noun) => ({ before: 'Ich denke oft an ', after: `${noun}.` }),
      (noun) => ({ before: 'Ich meine ', after: `${noun}.` }),
      (noun) => ({ before: 'Ich schreibe einen Text über ', after: `${noun}.` })
    ],
    dative: [
      (noun) => ({ before: 'Wir beginnen heute mit ', after: `${noun}.` }),
      (noun) => ({ before: 'Er fragt nach ', after: `${noun}.` }),
      (noun) => ({ before: 'Was machen wir mit ', after: `${noun}?` }),
      (noun) => ({ before: 'Sie erzählt von ', after: `${noun}.` })
    ]
  }
};
function templatesFor(noun: string, grammarCase: GrammarCase): NounTemplate[] {
  return templatesByClass[nounClass(noun)][grammarCase];
}

// `features` names the grammar features a German prompt tests, so a wrong answer can be logged
// against them (progress/events.ts, featureErrors).
/** Why a gap takes its case: the word or question that asks for it, shown after the answer. */
export type CaseReason = { cue: string; case: GrammarCase };
export type GrammarPrompt = { before: string; after: string; correct: string; choices: string[]; question?: string; highlight?: string | undefined; features?: FeatureKey[]; why?: CaseReason };

const CASE_QUESTION: Record<GrammarCase, string> = { nominative: 'Wer oder was?', accusative: 'Wen oder was?', dative: 'Wem?' };
// Verbs that take the dative and the prepositions used in the drills, by the form the sentences use.
const DATIVE_VERBS: Record<string, string> = { helfe: 'helfen', gehört: 'gehören', dankt: 'danken', folgen: 'folgen' };
const PREPOSITIONS = new Set(['mit', 'von', 'nach', 'vor', 'neben', 'über', 'an']);
// "Wir stehen vor dem Haus" answers "wo?", which is why these two take the dative here.
const PLACE_PREPOSITIONS = new Set(['vor', 'neben']);

/**
 * The reason for a gap's case, read from the words in front of it: a preposition ("mit"), a verb
 * that takes the dative ("helfen"), or else the question the case answers ("Wen oder was?").
 */
export function caseReason(before: string, grammarCase: GrammarCase): CaseReason {
  const words = before.trim().toLocaleLowerCase('de').split(/\s+/u).filter(Boolean);
  const last = words.at(-1) ?? '';
  if (PREPOSITIONS.has(last)) return { cue: PLACE_PREPOSITIONS.has(last) ? `Wo? ${last}` : last, case: grammarCase };
  if (grammarCase === 'dative') {
    const verb = words.map((word) => DATIVE_VERBS[word]).find(Boolean);
    if (verb) return { cue: verb, case: grammarCase };
  }
  return { cue: CASE_QUESTION[grammarCase], case: grammarCase };
}

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
  const templates = templatesFor(noun, grammarCase);
  const { before, after } = templates[Math.floor(random() * templates.length)]!(declineNoun(noun, gender, grammarCase));
  return { before, after, correct, choices: shuffle(choices, random), features: [caseFeature(grammarCase), genderFeature(gender)], why: caseReason(before, grammarCase) };
}

/** Ask for several properties at once instead of filling a sentence gap. */
export function buildNounPropertyPrompt(noun: string, gender: VocabularyGender, random: () => number, shuffle: <T>(values: T[], random: () => number) => T[]): GrammarPrompt {
  const grammarCase = pickCase(random);
  const article = definiteArticlesByCase[grammarCase][gender];
  const templates = templatesFor(noun, grammarCase);
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
