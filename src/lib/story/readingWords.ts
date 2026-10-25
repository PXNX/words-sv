import { wordDefinitions, wordMetadata, type Language, type VocabularyGender } from '#lib/data/vocabulary.js';
import { verbConjugations } from '#lib/grammar/verbs.js';
import { definiteArticlesByCase } from '#lib/grammar/cases.js';

// A word as the reading mode needs it: dictionary spelling, meaning, number and the grammar that
// helps a learner understand the sentence. `word` stays the uppercased singular dictionary form
// used by the vocabulary review store and the missed-word list, even when the tapped token is a
// plural or an inflected form.
export type ReadingGrammarCase = 'nominative' | 'genitive' | 'dative' | 'accusative';
export type ReadingNumber = 'singular' | 'plural';
export type ReadingWordCase = { grammarCase: ReadingGrammarCase; article: string; form: string };

export type ReadingWordInfo = {
  word: string;
  spelling: string;
  display: string;
  article: string;
  number: ReadingNumber;
  plural?: string;
  gender?: VocabularyGender;
  type: string;
  definition: string;
  cases: ReadingWordCase[];
  // The case the tapped word actually has in its sentence, when the surrounding words make it
  // clear enough to point at one row.
  currentCase?: ReadingGrammarCase;
};

export type ReadingToken = { text: string; word: boolean; start: number; end: number };
export type ReadingWordContext = { text: string; start: number; end: number };

const READING_ARTICLES: Record<ReadingGrammarCase, Record<VocabularyGender, string>> = {
  nominative: definiteArticlesByCase.nominative,
  genitive: { masculine: 'des', feminine: 'der', neuter: 'des' },
  dative: definiteArticlesByCase.dative,
  accusative: definiteArticlesByCase.accusative
};

// Words that only exist in the plural. Their definitions often describe the group instead of
// starting with "Plural", so the list is explicit.
const PLURAL_ONLY = new Set(['ELTERN', 'GESCHWISTER', 'LEUTE', 'MENSCHEN']);

// Weak and mixed nouns change more than the article: "der Kollege" -> "des Kollegen",
// "der Name" -> "des Namens". The vocabulary files store only the dictionary form, so the
// handful of forms a reading text actually uses live here.
type NounOverride = { genitive: string; oblique?: string; plural?: string };
const NOUN_OVERRIDES: Record<string, NounOverride> = {
  KOLLEGE: { genitive: 'Kollegen', oblique: 'Kollegen', plural: 'Kollegen' },
  MENSCH: { genitive: 'Menschen', oblique: 'Menschen', plural: 'Menschen' },
  JUNGE: { genitive: 'Jungen', oblique: 'Jungen', plural: 'Jungen' },
  NEFFE: { genitive: 'Neffen', oblique: 'Neffen', plural: 'Neffen' },
  AFFE: { genitive: 'Affen', oblique: 'Affen', plural: 'Affen' },
  BÄR: { genitive: 'Bären', oblique: 'Bären', plural: 'Bären' },
  STUDENT: { genitive: 'Studenten', oblique: 'Studenten', plural: 'Studenten' },
  POLIZIST: { genitive: 'Polizisten', oblique: 'Polizisten', plural: 'Polizisten' },
  TOURIST: { genitive: 'Touristen', oblique: 'Touristen', plural: 'Touristen' },
  JOURNALIST: { genitive: 'Journalisten', oblique: 'Journalisten', plural: 'Journalisten' },
  PRÄSIDENT: { genitive: 'Präsidenten', oblique: 'Präsidenten', plural: 'Präsidenten' },
  NACHBAR: { genitive: 'Nachbarn', oblique: 'Nachbarn', plural: 'Nachbarn' },
  HERR: { genitive: 'Herrn', oblique: 'Herrn', plural: 'Herren' },
  NAME: { genitive: 'Namens', oblique: 'Namen', plural: 'Namen' },
  HERZ: { genitive: 'Herzens', oblique: 'Herzen', plural: 'Herzen' },
  GEDANKE: { genitive: 'Gedankens', oblique: 'Gedanken', plural: 'Gedanken' },
  GLAUBE: { genitive: 'Glaubens', oblique: 'Glauben', plural: 'Glauben' },
  WILLE: { genitive: 'Willens', oblique: 'Willen', plural: 'Willen' },
  FRIEDE: { genitive: 'Friedens', oblique: 'Frieden', plural: 'Frieden' }
};

