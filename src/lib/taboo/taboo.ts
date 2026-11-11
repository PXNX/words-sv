/*
 * Taboo: describe a word without saying it - or any word built on the same base. "Walking" may not
 * be explained with "walk", "walker", "walkman" or "walks", and "Abfahrt" not with "abfahren".
 *
 * The rating runs on the device: the definition of the word provides the key words that a good
 * explanation should contain, and the explanation is scored by how many of them it hits. No model,
 * no network.
 */

/** Fold case and accents so "läuft" and "laufen" meet at the same stem. */
function fold(value: string) {
  return value
    .normalize('NFC')
    .toLocaleLowerCase()
    .replaceAll('ß', 'ss')
    .replaceAll('ä', 'a')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('é', 'e')
    .replaceAll('è', 'e')
    .replaceAll('ê', 'e')
    .replaceAll('ë', 'e')
    .replaceAll('á', 'a')
    .replaceAll('â', 'a')
    .replaceAll('à', 'a')
    .replaceAll('í', 'i')
    .replaceAll('î', 'i')
    .replaceAll('ï', 'i')
    .replaceAll('ó', 'o')
    .replaceAll('ô', 'o')
    .replaceAll('ú', 'u')
    .replaceAll('û', 'u')
    .replaceAll('ñ', 'n')
    .replaceAll('ç', 'c');
}

// Longest first: "Wohnungen" loses "ungen", not just "en".
const SUFFIXES = [
  'ungen', 'keiten', 'heiten', 'schaft', 'lichkeit', 'ung', 'keit', 'heit', 'lich', 'isch',
  'erin', 'innen', 'chen', 'lein', 'bar', 'sam', 'ers', 'est', 'ern', 'em', 'er', 'es', 'en', 'et',
  'st', 'te', 'ten', 'tet', 'ing', 'ed', 'ies', 'ly', 'e', 'n', 't', 's'
];

/**
 * A rough stem for family checks: folds accents, drops a separable "ge-" and one inflection
 * suffix. It is deliberately language-agnostic and only needs to be stable, not linguistically
 * perfect - both sides of a comparison always go through it.
 */
export function wordStem(value: string): string {
  let word = fold(value).replace(/[^\p{L}\p{M}]/gu, '');
  if (word.length >= 7 && word.startsWith('ge')) word = word.slice(2);
  for (const suffix of SUFFIXES) {
    if (!word.endsWith(suffix)) continue;
    const rest = word.slice(0, -suffix.length);
    if (rest.length < 3) break;
    // A trailing "e" says little in a short word and would merge "Küche" and "Kuchen"; longer
    // words keep it as a plural marker ("Adresse"/"Adressen"). A final "s" is only a plural on
    // words long enough not to be a singular base ("Haus", "Gas").
    if (suffix === 'e' && rest.length < 5) continue;
    if (suffix === 's' && rest.length < 4) continue;
    word = rest;
    break;
  }
  return word;
}

/**
 * Whether two stems belong to the same word family: equal, a compound that starts or ends with the
 * other ("Hausaufgabe"/"Haus", "Autobahn"/"Bahn"), or a derivation ("walk"/"walkman").
 * Stems shorter than four letters only match exactly, so "Tag" does not swallow "sagt".
 */
export function sameFamily(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length < 4) return false;
  // The shared part must be the real base, not almost the whole word: "Küche"/"Kuchen" share
  // five letters but are not one family, while "walk"/"walkman" and "Haus"/"Hausaufgabe" are.
  if (long.length - short.length < 2) return false;
  return long.startsWith(short) || long.endsWith(short);
}

function tokens(text: string): string[] {
  return (text.normalize('NFC').match(/[\p{L}\p{M}]+/gu) ?? []).filter((token) => token.length > 0);
}

/**
 * A looser family check for scoring key words: inflections such as "places"/"place" or "läuft"/
 * "laufen" count, even when stemming a short word would overreach. Used only for awarding points,
 * never for the forbidden-word check.
 */
function matchesKeyword(token: string, keyword: string): boolean {
  const a = fold(token);
  const b = fold(keyword);
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 4 && (long.startsWith(short) || long.endsWith(short));
}

/** Every word of the explanation that belongs to the target's family - the buzz words of Taboo. */
export function tabooHits(target: string, text: string): string[] {
  const targetStem = wordStem(target);
  if (!targetStem) return [];
  const hits: string[] = [];
  for (const token of tokens(text)) {
    if (!sameFamily(wordStem(token), targetStem)) continue;
    if (!hits.some((hit) => hit.toLocaleLowerCase() === token.toLocaleLowerCase())) hits.push(token);
  }
  return hits;
}

/** Words from the learner's pool that share the target's base - shown as "also forbidden". */
export function relatedForms(target: string, words: readonly string[], limit = 4): string[] {
  const targetStem = wordStem(target);
  if (!targetStem) return [];
  const seen = new Set<string>();
  return words
    .filter((word) => {
      const key = word.toLocaleLowerCase();
      if (key === target.toLocaleLowerCase() || seen.has(key)) return false;
      seen.add(key);
      return sameFamily(wordStem(word), targetStem);
    })
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
    .slice(0, Math.max(0, limit));
}

