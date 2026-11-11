import type { VocabularyGender } from '#lib/data/vocabulary.js';
import { featureKey } from './taxonomy.js';
import { adjectiveFits, nounClass, type NounClass } from './nounClasses.js';
import { articleTable, capitalize, caseFeature, declineNoun, genderFeature, pickArticleKind, pickCase, uniqueEndingsAcrossGenders, type ArticleKind, type GrammarCase, type GrammarPrompt } from './cases';

// Endings for an attributive adjective after a der-word (weak declension) and after
// an ein-word (mixed declension). Genitive is deliberately left out: it would also
// require inflecting the noun itself (Mannes, Autos, ...), which we can't derive
// reliably from the vocabulary data, so we only ever teach cases that leave the noun
// untouched.
const weakEndings: Record<GrammarCase, Record<VocabularyGender, string>> = {
  nominative: { masculine: 'e', feminine: 'e', neuter: 'e' },
  accusative: { masculine: 'en', feminine: 'e', neuter: 'e' },
  dative: { masculine: 'en', feminine: 'en', neuter: 'en' }
};
const mixedEndings: Record<GrammarCase, Record<VocabularyGender, string>> = {
  nominative: { masculine: 'er', feminine: 'e', neuter: 'es' },
  accusative: { masculine: 'en', feminine: 'e', neuter: 'es' },
  dative: { masculine: 'en', feminine: 'en', neuter: 'en' }
};

// Words whose attributive form doesn't follow the plain stem+ending pattern at all
// (loanwords that never inflect, or a small closed set of irregular stems).
const INVARIABLE_ADJECTIVES = new Set(['lila', 'rosa', 'orange', 'beige', 'prima', 'super', 'klasse']);
// Words tagged as adjectives that only stand after a verb ("Es ist schade", "Mir ist egal") or
// that are listed in an already inflected form ("neuen", "meisten"); neither can take an ending.
const NON_ATTRIBUTIVE = new Set(['allein', 'egal', 'einig', 'einverstanden', 'gleichen', 'kürzlich', 'leid', 'lieber', 'meisten', 'neuen', 'neues', 'nächsten', 'schade', 'schuld', 'viel', 'weh', 'wenig']);
const STEM_OVERRIDES: Record<string, string> = { hoch: 'hoh', parallel: 'parallel' };

export function isEligibleAdjective(word: string): boolean {
  const lower = word.toLocaleLowerCase();
  if (INVARIABLE_ADJECTIVES.has(lower) || NON_ATTRIBUTIVE.has(lower)) return false;
  if (lower.endsWith('a')) return false;
  return true;
}

/** The stem endings attach to: "dunkel" → "dunkl", "teuer" → "teur", "müde" → "müd", "hoch" → "hoh". */
export function adjectiveStem(word: string): string {
  const lower = word.toLocaleLowerCase();
  if (STEM_OVERRIDES[lower]) return STEM_OVERRIDES[lower];
  // An unstressed -el drops its e (dunkle, flexible), and so does -er after au/eu (saure, teure).
  if (lower.endsWith('el')) return lower.slice(0, -2) + 'l';
  if (/(au|eu)er$/u.test(lower)) return lower.slice(0, -2) + 'r';
  // A base form ending in -e (müde, leise) adds the ending to the stem without it: müden, not müdeen.
  if (lower.endsWith('e')) return lower.slice(0, -1);
  return lower;
}

/** The adjective with an ending, e.g. inflectAdjective("rot", "en") → "roten". */
export function inflectAdjective(adjective: string, ending: string): string {
  return `${adjectiveStem(adjective)}${ending}`;
}

type AdjectiveTemplate = { leadIn: string; tail: string };

