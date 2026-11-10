import type { Language, VocabularyLevel } from '#lib/data/vocabulary.js';
import { usesWord } from './conversation.js';
import { dialogues, partnerTopics, type DialogueContent, type DialogueStep, type Expect, type Lexicon, type TopicId } from './dialogues.js';

/*
 * The conversation without AI: a scripted dialogue that needs no model and no download. The
 * partner picks one of their topics (dialogues.ts) and asks its questions one by one, with a
 * question about each of the round's words in between ("Here is a word for you … say a sentence
 * with it"). Each answer is checked with simple rules – yes or no, a keyword of the topic, a
 * number, a sentence long enough, the target word used – and the partner reacts: praises it
 * (modelling the full sentence when the learner said only a word or two), helps with an example
 * and asks again, or moves on after a second miss. Pure and serialisable, so it can be tested.
 */

export type ScriptWord = { word: string; type?: string | undefined; article?: string | undefined; definition?: string | undefined };

export type ScriptSetup = {
  language: Language;
  level: VocabularyLevel;
  partnerId: string;
  partnerName: string;
  learnerName?: string;
  storyTitle?: string;
  // The round's target words, spelled as the learner should use them.
  words: readonly ScriptWord[];
};

type PlanItem = { kind: 'topic'; step: DialogueStep } | { kind: 'word'; word: ScriptWord };

export type ScriptState = {
  language: Language;
  level: VocabularyLevel;
  topic: TopicId;
  plan: PlanItem[];
  index: number;
  // Misses on the current question; after the second the partner moves on.
  attempts: number;
  // Target words the learner has used so far.
  used: string[];
  words: readonly ScriptWord[];
  done: boolean;
};

/**
 * good: the answer fits · ok: a sentence, though not the expected one · retry: asked again with
 * an example · skip: moved on after a second miss · done: the dialogue is over.
 */
export type Verdict = 'good' | 'ok' | 'retry' | 'skip' | 'done';

export type ScriptTurn = { state: ScriptState; line: string; verdict: Verdict };

const MAX_ATTEMPTS = 2;

function content(language: Language): DialogueContent {
  return dialogues[language] ?? dialogues.en;
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length]!;
}

function capitalize(text: string, language: Language) {
  return text ? text.charAt(0).toLocaleUpperCase(language) + text.slice(1) : text;
}

/** Fills the {placeholders} of a template; unknown ones stay empty. */
export function fill(template: string, values: Record<string, string>, language: Language = 'en'): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (key in values) return values[key]!;
    const lower = key.toLowerCase();
    // {Art} is the capitalised form of {art}, for the start of a sentence.
    return lower !== key && lower in values ? capitalize(values[lower]!, language) : '';
  });
}

function normalized(text: string, language: Language) {
  return text.toLocaleLowerCase(language).normalize('NFC').replace(/[’ʼ`]/g, "'");
}

/** Where `phrase` first appears in `text` as a whole word (or words), or -1. */
function phraseAt(text: string, phrase: string, language: Language): number {
  const target = normalized(phrase, language).trim();
  if (!target) return -1;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?<![\\p{L}\\p{N}'])${escaped}(?![\\p{L}\\p{N}])`, 'u').exec(normalized(text, language));
  return match ? match.index : -1;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/u).filter((part) => /[\p{L}\p{N}]/u.test(part)).length;
}

/** Whether the answer says yes or no; whichever comes first wins ("Nein, ich koche nicht gern"). */
export function yesOrNo(text: string, lexicon: Lexicon, language: Language): 'yes' | 'no' | null {
  const first = (phrases: readonly string[]) => phrases.map((phrase) => phraseAt(text, phrase, language)).filter((at) => at >= 0).reduce((low, at) => Math.min(low, at), Infinity);
  const yes = first(lexicon.yes);
  const no = first(lexicon.no);
  if (yes === Infinity && no === Infinity) return null;
  return no <= yes ? 'no' : 'yes';
}

export function hasNumber(text: string, lexicon: Lexicon, language: Language): boolean {
  return /\p{N}/u.test(text) || lexicon.numbers.some((number) => phraseAt(text, number, language) >= 0);
}

type Check = 'match' | 'yes' | 'no' | 'sentence' | 'miss';

