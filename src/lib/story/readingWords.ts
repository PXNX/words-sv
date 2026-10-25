import { wordDefinitions, wordMetadata, type Language, type VocabularyGender } from '#lib/data/vocabulary.js';
import { verbConjugations } from '#lib/grammar/verbs.js';
import { definiteArticlesByCase, type GrammarCase } from '#lib/grammar/cases.js';

// A word as the reading mode needs it: dictionary spelling, meaning and the grammar that helps
// a learner understand the sentence. The `word` key is the uppercased base form used by the
// vocabulary review store and the missed-word list.
export type ReadingWordCase = { grammarCase: GrammarCase; article: string; form: string };

export type ReadingWordInfo = {
  word: string;
  spelling: string;
  article: string;
  gender?: VocabularyGender;
  type: string;
  definition: string;
  cases: ReadingWordCase[];
};

export type ReadingToken = { text: string; word: boolean };

const CASES: GrammarCase[] = ['nominative', 'accusative', 'dative'];

/**
 * Splits a sentence into tappable words and the punctuation between them. Letters of any script
 * count as a word, so German, Cyrillic and the other learning languages all work the same way.
 */
export function tokenizeReadingText(text: string): ReadingToken[] {
  return text
    .split(/(\p{L}+)/u)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, word: /^\p{L}/u.test(part) }));
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

/** Look a tapped word up in the vocabulary of its learning language. */
export function lookupReadingWord(language: Language, value: string): ReadingWordInfo | null {
  const metadata = wordMetadata[language] ?? {};
  for (const candidate of candidatesFor(language, value)) {
    const entry = metadata[candidate];
    if (!entry) continue;
    const article = entry.article ?? (language === 'de' && entry.gender ? definiteArticlesByCase.nominative[entry.gender] : '');
    const cases: ReadingWordCase[] = language === 'de' && entry.gender
      ? CASES.map((grammarCase) => ({ grammarCase, article: definiteArticlesByCase[grammarCase][entry.gender!], form: entry.spelling }))
      : [];
    return {
      word: candidate,
      spelling: entry.spelling,
      article,
      gender: entry.gender,
      type: entry.type,
      definition: wordDefinitions[language]?.[candidate] ?? '',
      cases
    };
  }
  return null;
}
