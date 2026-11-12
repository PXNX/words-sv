import type { VocabularyGender, VocabularyLevel, VocabularyMetadata } from '#lib/data/vocabulary.js';
import { vocabularyLevels } from '#lib/data/vocabulary.js';
import { definiteArticlesByCase, declineNoun, indefiniteArticlesByCase, type GrammarCase } from './cases';
import { inflectAdjective } from './adjectives';
import { verbConjugations } from './verbs';

/*
 * Sentence builder for the word-order drill ("Satzbau"). It composes German and English sentences
 * from a small hand-checked lexicon instead of free vocabulary, because only words with known
 * properties can be put together safely: every noun knows its gender (German), whether it is
 * countable and which pronoun replaces it; every verb knows its conjugation (German forms come
 * from `verbConjugations`), who can do it and what it can take as an object; every adjective knows
 * which nouns it fits. The templates then get the grammar right:
 *
 * - German: articles and adjective endings by case and gender (weak after der, mixed after ein and
 *   kein, strong without an article), weak masculine nouns (dem Jungen), the finite verb in second
 *   position with inversion after a fronted time or object, verb first in yes/no questions, the
 *   verb at the end after dass and weil, kein vs. nicht for negation, and modal + infinitive.
 * - English: third-person -s (buys, carries, washes, has), a vs. an, no article for uncountable
 *   nouns, do-support for questions and negation, and modals with the bare infinitive.
 *
 * Each exercise lists every order that is correct, not only the one it was built from: in German
 * any one constituent can open a main clause and a time adverb can move within the middle field.
 * Structures the lexicon can't build (perfect tense, separable verbs, relative clauses …) come from
 * a short list of hand-checked sentences per level.
 */

export type SentenceLanguage = 'de' | 'en';
export type SentenceStructure = 'statement' | 'inversion' | 'question' | 'wquestion' | 'negation' | 'modal' | 'dative' | 'dass' | 'weil' | 'curated';
export type Determiner = 'definite' | 'indefinite';
type NounKind = 'person' | 'animal' | 'food' | 'drink' | 'reading' | 'thing';

export type OrderExercise = {
  /** The sentence as built, also the review key. */
  id: string;
  language: SentenceLanguage;
  structure: SentenceStructure;
  /** The words in the order of `answers[0]`, cased as they stand inside a sentence. */
  tokens: string[];
  /** Every correct sentence made of exactly these tokens; the first is the canonical one. */
  answers: string[];
  /** The constituents of `answers[0]` in order, for checks like verb-second. Empty for curated sentences. */
  parts: Part[];
};

export function isSentenceLanguage(language: string): language is SentenceLanguage {
  return language === 'de' || language === 'en';
}

// ---------------------------------------------------------------------------------------------
// Lexicon. Ids are English; `level` is the first level a word shows up at.

type GermanNoun = { word: string; gender: VocabularyGender; mass?: true };
type EnglishNoun = { word: string; mass?: true; pronoun?: 'he' | 'she' | 'it' };
type NounEntry = { level: VocabularyLevel; kind: NounKind; de: GermanNoun; en: EnglishNoun; adjectives: string[] };

const NOUNS: Record<string, NounEntry> = {
  woman: { level: 'a1', kind: 'person', de: { word: 'Frau', gender: 'feminine' }, en: { word: 'woman', pronoun: 'she' }, adjectives: ['young', 'old', 'friendly'] },
  man: { level: 'a1', kind: 'person', de: { word: 'Mann', gender: 'masculine' }, en: { word: 'man', pronoun: 'he' }, adjectives: ['young', 'old', 'tired'] },
  child: { level: 'a1', kind: 'person', de: { word: 'Kind', gender: 'neuter' }, en: { word: 'child' }, adjectives: ['small', 'tired'] },
  boy: { level: 'a1', kind: 'person', de: { word: 'Junge', gender: 'masculine' }, en: { word: 'boy', pronoun: 'he' }, adjectives: ['small', 'friendly'] },
  girl: { level: 'a1', kind: 'person', de: { word: 'Mädchen', gender: 'neuter' }, en: { word: 'girl', pronoun: 'she' }, adjectives: ['small', 'friendly'] },
  teacher: { level: 'a1', kind: 'person', de: { word: 'Lehrerin', gender: 'feminine' }, en: { word: 'teacher' }, adjectives: ['young', 'friendly'] },
  grandma: { level: 'a1', kind: 'person', de: { word: 'Oma', gender: 'feminine' }, en: { word: 'grandmother', pronoun: 'she' }, adjectives: ['old', 'tired'] },
  neighbour: { level: 'a2', kind: 'person', de: { word: 'Nachbar', gender: 'masculine' }, en: { word: 'neighbour' }, adjectives: ['old', 'friendly'] },
  student: { level: 'a2', kind: 'person', de: { word: 'Student', gender: 'masculine' }, en: { word: 'student' }, adjectives: ['young', 'tired'] },
  dog: { level: 'a1', kind: 'animal', de: { word: 'Hund', gender: 'masculine' }, en: { word: 'dog', pronoun: 'it' }, adjectives: ['small', 'black', 'old'] },
  cat: { level: 'a1', kind: 'animal', de: { word: 'Katze', gender: 'feminine' }, en: { word: 'cat', pronoun: 'it' }, adjectives: ['small', 'black', 'white'] },

  apple: { level: 'a1', kind: 'food', de: { word: 'Apfel', gender: 'masculine' }, en: { word: 'apple' }, adjectives: ['red', 'green', 'fresh', 'sour'] },
  banana: { level: 'a1', kind: 'food', de: { word: 'Banane', gender: 'feminine' }, en: { word: 'banana' }, adjectives: ['yellow', 'sweet'] },
  cake: { level: 'a1', kind: 'food', de: { word: 'Kuchen', gender: 'masculine' }, en: { word: 'cake' }, adjectives: ['sweet', 'big'] },
  egg: { level: 'a1', kind: 'food', de: { word: 'Ei', gender: 'neuter' }, en: { word: 'egg' }, adjectives: ['fresh'] },
  bread: { level: 'a1', kind: 'food', de: { word: 'Brot', gender: 'neuter' }, en: { word: 'bread', mass: true }, adjectives: ['fresh'] },
  soup: { level: 'a2', kind: 'food', de: { word: 'Suppe', gender: 'feminine' }, en: { word: 'soup', mass: true }, adjectives: ['hot', 'warm'] },
  coffee: { level: 'a1', kind: 'drink', de: { word: 'Kaffee', gender: 'masculine', mass: true }, en: { word: 'coffee', mass: true }, adjectives: ['hot', 'black'] },
  tea: { level: 'a1', kind: 'drink', de: { word: 'Tee', gender: 'masculine', mass: true }, en: { word: 'tea', mass: true }, adjectives: ['hot', 'green'] },
  milk: { level: 'a1', kind: 'drink', de: { word: 'Milch', gender: 'feminine', mass: true }, en: { word: 'milk', mass: true }, adjectives: ['cold', 'warm', 'fresh'] },
  water: { level: 'a1', kind: 'drink', de: { word: 'Wasser', gender: 'neuter', mass: true }, en: { word: 'water', mass: true }, adjectives: ['cold'] },
  juice: { level: 'a2', kind: 'drink', de: { word: 'Saft', gender: 'masculine', mass: true }, en: { word: 'juice', mass: true }, adjectives: ['cold', 'sweet'] },

  book: { level: 'a1', kind: 'reading', de: { word: 'Buch', gender: 'neuter' }, en: { word: 'book' }, adjectives: ['new', 'old', 'interesting', 'heavy'] },
  newspaper: { level: 'a1', kind: 'reading', de: { word: 'Zeitung', gender: 'feminine' }, en: { word: 'newspaper' }, adjectives: ['new', 'old'] },
  letter: { level: 'a1', kind: 'reading', de: { word: 'Brief', gender: 'masculine' }, en: { word: 'letter' }, adjectives: ['long', 'short'] },
  bag: { level: 'a1', kind: 'thing', de: { word: 'Tasche', gender: 'feminine' }, en: { word: 'bag' }, adjectives: ['red', 'black', 'heavy', 'expensive'] },
  car: { level: 'a1', kind: 'thing', de: { word: 'Auto', gender: 'neuter' }, en: { word: 'car' }, adjectives: ['new', 'old', 'red', 'expensive'] },
  bike: { level: 'a1', kind: 'thing', de: { word: 'Fahrrad', gender: 'neuter' }, en: { word: 'bike' }, adjectives: ['new', 'old', 'blue'] },
  key: { level: 'a1', kind: 'thing', de: { word: 'Schlüssel', gender: 'masculine' }, en: { word: 'key' }, adjectives: ['small', 'old'] },
  ball: { level: 'a1', kind: 'thing', de: { word: 'Ball', gender: 'masculine' }, en: { word: 'ball' }, adjectives: ['red', 'blue', 'small', 'big'] },
  jacket: { level: 'a1', kind: 'thing', de: { word: 'Jacke', gender: 'feminine' }, en: { word: 'jacket' }, adjectives: ['warm', 'new', 'blue'] },
  lamp: { level: 'a2', kind: 'thing', de: { word: 'Lampe', gender: 'feminine' }, en: { word: 'lamp' }, adjectives: ['new', 'old', 'small'] },
  umbrella: { level: 'a2', kind: 'thing', de: { word: 'Regenschirm', gender: 'masculine' }, en: { word: 'umbrella' }, adjectives: ['black', 'old', 'big'] },
  present: { level: 'a2', kind: 'thing', de: { word: 'Geschenk', gender: 'neuter' }, en: { word: 'present' }, adjectives: ['small', 'big', 'expensive'] }
};