/** Checks an answer against what the question expects. */
export function checkAnswer(text: string, expect: Expect, lexicon: Lexicon, language: Language): Check {
  const words = wordCount(text);
  const sentence = words >= 3 ? 'sentence' : 'miss';
  switch (expect.kind) {
    case 'yesno':
      return yesOrNo(text, lexicon, language) ?? sentence;
    case 'free':
      return words >= (expect.minWords ?? 2) ? 'match' : 'miss';
    case 'keywords': {
      if (expect.numbers && hasNumber(text, lexicon, language)) return 'match';
      return expect.words.some((word) => usesWord(text, word, language)) ? 'match' : sentence;
    }
  }
}

function modelLine(step: DialogueStep, text: string, lexicon: Lexicon, language: Language): string {
  if (!step.model) return '';
  const answer = text.trim().replace(/[.!?。]+$/u, '').trim();
  if (!answer) return '';
  if (step.modelWhen === 'number') {
    if (wordCount(answer) !== 1 || !hasNumber(answer, lexicon, language)) return '';
  } else {
    // Only a word or two, and not already the start of the full sentence.
    const firstOfModel = normalized(step.model.split(/\s+/u)[0] ?? '', language);
    const firstOfAnswer = normalized(answer.split(/\s+/u)[0] ?? '', language);
    if (wordCount(answer) > 2 || firstOfAnswer === firstOfModel) return '';
  }
  return fill(lexicon.model, { model: fill(step.model, { answer }, language) }, language);
}

/** The partner's question for a plan item. */
function askLine(item: PlanItem, lexicon: Lexicon, language: Language, random: () => number): string {
  if (item.kind === 'topic') return item.step.ask;
  const values = { word: item.word.word };
  return [
    fill(pick(lexicon.wordIntro, random), values, language),
    item.word.definition ? fill(lexicon.wordMeaning, { definition: item.word.definition.trim() }, language) : '',
    fill(pick(lexicon.wordAsk, random), values, language)
  ].filter(Boolean).join(' ');
}

