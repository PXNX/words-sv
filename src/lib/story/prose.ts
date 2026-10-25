import type { Language } from '#lib/data/vocabulary.js';
import { characterNames, fillName, type CharacterId, type Story, type StoryBeat } from './stories';
import type { ReadingBlock, ReadingQuestion, SpeechStyle } from './readingTexts';

export type ReadingQuestionView = ReadingQuestion & { answer: string };

export type StoryProse = {
  blocks: ReadingBlock[];
  questions: ReadingQuestionView[];
};

// Third-person forms used when a spoken line is folded into prose.
const speechVerbs: Record<Language, Record<SpeechStyle, string>> = {
  de: { say: 'sagt', shout: 'ruft', whisper: 'flüstert', ask: 'fragt', answer: 'antwortet', laugh: 'lacht', sigh: 'seufzt', murmur: 'murmelt', call: 'ruft' },
  en: { say: 'says', shout: 'shouts', whisper: 'whispers', ask: 'asks', answer: 'answers', laugh: 'laughs', sigh: 'sighs', murmur: 'murmurs', call: 'calls' },
  fr: { say: 'dit', shout: 'crie', whisper: 'chuchote', ask: 'demande', answer: 'répond', laugh: 'rit', sigh: 'soupire', murmur: 'murmure', call: 'appelle' },
  it: { say: 'dice', shout: 'grida', whisper: 'sussurra', ask: 'chiede', answer: 'risponde', laugh: 'ride', sigh: 'sospira', murmur: 'mormora', call: 'chiama' },
  es: { say: 'dice', shout: 'grita', whisper: 'susurra', ask: 'pregunta', answer: 'responde', laugh: 'ríe', sigh: 'suspira', murmur: 'murmura', call: 'llama' },
  pt: { say: 'diz', shout: 'grita', whisper: 'sussurra', ask: 'pergunta', answer: 'responde', laugh: 'ri', sigh: 'suspira', murmur: 'murmura', call: 'chama' },
  uk: { say: 'каже', shout: 'кричить', whisper: 'шепоче', ask: 'питає', answer: 'відповідає', laugh: 'сміється', sigh: 'зітхає', murmur: 'бурмоче', call: 'кличе' }
};

/** How a line is spoken, read from its explicit mood and from the shape of the German text. */
export function speechStyleFor(beat: Extract<StoryBeat, { kind: 'line' }>): SpeechStyle {
  if (beat.mood === 'angry') return 'shout';
  if (beat.mood === 'laughing') return 'laugh';
  if (beat.mood === 'sad') return 'murmur';
  if (beat.mood === 'sleepy') return 'murmur';
  const text = beat.text.de;
  if (/psst|ganz leise|flüster/i.test(text)) return 'whisper';
  if (beat.mood === 'curious') return /\?\s*$/.test(text) ? 'ask' : 'say';
  if (/\?\s*$/.test(text)) return 'ask';
  if (/!+\s*$/.test(text)) return beat.mood === 'worried' ? 'whisper' : 'shout';
  if (/…\s*$|\.\.\.\s*$/.test(text)) return 'whisper';
  return 'say';
}

/** "sagt Mia", "ruft Tom", "flüstert Lilith" in the learning language. */
export function attribution(speaker: string, style: SpeechStyle, language: Language): string {
  return `${speechVerbs[language][style]} ${speaker}`;
}

/** German attribution for the written texts, whose prose is always German. */
export function germanAttribution(speaker: string, style: SpeechStyle): string {
  return attribution(speaker, style, 'de');
}

// A tiny deterministic shuffle: the answer order stays put when the page renders again, and the
// correct answer is not always the first button.
function shuffleStable<T>(items: T[], seed: string): T[] {
  let state = 0;
  for (let index = 0; index < seed.length; index += 1) state = (state * 31 + seed.charCodeAt(index)) % 2147483647;
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (state * 1103515245 + 12345) % 2147483647;
    const swap = state % (index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function questionView(prompt: string, options: string[], seed: string): ReadingQuestionView {
  const answer = options[0];
  return { prompt, options: shuffleStable(options, seed), answer };
}

function pushParagraph(blocks: ReadingBlock[], text: string) {
  const last = blocks.at(-1);
  // Short narration beats are joined into one paragraph; a long one starts a new paragraph.
  if (last?.kind === 'paragraph' && last.text.length + text.length < 360) {
    last.text = `${last.text} ${text}`;
    return;
  }
  blocks.push({ kind: 'paragraph', text });
}

/**
 * Turns a story into a continuous text: narration becomes paragraphs, dialogue becomes quoted
 * prose with a speech attribution, and comprehension questions move to the end instead of sitting
 * between the lines. The correct reply is woven in as the reader's own line.
 */
export function storyProse(story: Story, language: Language, name: string, seed = story.id): StoryProse {
  const blocks: ReadingBlock[] = [];
  const questions: ReadingQuestionView[] = [];
  for (const beat of story.beats) {
    if (beat.kind === 'narration') {
      pushParagraph(blocks, fillName(beat.text[language], name));
      continue;
    }
    if (beat.kind === 'line') {
      blocks.push({
        kind: 'quote',
        speaker: beat.speaker,
        text: fillName(beat.text[language], name),
        speech: speechStyleFor(beat)
      });
      continue;
    }
    if (beat.kind === 'reply') {
      blocks.push({ kind: 'quote', speaker: 'you', text: fillName(beat.options[0][language], name), speech: 'answer' });
      continue;
    }
    questions.push(questionView(
      fillName(beat.prompt[language], name),
      beat.options.map((option) => fillName(option[language], name)),
      `${seed}:${questions.length}`
    ));
  }
  return { blocks, questions };
}

/** The speaker's display name, with the reader's own name for their replies. */
export function speakerName(speaker: CharacterId | 'you', language: Language, name: string): string {
  return speaker === 'you' ? name : characterNames[speaker][language];
}

/** Scores a multiple-choice question against its stored answer. */
export function isCorrectAnswer(question: ReadingQuestionView, option: string): boolean {
  return option === question.answer;
}