const ADJECTIVES: Record<string, { level: VocabularyLevel; de: string; en: string }> = {
  red: { level: 'a1', de: 'rot', en: 'red' },
  green: { level: 'a1', de: 'grün', en: 'green' },
  yellow: { level: 'a1', de: 'gelb', en: 'yellow' },
  blue: { level: 'a1', de: 'blau', en: 'blue' },
  black: { level: 'a1', de: 'schwarz', en: 'black' },
  white: { level: 'a1', de: 'weiß', en: 'white' },
  big: { level: 'a1', de: 'groß', en: 'big' },
  small: { level: 'a1', de: 'klein', en: 'small' },
  new: { level: 'a1', de: 'neu', en: 'new' },
  old: { level: 'a1', de: 'alt', en: 'old' },
  young: { level: 'a1', de: 'jung', en: 'young' },
  long: { level: 'a1', de: 'lang', en: 'long' },
  short: { level: 'a1', de: 'kurz', en: 'short' },
  hot: { level: 'a1', de: 'heiß', en: 'hot' },
  cold: { level: 'a1', de: 'kalt', en: 'cold' },
  warm: { level: 'a1', de: 'warm', en: 'warm' },
  fresh: { level: 'a1', de: 'frisch', en: 'fresh' },
  sweet: { level: 'a1', de: 'süß', en: 'sweet' },
  tired: { level: 'a1', de: 'müde', en: 'tired' },
  friendly: { level: 'a1', de: 'freundlich', en: 'friendly' },
  heavy: { level: 'a2', de: 'schwer', en: 'heavy' },
  expensive: { level: 'a2', de: 'teuer', en: 'expensive' },
  sour: { level: 'a2', de: 'sauer', en: 'sour' },
  interesting: { level: 'a2', de: 'interessant', en: 'interesting' }
};

type VerbEntry = {
  level: VocabularyLevel;
  /** Key into `verbConjugations`. */
  de: string;
  /** Bare infinitive, plus the -s form when it isn't regular, and any particle ("look for"). */
  en: { base: string; third?: string; particle?: string };
  subjects: Array<'person' | 'animal'>;
  objects: NounKind[];
  /**
   * The object kinds a time phrase ("every day") fits with: "liest jeden Abend ein Buch", but not
   * "kauft jeden Morgen ein Auto". Empty when the verb takes none ("hat heute einen Hund").
   */
  time: NounKind[];
  /** Takes a person in the dative (German) / as indirect object (English) before the thing. */
  recipient?: true;
  /** Only sounds right with a known, definite object ("mag den Kuchen", not "mag einen Kuchen"). */
  definiteOnly?: true;
  /** Narrows `objects` to these nouns ("macht Kaffee", but not "makes water"). */
  only?: string[];
  /** Nouns of the allowed kinds that still don't fit ("kauft einen Brief"). */
  except?: string[];
  /** Doesn't go with a modal ("will den Kuchen mögen"). */
  noModal?: true;
  /** A was-question means something else ("Was hat er?" asks what is wrong with him). */
  noWh?: true;
  /** Nothing to be glad about, so it stays out of "… is happy because …". */
  unwelcome?: true;
};

const VERBS: Record<string, VerbEntry> = {
  buy: { level: 'a1', de: 'KAUFEN', en: { base: 'buy' }, subjects: ['person'], objects: ['food', 'drink', 'reading', 'thing'], time: ['food', 'drink', 'reading'], except: ['letter'] },
  eat: { level: 'a1', de: 'ESSEN', en: { base: 'eat' }, subjects: ['person'], objects: ['food'], time: ['food'] },
  drink: { level: 'a1', de: 'TRINKEN', en: { base: 'drink' }, subjects: ['person'], objects: ['drink'], time: ['drink'] },
  read: { level: 'a1', de: 'LESEN', en: { base: 'read' }, subjects: ['person'], objects: ['reading'], time: ['reading'] },
  write: { level: 'a1', de: 'SCHREIBEN', en: { base: 'write' }, subjects: ['person'], objects: ['reading'], time: ['reading'], only: ['letter', 'book'] },
  search: { level: 'a1', de: 'SUCHEN', en: { base: 'look', particle: 'for' }, subjects: ['person', 'animal'], objects: ['thing', 'animal'], time: ['thing', 'animal'] },
  see: { level: 'a1', de: 'SEHEN', en: { base: 'see' }, subjects: ['person', 'animal'], objects: ['animal', 'thing'], time: ['animal'] },
  find: { level: 'a1', de: 'FINDEN', en: { base: 'find' }, subjects: ['person', 'animal'], objects: ['thing'], time: [] },
  need: { level: 'a1', de: 'BRAUCHEN', en: { base: 'need' }, subjects: ['person'], objects: ['thing', 'food', 'drink'], time: ['food', 'drink'] },
  have: { level: 'a1', de: 'HABEN', en: { base: 'have', third: 'has' }, subjects: ['person'], objects: ['thing', 'animal'], time: [], noWh: true },
  like: { level: 'a1', de: 'MÖGEN', en: { base: 'like' }, subjects: ['person', 'animal'], objects: ['food', 'drink', 'animal'], time: [], definiteOnly: true, noModal: true, noWh: true },
  cook: { level: 'a1', de: 'KOCHEN', en: { base: 'make' }, subjects: ['person'], objects: ['drink', 'food'], time: ['drink', 'food'], only: ['coffee', 'tea', 'soup'] },
  take: { level: 'a1', de: 'NEHMEN', en: { base: 'take' }, subjects: ['person'], objects: ['food', 'thing'], time: ['food', 'thing'] },
  carry: { level: 'a2', de: 'TRAGEN', en: { base: 'carry' }, subjects: ['person'], objects: ['thing', 'reading'], time: ['thing', 'reading'], only: ['bag', 'ball', 'umbrella', 'present', 'book', 'newspaper'] },
  wash: { level: 'a2', de: 'WASCHEN', en: { base: 'wash' }, subjects: ['person'], objects: ['thing'], time: ['thing'], only: ['car', 'bike', 'jacket', 'bag', 'ball'] },
  lose: { level: 'a2', de: 'VERLIEREN', en: { base: 'lose' }, subjects: ['person'], objects: ['thing'], time: ['thing'], only: ['key', 'ball', 'bag', 'umbrella', 'jacket'], unwelcome: true },
  give: { level: 'a2', de: 'GEBEN', en: { base: 'give' }, subjects: ['person'], objects: ['food', 'thing', 'reading'], time: ['food', 'thing', 'reading'], recipient: true },
  show: { level: 'a2', de: 'ZEIGEN', en: { base: 'show' }, subjects: ['person'], objects: ['thing', 'reading'], time: ['thing', 'reading'], recipient: true },
  bring: { level: 'a2', de: 'BRINGEN', en: { base: 'bring' }, subjects: ['person'], objects: ['food', 'drink', 'thing', 'reading'], time: ['food', 'drink', 'thing', 'reading'], recipient: true }
};

