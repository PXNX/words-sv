import type { Language, VocabularyLevel } from '#lib/data/vocabulary.js';

/*
 * The pure part of the conversation mode: which words a round practises, what the on-device model
 * is told, and which of the words the learner has already used. No model or browser API in here,
 * so it can be tested on its own.
 */

export type Speaker = 'partner' | 'learner';
export type Turn = { speaker: Speaker; text: string };
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export const TARGET_WORD_COUNT = 5;
// The model's context window is small (4k tokens), so only the most recent turns are sent along.
export const HISTORY_TURNS = 12;

const languageNames: Record<Language, string> = {
  de: 'German', en: 'English', fr: 'French', it: 'Italian', es: 'Spanish', pt: 'Portuguese', uk: 'Ukrainian'
};

const levelStyle: Record<VocabularyLevel, string> = {
  a1: 'Use very short, simple sentences (A1 level): present tense, everyday words only.',
  a2: 'Use short, simple sentences (A2 level): everyday topics, simple past is fine.',
  b1: 'Use clear sentences of medium length (B1 level).',
  b2: 'Speak naturally at B2 level, with some varied sentence structures.',
  c1: 'Speak fluently at C1 level, with idiomatic expressions where they fit.',
  c2: 'Speak like an educated native speaker (C2 level).'
};

/** Picks `count` distinct words at random. */
export function pickTargetWords(pool: readonly string[], count = TARGET_WORD_COUNT, random: () => number = Math.random): string[] {
  const unique = [...new Set(pool)];
  for (let index = unique.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [unique[index], unique[swap]] = [unique[swap], unique[index]];
  }
  return unique.slice(0, count);
}

/** Who the model plays (see partners.ts); optional, so the prompt also works without a character. */
export type PromptPartner = { name: string; background: string; storyTitle: string; memory: readonly string[] };

export type PromptSetup = {
  language: Language;
  level: VocabularyLevel;
  // The round's words, which the learner should hear and use.
  targetWords: readonly string[];
  // A sample of the level's word list: the vocabulary the model should prefer in general.
  levelWords?: readonly string[];
  learnerName?: string;
  partner?: PromptPartner | null;
};

export const LEVEL_WORD_SAMPLE = 40;

export function systemPrompt({ language, level, targetWords, levelWords = [], learnerName = '', partner = null }: PromptSetup): string {
  const name = languageNames[language];
  return [
    partner
      ? `You are ${partner.name}, ${partner.background}. Stay in character and talk like this person would, warmly and with a little humour. You are chatting with someone who is practising ${name}.`
      : `You are a friendly conversation partner helping someone practise ${name}.`,
    `Speak only ${name}, never any other language.`,
    levelStyle[level],
    partner && partner.memory.length ? `You both remember this moment from the story "${partner.storyTitle}": ${partner.memory.join(' ')} You may bring it up.` : '',
    `This conversation practises these words: ${targetWords.join(', ')}. Build the topic around them and use one or two of them naturally in each reply, so the learner hears them and gets chances to use them too.`,
    levelWords.length ? `Otherwise prefer simple, common words like these from the learner's level: ${levelWords.join(', ')}. Avoid rare or advanced words.` : '',
    'Reply with one to three sentences and end with a question that keeps the conversation going.',
    'If the learner made a mistake, first repeat their sentence correctly in a few words, then continue. Do not explain grammar.',
    'This is a spoken conversation: no lists, no emojis, no markdown, no translations.',
    learnerName ? `The learner's name is ${learnerName}.` : ''
  ].filter(Boolean).join('\n');
}

// Asks the model for the very first line. It is not part of the transcript.
export function openingRequest(language: Language): string {
  return `Start the conversation in ${languageNames[language]}: greet me briefly, in character, and ask me a first question about one of the words.`;
}

/** The messages to send for the partner's next reply. */
export function chatMessages(setup: PromptSetup, turns: readonly Turn[]): ChatMessage[] {
  const recent = turns.slice(-HISTORY_TURNS);
  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt(setup) }];
  // Chat models expect the user to speak first; when the history starts with the partner (or was
  // cut so it does), the hidden opening request stands in front of it.
  if (recent[0]?.speaker !== 'learner') messages.push({ role: 'user', content: openingRequest(setup.language) });
  for (const turn of recent) messages.push({ role: turn.speaker === 'learner' ? 'user' : 'assistant', content: turn.text });
  return messages;
}

/** Cleans up a model reply for display and speech: no markdown, no stray role labels. */
export function cleanReply(text: string): string {
  return text
    .replace(/<think>[\s\S]*?(<\/think>|$)/g, '')
    .replace(/[*_#`]+/g, '')
    .replace(/^\s*(assistant|partner)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(text: string, language: Language) {
  return text.toLocaleLowerCase(language).normalize('NFC');
}

/**
 * Whether `text` contains `word`. Words match at the start of a word, so inflected forms count
 * ("Hunde" for "Hund", "spielte" for "spielen" does not, but "spielen" / "spielt" via the stem do).
 */
export function usesWord(text: string, word: string, language: Language): boolean {
  const target = normalize(word, language).trim();
  if (!target) return false;
  // Verbs and adjectives inflect at the end: compare the stem without the last one or two letters.
  const stem = target.length > 5 ? target.slice(0, -2) : target.length > 3 ? target.slice(0, -1) : target;
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}])${escaped}`, 'u').test(normalize(text, language));
}

/** The target words the learner has used so far, in their original order. */
export function usedWords(turns: readonly Turn[], targetWords: readonly string[], spellingOf: (word: string) => string, language: Language): string[] {
  const said = turns.filter((turn) => turn.speaker === 'learner').map((turn) => turn.text).join(' ');
  return targetWords.filter((word) => usesWord(said, spellingOf(word), language));
}