// Inflected weak/mixed forms that the suffix rules cannot reach, mapped back to the dictionary
// form. Used only for capitalised words so "glauben" stays a verb.
const NOUN_FORM_BASES: Record<string, string> = {
  KOLLEGEN: 'KOLLEGE',
  MENSCHEN: 'MENSCH',
  JUNGEN: 'JUNGE',
  NEFFEN: 'NEFFE',
  AFFEN: 'AFFE',
  BÄREN: 'BÄR',
  STUDENTEN: 'STUDENT',
  POLIZISTEN: 'POLIZIST',
  TOURISTEN: 'TOURIST',
  JOURNALISTEN: 'JOURNALIST',
  PRÄSIDENTEN: 'PRÄSIDENT',
  NACHBARN: 'NACHBAR',
  HERRN: 'HERR',
  HERREN: 'HERR',
  NAMEN: 'NAME',
  NAMENS: 'NAME',
  HERZEN: 'HERZ',
  HERZENS: 'HERZ',
  GEDANKEN: 'GEDANKE',
  GEDANKENS: 'GEDANKE',
  GLAUBEN: 'GLAUBE',
  GLAUBENS: 'GLAUBE',
  WILLEN: 'WILLE',
  WILLENS: 'WILLE',
  FRIEDEN: 'FRIEDE',
  FRIEDENS: 'FRIEDE'
};

// Determiners that force or strongly suggest a plural, and number words that do the same.
const PLURAL_DETERMINERS = new Set([
  'die', 'diese', 'jene', 'welche', 'alle', 'beide', 'einige', 'viele', 'manche', 'wenige',
  'keine', 'meine', 'deine', 'seine', 'ihre', 'unsere', 'eure', 'sämtliche', 'zahlreiche'
]);
const NUMBER_WORDS = new Set([
  'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf',
  'hundert', 'tausend', 'beide', 'einige', 'mehrere', 'viele', 'wenige', 'manche', 'alle'
]);

// Case sets for the words that stand in front of a noun. Ambiguous forms (die, das, ein ...) are
// resolved from the sentence afterwards.
const GENITIVE_DETERMINERS = new Set([
  'des', 'eines', 'keines', 'meines', 'deines', 'seines', 'ihres', 'unseres', 'eures',
  'dieses', 'jenes', 'welches', 'alles', 'manches', 'vieles', 'jedes', 'solches'
]);
const DATIVE_DETERMINERS = new Set([
  'dem', 'einem', 'keinem', 'meinem', 'deinem', 'seinem', 'ihrem', 'unserem', 'eurem',
  'diesem', 'jenem', 'welchem', 'allem', 'manchem', 'vielem', 'jedem', 'solchem',
  'einer', 'keiner', 'meiner', 'deiner', 'seiner', 'ihrer', 'unserer', 'eurer',
  'dieser', 'jener', 'welcher', 'aller', 'mancher', 'vieler', 'jeder', 'solcher',
  'beiden', 'einigen', 'mehreren', 'deren'
]);
const ACCUSATIVE_DETERMINERS = new Set([
  'den', 'einen', 'keinen', 'meinen', 'deinen', 'seinen', 'ihren', 'unseren', 'euren',
  'diesen', 'jenen', 'welchen', 'allen', 'manchen', 'vielen', 'jeden', 'solchen'
]);
const GENITIVE_PLURAL_DETERMINERS = new Set([
  'der', 'dieser', 'jener', 'welcher', 'aller', 'mancher', 'vieler', 'jeder', 'solcher',
  'meiner', 'deiner', 'seiner', 'ihrer', 'unserer', 'eurer', 'beider', 'einiger', 'mehrerer'
]);
const DATIVE_PLURAL_DETERMINERS = new Set([
  'den', 'diesen', 'jenen', 'welchen', 'allen', 'manchen', 'vielen', 'jeden', 'solchen',
  'meinen', 'deinen', 'seinen', 'ihren', 'unseren', 'euren', 'beiden', 'einigen', 'mehreren'
]);
const AMBIGUOUS_NOM_ACC = new Set([
  'die', 'das', 'ein', 'eine', 'kein', 'keine', 'mein', 'meine', 'dein', 'deine', 'sein',
  'seine', 'ihr', 'ihre', 'unser', 'unsere', 'euer', 'eure', 'diese', 'jene', 'welche',
  'alle', 'manche', 'viele', 'jede', 'solche', 'beide', 'einige', 'mehrere'
]);
const DETERMINER_WORDS = new Set([
  ...GENITIVE_DETERMINERS,
  ...DATIVE_DETERMINERS,
  ...ACCUSATIVE_DETERMINERS,
  ...AMBIGUOUS_NOM_ACC,
  'der'
]);