const MODALS: Record<string, { level: VocabularyLevel; de: string; en: string }> = {
  can: { level: 'a2', de: 'KÖNNEN', en: 'can' },
  must: { level: 'a2', de: 'MÜSSEN', en: 'must' },
  want: { level: 'a2', de: 'WOLLEN', en: '' },
  wouldLike: { level: 'a2', de: 'MÖCHTEN', en: '' }
};

// English has no habitual reading for "today" or "now" with the simple present, so those stay German.
const TIMES: Record<string, { de: string; en: string }> = {
  today: { de: 'heute', en: '' },
  tomorrow: { de: 'morgen', en: '' },
  now: { de: 'jetzt', en: '' },
  everyDay: { de: 'jeden Tag', en: 'every day' },
  everyMorning: { de: 'jeden Morgen', en: 'every morning' },
  evening: { de: 'am Abend', en: 'in the evening' },
  sunday: { de: 'am Sonntag', en: 'on Sundays' }
};

// German main clauses for dass, English for that; the subordinate clause follows.
const DASS_FRAMES: Record<string, { de: string; en: string }> = {
  think: { de: 'ich glaube', en: 'I think' },
  know: { de: 'ich weiß', en: 'I know' },
  hope: { de: 'wir hoffen', en: 'we hope' }
};

export type Pronoun = 'i' | 'you' | 'he' | 'she' | 'we' | 'youPlural' | 'they';
// German person index into the conjugation table: ich, du, er/sie/es, wir, ihr, sie.
const PRONOUNS: Record<Pronoun, { de: string; en: string; person: number }> = {
  i: { de: 'ich', en: 'I', person: 0 },
  you: { de: 'du', en: 'you', person: 1 },
  he: { de: 'er', en: 'he', person: 2 },
  she: { de: 'sie', en: 'she', person: 2 },
  we: { de: 'wir', en: 'we', person: 3 },
  youPlural: { de: 'ihr', en: 'you', person: 4 },
  they: { de: 'sie', en: 'they', person: 5 }
};
const PRONOUN_IDS = Object.keys(PRONOUNS) as Pronoun[];

// ---------------------------------------------------------------------------------------------
// German forms.

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
const strongEndings: Record<GrammarCase, Record<VocabularyGender, string>> = {
  nominative: { masculine: 'er', feminine: 'e', neuter: 'es' },
  accusative: { masculine: 'en', feminine: 'e', neuter: 'es' },
  dative: { masculine: 'em', feminine: 'er', neuter: 'em' }
};
const GERMAN_PERSONAL_PRONOUN: Record<VocabularyGender, string> = { masculine: 'er', feminine: 'sie', neuter: 'es' };

/**
 * A German noun phrase in the singular: "einen roten Apfel", "dem Jungen", "kalte Milch",
 * "keinen Kaffee". `negative` turns an indefinite article into kein; a mass noun without an
 * article ("indefinite") takes strong adjective endings.
 */
export function germanNounPhrase(noun: GermanNoun, grammarCase: GrammarCase, determiner: Determiner, adjective?: string, negative = false): string[] {
  const form = declineNoun(noun.word, noun.gender, grammarCase);
  let article: string | null;
  let endings: Record<GrammarCase, Record<VocabularyGender, string>>;
  if (determiner === 'definite') {
    article = definiteArticlesByCase[grammarCase][noun.gender];
    endings = weakEndings;
  } else if (negative) {
    article = `k${indefiniteArticlesByCase[grammarCase][noun.gender]}`;
    endings = mixedEndings;
  } else if (noun.mass) {
    article = null;
    endings = strongEndings;
  } else {
    article = indefiniteArticlesByCase[grammarCase][noun.gender];
    endings = mixedEndings;
  }
  const words = adjective ? [inflectAdjective(adjective, endings[grammarCase][noun.gender]), form] : [form];
  return article ? [article, ...words] : words;
}

// ---------------------------------------------------------------------------------------------
// English forms.

/** "buy" → "buys", "carry" → "carries", "wash" → "washes", "go" → "goes", "have" → "has". */
export function englishThirdPerson(base: string): string {
  const irregular: Record<string, string> = { have: 'has', be: 'is', do: 'does', go: 'goes' };
  if (irregular[base]) return irregular[base];
  if (/[^aeiou]y$/u.test(base)) return `${base.slice(0, -1)}ies`;
  if (/(s|sh|ch|x|z|o)$/u.test(base)) return `${base}es`;
  return `${base}s`;
}

// Spelled with a vowel but said with a consonant (a university), or the other way round (an hour).
const CONSONANT_SOUND = /^(uni|use|usu|uti|eu|one|once|ewe)/u;
const VOWEL_SOUND = /^(hour|honest|honou?r|heir)/u;

/** "a" or "an" by the sound of the next word. */
export function englishIndefiniteArticle(nextWord: string): 'a' | 'an' {
  const lower = nextWord.toLocaleLowerCase();
  if (VOWEL_SOUND.test(lower)) return 'an';
  if (CONSONANT_SOUND.test(lower)) return 'a';
  return /^[aeiou]/u.test(lower) ? 'an' : 'a';
}

/** "a red apple", "an old car", "the bread", "cold milk", "an egg". */
export function englishNounPhrase(noun: EnglishNoun, determiner: Determiner, adjective?: string): string[] {
  const words = adjective ? [adjective, noun.word] : [noun.word];
  if (determiner === 'definite') return ['the', ...words];
  if (noun.mass) return words;
  return [englishIndefiniteArticle(words[0]!), ...words];
}

// ---------------------------------------------------------------------------------------------
// Constituents and their orders.

export type Role = 'frame' | 'conj' | 'wh' | 'subject' | 'verb' | 'time' | 'recipient' | 'object' | 'neg' | 'infinitive' | 'predicate';
export type Part = {
  role: Role;
  tokens: string[];
  /** A pronoun subject must stay right after the verb or conjunction. */
  pronoun?: true;
  /** An indefinite or article-less noun phrase: a time adverb doesn't follow it. */
  indefinite?: true;
  grammarCase?: GrammarCase;
  gender?: VocabularyGender;
};

