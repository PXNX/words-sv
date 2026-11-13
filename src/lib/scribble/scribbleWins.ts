// How many Scribble matches the learner's Telegram account has won (the server counts them, see
// server/_lib/scribbleGame.ts). Kept on the device for the achievements, never lowered; the key
// starts with `wordcircle-`, so it travels with the progress sync.
export const SCRIBBLE_WINS_KEY = 'wordcircle-scribble-wins-v1';

export function readScribbleWins(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): number {
  try {
    const value = Number(storage?.getItem(SCRIBBLE_WINS_KEY));
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function recordScribbleWins(wins: number, storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = globalThis.localStorage) {
  if (!Number.isSafeInteger(wins) || wins <= readScribbleWins(storage)) return;
  try {
    storage?.setItem(SCRIBBLE_WINS_KEY, String(wins));
  } catch {
    /* full storage: the next state from the server tries again */
  }
}