// Sentences per kind of noun (nounClasses.ts), so "ein junger Lehrer" works somewhere and
// "ein neues Fahrrad" is bought, not helped.
const templatesByClass: Record<NounClass, Record<GrammarCase, AdjectiveTemplate[]>> = {
  person: {
    nominative: [
      { leadIn: '', tail: ' wohnt nebenan.' },
      { leadIn: '', tail: ' arbeitet hier.' },
      { leadIn: 'Plötzlich stand ', tail: ' vor der Tür.' },
      { leadIn: '', tail: ' kommt aus Hamburg.' }
    ],
    accusative: [
      { leadIn: 'Ich kenne ', tail: ' schon lange.' },
      { leadIn: 'Wir besuchen ', tail: ' morgen.' },
      { leadIn: 'Ich finde ', tail: ' wirklich toll.' },
      { leadIn: 'Er hat ', tail: ' gestern getroffen.' }
    ],
    dative: [
      { leadIn: 'Ich helfe ', tail: ' gern.' },
      { leadIn: 'Das gehört ', tail: '.' },
      { leadIn: 'Wir sprechen mit ', tail: '.' },
      { leadIn: 'Er erzählt oft von ', tail: '.' }
    ]
  },
  thing: {
    nominative: [
      { leadIn: '', tail: ' ist wirklich schön.' },
      { leadIn: '', tail: ' gefällt mir sehr.' },
      { leadIn: '', tail: ' war ein Geschenk.' },
      { leadIn: 'Dort steht ', tail: '.' }
    ],
    accusative: [
      { leadIn: 'Ich sehe ', tail: ' jeden Tag.' },
      { leadIn: 'Er hat mir ', tail: ' gezeigt.' },
      { leadIn: 'Ich finde ', tail: ' wirklich toll.' },
      { leadIn: 'Wir suchen ', tail: ' schon lange.' }
    ],
    dative: [
      { leadIn: 'Ich bin mit ', tail: ' sehr zufrieden.' },
      { leadIn: 'Wir träumen von ', tail: '.' },
      { leadIn: 'Er erzählt oft von ', tail: '.' },
      { leadIn: 'Wir stehen vor ', tail: '.' }
    ]
  },
  other: {
    nominative: [
      { leadIn: '', tail: ' ist heute unser Thema.' },
      { leadIn: 'Das ist ', tail: '.' }
    ],
    accusative: [
      { leadIn: 'Wir sprechen heute über ', tail: '.' },
      { leadIn: 'Ich denke oft an ', tail: '.' }
    ],
    dative: [
      { leadIn: 'Wir beginnen heute mit ', tail: '.' },
      { leadIn: 'Er fragt nach ', tail: '.' }
    ]
  }
};

export function buildAdjectivePrompt(
  adjective: string,
  noun: string,
  gender: VocabularyGender,
  random: () => number,
  shuffle: <T>(values: T[], random: () => number) => T[]
): GrammarPrompt {
  const grammarCase = pickCase(random);
  const articleKind: ArticleKind = pickArticleKind(random);
  const article = articleTable(articleKind)[grammarCase][gender];
  const endingsTable = articleKind === 'definite' ? weakEndings : mixedEndings;
  const correctEnding = endingsTable[grammarCase][gender];
  // An adjective that does not describe this kind of noun falls back to the neutral sentences.
  const kind = nounClass(noun);
  const templates = templatesByClass[adjectiveFits(adjective, kind) ? kind : 'other'][grammarCase];
  const template = templates[Math.floor(random() * templates.length)]!;
  const before = template.leadIn === '' ? `${capitalize(article)} ` : `${template.leadIn}${article} `;
  const after = `${declineNoun(noun, gender, grammarCase)}${template.tail}`;
  const endings = uniqueEndingsAcrossGenders(endingsTable);
  const choices = shuffle(endings.map((ending) => inflectAdjective(adjective, ending)), random);
  // Weak endings after a definite article, mixed after an indefinite one.
  const features = [featureKey('de', 'adjective', 'declension', articleKind === 'definite' ? 'schwach' : 'gemischt'), caseFeature(grammarCase), genderFeature(gender)];
  return { before, after, correct: inflectAdjective(adjective, correctEnding), choices, features };
}
