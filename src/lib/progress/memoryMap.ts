// The memory map: every word of a level as one tile, coloured by where it stands in memory
// (new → learning → young → mature, or a leech that keeps slipping) and faded by how likely it is
// to be recalled right now. Known words come first, so the map fills from the top as the learner
// goes: a picture of the whole level instead of a number. Pure; the component draws it.
import { reviewKey, type ReviewLedger } from '#lib/review/ledger.js';
import { currentRetrievability, itemStage, type ItemStage } from '#lib/review/scheduler.js';

export type MemoryTile = {
  /** The word as the pools hold it (uppercased). */
  word: string;
  stage: ItemStage;
  /** Chance of recalling it now, 0..1; 0 for words never answered. */
  strength: number;
  /** When it is due next, or null for a word never answered. */
  dueAt: number | null;
  due: boolean;
};

export type MemoryMap = {
  tiles: MemoryTile[];
  counts: Record<ItemStage, number>;
  /** Tiles whose review is due now. */
  due: number;
  /** Share of the level that is at least young (answered right twice and holding), 0..1. */
  covered: number;
};

export const MEMORY_STAGES: readonly ItemStage[] = ['mature', 'young', 'learning', 'leech', 'new'];
const STAGE_ORDER: Record<ItemStage, number> = { mature: 0, young: 1, learning: 2, leech: 3, new: 4 };

export function buildMemoryMap(language: string, words: readonly string[], ledger: ReviewLedger, now: number = Date.now()): MemoryMap {
  const counts: Record<ItemStage, number> = { new: 0, learning: 0, young: 0, mature: 0, leech: 0 };
  const seen = new Set<string>();
  const tiles: MemoryTile[] = [];
  for (const raw of words) {
    const word = raw.trim().toLocaleUpperCase();
    if (!word || seen.has(word)) continue;
    seen.add(word);
    const entry = ledger[reviewKey(language, word)];
    const stage = entry ? itemStage(entry, now) : 'new';
    counts[stage] += 1;
    tiles.push({
      word,
      stage,
      strength: entry ? currentRetrievability(entry, now) : 0,
      dueAt: entry ? entry.dueAt : null,
      due: Boolean(entry) && stage !== 'new' && entry!.dueAt <= now
    });
  }
  // Strongest first inside a stage, so fading tiles gather at each band's end; new words keep their order.
  tiles.sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage] || (a.stage === 'new' ? 0 : b.strength - a.strength));
  return {
    tiles,
    counts,
    due: tiles.filter((tile) => tile.due).length,
    covered: tiles.length ? (counts.mature + counts.young) / tiles.length : 0
  };
}

/** How solid a tile is drawn: never fully transparent, so a fading word can still be seen and tapped. */
export function tileOpacity(tile: Pick<MemoryTile, 'stage' | 'strength'>): number {
  if (tile.stage === 'new') return 1;
  return Math.round((0.35 + 0.65 * Math.min(Math.max(tile.strength, 0), 1)) * 100) / 100;
}