const FIXED_PREPOSITION_CASES: Record<string, ReadingGrammarCase> = {
  durch: 'accusative', für: 'accusative', gegen: 'accusative', ohne: 'accusative',
  um: 'accusative', bis: 'accusative',
  aus: 'dative', bei: 'dative', mit: 'dative', nach: 'dative', seit: 'dative',
  von: 'dative', zu: 'dative', gegenüber: 'dative', ab: 'dative',
  wegen: 'genitive', trotz: 'genitive', während: 'genitive', statt: 'genitive',
  anstatt: 'genitive', innerhalb: 'genitive', außerhalb: 'genitive',
  diesseits: 'genitive', jenseits: 'genitive'
};
const TWO_WAY_PREPOSITIONS = new Set(['an', 'auf', 'hinter', 'in', 'neben', 'über', 'unter', 'vor', 'zwischen']);

// Contractions carry the preposition and its article, which is exactly what the case needs.
const CONTRACTIONS: Record<string, { article: string; preposition: string }> = {
  im: { article: 'dem', preposition: 'in' },
  am: { article: 'dem', preposition: 'an' },
  beim: { article: 'dem', preposition: 'bei' },
  vom: { article: 'dem', preposition: 'von' },
  zum: { article: 'dem', preposition: 'zu' },
  zur: { article: 'der', preposition: 'zu' },
  ins: { article: 'das', preposition: 'in' },
  ans: { article: 'das', preposition: 'an' },
  aufs: { article: 'das', preposition: 'auf' },
  ums: { article: 'das', preposition: 'um' },
  fürs: { article: 'das', preposition: 'für' },
  durchs: { article: 'das', preposition: 'durch' },
  hinters: { article: 'das', preposition: 'hinter' },
  unters: { article: 'das', preposition: 'unter' },
  übers: { article: 'das', preposition: 'über' },
  vors: { article: 'das', preposition: 'vor' }
};

const PREDICATE_VERBS = new Set([
  'ist', 'sind', 'war', 'waren', 'bin', 'bist', 'seid', 'wird', 'werden', 'wurde', 'wurden',
  'bleibt', 'bleiben', 'scheint', 'scheinen', 'wirkt', 'wirken', 'heißt', 'heißen'
]);

/**
 * Splits a sentence into tappable words and the punctuation between them. Letters of any script
 * count as a word, so German, Cyrillic and the other learning languages all work the same way.
 * Offsets point back into the sentence so a tapped token can see the words around it.
 */
export function tokenizeReadingText(text: string): ReadingToken[] {
  const tokens: ReadingToken[] = [];
  let offset = 0;
  for (const part of text.split(/(\p{L}+)/u)) {
    if (!part) continue;
    tokens.push({ text: part, word: /^\p{L}/u.test(part), start: offset, end: offset + part.length });
    offset += part.length;
  }
  return tokens;
}

// Present-tense forms of the verbs the grammar module already knows, so "sieht", "nimmt" and
// "fährt" find their infinitive without a second conjugation table in the reading route.
const presentForms: Record<string, string> = Object.fromEntries(
  Object.entries(verbConjugations).flatMap(([infinitive, entry]) =>
    entry.forms.filter(Boolean).map((form) => [form.toLocaleUpperCase(), infinitive] as const)
  )
);

