// The home screen's catalogue: every mode with the channels it trains, so the page can filter by
// what the learner wants to do (hear, read, speak, write, …) and build a short daily mix that
// reaches the ear, the eye and the hand. Pure data and functions; icons and labels live in the page.
import type { StreakMode } from '#lib/streak/clientStreak.js';

export const CHANNELS = ['hear', 'read', 'speak', 'write', 'words', 'grammar', 'play'] as const;
export type Channel = (typeof CHANNELS)[number];
export type HomeGroup = 'games' | 'stories' | 'writing' | 'vocabulary' | 'grammar';

export type HomeModeId =
  | 'circle' | 'definitions' | 'wordle' | 'hangman' | 'taboo' | 'scribble'
  | 'stories' | 'reading' | 'listen' | 'conversation'
  | 'sentence' | 'fullText'
  | 'vocab' | 'pronunciation' | 'alltag' | 'dictionary' | 'falseFriends'
  | 'grammarFill' | 'grammarDetermine' | 'grammarOrder' | 'grammarForms';

export type HomeMode = {
  id: HomeModeId;
  href: string;
  group: HomeGroup;
  /** The first channel is the mode's main one and gives the card its colour. */
  channels: readonly [Channel, ...Channel[]];
  /** Which streak counter the mode fills, if any. */
  streak: StreakMode | null;
  /** Only offered for these learning languages. */
  languages?: readonly string[];
};

export const HOME_MODES: readonly HomeMode[] = [
  { id: 'circle', href: '/circle', group: 'games', channels: ['play', 'words'], streak: 'circle' },
  { id: 'definitions', href: '/circle/definitions', group: 'games', channels: ['play', 'read', 'words'], streak: 'definitions' },
  { id: 'wordle', href: '/wordle', group: 'games', channels: ['play', 'write'], streak: 'wordle' },
  { id: 'hangman', href: '/hangman', group: 'games', channels: ['play', 'words'], streak: 'hangman' },
  { id: 'taboo', href: '/taboo', group: 'games', channels: ['play', 'write', 'speak'], streak: 'taboo' },
  { id: 'scribble', href: '/scribble', group: 'games', channels: ['play', 'words'], streak: null, languages: ['de', 'en'] },
  { id: 'stories', href: '/stories', group: 'stories', channels: ['read', 'hear'], streak: 'story' },
  { id: 'reading', href: '/reading', group: 'stories', channels: ['read'], streak: 'reading' },
  { id: 'listen', href: '/listen', group: 'stories', channels: ['hear'], streak: 'listen' },
  { id: 'conversation', href: '/conversation', group: 'stories', channels: ['speak', 'hear', 'write'], streak: null },
  { id: 'sentence', href: '/sentence', group: 'writing', channels: ['write'], streak: 'sentence' },
  { id: 'fullText', href: '/sentence/full', group: 'writing', channels: ['write'], streak: 'sentence' },
  { id: 'vocab', href: '/vocab', group: 'vocabulary', channels: ['words', 'hear', 'read'], streak: 'vocab' },
  { id: 'pronunciation', href: '/pronunciation', group: 'vocabulary', channels: ['speak', 'hear'], streak: 'pronunciation' },
  { id: 'alltag', href: '/alltag', group: 'vocabulary', channels: ['words'], streak: 'alltag' },
  { id: 'dictionary', href: '/dictionary', group: 'vocabulary', channels: ['words', 'read'], streak: null },
  { id: 'falseFriends', href: '/grammar?mode=falsefriends', group: 'vocabulary', channels: ['words'], streak: 'grammar' },
  { id: 'grammarFill', href: '/grammar?mode=fill', group: 'grammar', channels: ['grammar'], streak: 'grammar' },
  { id: 'grammarDetermine', href: '/grammar?mode=determine', group: 'grammar', channels: ['grammar', 'read'], streak: 'grammar' },
  { id: 'grammarOrder', href: '/grammar?mode=order', group: 'grammar', channels: ['grammar', 'write'], streak: 'grammar' },
  { id: 'grammarForms', href: '/grammar?mode=forms', group: 'grammar', channels: ['grammar', 'write'], streak: 'grammar', languages: ['de'] }
];