/** Reply suggestions with a target word, from frames that fit its word type. */
export function wordChoices(word: ScriptWord, lexicon: Lexicon, language: Language): string[] {
  const frames = lexicon.wordChoices;
  const typed = word.type === 'noun' && !word.article ? undefined : frames[word.type as 'noun' | 'verb' | 'adjective'];
  // French and Italian elide the article ("l'"): no space after it then.
  const article = word.article ?? '';
  const values = { word: word.word, art: article };
  const filled = [...(typed ?? []), ...frames.any].map((frame) => fill(frame, values, language).replace(/(['’]) (?=\p{L})/u, '$1'));
  return filled.slice(0, 3);
}

function nextIndex(plan: readonly PlanItem[], from: number, used: readonly string[]): number {
  let index = from;
  // A word the learner has already used needs no question of its own.
  for (let item = plan[index]; item?.kind === 'word' && used.includes(item.word.word); item = plan[index]) index += 1;
  return index;
}

function chooseTopic(language: Language, partnerId: string, random: () => number): TopicId {
  const available = content(language).topics.map((topic) => topic.id);
  const liked = (partnerTopics[partnerId] ?? []).filter((id) => available.includes(id));
  return pick(liked.length ? liked : available, random);
}

/** Starts a dialogue: the greeting, the topic and the first question. */
export function startScript(setup: ScriptSetup, random: () => number = Math.random): ScriptTurn {
  const { language } = setup;
  const { lexicon, topics } = content(language);
  const topicId = chooseTopic(language, setup.partnerId, random);
  const topic = topics.find((entry) => entry.id === topicId) ?? topics[0]!;
  // Topic questions and word questions take turns; words left over come at the end.
  const plan: PlanItem[] = [];
  const steps = [...topic.steps];
  const words = [...setup.words];
  while (steps.length || words.length) {
    const step = steps.shift();
    if (step) plan.push({ kind: 'topic', step });
    const word = words.shift();
    if (word) plan.push({ kind: 'word', word });
  }
  const state: ScriptState = { language, level: setup.level, topic: topic.id, plan, index: 0, attempts: 0, used: [], words: setup.words, done: plan.length === 0 };
  const name = setup.learnerName?.trim();
  const line = [
    fill(pick(name ? lexicon.hello : lexicon.helloAnon, random), { learner: name ?? '', partner: setup.partnerName }, language),
    setup.storyTitle ? fill(lexicon.story, { story: setup.storyTitle }, language) : '',
    topic.intro,
    plan[0] ? askLine(plan[0], lexicon, language, random) : pick(lexicon.closing, random)
  ].filter(Boolean).join(' ');
  return { state, line, verdict: state.done ? 'done' : 'good' };
}

/** The partner's reaction to the learner's answer, and the next question (or goodbye). */
export function respond(state: ScriptState, text: string, random: () => number = Math.random): ScriptTurn {
  const item = state.plan[state.index];
  if (state.done || !item) return { state: { ...state, done: true }, line: '', verdict: 'done' };
  const { language } = state;
  const { lexicon } = content(language);
  const fresh = state.words.filter((word) => !state.used.includes(word.word) && usesWord(text, word.word, language)).map((word) => word.word);
  const used = [...state.used, ...fresh];
  const wordNote = fresh.length ? fill(pick(lexicon.wordPraise, random), { word: fresh[0]! }, language) : '';

  let verdict: Verdict;
  const parts: string[] = [];
  let plan = state.plan;
  if (item.kind === 'word') {
    if (used.includes(item.word.word)) {
      verdict = 'good';
      parts.push(wordNote || pick(lexicon.praise, random));
    } else if (state.attempts + 1 < MAX_ATTEMPTS) {
      verdict = 'retry';
      parts.push(fill(lexicon.wordRetry, { word: item.word.word, example: wordChoices(item.word, lexicon, language)[0] ?? item.word.word }, language));
    } else {
      verdict = 'skip';
      parts.push(pick(lexicon.moveOn, random), wordNote);
    }
  } else {
    const { step } = item;
    const check = checkAnswer(text, step.expect, lexicon, language);
    if (check === 'match' || check === 'yes' || check === 'no') {
      verdict = 'good';
      const model = modelLine(step, text, lexicon, language);
      parts.push(pick(lexicon.praise, random), model, step.react ?? '', wordNote);
      // A yes/no question branches into its follow-up.
      const follow = check === 'yes' ? step.yes : check === 'no' ? step.no : undefined;
      if (follow) plan = [...plan.slice(0, state.index + 1), { kind: 'topic', step: follow }, ...plan.slice(state.index + 1)];
    } else if (check === 'sentence') {
      verdict = 'ok';
      parts.push(wordNote || pick(lexicon.ack, random));
    } else if (state.attempts + 1 < MAX_ATTEMPTS) {
      verdict = 'retry';
      parts.push(wordNote, fill(pick(lexicon.retry, random), { example: step.choices[0] ?? '' }, language));
    } else {
      verdict = 'skip';
      parts.push(pick(lexicon.moveOn, random), wordNote);
    }
  }

  if (verdict === 'retry') {
    const next: ScriptState = { ...state, used, attempts: state.attempts + 1 };
    return { state: next, line: [...parts, item.kind === 'topic' ? item.step.ask : ''].filter(Boolean).join(' '), verdict };
  }
  const advanced: ScriptState = { ...state, plan, used, attempts: 0 };
  const index = nextIndex(plan, state.index + 1, used);
  const upcoming = plan[index];
  if (!upcoming) {
    const all = state.words.length > 0 && state.words.every((word) => used.includes(word.word));
    parts.push(all ? lexicon.allWords : '', pick(lexicon.closing, random));
    return { state: { ...advanced, index, done: true }, line: parts.filter(Boolean).join(' '), verdict };
  }
  parts.push(askLine(upcoming, lexicon, language, random));
  return { state: { ...advanced, index }, line: parts.filter(Boolean).join(' '), verdict };
}

/** Whether the reply suggestions show right away: at A1 and A2, and from B1 on after a miss. */
export function choicesOpen(state: ScriptState): boolean {
  return ['a1', 'a2'].includes(state.level) || state.attempts > 0;
}

/** Replies the learner can tap for the current question. */
export function replyChoices(state: ScriptState): string[] {
  const item = state.plan[state.index];
  if (state.done || !item) return [];
  const { lexicon } = content(state.language);
  return item.kind === 'topic' ? [...item.step.choices] : wordChoices(item.word, lexicon, state.language);
}