// Past and perfect forms that suffix rules cannot derive. Only common verbs; unknown forms simply
// stay plain text instead of opening a wrong entry.
const irregularForms: Record<string, string> = {
  WAR: 'SEIN', WAREN: 'SEIN', GEWESEN: 'SEIN',
  HATTE: 'HABEN', HATTEN: 'HABEN', GEHABT: 'HABEN',
  WURDE: 'WERDEN', WURDEN: 'WERDEN', GEWORDEN: 'WERDEN',
  GING: 'GEHEN', GINGEN: 'GEHEN', GEGANGEN: 'GEHEN',
  KAM: 'KOMMEN', KAMEN: 'KOMMEN', GEKOMMEN: 'KOMMEN',
  GAB: 'GEBEN', GABEN: 'GEBEN', GEGEBEN: 'GEBEN',
  NAHM: 'NEHMEN', NAHMEN: 'NEHMEN', GENOMMEN: 'NEHMEN',
  SAH: 'SEHEN', SAHEN: 'SEHEN', GESEHEN: 'SEHEN',
  LAS: 'LESEN', LASEN: 'LESEN', GELESEN: 'LESEN',
  SPRACH: 'SPRECHEN', SPRACHEN: 'SPRECHEN', GESPROCHEN: 'SPRECHEN',
  ASS: 'ESSEN', ASSEN: 'ESSEN', GEGESSEN: 'ESSEN',
  FUHR: 'FAHREN', FUHREN: 'FAHREN', GEFAHREN: 'FAHREN',
  SCHLIEF: 'SCHLAFEN', SCHLIEFEN: 'SCHLAFEN', GESCHLAFEN: 'SCHLAFEN',
  LIEF: 'LAUFEN', LIEFEN: 'LAUFEN', GELAUFEN: 'LAUFEN',
  FIEL: 'FALLEN', FIELEN: 'FALLEN', GEFALLEN: 'FALLEN',
  FING: 'FANGEN', FINGEN: 'FANGEN', GEFANGEN: 'FANGEN',
  HIELT: 'HALTEN', HIELTEN: 'HALTEN', GEHALTEN: 'HALTEN',
  LIESS: 'LASSEN', LIESSEN: 'LASSEN', GELASSEN: 'LASSEN',
  RIEF: 'RUFEN', RIEFEN: 'RUFEN', GERUFEN: 'RUFEN',
  STAND: 'STEHEN', STANDEN: 'STEHEN', GESTANDEN: 'STEHEN',
  SASS: 'SITZEN', SASSEN: 'SITZEN', GESESSEN: 'SITZEN',
  LAG: 'LIEGEN', LAGEN: 'LIEGEN', GELEGEN: 'LIEGEN',
  TRUG: 'TRAGEN', TRUGEN: 'TRAGEN', GETRAGEN: 'TRAGEN',
  DACHTE: 'DENKEN', DACHTEN: 'DENKEN', GEDACHT: 'DENKEN',
  BRACHTE: 'BRINGEN', BRACHTEN: 'BRINGEN', GEBRACHT: 'BRINGEN',
  WUSSTE: 'WISSEN', WUSSTEN: 'WISSEN', GEWUSST: 'WISSEN',
  KONNTE: 'KÖNNEN', KONNTEN: 'KÖNNEN', GEKONNT: 'KÖNNEN',
  MUSSTE: 'MÜSSEN', MUSSTEN: 'MÜSSEN', GEMUSST: 'MÜSSEN',
  DURFTE: 'DÜRFEN', DURFTEN: 'DÜRFEN', GEDURFT: 'DÜRFEN',
  SOLLTE: 'SOLLEN', SOLLTEN: 'SOLLEN', GESOLLT: 'SOLLEN',
  WOLLTE: 'WOLLEN', WOLLTEN: 'WOLLEN', GEWOLLT: 'WOLLEN',
  MOCHTE: 'MÖGEN', MOCHTEN: 'MÖGEN', GEMOCHT: 'MÖGEN',
  BOT: 'BIETEN', BOTEN: 'BIETEN', GEBOTEN: 'BIETEN',
  BAT: 'BITTEN', BATEN: 'BITTEN', GEBETEN: 'BITTEN',
  VERLOR: 'VERLIEREN', VERLOREN: 'VERLIEREN',
  GEWANN: 'GEWINNEN', GEWONNEN: 'GEWINNEN'
};

const FINITE_FORMS = new Set([
  ...Object.keys(presentForms).map((form) => form.toLocaleLowerCase()),
  ...Object.keys(irregularForms).map((form) => form.toLocaleLowerCase()),
  ...PREDICATE_VERBS
]);