const part = (role: Role, tokens: string[], extra: Partial<Part> = {}): Part => ({ role, tokens, ...extra });

/**
 * German middle field orders: the noun phrases keep their order (subject, dative, accusative) and
 * a time adverb may sit anywhere among them, except before a pronoun subject or after an
 * indefinite noun phrase ("kauft heute einen Apfel", not "kauft einen Apfel heute").
 */
function germanMiddleFields(core: Part[], time: Part | undefined): Part[][] {
  if (!time) return [core];
  const orders: Part[][] = [];
  for (let index = 0; index <= core.length; index += 1) {
    const before = core.slice(0, index);
    if (before.some((item) => item.indefinite)) break;
    if (index === 0 && core[0]?.role === 'subject' && core[0].pronoun) continue;
    orders.push([...before, time, ...core.slice(index)]);
  }
  return orders;
}

/** Every correct German main-clause order: one constituent in front, then the finite verb. */
function germanMainClauseOrders(parts: Part[], fronted: Role): Part[][] {
  const verb = parts.find((item) => item.role === 'verb')!;
  const time = parts.find((item) => item.role === 'time');
  const core = parts.filter((item) => ['subject', 'recipient', 'object'].includes(item.role));
  const tail = parts.filter((item) => ['neg', 'infinitive'].includes(item.role));
  const orders: Part[][] = [];
  const frontable = [fronted, ...(['subject', 'time', 'recipient', 'object'] as Role[]).filter((role) => role !== fronted)];
  for (const role of frontable) {
    const front = parts.find((item) => item.role === role);
    if (!front) continue;
    const rest = core.filter((item) => item !== front);
    for (const middle of germanMiddleFields(rest, front === time ? undefined : time)) orders.push([front, verb, ...middle, ...tail]);
  }
  return orders;
}

function flatten(order: Part[]): string[] {
  return order.flatMap((item) => item.tokens);
}

const SUBORDINATORS = new Set(['dass', 'weil']);

/** Joins tokens into a sentence: capital first letter, commas before dass/weil, final punctuation. */
export function renderSentence(tokens: string[], punctuation: '.' | '?', commaAfter: number[] = []): string {
  let text = '';
  tokens.forEach((token, index) => {
    if (index > 0) text += SUBORDINATORS.has(token) ? ', ' : ' ';
    text += index === 0 ? token.charAt(0).toLocaleUpperCase() + token.slice(1) : token;
    if (commaAfter.includes(index)) text += ',';
  });
  return `${text}${punctuation}`;
}

/** The words of a sentence without punctuation, for comparing orders. */
export function sentenceTokens(sentence: string): string[] {
  return sentence.split(/\s+/u).map((token) => token.replace(/^[„“"«]+|[,.!?;:„“"»]+$/gu, '')).filter(Boolean);
}

/** The correct sentence the learner's order matches, or null. Case is ignored: the tiles are fixed. */
export function matchOrder(exercise: OrderExercise, chosen: string[]): string | null {
  const wanted = chosen.map((token) => token.toLocaleLowerCase()).join(' ');
  return exercise.answers.find((answer) => sentenceTokens(answer).map((token) => token.toLocaleLowerCase()).join(' ') === wanted) ?? null;
}

// ---------------------------------------------------------------------------------------------
// Composing one sentence.

export type SentenceSpec = {
  structure: Exclude<SentenceStructure, 'curated'>;
  /** A noun id or a pronoun. */
  subject: { noun: string; determiner?: Determiner; adjective?: string } | { pronoun: Pronoun };
  verb: string;
  object?: { noun: string; determiner: Determiner; adjective?: string };
  recipient?: { noun: string; determiner: Determiner };
  time?: string;
  modal?: string;
  /** For dass/that clauses. */
  frame?: string;
};

/** Whether the verb can take this noun as its object. */
function fitsObject(verb: VerbEntry, nounId: string): boolean {
  const noun = NOUNS[nounId];
  if (!noun || !verb.objects.includes(noun.kind)) return false;
  if (verb.only && !verb.only.includes(nounId)) return false;
  return !verb.except?.includes(nounId);
}

function nounEntry(id: string | undefined): NounEntry | undefined {
  return id ? NOUNS[id] : undefined;
}

function subjectKind(spec: SentenceSpec): NounKind {
  return 'noun' in spec.subject ? nounEntry(spec.subject.noun)?.kind ?? 'thing' : 'person';
}

/** Whether the parts of a spec go together (lexicon, structure and language), before any words are built. */
function isCompatible(language: SentenceLanguage, spec: SentenceSpec): boolean {
  const verb = VERBS[spec.verb];
  if (!verb) return false;
  const kind = subjectKind(spec);
  if (kind !== 'person' && kind !== 'animal') return false;
  if (!verb.subjects.includes(kind)) return false;
  if ('noun' in spec.subject && spec.subject.adjective && !NOUNS[spec.subject.noun]!.adjectives.includes(spec.subject.adjective)) return false;
  const needsObject = spec.structure !== 'wquestion';
  const object = nounEntry(spec.object?.noun);
  if (needsObject && (!object || !fitsObject(verb, spec.object!.noun))) return false;
  if (!needsObject && spec.object) return false;
  if (object && spec.object?.adjective && !object.adjectives.includes(spec.object.adjective)) return false;
  if (object && verb.definiteOnly && spec.object?.determiner !== 'definite') return false;
  if ('noun' in spec.subject && spec.object && spec.subject.noun === spec.object.noun) return false;
  if (spec.structure === 'dative') {
    if (!verb.recipient || !spec.recipient || nounEntry(spec.recipient.noun)?.kind !== 'person') return false;
    if ('noun' in spec.subject && spec.subject.noun === spec.recipient.noun) return false;
  } else if (spec.recipient) return false;
  if (spec.structure === 'wquestion' && (verb.noWh || !verb.objects.some((item) => item !== 'person' && item !== 'animal'))) return false;
  if (spec.time) {
    const time = TIMES[spec.time];
    if (!time || !time[language] || verb.time.length === 0) return false;
    if (object && !verb.time.includes(object.kind)) return false;
    if (language === 'en' && spec.structure === 'dative') return false;
  }
  if (spec.structure === 'inversion' && !spec.time) return false;
  if (spec.structure === 'modal') {
    const modal = spec.modal ? MODALS[spec.modal] : undefined;
    if (!modal || !modal[language] || verb.noModal) return false;
  } else if (spec.modal) return false;
  if (spec.structure === 'dass' && !(spec.frame && DASS_FRAMES[spec.frame])) return false;
  // "weil" restates the subject as a pronoun, so a noun subject needs one; English nouns like
  // "teacher" have none that is safe.
  if (spec.structure === 'weil' && 'noun' in spec.subject && language === 'en' && !NOUNS[spec.subject.noun]!.en.pronoun) return false;
  if ((spec.structure === 'dass' || spec.structure === 'weil') && !('noun' in spec.subject)) return false;
  if (spec.structure === 'weil' && verb.unwelcome) return false;
  return true;
}

