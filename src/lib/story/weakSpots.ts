/*
 * What the learner finds hard right now, from everything the app records about them, so generated
 * stories can practise exactly that. Pure: storage is read by the caller (generated.ts).
 *
 * A word's weight adds up its signals: misses anywhere in the app (more, and more recent, count
 * more), lapses the scheduler has not seen earned back, a low ease, and how overdue its review is.
 * Grammar mistakes on a noun count for the noun, and articles missed in grammar make stories ask
 * for articles more often. Words are then drawn at random in proportion to their weight: the weak
 * ones come up most, but no two stories practise the same handful.
 */
import type { ReviewEntry } from '#lib/review/ledger.js';
import type { ReviewProgress } from '#lib/vocab/spacedRepetition.js';
import type { MissedWord } from './missedWords';

const DAY_MS = 24 * 60 * 60 * 1000;
// A miss fades to half its weight after a week: last night's slip matters more than last month's.
const MISS_HALF_LIFE_DAYS = 7;

export type WeakSpotInput = {
  missed: readonly MissedWord[];
  // Review ledger entries of the learner's language, by item (word, NOUN:WORD, ARTICLE:WORD, …).
  ledger: readonly { item: string; entry: ReviewEntry }[];
  // Vocabulary schedule per word (all levels merged).
  progress: Readonly<Record<string, ReviewProgress>>;
};

function overdueDays(dueAt: number, now: number) {
  return dueAt > 0 && dueAt < now ? (now - dueAt) / DAY_MS : 0;
}

/** How weak each word is (0 = nothing known against it). */
export function weakSpotWeights({ missed, ledger, progress }: WeakSpotInput, now: number): Map<string, number> {
  const weights = new Map<string, number>();
  const add = (word: string, amount: number) => {
    if (amount > 0) weights.set(word, (weights.get(word) ?? 0) + amount);
  };
  for (const entry of missed) {
    const ageDays = Math.max(0, (now - entry.at) / DAY_MS);
    add(entry.word, 3 * Math.min(entry.count, 5) * 0.5 ** (ageDays / MISS_HALF_LIFE_DAYS));
  }
  for (const { item, entry } of ledger) {
    // Grammar items are "KIND:WORD"; their weakness belongs to the word.
    const word = item.includes(':') ? item.slice(item.indexOf(':') + 1) : item;
    add(word, 2 * entry.lapses + Math.min(3, overdueDays(entry.dueAt, now) / 3) + (entry.ease !== undefined && entry.ease < 2.1 ? 1.5 : 0));
  }
  for (const [word, state] of Object.entries(progress)) {
    add(word, 2 * (state.lapses ?? 0) + Math.min(3, overdueDays(state.dueAt, now) / 3) + (state.ease !== undefined && state.ease < 2.1 ? 1.5 : 0));
  }
  return weights;
}

/**
 * How often stories should ask for a noun's article (0.15–0.6): more the more article and noun
 * questions the learner has missed in grammar and not earned back.
 */
export function articleFocus(ledger: readonly { item: string; entry: ReviewEntry }[]): number {
  const genderItems = ledger.filter(({ item }) => item.startsWith('ARTICLE:') || item.startsWith('NOUN:'));
  if (!genderItems.length) return 0.2;
  const weak = genderItems.filter(({ entry }) => entry.lapses > 0).length / genderItems.length;
  return Math.min(0.6, Math.max(0.15, 0.15 + weak * 0.9));
}

/**
 * Draws `count` distinct words, each with probability proportional to its weight (plus `base`,
 * so even unmarked words get a chance and stories stay varied).
 */
export function sampleWeighted(words: readonly string[], weights: ReadonlyMap<string, number>, count: number, random: () => number = Math.random, base = 0.5): string[] {
  const pool = [...new Set(words)].map((word) => ({ word, weight: (weights.get(word) ?? 0) + base }));
  const chosen: string[] = [];
  while (chosen.length < count && pool.length) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let pick = random() * total;
    let index = 0;
    while (index < pool.length - 1 && pick >= pool[index]!.weight) {
      pick -= pool[index]!.weight;
      index += 1;
    }
    chosen.push(pool[index]!.word);
    pool.splice(index, 1);
  }
  return chosen;
}

/** The weakest of `words`, for a last recall at the end of the story. */
export function weakest(words: readonly string[], weights: ReadonlyMap<string, number>): string | null {
  let best: string | null = null;
  for (const word of words) if (best === null || (weights.get(word) ?? 0) > (weights.get(best) ?? 0)) best = word;
  return best;
}