// German adjectives whose stem loses an e in front of the ending: dunkel -> dunkle, teuer -> teure.
const DROPPED_L = ['LE', 'LER', 'LEN', 'LEM', 'LES', 'LST', 'LSTE', 'LSTEN', 'LSTER', 'LSTES'];
const DROPPED_R = ['RE', 'RER', 'REN', 'REM', 'RES', 'RST', 'RSTE', 'RSTEN', 'RSTER', 'RSTES'];
const NOUN_ENDINGS = ['INNEN', 'NEN', 'ERN', 'EM', 'EN', 'ER', 'ES', 'E', 'N', 'S'];
const VERB_ENDINGS = ['TEST', 'TEN', 'TET', 'EST', 'ET', 'EN', 'ST', 'TE', 'T', 'E'];
const ENGLISH_ENDINGS: Record<string, string> = { IES: 'Y', ES: '', S: '', ED: '', ING: '', ER: '', EST: '' };

function stripUmlauts(value: string): string {
  return value.replace(/Ä/g, 'A').replace(/Ö/g, 'O').replace(/Ü/g, 'U');
}

function addCandidate(into: Set<string>, candidate: string) {
  if (candidate.length >= 3) into.add(candidate);
}

function germanCandidates(value: string): string[] {
  const upper = value.toLocaleUpperCase();
  const found = new Set<string>([upper, stripUmlauts(upper)]);
  const irregular = presentForms[upper] ?? irregularForms[upper];
  if (irregular) found.add(irregular);

  // Noun plural and adjective case endings, with and without an umlaut change.
  for (const ending of NOUN_ENDINGS) {
    if (!upper.endsWith(ending) || upper.length <= ending.length + 2) continue;
    const stem = upper.slice(0, -ending.length);
    for (const root of [stem, stripUmlauts(stem)]) {
      addCandidate(found, root);
      addCandidate(found, `${root}E`);
      addCandidate(found, `${root}ER`);
      addCandidate(found, `${root}EN`);
    }
  }

  // Conjugated verbs: wohnt -> wohnen, bezahlt -> bezahlen, arbeitete -> arbeiten.
  for (const ending of VERB_ENDINGS) {
    if (!upper.endsWith(ending) || upper.length <= ending.length + 2) continue;
    const stem = upper.slice(0, -ending.length);
    for (const root of [stem, stripUmlauts(stem)]) {
      addCandidate(found, `${root}EN`);
      addCandidate(found, `${root}N`);
    }
  }

  // Participles: gekauft -> kaufen, gefahren -> fahren, gegessen is in the irregular table.
  if (upper.startsWith('GE') && upper.length > 5) {
    const rest = upper.slice(2);
    for (const ending of ['T', 'EN']) {
      if (!rest.endsWith(ending)) continue;
      const stem = rest.slice(0, -ending.length);
      for (const root of [stem, stripUmlauts(stem)]) {
        addCandidate(found, `${root}EN`);
        addCandidate(found, `${root}N`);
      }
    }
  }

  // Adjectives that drop the e of an -el/-er stem (dunkle, teure, saure).
  for (const ending of DROPPED_L) {
    if (!upper.endsWith(ending)) continue;
    const index = upper.lastIndexOf('L');
    if (index > 2) addCandidate(found, `${upper.slice(0, index)}EL`);
  }
  for (const ending of DROPPED_R) {
    if (!upper.endsWith(ending)) continue;
    const index = upper.indexOf('R', 2);
    if (index > 2) addCandidate(found, `${upper.slice(0, index)}ER`);
  }

  return [...found];
}

function englishCandidates(value: string): string[] {
  const upper = value.toLocaleUpperCase();
  const found = new Set<string>([upper]);
  const irregular: Record<string, string> = { AM: 'BE', IS: 'BE', ARE: 'BE', WAS: 'BE', WERE: 'BE', BEEN: 'BE', HAS: 'HAVE', HAD: 'HAVE', DOES: 'DO', DID: 'DO', GOES: 'GO', WENT: 'GO', GONE: 'GO', SAYS: 'SAY', SAID: 'SAY' };
  const known = irregular[upper];
  if (known) found.add(known);
  for (const [ending, replacement] of Object.entries(ENGLISH_ENDINGS)) {
    if (!upper.endsWith(ending) || upper.length <= ending.length + 2) continue;
    const stem = upper.slice(0, -ending.length);
    addCandidate(found, `${stem}${replacement}`);
    // running -> run, stopped -> stop
    if (stem.length >= 4 && stem.at(-1) === stem.at(-2)) addCandidate(found, stem.slice(0, -1));
    // making -> make
    if (ending === 'ING') addCandidate(found, `${stem}E`);
  }
  return [...found];
}