function germanExercise(spec: SentenceSpec): OrderExercise {
  const verb = VERBS[spec.verb]!;
  const forms = verbConjugations[verb.de]!.forms;
  const subjectNoun = 'noun' in spec.subject ? NOUNS[spec.subject.noun]!.de : null;
  const person = 'pronoun' in spec.subject ? PRONOUNS[spec.subject.pronoun].person : 2;
  const subjectPart = (() => {
    if ('pronoun' in spec.subject) return part('subject', [PRONOUNS[spec.subject.pronoun].de], { pronoun: true, grammarCase: 'nominative' });
    const adjective = spec.subject.adjective ? ADJECTIVES[spec.subject.adjective]!.de : undefined;
    return part('subject', germanNounPhrase(subjectNoun!, 'nominative', spec.subject.determiner ?? 'definite', adjective), { grammarCase: 'nominative', gender: subjectNoun!.gender, ...(spec.subject.determiner === 'indefinite' ? { indefinite: true as const } : {}) });
  })();
  const negative = spec.structure === 'negation';
  const object = spec.object ? NOUNS[spec.object.noun]!.de : null;
  // Negation: kein replaces an indefinite article (or the missing one of a mass noun); a definite object keeps its article and takes nicht at the end.
  const usesKein = negative && spec.object?.determiner === 'indefinite';
  const objectPart = object && spec.object
    ? part('object', germanNounPhrase(object, 'accusative', spec.object.determiner, spec.object.adjective ? ADJECTIVES[spec.object.adjective]!.de : undefined, usesKein), { grammarCase: 'accusative', gender: object.gender, ...(spec.object.determiner === 'indefinite' ? { indefinite: true as const } : {}) })
    : undefined;
  const recipientNoun = spec.recipient ? NOUNS[spec.recipient.noun]!.de : null;
  const recipientPart = recipientNoun && spec.recipient
    ? part('recipient', germanNounPhrase(recipientNoun, 'dative', spec.recipient.determiner), { grammarCase: 'dative', gender: recipientNoun.gender, ...(spec.recipient.determiner === 'indefinite' ? { indefinite: true as const } : {}) })
    : undefined;
  const timePart = spec.time ? part('time', TIMES[spec.time]!.de.split(' ')) : undefined;
  const negPart = negative && !usesKein ? part('neg', ['nicht']) : undefined;
  const modalForms = spec.modal ? verbConjugations[MODALS[spec.modal]!.de]!.forms : null;
  const finite = modalForms ? modalForms[person]! : forms[person]!;
  const verbPart = part('verb', [finite]);
  const infinitivePart = modalForms ? part('infinitive', [verb.de.toLocaleLowerCase()]) : undefined;
  const core = [subjectPart, recipientPart, objectPart].filter((item): item is Part => Boolean(item));
  const tail = [negPart, infinitivePart].filter((item): item is Part => Boolean(item));
  const all = [subjectPart, verbPart, timePart, recipientPart, objectPart, ...tail].filter((item): item is Part => Boolean(item));

  let orders: Part[][];
  let punctuation: '.' | '?' = '.';
  switch (spec.structure) {
    case 'question':
      punctuation = '?';
      orders = germanMiddleFields(core, timePart).map((middle) => [verbPart, ...middle, ...tail]);
      // Canonical: time right after the subject.
      orders.sort((a, b) => Number(a[1] !== subjectPart) - Number(b[1] !== subjectPart));
      break;
    case 'wquestion': {
      punctuation = '?';
      const wh = part('wh', ['was']);
      orders = germanMiddleFields(core, timePart).map((middle) => [wh, verbPart, ...middle]);
      orders.sort((a, b) => Number(a[2] !== subjectPart) - Number(b[2] !== subjectPart));
      break;
    }
    case 'dass':
    case 'weil': {
      const frame = spec.structure === 'dass'
        ? part('frame', DASS_FRAMES[spec.frame!]!.de.split(' '))
        : part('frame', [...germanNounPhrase(subjectNoun!, 'nominative', 'definite'), 'ist', 'glücklich']);
      const conj = part('conj', [spec.structure]);
      // After weil the subject is restated as er/sie/es.
      const clauseSubject = spec.structure === 'weil' ? part('subject', [GERMAN_PERSONAL_PRONOUN[subjectNoun!.gender]], { pronoun: true, grammarCase: 'nominative' }) : subjectPart;
      const clauseCore = [clauseSubject, recipientPart, objectPart].filter((item): item is Part => Boolean(item));
      orders = germanMiddleFields(clauseCore, timePart).map((middle) => [frame, conj, ...middle, ...tail, verbPart]);
      orders.sort((a, b) => Number(a[2] !== clauseSubject) - Number(b[2] !== clauseSubject));
      break;
    }
    default: {
      const fronted: Role = spec.structure === 'inversion' ? 'time' : 'subject';
      orders = germanMainClauseOrders(all, fronted);
      // Canonical: the fronted part, the verb, then the subject and time right after it.
      const canonicalIndex = orders.findIndex((order) => order[0]!.role === fronted && (fronted === 'time' || !timePart || order[2] === timePart));
      if (canonicalIndex > 0) orders.unshift(...orders.splice(canonicalIndex, 1));
    }
  }
  return finishExercise('de', spec.structure, orders, punctuation);
}

function englishExercise(spec: SentenceSpec): OrderExercise {
  const verb = VERBS[spec.verb]!;
  const subjectNoun = 'noun' in spec.subject ? NOUNS[spec.subject.noun]!.en : null;
  const pronoun = 'pronoun' in spec.subject ? spec.subject.pronoun : null;
  const thirdSingular = pronoun ? pronoun === 'he' || pronoun === 'she' : true;
  const subjectTokens = pronoun ? [PRONOUNS[pronoun].en] : englishNounPhrase(subjectNoun!, (spec.subject as { determiner?: Determiner }).determiner ?? 'definite', (spec.subject as { adjective?: string }).adjective ? ADJECTIVES[(spec.subject as { adjective: string }).adjective]!.en : undefined);
  const subjectPart = part('subject', subjectTokens, pronoun ? { pronoun: true } : {});
  const object = spec.object ? NOUNS[spec.object.noun]!.en : null;
  const objectPart = object && spec.object ? part('object', englishNounPhrase(object, spec.object.determiner, spec.object.adjective ? ADJECTIVES[spec.object.adjective]!.en : undefined)) : undefined;
  const recipientPart = spec.recipient ? part('recipient', englishNounPhrase(NOUNS[spec.recipient.noun]!.en, spec.recipient.determiner)) : undefined;
  const timePart = spec.time ? part('time', TIMES[spec.time]!.en.split(' ')) : undefined;
  const particle = verb.en.particle ? [verb.en.particle] : [];
  const finiteLexical = thirdSingular ? verb.en.third ?? englishThirdPerson(verb.en.base) : verb.en.base;
  const doForm = thirdSingular ? 'does' : 'do';
  const objects = [recipientPart, objectPart].filter((item): item is Part => Boolean(item));

  let orders: Part[][];
  let punctuation: '.' | '?' = '.';
  switch (spec.structure) {
    case 'question':
      punctuation = '?';
      orders = [[part('verb', [doForm]), subjectPart, part('infinitive', [verb.en.base, ...particle]), ...objects, ...(timePart ? [timePart] : [])]];
      break;
    case 'wquestion':
      punctuation = '?';
      orders = [[part('wh', ['what']), part('verb', [doForm]), subjectPart, part('infinitive', [verb.en.base, ...particle]), ...(timePart ? [timePart] : [])]];
      break;
    case 'negation':
      orders = [[subjectPart, part('verb', [doForm]), part('neg', ['not']), part('infinitive', [verb.en.base, ...particle]), ...objects, ...(timePart ? [timePart] : [])]];
      break;
    case 'dass': {
      const frame = part('frame', DASS_FRAMES[spec.frame!]!.en.split(' '));
      orders = [[frame, part('conj', ['that']), subjectPart, part('verb', [finiteLexical, ...particle]), ...objects, ...(timePart ? [timePart] : [])]];
      break;
    }
    case 'weil': {
      const frame = part('frame', [...englishNounPhrase(subjectNoun!, 'definite'), 'is', 'happy']);
      const restated = part('subject', [subjectNoun!.pronoun!], { pronoun: true });
      orders = [[frame, part('conj', ['because']), restated, part('verb', [finiteLexical, ...particle]), ...objects, ...(timePart ? [timePart] : [])]];
      break;
    }
    default: {
      const verbParts = spec.structure === 'modal'
        ? [part('verb', [MODALS[spec.modal!]!.en]), part('infinitive', [verb.en.base, ...particle])]
        : [part('verb', [finiteLexical, ...particle])];
      const base = [subjectPart, ...verbParts, ...objects];
      // A time phrase goes at the end or, set off by a comma, in front.
      const atEnd = timePart ? [...base, timePart] : base;
      const inFront = timePart ? [timePart, ...base] : null;
      orders = spec.structure === 'inversion' && inFront ? [inFront, atEnd] : inFront ? [atEnd, inFront] : [atEnd];
    }
  }
  return finishExercise('en', spec.structure, orders, punctuation, true);
}

