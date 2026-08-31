import type { VocabularyGender } from '$lib/data/vocabulary';
import { articleTable, capitalize, pickArticleKind, pickCase, uniqueEndingsAcrossGenders, type ArticleKind, type GrammarCase, type GrammarPrompt } from './cases';

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
const INVARIABLE_ADJECTIVES = new Set(['lila', 'rosa', 'orange', 'beige', 'prima', 'super', 'klasse', 'teuer']);
const STEM_OVERRIDES: Record<string, string> = { hoch: 'hoh' };

export function isEligibleAdjective(word: string): boolean {
  const lower = word.toLocaleLowerCase();
  if (INVARIABLE_ADJECTIVES.has(lower)) return false;
  if (lower.endsWith('a')) return false;
  return true;
}

function stemOf(word: string): string {
  const lower = word.toLocaleLowerCase();
  if (STEM_OVERRIDES[lower]) return STEM_OVERRIDES[lower];
  if (lower.endsWith('el')) return lower.slice(0, -2) + 'l';
  return lower;
}

function inflect(adjective: string, ending: string): string {
  return `${stemOf(adjective)}${ending}`;
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
    { leadIn: 'Er spricht von ', tail: ' oft.' }
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
  const template = templatesByCase[grammarCase][Math.floor(random() * templatesByCase[grammarCase].length)];
  const before = template.leadIn === '' ? `${capitalize(article)} ` : `${template.leadIn}${article} `;
  const after = `${noun}${template.tail}`;
  const endings = uniqueEndingsAcrossGenders(endingsTable);
  const choices = shuffle(endings.map((ending) => inflect(adjective, ending)), random);
  return { before, after, correct: inflect(adjective, correctEnding), choices };
}