function candidatesFor(language: Language, value: string): string[] {
  if (language === 'de') return germanCandidates(value);
  if (language === 'en') return englishCandidates(value);
  const upper = value.toLocaleUpperCase();
  const found = new Set<string>([upper]);
  for (const ending of ['ES', 'S', 'EN', 'E', 'N', 'T']) {
    if (!upper.endsWith(ending) || upper.length <= ending.length + 2) continue;
    addCandidate(found, upper.slice(0, -ending.length));
  }
  return [...found];
}

type ContextWord = { text: string; lower: string };

function wordsBefore(text: string, start: number, limit: number): ContextWord[] {
  const words: ContextWord[] = [];
  let cursor = start;
  while (words.length < limit && cursor > 0) {
    const match = /([\p{L}]+)([^\p{L}]*)$/u.exec(text.slice(0, cursor));
    if (!match) break;
    const gap = match[2] ?? '';
    if (/[.!?;:]/u.test(gap)) break;
    words.push({ text: match[1], lower: match[1].toLocaleLowerCase() });
    cursor -= match[1].length + gap.length;
  }
  return words;
}

function wordsAfter(text: string, end: number, limit: number): ContextWord[] {
  const words: ContextWord[] = [];
  let cursor = end;
  while (words.length < limit && cursor < text.length) {
    const match = /^([^\p{L}]*)([\p{L}]+)/u.exec(text.slice(cursor));
    if (!match) break;
    if (/[.!?;:]/u.test(match[1])) break;
    words.push({ text: match[2], lower: match[2].toLocaleLowerCase() });
    cursor += match[1].length + match[2].length;
  }
  return words;
}

function followedByVerb(words: ContextWord[]): boolean {
  const first = words[0]?.lower;
  return first ? FINITE_FORMS.has(first) : false;
}

function isPluralOnly(wordUpper: string, definition: string): boolean {
  return PLURAL_ONLY.has(wordUpper) || definition.startsWith('Plural');
}

function vowelGroups(value: string): number {
  const plain = value.toLocaleLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
  return (plain.match(/[aeiouy]+/g) ?? []).length;
}

function genitiveSingular(spelling: string, gender: VocabularyGender, wordUpper: string): string {
  const override = NOUN_OVERRIDES[wordUpper];
  if (override) return override.genitive;
  if (gender === 'feminine') return spelling;

  const lower = spelling.toLocaleLowerCase();
  if (lower.endsWith('ismus')) return spelling;
  if (lower.endsWith('nis')) return `${spelling}ses`;
  if (/(s|ß|x|z|tz|sch)$/.test(lower)) return `${spelling}es`;
  return vowelGroups(spelling) <= 1 ? `${spelling}es` : `${spelling}s`;
}

function umlaut(value: string): string {
  return value.replace(/[AOU]/g, (letter) => ({ A: 'Ä', O: 'Ö', U: 'Ü' })[letter] ?? letter);
}

// Plausible plural spellings of a singular. The tapped token is checked against these, which is
// more reliable than guessing the plural on its own: the text already contains the real form.
function pluralCandidates(spelling: string, gender: VocabularyGender | undefined): string[] {
  const upper = spelling.toLocaleUpperCase();
  const lower = spelling.toLocaleLowerCase();
  const umlauted = umlaut(upper);
  const found = new Set<string>();

  if (gender === 'feminine') {
    if (lower.endsWith('in')) found.add(`${upper}NEN`);
    else if (/(ung|heit|keit|schaft|ion|tät|ik|ei|ie|ur)$/.test(lower)) found.add(`${upper}EN`);
    else if (lower.endsWith('e')) found.add(`${upper}N`);
    else found.add(`${upper}EN`);
    found.add(`${umlauted}E`);
    found.add(`${umlauted}EN`);
    return [...found];
  }

  if (/(er|el|en|chen|lein)$/.test(lower)) found.add(upper);
  found.add(`${upper}E`);
  found.add(`${umlauted}E`);
  found.add(`${upper}ER`);
  found.add(`${umlauted}ER`);
  found.add(`${upper}EN`);
  found.add(`${umlauted}EN`);
  found.add(`${upper}S`);
  found.add(upper);
  found.add(umlauted);
  return [...found];
}