function finishExercise(language: SentenceLanguage, structure: SentenceStructure, orders: Part[][], punctuation: '.' | '?', commaAfterFrontedTime = false): OrderExercise {
  const answers = [...new Set(orders.map((order) => {
    const tokens = flatten(order);
    const comma = commaAfterFrontedTime && order[0]!.role === 'time' && order.length > 1 ? [order[0]!.tokens.length - 1] : [];
    return renderSentence(tokens, punctuation, comma);
  }))];
  return { id: answers[0]!, language, structure, tokens: flatten(orders[0]!), answers, parts: orders[0]! };
}

/** Builds one exercise from an explicit spec, or null when its words don't go together. */
export function composeSentence(language: SentenceLanguage, spec: SentenceSpec): OrderExercise | null {
  if (!isCompatible(language, spec)) return null;
  return language === 'de' ? germanExercise(spec) : englishExercise(spec);
}

// ---------------------------------------------------------------------------------------------
// Hand-checked sentences for structures the builder doesn't make. Alternatives list the other
// correct orders of the same words.

type CuratedSentence = { level: VocabularyLevel; answers: string[] };

const CURATED: Record<SentenceLanguage, CuratedSentence[]> = {
  de: [
    { level: 'a1', answers: ['Ich lerne jeden Tag Deutsch.', 'Jeden Tag lerne ich Deutsch.', 'Deutsch lerne ich jeden Tag.'] },
    { level: 'a1', answers: ['Heute geht sie ins Kino.', 'Sie geht heute ins Kino.', 'Ins Kino geht sie heute.'] },
    { level: 'a1', answers: ['Der Hund schläft im Garten.', 'Im Garten schläft der Hund.'] },
    { level: 'a1', answers: ['Morgen fährt er nach Berlin.', 'Er fährt morgen nach Berlin.', 'Nach Berlin fährt er morgen.'] },
    { level: 'a1', answers: ['Die Kinder spielen im Park.', 'Im Park spielen die Kinder.'] },
    { level: 'a2', answers: ['Ich habe einen Kaffee bestellt.', 'Einen Kaffee habe ich bestellt.'] },
    { level: 'a2', answers: ['Am Abend liest sie ein Buch.', 'Sie liest am Abend ein Buch.'] },
    { level: 'a2', answers: ['Wir stehen jeden Morgen um sieben Uhr auf.', 'Jeden Morgen stehen wir um sieben Uhr auf.', 'Um sieben Uhr stehen wir jeden Morgen auf.'] },
    { level: 'a2', answers: ['Er ruft heute seine Mutter an.', 'Heute ruft er seine Mutter an.', 'Seine Mutter ruft er heute an.'] },
    { level: 'b1', answers: ['Ich bleibe zu Hause, weil ich krank bin.', 'Weil ich krank bin, bleibe ich zu Hause.'] },
    { level: 'b1', answers: ['Sie sagt, dass sie morgen kommt.'] },
    { level: 'b1', answers: ['Wenn es regnet, nehme ich den Bus.', 'Ich nehme den Bus, wenn es regnet.'] },
    { level: 'b2', answers: ['Obwohl er müde war, hat er noch gearbeitet.', 'Er hat noch gearbeitet, obwohl er müde war.'] },
    { level: 'b2', answers: ['Das Buch, das ich gestern gekauft habe, ist spannend.'] },
    { level: 'c1', answers: ['Hätte ich mehr Zeit gehabt, wäre ich mitgekommen.', 'Ich wäre mitgekommen, hätte ich mehr Zeit gehabt.'] },
    { level: 'c1', answers: ['Der Brief wurde gestern von meiner Schwester geschrieben.', 'Gestern wurde der Brief von meiner Schwester geschrieben.'] },
    { level: 'c2', answers: ['Je länger ich darüber nachdenke, desto weniger verstehe ich es.'] },
    { level: 'c2', answers: ['Es wäre besser gewesen, früher damit anzufangen.'] },
    // A2: the verb bracket (Perfekt, modal verbs, separable verbs) and time before place.
    { level: 'a2', answers: ['Gestern sind wir mit dem Zug nach Hamburg gefahren.', 'Wir sind gestern mit dem Zug nach Hamburg gefahren.'] },
    { level: 'a2', answers: ['Ich muss morgen früh aufstehen.', 'Morgen muss ich früh aufstehen.'] },
    { level: 'a2', answers: ['Kannst du mir bitte das Salz geben?'] },
    { level: 'a2', answers: ['Am Wochenende kaufe ich immer auf dem Markt ein.', 'Ich kaufe am Wochenende immer auf dem Markt ein.'] },
    { level: 'a2', answers: ['Sie hat ihrem Bruder ein Buch geschenkt.', 'Ihrem Bruder hat sie ein Buch geschenkt.'] },
    { level: 'a2', answers: ['Warum bist du gestern nicht gekommen?'] },
    // B1: subordinate clauses send the verb to the end; a clause in front counts as position one.
    { level: 'b1', answers: ['Ich weiß nicht, ob er heute Zeit hat.'] },
    { level: 'b1', answers: ['Als ich klein war, wohnten wir auf dem Land.', 'Wir wohnten auf dem Land, als ich klein war.'] },
    { level: 'b1', answers: ['Er lernt Deutsch, um in Wien zu studieren.', 'Um in Wien zu studieren, lernt er Deutsch.'] },
    { level: 'b1', answers: ['Ich freue mich darauf, dich bald wiederzusehen.'] },
    { level: 'b1', answers: ['Bevor wir essen, waschen wir uns die Hände.', 'Wir waschen uns die Hände, bevor wir essen.'] },
    { level: 'b1', answers: ['Kannst du mir sagen, wo der Bahnhof ist?'] },
    { level: 'b1', answers: ['Das ist der Mann, der mir geholfen hat.'] },
    { level: 'b1', answers: ['Ich würde gern mehr reisen, wenn ich mehr Zeit hätte.', 'Wenn ich mehr Zeit hätte, würde ich gern mehr reisen.'] },
    // B2: relative clauses with prepositions, passive with modal verbs, two-part connectors.
    { level: 'b2', answers: ['Nachdem sie gegessen hatten, gingen sie spazieren.', 'Sie gingen spazieren, nachdem sie gegessen hatten.'] },
    { level: 'b2', answers: ['Die Rechnung muss bis Freitag bezahlt werden.', 'Bis Freitag muss die Rechnung bezahlt werden.'] },
    { level: 'b2', answers: ['Er spricht sowohl Englisch als auch Spanisch.'] },
    { level: 'b2', answers: ['Entweder kommst du mit, oder du bleibst zu Hause.'] },
    { level: 'b2', answers: ['Ich habe weder Zeit noch Lust.'] },
    { level: 'b2', answers: ['Das ist die Kollegin, mit der ich zusammenarbeite.'] },
    { level: 'b2', answers: ['Statt zu lernen, hat er den ganzen Abend ferngesehen.', 'Er hat den ganzen Abend ferngesehen, statt zu lernen.'] },
    { level: 'b2', answers: ['Sie tat so, als ob sie nichts gehört hätte.'] },
    { level: 'b2', answers: ['Trotz des Regens sind wir spazieren gegangen.', 'Wir sind trotz des Regens spazieren gegangen.'] },
    { level: 'b2', answers: ['Ich lasse mein Auto morgen reparieren.', 'Morgen lasse ich mein Auto reparieren.'] },
    { level: 'b2', answers: ['Er ist nicht nur klug, sondern auch fleißig.'] },
    { level: 'b2', answers: ['Seitdem er in Berlin wohnt, sehen wir uns selten.', 'Wir sehen uns selten, seitdem er in Berlin wohnt.'] },
    { level: 'b2', answers: ['Ohne ein Wort zu sagen, verließ sie den Raum.', 'Sie verließ den Raum, ohne ein Wort zu sagen.'] },
    { level: 'b2', answers: ['Je mehr ich übe, desto besser spreche ich.'] },
    // C1: conditional clauses without wenn, passive alternatives, three verbs at the end.
    { level: 'c1', answers: ['Sollte es morgen regnen, fällt das Konzert aus.', 'Das Konzert fällt aus, sollte es morgen regnen.'] },
    { level: 'c1', answers: ['Das Problem lässt sich nicht so einfach lösen.', 'So einfach lässt sich das Problem nicht lösen.'] },
    { level: 'c1', answers: ['Er behauptet, den Vertrag nie unterschrieben zu haben.'] },
    { level: 'c1', answers: ['Ich weiß, dass er das nicht hätte sagen sollen.'] },
    { level: 'c1', answers: ['Wäre sie früher losgefahren, hätte sie den Zug erreicht.', 'Sie hätte den Zug erreicht, wäre sie früher losgefahren.'] },
    { level: 'c1', answers: ['Die Ergebnisse, auf die wir so lange gewartet haben, liegen endlich vor.'] },
    { level: 'c1', answers: ['Anstatt sich zu beschweren, sollte man selbst etwas ändern.', 'Man sollte selbst etwas ändern, anstatt sich zu beschweren.'] },
    { level: 'c1', answers: ['Der Antrag ist bis Ende des Monats einzureichen.', 'Bis Ende des Monats ist der Antrag einzureichen.'] },
    { level: 'c1', answers: ['Wie sich später herausstellte, war alles ein Missverständnis.', 'Alles war ein Missverständnis, wie sich später herausstellte.'] },
    { level: 'c1', answers: ['Es wird vermutet, dass der Brand absichtlich gelegt wurde.'] },
    { level: 'c1', answers: ['Soweit ich weiß, ist die Entscheidung noch nicht gefallen.', 'Die Entscheidung ist, soweit ich weiß, noch nicht gefallen.'] },
    { level: 'c1', answers: ['Dadurch, dass er täglich übt, macht er schnelle Fortschritte.', 'Er macht schnelle Fortschritte dadurch, dass er täglich übt.'] },
    { level: 'c1', answers: ['Kaum hatte er das Haus verlassen, begann es zu regnen.'] },
    { level: 'c1', answers: ['Sie scheint die Nachricht noch nicht gelesen zu haben.'] },
    // C2: extended participle phrases, concessive clauses and the full verb cluster.
    { level: 'c2', answers: ['Die von der Regierung beschlossenen Maßnahmen stoßen auf Kritik.'] },
    { level: 'c2', answers: ['Wie dem auch sei, wir müssen heute eine Entscheidung treffen.'] },
    { level: 'c2', answers: ['So sehr er sich auch bemühte, es gelang ihm nicht.'] },
    { level: 'c2', answers: ['Er soll das Geld schon vor Jahren ins Ausland gebracht haben.', 'Schon vor Jahren soll er das Geld ins Ausland gebracht haben.'] },
    { level: 'c2', answers: ['Das Angebot war zu gut, als dass man es hätte ablehnen können.'] },
    { level: 'c2', answers: ['Mag er auch recht haben, sein Ton war unangemessen.'] },
    { level: 'c2', answers: ['Nicht dass ich wüsste, aber ich frage gern noch einmal nach.'] },
    { level: 'c2', answers: ['Ohne dass es jemand bemerkt hätte, war sie verschwunden.', 'Sie war verschwunden, ohne dass es jemand bemerkt hätte.'] },
    { level: 'c2', answers: ['Wer auch immer das behauptet hat, er irrt sich.'] },
    { level: 'c2', answers: ['Es bleibt abzuwarten, ob sich die Lage bessern wird.'] },
    { level: 'c2', answers: ['Dem Bericht zufolge hätte der Unfall vermieden werden können.', 'Der Unfall hätte dem Bericht zufolge vermieden werden können.'] },
    { level: 'c2', answers: ['Kaum dass er angekommen war, musste er schon wieder aufbrechen.'] },
    { level: 'c2', answers: ['Was auch immer geschehen mag, ich stehe zu dir.'] },
    { level: 'c2', answers: ['Gesetzt den Fall, er sagt ab, wer übernimmt dann die Leitung?'] }
  ],
  en: [
    { level: 'a1', answers: ['I learn English every day.', 'Every day, I learn English.'] },
    { level: 'a1', answers: ['The dog sleeps in the garden.'] },
    { level: 'a1', answers: ['He drives to London on Mondays.', 'On Mondays, he drives to London.'] },
    { level: 'a1', answers: ['The children play in the park.'] },
    { level: 'a1', answers: ['We buy fresh bread every morning.', 'Every morning, we buy fresh bread.'] },
    { level: 'a2', answers: ['I have ordered a coffee.'] },
    { level: 'a2', answers: ['She reads a book in the evening.', 'In the evening, she reads a book.'] },
    { level: 'a2', answers: ['We get up at seven every morning.', 'Every morning, we get up at seven.'] },
    { level: 'a2', answers: ['Does he call his mother every day?'] },
    { level: 'b1', answers: ['I am staying at home because I am ill.'] },
    { level: 'b1', answers: ['She says that she will come tomorrow.'] },
    { level: 'b1', answers: ['If it rains, I take the bus.', 'I take the bus if it rains.'] },
    { level: 'b2', answers: ['Although he was tired, he kept working.', 'He kept working although he was tired.'] },
    { level: 'b2', answers: ['The book that I bought yesterday is exciting.'] },
    { level: 'c1', answers: ['Had I had more time, I would have come along.', 'I would have come along had I had more time.'] },
    { level: 'c1', answers: ['The letter was written by my sister yesterday.', 'Yesterday, the letter was written by my sister.'] },
    { level: 'c2', answers: ['The longer I think about it, the less I understand it.'] },
    { level: 'c2', answers: ['Never have I seen such a beautiful sunset.'] }
  ]
};

