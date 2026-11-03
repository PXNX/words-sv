/*
 * Which cosmetic rewards the learner has unlocked (the catalog and rules are in cosmetics.ts).
 * Unlocked items stay unlocked; they live in localStorage next to the avatar and never leave the
 * device. `justUnlocked` drives the pop-up (CosmeticUnlockToast) over whatever mode is open.
 */
import type { AvatarPart } from './avatar.js';
import { COSMETICS_KEY, lockedIn, nextRun, parseUnlocked, type CosmeticMode } from './cosmetics.js';

export { cosmetics, cosmeticModes, rewardFor, LISTEN_TARGET, type CosmeticMode } from './cosmetics.js';

function readUnlocked(): CosmeticMode[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return parseUnlocked(localStorage.getItem(COSMETICS_KEY));
  } catch {
    return [];
  }
}

export const cosmeticState = $state<{ unlocked: CosmeticMode[]; justUnlocked: CosmeticMode | null }>({ unlocked: readUnlocked(), justUnlocked: null });

export function isLocked(part: AvatarPart, choice: string, unlocked: readonly CosmeticMode[] = cosmeticState.unlocked): boolean {
  return lockedIn(part, choice, unlocked);
}

/** Unlocks the mode's item; returns true only the first time. */
export function unlockCosmetic(mode: CosmeticMode): boolean {
  if (cosmeticState.unlocked.includes(mode)) return false;
  cosmeticState.unlocked = [...cosmeticState.unlocked, mode];
  cosmeticState.justUnlocked = mode;
  try {
    localStorage.setItem(COSMETICS_KEY, JSON.stringify(cosmeticState.unlocked));
  } catch {
    // A full quota only means the reward is not remembered after a reload.
  }
  return true;
}

// Current runs of first-try answers, per mode, for this visit.
const runs: Partial<Record<CosmeticMode, number>> = {};

/** Counts a first-try answer towards the mode's run; a miss starts the run over. */
export function recordAnswer(mode: CosmeticMode, correctFirstTry: boolean): void {
  const { run, reached } = nextRun(mode, runs[mode] ?? 0, correctFirstTry);
  runs[mode] = run;
  if (reached) unlockCosmetic(mode);
}

export function dismissUnlock() {
  cosmeticState.justUnlocked = null;
}
