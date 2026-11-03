/*
 * Cosmetic rewards for the learner's character: the catalog and the rules, without any state.
 * Every mode has one item of its own, unlocked by playing that mode really well (a flawless round,
 * a long run of first-try answers, …). The unlocked list itself lives in cosmetics.svelte.ts.
 */
import type { Avatar, AvatarPart } from './avatar.js';

export type CosmeticMode =
  | 'vocab' | 'circle' | 'definitions' | 'wordle' | 'hangman' | 'pronunciation' | 'alltag'
  | 'grammar' | 'story' | 'reading' | 'listen' | 'conversation';

export type Cosmetic = { mode: CosmeticMode; part: AvatarPart; choice: string };

// One item per mode, each a part the story cast already wears somewhere (StoryCharacter draws it).
export const cosmetics: Record<CosmeticMode, Cosmetic> = {
  vocab: { mode: 'vocab', part: 'extra', choice: 'monocle' },
  circle: { mode: 'circle', part: 'extra', choice: 'tyrolean' },
  definitions: { mode: 'definitions', part: 'extra', choice: 'pencil' },
  wordle: { mode: 'wordle', part: 'shirt', choice: 'waistcoat' },
  hangman: { mode: 'hangman', part: 'extra', choice: 'kaiser' },
  pronunciation: { mode: 'pronunciation', part: 'extra', choice: 'toque' },
  alltag: { mode: 'alltag', part: 'extra', choice: 'straw' },
  grammar: { mode: 'grammar', part: 'shirt', choice: 'tracht' },
  story: { mode: 'story', part: 'shirt', choice: 'overalls' },
  reading: { mode: 'reading', part: 'shirt', choice: 'tie' },
  listen: { mode: 'listen', part: 'hair', choice: '#9fc6e8' },
  conversation: { mode: 'conversation', part: 'top', choice: '#d4af37' }
};
export const cosmeticModes = Object.keys(cosmetics) as CosmeticMode[];

// Runs of first-try answers that count as "really well" in the answer-by-answer modes. The other
// modes unlock from a single flawless round (see each mode's call to unlockCosmetic).
export const RUN_TARGETS: Partial<Record<CosmeticMode, number>> = { vocab: 15, grammar: 15, alltag: 20, pronunciation: 10 };
// Full listening sessions, since listening has no wrong answers to avoid.
export const LISTEN_TARGET = 3;

export const COSMETICS_KEY = 'wordcircle-cosmetics-v1';

/** The stored unlocked list; anything unknown is dropped. */
export function parseUnlocked(raw: string | null): CosmeticMode[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? cosmeticModes.filter((mode) => value.includes(mode)) : [];
  } catch {
    return [];
  }
}

/** The mode whose item this choice is, if it is a reward at all. */
export function rewardFor(part: AvatarPart, choice: string): CosmeticMode | null {
  return cosmeticModes.find((mode) => cosmetics[mode].part === part && cosmetics[mode].choice === choice) ?? null;
}

export function lockedIn(part: AvatarPart, choice: string, unlocked: readonly CosmeticMode[]): boolean {
  const mode = rewardFor(part, choice);
  return mode !== null && !unlocked.includes(mode);
}

/** Whether every part of `avatar` is either a basic choice or an unlocked reward. */
export function avatarAllowed(avatar: Avatar, unlocked: readonly CosmeticMode[]): boolean {
  return (Object.keys(avatar) as AvatarPart[]).every((part) => !lockedIn(part, String(avatar[part]), unlocked));
}

/** The next length of a run of first-try answers, and whether it reaches the mode's target. */
export function nextRun(mode: CosmeticMode, run: number, correctFirstTry: boolean): { run: number; reached: boolean } {
  const target = RUN_TARGETS[mode];
  const next = correctFirstTry ? run + 1 : 0;
  return { run: next, reached: Boolean(target) && next >= (target ?? Infinity) };
}