// Words that keep their capital at the start of a sentence too: English "I" and German nouns
// that open a curated sentence (none do today besides those listed).
const KEEP_CAPITAL = new Set(['I', 'Deutsch', 'English', 'London', 'Berlin']);

function curatedExercise(language: SentenceLanguage, sentence: CuratedSentence): OrderExercise {
  const [first, ...rest] = sentenceTokens(sentence.answers[0]!);
  const tokens = [KEEP_CAPITAL.has(first!) ? first! : first!.toLocaleLowerCase(), ...rest];
  return { id: sentence.answers[0]!, language, structure: 'curated', tokens, answers: sentence.answers, parts: [] };
}

export function curatedExercises(language: SentenceLanguage, level: VocabularyLevel): OrderExercise[] {
  return CURATED[language].filter((sentence) => sentence.level === level).map((sentence) => curatedExercise(language, sentence));
}

// ---------------------------------------------------------------------------------------------
// The pool for one language and level.

const STRUCTURES_BY_LEVEL: Record<VocabularyLevel, Array<Exclude<SentenceStructure, 'curated'>>> = {
  a1: ['statement', 'inversion', 'question', 'negation'],
  a2: ['statement', 'inversion', 'question', 'wquestion', 'negation', 'modal', 'dative'],
  b1: ['inversion', 'question', 'wquestion', 'negation', 'modal', 'dative', 'dass', 'weil'],
  b2: ['inversion', 'wquestion', 'modal', 'dative', 'dass', 'weil'],
  c1: ['inversion', 'modal', 'dative', 'dass', 'weil'],
  c2: ['inversion', 'modal', 'dative', 'dass', 'weil']
};