export const HOME_GROUPS: readonly HomeGroup[] = ['games', 'stories', 'writing', 'vocabulary', 'grammar'];

export function modesForLanguage(language: string): HomeMode[] {
  return HOME_MODES.filter((mode) => !mode.languages || mode.languages.includes(language));
}

/** The modes a filter chip shows; `all` keeps the catalogue's order, a channel puts its main modes first. */
export function modesForChannel(channel: Channel | 'all', language: string): HomeMode[] {
  const modes = modesForLanguage(language);
  if (channel === 'all') return modes;
  const matching = modes.filter((mode) => mode.channels.includes(channel));
  return [...matching.filter((mode) => mode.channels[0] === channel), ...matching.filter((mode) => mode.channels[0] !== channel)];
}

// How the learner likes to take things in. It only weights what is offered first; every style still
// meets the other channels, because words stick best when they are heard, seen and used.
export const LEARNING_STYLES = ['mixed', 'hear', 'see', 'write', 'do'] as const;
export type LearningStyle = (typeof LEARNING_STYLES)[number];
export function isLearningStyle(value: unknown): value is LearningStyle {
  return typeof value === 'string' && (LEARNING_STYLES as readonly string[]).includes(value);
}

/** The three steps of the daily mix: one for the ear, one for the eye, one for the hand. */
export type MixStep = 'hear' | 'see' | 'do';
export type MixEntry = { step: MixStep; mode: HomeMode; done: boolean };

const MIX_CANDIDATES: Record<MixStep, readonly HomeModeId[]> = {
  hear: ['listen', 'pronunciation', 'stories'],
  see: ['vocab', 'reading', 'definitions', 'alltag'],
  do: ['grammarOrder', 'sentence', 'circle', 'wordle', 'grammarForms', 'hangman']
};
const STYLE_FIRST: Record<LearningStyle, MixStep> = { mixed: 'see', hear: 'hear', see: 'see', write: 'do', do: 'do' };
const STYLE_DO: Partial<Record<LearningStyle, readonly HomeModeId[]>> = {
  write: ['sentence', 'grammarForms', 'grammarOrder', 'wordle', 'circle', 'hangman'],
  do: ['grammarOrder', 'circle', 'wordle', 'hangman', 'sentence', 'grammarForms']
};

/** A stable number per calendar day, so the mix changes daily but not on every visit. */
export function dayIndex(dateKey: string): number {
  let hash = 0;
  for (const char of dateKey) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/**
 * Today's mix: per step the first candidate (rotated by the day) that has not counted today, and
 * a finished one only when all of the step's candidates are done. Due words always take the "see"
 * step, because reviews on time are worth more than anything new.
 */
export function dailyMix(input: {
  language: string;
  dateKey: string;
  style: LearningStyle;
  dueWords: number;
  isDone: (mode: StreakMode) => boolean;
}): MixEntry[] {
  const available = new Map(modesForLanguage(input.language).map((mode) => [mode.id, mode]));
  const rotation = dayIndex(input.dateKey);
  const order: MixStep[] = [STYLE_FIRST[input.style], ...(['see', 'hear', 'do'] as const).filter((step) => step !== STYLE_FIRST[input.style])];
  const used = new Set<StreakMode>();
  const entries: MixEntry[] = [];
  for (const step of order) {
    const ids = step === 'do' ? STYLE_DO[input.style] ?? MIX_CANDIDATES.do : MIX_CANDIDATES[step];
    const candidates = ids.map((id) => available.get(id)).filter((mode): mode is HomeMode => Boolean(mode));
    if (!candidates.length) continue;
    const start = step === 'see' && input.dueWords > 0 ? 0 : rotation % candidates.length;
    const rotated = [...candidates.slice(start), ...candidates.slice(0, start)];
    // Two steps never share a streak counter (the grammar modes all fill the same one).
    const fresh = rotated.filter((mode) => !mode.streak || !used.has(mode.streak));
    const pool = fresh.length ? fresh : rotated;
    const open = pool.find((mode) => !mode.streak || !input.isDone(mode.streak));
    const mode = open ?? pool[0]!;
    if (mode.streak) used.add(mode.streak);
    entries.push({ step, mode, done: !open });
  }
  return entries;
}
