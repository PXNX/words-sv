/*
 * Which cosmetic rewards the learner has unlocked (the catalog and rules are in cosmetics.ts).
 * Unlocked items stay unlocked; they live in localStorage next to the avatar (and travel with the
 * Telegram-saved progress). `justUnlocked` drives the pop-up (CosmeticUnlockToast) over whatever
 * mode is open.
 */
import { readScribbleWins } from '#lib/scribble/scribbleWins.js';
import type { AvatarPart } from './avatar.js';
import { COSMETICS_KEY, earnedAchievementRewards, earnedInviteRewards, earnedLanguageRewards, lockedIn, nextHangmanRun, nextRun, parseUnlocked, type CosmeticMode, type RewardId } from './cosmetics.js';
import { buildAchievements } from '#lib/progress/achievements.js';
import { readActivity } from '#lib/progress/activity.js';
import type { Language } from '#lib/data/vocabulary.js';

export { cosmetics, cosmeticModes, rewardFor, rewardIds, LISTEN_TARGET, WORDLE_TOP_TRIES, type CosmeticMode, type RewardId } from './cosmetics.js';

const HANGMAN_RUN_KEY = 'wordcircle-hangman-win-run-v1';

function readUnlocked(): RewardId[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return parseUnlocked(localStorage.getItem(COSMETICS_KEY));
  } catch {
    return [];
  }
}

export const cosmeticState = $state<{ unlocked: RewardId[]; justUnlocked: RewardId | null }>({ unlocked: readUnlocked(), justUnlocked: null });

export function isLocked(part: AvatarPart, choice: string, unlocked: readonly RewardId[] = cosmeticState.unlocked): boolean {
  return lockedIn(part, choice, unlocked);
}

/** Unlocks a reward; returns true only the first time. */
export function unlockCosmetic(id: RewardId): boolean {
  if (cosmeticState.unlocked.includes(id)) return false;
  cosmeticState.unlocked = [...cosmeticState.unlocked, id];
  cosmeticState.justUnlocked = id;
  try {
    localStorage.setItem(COSMETICS_KEY, JSON.stringify(cosmeticState.unlocked));
  } catch {
    // A full quota only means the reward is not remembered after a reload.
  }
  return true;
}

// Current runs of first-try answers, per mode, for this visit.
const runs: Partial<Record<CosmeticMode, number>> = {};

/** Counts a first-try answer towards the mode's run (and its high score); a miss starts over. */
export function recordAnswer(mode: CosmeticMode, correctFirstTry: boolean): void {
  const { run, reached, score } = nextRun(mode, runs[mode] ?? 0, correctFirstTry);
  runs[mode] = run;
  if (reached) unlockCosmetic(mode);
  if (score) unlockCosmetic(score);
}

/** Counts a finished Hangman word; five won in a row (across visits) is a high score. */
export function recordHangmanResult(won: boolean): void {
  let current = 0;
  try { current = Number(localStorage.getItem(HANGMAN_RUN_KEY)) || 0; } catch { /* starts at zero */ }
  const { run, reached } = nextHangmanRun(current, won);
  try { localStorage.setItem(HANGMAN_RUN_KEY, String(run)); } catch { /* only the run is forgotten */ }
  if (reached) unlockCosmetic('score_hangman_five');
}

/**
 * Unlocks the items of every finished achievement. Runs at startup and after streak changes (every
 * mode updates the streak), and on the progress page with the full count of mastered words.
 */
export function checkAchievementRewards({ bestStreak, masteredWords }: { bestStreak: number; masteredWords: number }): void {
  const achievements = buildAchievements({ activity: readActivity(), bestStreak, masteredWords, scribbleWins: readScribbleWins() });
  for (const id of earnedAchievementRewards(achievements, cosmeticState.unlocked)) unlockCosmetic(id);
}

/** Language items: practising enough words of a learning language unlocks the one tied to it. */
export function checkLanguageRewards(wordsPracticed: Partial<Record<Language, number>>): void {
  for (const id of earnedLanguageRewards(wordsPracticed, cosmeticState.unlocked)) unlockCosmetic(id);
}

/** The invite item: ten friends joined through the invite link (the count comes from the server). */
export function checkInviteRewards(invited: number): void {
  for (const id of earnedInviteRewards(invited, cosmeticState.unlocked)) unlockCosmetic(id);
}

export function dismissUnlock() {
  cosmeticState.justUnlocked = null;
}