// Function words and generic gloss words ("etwas", "person", "place", ...). They say nothing about
// a specific word and would otherwise hand out points for any explanation.
const STOPWORDS = new Set(
  `
  der die das den dem des ein eine einer eines einem einen und oder aber auch noch nur schon
  nicht kein keine keinen keinem keiner ist sind war waren wird werden wurde wurden sein haben hat
  hatte hatten kann können muss müssen soll sollen will wollen mag mit von zu zum zur aus bei nach
  vor über unter auf an in im am um für gegen ohne durch zwischen seit bis als wie wenn dass daß
  weil ob man sie er es wir ihr ich du mich mir dich dir sich uns euch ihm ihn ihnen ihr ihre
  ihrem ihren ihres diese dieser dieses diesen diesem jene jener jenes jede jeder jedes jeden
  jedem alle allen allem alles etwas jemand jemandem jemanden jemandes niemand manche mancher
  viele viel mehr sehr oft meist meistens immer wieder dann dort hier da so also etwa circa
  andere anderen anderer anderes gleiche gleichen ähnliche ähnlichen ding dinge dingen sache
  sachen person personen mensch menschen ort orte stelle stellen art weise form fall beispiel
  the a an and or but also still only already not no nor is are was were be been being has have
  had can could may might must shall should will would do does did done this that these those
  there here then than with from to of in on at by for about over under between into onto out
  up down off again very more most much many some any each every all both either neither other
  others another same such something someone somebody nothing nobody thing things person people
  kind sort type way often usually example where when which what who whom whose why how
  whether
  le la les un une des du de d et ou mais donc car ne pas plus très avec sans pour par sur sous
  dans entre chez est sont était étaient être avoir a ont au aux ce cette ces cet qui que quoi
  dont où il elle ils elles on nous vous je tu mon ma mes ton ta tes son sa ses leur leurs
  lo la los las el un una unos unas de del y o pero porque muy con sin para por sobre entre es
  son era eran ser tener ha han al se su sus que quien como donde
  o a os as um uma uns umas do da dos das no na nos nas em por para com sem sobre entre é são
  era eram ser ter tem têm ao aos seu sua seus suas que quem como onde
  і й та те той цей ця ці він вона воно вони ми ви я ти не ні та але або що як де коли для
  без через між над під про у в на з із до від це той ця ці
  `
    .split(/\s+/u)
    .filter(Boolean)
    .map(fold)
);

export type DefinitionKeyword = { word: string; stem: string };

/**
 * The key words of a definition, deduplicated by stem and without the target's own family (a
 * definition of "Abfalleimer" may say "Abfall", but that must not be a point the learner can score).
 */
export function definitionKeywords(target: string, definition: string): DefinitionKeyword[] {
  const targetStem = wordStem(target);
  const result: DefinitionKeyword[] = [];
  const seen = new Set<string>();
  for (const token of tokens(definition)) {
    if (token.length < 3) continue;
    const lower = fold(token);
    if (STOPWORDS.has(lower)) continue;
    const stem = wordStem(token);
    if (!stem || seen.has(stem)) continue;
    if (sameFamily(stem, targetStem)) continue;
    seen.add(stem);
    result.push({ word: token, stem });
  }
  return result;
}

export type TabooVerdict = 'pass' | 'close' | 'fail';

export type TabooRating = {
  /** 0-100; a forbidden word always makes it 0. */
  score: number;
  verdict: TabooVerdict;
  /** Words of the explanation that broke the rule. */
  forbidden: string[];
  /** Definition key words the explanation hit. */
  matched: string[];
  /** Definition key words that were missing. */
  missed: string[];
  /** How many words the explanation had. */
  words: number;
};

export const TABOO_PASS_SCORE = 60;
export const TABOO_CLOSE_SCORE = 30;
/** Below this many words even a lucky keyword list is not a real explanation. */
export const TABOO_MIN_WORDS = 4;

/**
 * Rates an explanation against the definition's key words. A word from the target's family fails
 * the round outright; otherwise the share of key words found decides pass / close / fail.
 */
export function rateDescription(target: string, definition: string, text: string): TabooRating {
  const explanation = tokens(text);
  const forbidden = tabooHits(target, text);
  const keywords = definitionKeywords(target, definition);
  const matched: string[] = [];
  const missed: string[] = [];
  for (const keyword of keywords) {
    if (explanation.some((token) => matchesKeyword(token, keyword.word))) matched.push(keyword.word);
    else missed.push(keyword.word);
  }

  let score: number;
  if (keywords.length === 0) {
    // A definition without usable key words still rewards an actual, substantial explanation.
    score = explanation.length >= 12 ? 70 : 40;
  } else {
    score = Math.round((matched.length / keywords.length) * 100);
  }
  if (explanation.length < TABOO_MIN_WORDS) score = Math.min(score, 40);
  if (forbidden.length > 0) score = 0;

  return {
    score,
    verdict: score >= TABOO_PASS_SCORE ? 'pass' : score >= TABOO_CLOSE_SCORE ? 'close' : 'fail',
    forbidden,
    matched,
    missed,
    words: explanation.length
  };
}

/** Words that make a playable round: a real word with enough definition key words to grade it. */
export function tabooCandidates(words: readonly string[], definitions: Record<string, string>): string[] {
  const unique = [...new Set(words.filter((word) => /^\p{L}{3,}$/u.test(word) && !STOPWORDS.has(fold(word))))];
  return unique.filter((word) => definitionKeywords(word, definitions[word] ?? '').length >= 2);
}

/** Draws the next word, avoiding the last few so a round does not repeat itself. */
export function nextTabooWord(candidates: readonly string[], recent: readonly string[] = [], random: () => number = Math.random): string {
  if (candidates.length === 0) return '';
  const fresh = candidates.filter((word) => !recent.includes(word));
  const pool = fresh.length > 0 ? fresh : candidates;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] ?? '';
}