function atOrBelow(level: VocabularyLevel, limit: VocabularyLevel): boolean {
  return vocabularyLevels.indexOf(level) <= vocabularyLevels.indexOf(limit);
}

/** A small seeded generator, so a level's pool (and so its review keys) stays the same across visits. */
export function seededRandom(seed: string): () => number {
  let state = 0;
  for (let index = 0; index < seed.length; index += 1) state = (Math.imul(state, 31) + seed.charCodeAt(index)) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(values: readonly T[], random: () => number): T | undefined {
  return values.length > 0 ? values[Math.floor(random() * values.length)] : undefined;
}

export type PoolOptions = {
  /** How many generated sentences to aim for (curated ones come on top). */
  count?: number;
  random?: () => number;
  /**
   * The vocabulary's metadata for the language, keyed by uppercased word. A German noun whose
   * entry names a different gender than the lexicon is left out rather than trusted either way.
   */
  metadata?: Readonly<Record<string, VocabularyMetadata>>;
};

/** Generated plus hand-checked word-order exercises for one language and level. */
export function orderExercisePool(language: SentenceLanguage, level: VocabularyLevel, options: PoolOptions = {}): OrderExercise[] {
  const random = options.random ?? seededRandom(`${language}:${level}`);
  const count = options.count ?? 18;
  const metadata = options.metadata;
  const nounIds = Object.keys(NOUNS).filter((id) => {
    const entry = NOUNS[id]!;
    if (!atOrBelow(entry.level, level)) return false;
    if (language !== 'de' || !metadata) return true;
    const known = metadata[entry.de.word.toLocaleUpperCase()];
    return !known?.gender || known.gender === entry.de.gender;
  });
  const verbIds = Object.keys(VERBS).filter((id) => atOrBelow(VERBS[id]!.level, level) && Boolean(verbConjugations[VERBS[id]!.de]));
  const people = nounIds.filter((id) => NOUNS[id]!.kind === 'person');
  const subjects = nounIds.filter((id) => ['person', 'animal'].includes(NOUNS[id]!.kind));
  const modalIds = Object.keys(MODALS).filter((id) => atOrBelow(MODALS[id]!.level, level) && Boolean(MODALS[id]![language]));
  const timeIds = Object.keys(TIMES).filter((id) => Boolean(TIMES[id]![language]));
  const structures = STRUCTURES_BY_LEVEL[level];
  const generated = new Map<string, OrderExercise>();

  for (let attempt = 0; attempt < count * 40 && generated.size < count; attempt += 1) {
    const structure = pick(structures, random)!;
    const verbId = pick(structure === 'dative' ? verbIds.filter((id) => VERBS[id]!.recipient) : verbIds.filter((id) => !VERBS[id]!.recipient), random);
    if (!verbId) continue;
    const verb = VERBS[verbId]!;
    const usePronoun = structure !== 'dass' && structure !== 'weil' && random() < 0.3;
    const subjectId = pick(subjects.filter((id) => verb.subjects.includes(NOUNS[id]!.kind as 'person' | 'animal')), random);
    if (!usePronoun && !subjectId) continue;
    const subjectAdjectives = subjectId ? NOUNS[subjectId]!.adjectives.filter((id) => atOrBelow(ADJECTIVES[id]!.level, level)) : [];
    const adjectiveOn = random();
    const subject: SentenceSpec['subject'] = usePronoun
      ? { pronoun: pick(PRONOUN_IDS, random)! }
      : { noun: subjectId!, determiner: 'definite', ...(adjectiveOn < 0.2 && subjectAdjectives.length > 0 ? { adjective: pick(subjectAdjectives, random)! } : {}) };
    const objectId = pick(nounIds.filter((id) => fitsObject(verb, id) && id !== subjectId), random);
    const objectAdjectives = objectId ? NOUNS[objectId]!.adjectives.filter((id) => atOrBelow(ADJECTIVES[id]!.level, level)) : [];
    const object = structure === 'wquestion' || !objectId
      ? undefined
      : {
          noun: objectId,
          determiner: (verb.definiteOnly || random() < 0.4 ? 'definite' : 'indefinite') as Determiner,
          ...(adjectiveOn >= 0.2 && adjectiveOn < 0.7 && objectAdjectives.length > 0 ? { adjective: pick(objectAdjectives, random)! } : {})
        };
    const recipientId = structure === 'dative' ? pick(people.filter((id) => id !== subjectId), random) : undefined;
    const wantsTime = structure === 'inversion' || (verb.time.length > 0 && random() < 0.5);
    const time = wantsTime ? pick(timeIds, random) : undefined;
    const spec: SentenceSpec = {
      structure,
      subject,
      verb: verbId,
      ...(object ? { object } : {}),
      ...(recipientId ? { recipient: { noun: recipientId, determiner: 'definite' as Determiner } } : {}),
      ...(time ? { time } : {}),
      ...(structure === 'modal' ? { modal: pick(modalIds, random)! } : {}),
      ...(structure === 'dass' ? { frame: pick(Object.keys(DASS_FRAMES), random)! } : {})
    };
    const exercise = composeSentence(language, spec);
    if (exercise && !generated.has(exercise.id)) generated.set(exercise.id, exercise);
  }

  const levelIndex = vocabularyLevels.indexOf(level);
  const curated = [...curatedExercises(language, level), ...(levelIndex > 0 ? curatedExercises(language, vocabularyLevels[levelIndex - 1]!) : [])];
  return [...generated.values(), ...curated.filter((exercise) => !generated.has(exercise.id))];
}

/** Shuffles the tiles so they don't already spell out a correct answer, when that is possible. */
export function shuffleTiles(exercise: OrderExercise, shuffle: <T>(values: T[], random: () => number) => T[], random: () => number): string[] {
  let tiles = shuffle(exercise.tokens, random);
  for (let attempt = 0; attempt < 8 && matchOrder(exercise, tiles); attempt += 1) tiles = shuffle(exercise.tokens, random);
  return tiles;
}