function pluralOf(
  spelling: string,
  token: string,
  tokenUpper: string,
  gender: VocabularyGender | undefined,
  wordUpper: string
): string {
  const override = NOUN_OVERRIDES[wordUpper];
  if (override?.plural) return override.plural;

  const candidates = pluralCandidates(spelling, gender);
  if (candidates.includes(tokenUpper)) return token;
  // Dative plural adds an -n to plurals that do not already end in -n or -s.
  if (tokenUpper.endsWith('N') && candidates.includes(tokenUpper.slice(0, -1))) return token.slice(0, -1);
  return token;
}

function detectNumber(
  spelling: string,
  gender: VocabularyGender | undefined,
  definition: string,
  tokenUpper: string,
  wordUpper: string,
  previous: string[]
): ReadingNumber {
  if (isPluralOnly(wordUpper, definition)) return 'plural';

  const pluralArticle = previous[0] !== undefined && PLURAL_DETERMINERS.has(previous[0]);
  const counted = previous.some((word) => NUMBER_WORDS.has(word));

  if (tokenUpper === wordUpper) {
    // Unchanged plurals (Lehrer, Mädchen) only show their number through the article or a number.
    if (pluralArticle && gender !== 'feminine') return 'plural';
    if (counted) return 'plural';
    return 'singular';
  }

  const override = NOUN_OVERRIDES[wordUpper];
  if (override) {
    const forms = [override.genitive, override.oblique].filter((form): form is string => Boolean(form));
    if (forms.some((form) => form.toLocaleUpperCase() === tokenUpper)) {
      if (pluralArticle) return 'plural';
      if (counted) return 'plural';
      // "den Kollegen" is singular, "die Kollegen" plural. Without context the plural is the
      // friendlier reading for a tapped word that is both an oblique singular and a plural.
      return previous.length === 0 ? 'plural' : 'singular';
    }
  }

  if (tokenUpper === genitiveSingular(spelling, gender ?? 'masculine', wordUpper).toLocaleUpperCase()) {
    if (pluralArticle || counted) return 'plural';
    // Genitive singular needs "des/eines/..."; without one the same spelling is a plural.
    return previous.some((word) => GENITIVE_DETERMINERS.has(word)) ? 'singular' : 'plural';
  }

  return 'plural';
}

function caseFromDeterminer(
  determiner: string,
  info: ReadingWordInfo,
  preposition: string | undefined,
  beforeWord: ContextWord | undefined,
  nounBefore: boolean,
  next: ContextWord[]
): ReadingGrammarCase | undefined {
  const plural = info.number === 'plural';

  if (plural) {
    if (GENITIVE_PLURAL_DETERMINERS.has(determiner)) return 'genitive';
    if (DATIVE_PLURAL_DETERMINERS.has(determiner)) return 'dative';
  }
  if (GENITIVE_DETERMINERS.has(determiner)) return 'genitive';
  if (DATIVE_DETERMINERS.has(determiner)) return 'dative';
  if (ACCUSATIVE_DETERMINERS.has(determiner)) return 'accusative';

  if (determiner === 'der') {
    if (!plural && info.gender === 'masculine') return 'nominative';
    if (preposition && FIXED_PREPOSITION_CASES[preposition]) return FIXED_PREPOSITION_CASES[preposition];
    if (preposition && TWO_WAY_PREPOSITIONS.has(preposition)) return 'dative';
    // "die Tür der Wohnung": a noun in front of "der" points at the genitive.
    if (nounBefore) return 'genitive';
    return 'dative';
  }

  if (AMBIGUOUS_NOM_ACC.has(determiner)) {
    if (preposition && FIXED_PREPOSITION_CASES[preposition]) return FIXED_PREPOSITION_CASES[preposition];
    if (preposition && TWO_WAY_PREPOSITIONS.has(preposition)) return 'accusative';
    if (followedByVerb(next)) return 'nominative';
    if (beforeWord && PREDICATE_VERBS.has(beforeWord.lower)) return 'nominative';
    return 'accusative';
  }

  return undefined;
}

