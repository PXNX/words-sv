import { vocabularyLevels, type VocabularyLevel } from '$lib/data/vocabulary';

export type Orientation = 'across' | 'down';
export type Placement = { word: string; row: number; col: number; orientation: Orientation; reversed?: boolean };
export type BoardCell = { letter: string; words: string[] };
export type Grid = { cells: Map<string, BoardCell>; placements: Placement[]; minRow: number; maxRow: number; minCol: number; maxCol: number };
export type Round = { words: string[]; letters: string[]; grid: Grid };
export type StoredGame<Language extends string> = {
  version: 1;
  language: Language;
  roundNumber: number;
  words: string[];
  letters: string[];
  placements: Placement[];
  solvedWords: string[];
  startedAt?: number;
  completedDuration?: number;
  vocabularyLevel?: VocabularyLevel;
  includeLowerVocabulary?: boolean;
};

export function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}
export function coordinate(key: string) {
  const [row, col] = key.split(':').map(Number);
  return { row, col };
}
export function makeRng(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
export function shuffle<T>(values: T[], rng: () => number) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}
export function inventory(word: string) {
  return [...word].reduce<Record<string, number>>((counts, letter) => ({ ...counts, [letter]: (counts[letter] ?? 0) + 1 }), {});
}
export function canSpell(word: string, letters: string[]) {
  const available = inventory(letters.join(''));
  return Object.entries(inventory(word)).every(([letter, count]) => (available[letter] ?? 0) >= count);
}
export function emptyGrid(): Grid {
  return { cells: new Map<string, BoardCell>(), placements: [], minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
}
export function placementLetters(entry: Placement) {
  const letters = [...entry.word];
  return entry.reversed ? letters.reverse() : letters;
}
export function placementCells(entry: Placement) {
  return entry.word.split('').map((_letter, index) => ({
    row: entry.row + (entry.orientation === 'down' ? index : 0),
    col: entry.col + (entry.orientation === 'across' ? index : 0),
    index
  }));
}
function refreshBounds(grid: Grid) {
  const coordinates = [...grid.cells.keys()].map(coordinate);
  grid.minRow = Math.min(...coordinates.map((point) => point.row));
  grid.maxRow = Math.max(...coordinates.map((point) => point.row));
  grid.minCol = Math.min(...coordinates.map((point) => point.col));
  grid.maxCol = Math.max(...coordinates.map((point) => point.col));
}
export function writePlacement(grid: Grid, entry: Placement) {
  grid.placements.push(entry);
  placementLetters(entry).forEach((letter, index) => {
    const row = entry.row + (entry.orientation === 'down' ? index : 0);
    const col = entry.col + (entry.orientation === 'across' ? index : 0);
    const key = cellKey(row, col);
    const existing = grid.cells.get(key);
    grid.cells.set(key, { letter, words: [...(existing?.words ?? []), entry.word] });
  });
  refreshBounds(grid);
}
export function gridFromPlacements(placements: Placement[]) {
  const grid = emptyGrid();
  placements.forEach((placement) => writePlacement(grid, placement));
  return grid;
}
export function isPlacement(value: unknown): value is Placement {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<Placement>;
  return (
    typeof entry.word === 'string' &&
    Number.isInteger(entry.row) &&
    Number.isInteger(entry.col) &&
    (entry.orientation === 'across' || entry.orientation === 'down') &&
    (typeof entry.reversed === 'undefined' || typeof entry.reversed === 'boolean')
  );
}
function canPlace(grid: Grid, entry: Placement, crossing: { row: number; col: number }) {
  const points = placementCells(entry);
  const planned = new Set(points.map((point) => cellKey(point.row, point.col)));
  let crossings = 0;
  for (const point of points) {
    const key = cellKey(point.row, point.col);
    const existing = grid.cells.get(key);
    if (existing) {
      if (existing.letter !== placementLetters(entry)[point.index] || key !== cellKey(crossing.row, crossing.col) || existing.words.length !== 1) return false;
      crossings += 1;
      continue;
    }
    for (const [rowDelta, colDelta] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]) {
      const neighbourKey = cellKey(point.row + rowDelta, point.col + colDelta);
      const neighbour = grid.cells.get(neighbourKey);
      if (!neighbour || planned.has(neighbourKey)) continue;
      if (neighbourKey === cellKey(crossing.row, crossing.col)) continue;
      return false;
    }
  }
  if (crossings !== 1) return false;
  const allRows = [...grid.cells.keys()].map(coordinate).map((point) => point.row).concat(points.map((point) => point.row));
  const allCols = [...grid.cells.keys()].map(coordinate).map((point) => point.col).concat(points.map((point) => point.col));
  return Math.max(...allRows) - Math.min(...allRows) <= 12 && Math.max(...allCols) - Math.min(...allCols) <= 12;
}
function findPlacement(grid: Grid, word: string, rng: () => number, allowBackward = false) {
  const openCells = shuffle([...grid.cells.entries()].filter(([, cell]) => cell.words.length === 1), rng);
  for (const reversed of allowBackward ? [false, true] : [false]) {
    for (const [key, cell] of openCells) {
      const crossing = coordinate(key);
      const crossedWord = cell.words[0];
      const crossedPlacement = grid.placements.find((entry) => entry.word === crossedWord);
      if (!crossedPlacement) continue;
      const orientation: Orientation = crossedPlacement.orientation === 'across' ? 'down' : 'across';
      const renderedLetters = reversed ? [...word].reverse() : [...word];
      for (const wordIndex of shuffle(
        renderedLetters.map((_letter, index) => index).filter((index) => renderedLetters[index] === cell.letter),
        rng
      )) {
        const entry: Placement = {
          word,
          reversed,
          orientation,
          row: orientation === 'down' ? crossing.row - wordIndex : crossing.row,
          col: orientation === 'across' ? crossing.col - wordIndex : crossing.col
        };
        if (canPlace(grid, entry, crossing)) return entry;
      }
    }
  }
  return null;
}
export function viableBaseCount(pool: string[]) {
  const normalized = [...new Set(pool.map((word) => word.trim().normalize('NFC').toUpperCase()).filter((word) => /^\p{L}+$/u.test(word) && [...word].length >= 3 && [...word].length <= 8))];
  return normalized.filter((word) => [...word].length >= 5 && [...word].length <= 8 && normalized.filter((candidate) => candidate !== word && canSpell(candidate, [...word])).length >= 5).length;
}
export function requiresCumulativePool(poolsByLevel: Record<VocabularyLevel, string[]>, level: VocabularyLevel) {
  return level !== 'a1' && viableBaseCount(poolsByLevel[level]) === 0;
}
export function selectedPool(poolsByLevel: Record<VocabularyLevel, string[]>, level: VocabularyLevel, includeLower = false) {
  const end = vocabularyLevels.indexOf(level);
  const levels = includeLower || requiresCumulativePool(poolsByLevel, level) ? vocabularyLevels.slice(0, end + 1) : [level];
  return levels.flatMap((entry) => poolsByLevel[entry]);
}
export function randomSeed() {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0];
  }
  return Math.floor(Math.random() * 2147483647) ^ Date.now();
}
export function buildRound(pool: string[], seed: number, excludedBases: string[] = [], allowBackward = false, hintableBaseWords: ReadonlySet<string> = new Set()): Round {
  const rng = makeRng(seed);
  const normalized = [...new Set(pool.map((word) => word.trim().normalize('NFC').toUpperCase()).filter((word) => /^\p{L}+$/u.test(word) && [...word].length >= 3 && [...word].length <= 8))];
  const bases = shuffle(normalized.filter((word) => [...word].length >= 5 && [...word].length <= 8 && normalized.filter((candidate) => candidate !== word && canSpell(candidate, [...word])).length >= 5), rng);
  const freshBases = bases.filter((word) => !excludedBases.includes(word));
  const preferredBases = bases.filter((word) => hintableBaseWords.has(word));
  const freshPreferredBases = preferredBases.filter((word) => !excludedBases.includes(word));
  const candidatesForBase = freshPreferredBases.length > 0 ? freshPreferredBases : preferredBases.length > 0 ? preferredBases : freshBases.length > 0 ? freshBases : bases;
  for (const base of candidatesForBase) {
    const grid = emptyGrid();
    writePlacement(grid, { word: base, row: 0, col: 0, orientation: 'across' });
    const selected = [base];
    const target = 6 + Math.floor(rng() * 3);
    const candidates = shuffle(normalized.filter((word) => word !== base && [...word].length >= 3 && canSpell(word, [...base])), rng);
    while (selected.length < target) {
      let placed = false;
      for (const candidate of candidates) {
        if (selected.includes(candidate)) continue;
        const entry = findPlacement(grid, candidate, rng, allowBackward);
        if (!entry) continue;
        writePlacement(grid, entry);
        selected.push(candidate);
        placed = true;
        break;
      }
      if (!placed) break;
    }
    if (selected.length >= 6) return { words: selected, letters: [...base], grid };
  }
  const fallback = preferredBases[0] ?? freshBases[0] ?? bases[0] ?? normalized.find((word) => [...word].length >= 5) ?? 'WORT';
  const grid = emptyGrid();
  writePlacement(grid, { word: fallback, row: 0, col: 0, orientation: 'across' });
  return { words: [fallback], letters: [...fallback], grid };
}
export function roundFromStoredGame<Language extends string>(game: StoredGame<Language>): Round {
  return { words: game.words, letters: game.letters, grid: gridFromPlacements(game.placements) };
}
