import type { VocabularyGender } from '#lib/data/vocabulary.js';
import { featureKey } from './taxonomy.js';
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

const templatesByCase: Record<GrammarCase, AdjectiveTemplate[]> = {
  nominative: [
    { leadIn: '', tail: ' ist wirklich schön.' },
    { leadIn: '', tail: ' steht im Garten.' },
    { leadIn: '', tail: ' gefällt mir sehr.' },
    { leadIn: 'Plötzlich stand ', tail: ' vor der Tür.' }
  ],
  accusative: [
    { leadIn: 'Ich kaufe ', tail: ' sofort.' },
    { leadIn: 'Er hat mir ', tail: ' gezeigt.' },
    { leadIn: 'Ich finde ', tail: ' wirklich toll.' },
    { leadIn: 'Wir suchen ', tail: ' schon lange.' }
  ],
  dative: [
    { leadIn: 'Ich helfe ', tail: ' gern.' },
    { leadIn: 'Das gehört ', tail: '.' },
    { leadIn: 'Mit ', tail: ' geht es leichter.' },
    { leadIn: 'Er spricht oft von ', tail: '.' }
  ]
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
  // Every grammar case has at least one template; callers pick a random one within its row.
  const template = templatesByCase[grammarCase]![Math.floor(random() * templatesByCase[grammarCase]!.length)]!;
  const before = template.leadIn === '' ? `${capitalize(article)} ` : `${template.leadIn}${article} `;
  const after = `${declineNoun(noun, gender, grammarCase)}${template.tail}`;
  const endings = uniqueEndingsAcrossGenders(endingsTable);
  const choices = shuffle(endings.map((ending) => inflectAdjective(adjective, ending)), random);
  // Weak endings after a definite article, mixed after an indefinite one.
  const features = [featureKey('de', 'adjective', 'declension', articleKind === 'definite' ? 'schwach' : 'gemischt'), caseFeature(grammarCase), genderFeature(gender)];
  return { before, after, correct: inflectAdjective(adjective, correctEnding), choices, features };
}