function detectCurrentCase(
  text: string,
  start: number,
  end: number,
  info: ReadingWordInfo,
  tokenUpper: string
): ReadingGrammarCase | undefined {
  const before = wordsBefore(text, start, 4);
  const after = wordsAfter(text, end, 2);
  const previous = before.map((word) => word.lower);

  for (let index = 0; index < previous.length; index += 1) {
    const contraction = CONTRACTIONS[previous[index]];
    if (contraction) {
      return caseFromDeterminer(contraction.article, info, contraction.preposition, before[index + 1], false, after);
    }
    if (DETERMINER_WORDS.has(previous[index])) {
      const nounBefore = before.slice(index + 1).some((word) => /^\p{Lu}/u.test(word.text));
      return caseFromDeterminer(previous[index], info, previous[index + 1], before[index + 1], nounBefore, after);
    }
  }

  const preposition = previous.find(
    (word) => Boolean(FIXED_PREPOSITION_CASES[word]) || TWO_WAY_PREPOSITIONS.has(word)
  );
  if (preposition) {
    const fixed = FIXED_PREPOSITION_CASES[preposition];
    if (fixed) return fixed;
    // Without an article, a plural noun ending in -n after a two-way preposition is dative.
    if (info.number === 'plural' && tokenUpper.endsWith('N')) return 'dative';
  }

  return undefined;
}

function nounCases(
  spelling: string,
  gender: VocabularyGender,
  number: ReadingNumber,
  plural: string | undefined,
  wordUpper: string
): ReadingWordCase[] {
  if (number === 'plural') {
    const base = plural ?? spelling;
    const dative = /[ns]$/i.test(base) ? base : `${base}n`;
    return [
      { grammarCase: 'nominative', article: 'die', form: base },
      { grammarCase: 'genitive', article: 'der', form: base },
      { grammarCase: 'dative', article: 'den', form: dative },
      { grammarCase: 'accusative', article: 'die', form: base }
    ];
  }

  const override = NOUN_OVERRIDES[wordUpper];
  const genitive = genitiveSingular(spelling, gender, wordUpper);
  const oblique = override?.oblique ?? spelling;
  return [
    { grammarCase: 'nominative', article: READING_ARTICLES.nominative[gender], form: spelling },
    { grammarCase: 'genitive', article: READING_ARTICLES.genitive[gender], form: genitive },
    { grammarCase: 'dative', article: READING_ARTICLES.dative[gender], form: oblique },
    { grammarCase: 'accusative', article: READING_ARTICLES.accusative[gender], form: gender === 'masculine' ? oblique : spelling }
  ];
}

/** Look a tapped word up in the vocabulary of its learning language. */
export function lookupReadingWord(
  language: Language,
  value: string,
  context?: ReadingWordContext
): ReadingWordInfo | null {
  const metadata = wordMetadata[language] ?? {};
  const tokenUpper = value.toLocaleUpperCase();
  const nounBase = language === 'de' && /^\p{Lu}/u.test(value) ? NOUN_FORM_BASES[tokenUpper] : undefined;
  const candidates = nounBase ? [nounBase, ...candidatesFor(language, value)] : candidatesFor(language, value);
  const previous = context ? wordsBefore(context.text, context.start, 4).map((word) => word.lower) : [];

  for (const candidate of candidates) {
    const entry = metadata[candidate];
    if (!entry) continue;

    const definition = wordDefinitions[language]?.[candidate] ?? '';
    const number = language === 'de' && entry.gender
      ? detectNumber(entry.spelling, entry.gender, definition, tokenUpper, candidate, previous)
      : 'singular';
    const pluralOnly = isPluralOnly(candidate, definition);
    const plural = number === 'plural'
      ? (pluralOnly ? entry.spelling : pluralOf(entry.spelling, value, tokenUpper, entry.gender, candidate))
      : undefined;
    const article = number === 'plural'
      ? 'die'
      : entry.article ?? (language === 'de' && entry.gender ? READING_ARTICLES.nominative[entry.gender] : '');
    const displayForm = number === 'plural' && plural ? plural : entry.spelling;
    const cases = language === 'de' && entry.gender
      ? nounCases(entry.spelling, entry.gender, number, plural, candidate)
      : [];

    const info: ReadingWordInfo = {
      word: candidate,
      spelling: entry.spelling,
      display: article ? `${article} ${displayForm}` : displayForm,
      article,
      number,
      plural,
      gender: entry.gender,
      type: entry.type,
      definition,
      cases
    };

    if (context && cases.length > 0) {
      info.currentCase = detectCurrentCase(context.text, context.start, context.end, info, tokenUpper);
    }

    return info;
  }
  return null;
}
