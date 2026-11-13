/*
 * Scribble: one player draws a word, the others guess it. Pure rules, shared by the app's modes and
 * mirrored by the bot (bot/bot/scribble.py) for guesses in a Telegram group:
 * - which words can be drawn (concrete words that have a picture, src/lib/learn/pictures.ts),
 * - the word choices and answer options,
 * - when a guess counts (case, accents, articles and a typo in a long word do not matter),
 * - and Lilith's drawing: an emoji traced into line art and ordered into pen strokes, so the
 *   picture appears stroke by stroke as if drawn by hand.
 */
import { pictureFor } from '#lib/learn/pictures.js';

export type Random = () => number;

/** Words of the pool that have a picture and are short enough to draw (no phrases). */
export function drawableWords(language: string, pool: readonly string[]): string[] {
  const seen = new Set<string>();
  return pool.filter((word) => {
    const key = word.toLocaleLowerCase();
    if (seen.has(key) || word.includes(' ') || word.length < 2 || !pictureFor(language, word)) return false;
    seen.add(key);
    return true;
  });
}

/** `count` different words, drawn at random. */
export function pickWords(pool: readonly string[], count: number, random: Random = Math.random): string[] {
  const rest = [...pool];
  const picked: string[] = [];
  while (picked.length < count && rest.length > 0) picked.push(rest.splice(Math.floor(random() * rest.length), 1)[0]!);
  return picked;
}

/** The target and `count - 1` other words with a different picture, shuffled. */
export function answerOptions(target: string, pool: readonly string[], language: string, count = 4, random: Random = Math.random): string[] {
  const picture = pictureFor(language, target);
  const others = pickWords(pool.filter((word) => word !== target && pictureFor(language, word) !== picture), count - 1, random);
  return pickWords([target, ...others], count, random);
}

const ARTICLES = new Set(['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'the', 'a', 'an', 'to']);

/** Lowercase, without accents, punctuation or a leading article: "Die Äpfel!" → "apfel". */
export function foldGuess(value: string): string {
  const words = value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replaceAll('ß', 'ss')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/u)
    .filter(Boolean);
  if (words.length > 1 && ARTICLES.has(words[0]!)) words.shift();
  return words.join(' ');
}

/** Levenshtein distance, stopping early once it is above `limit`. */
export function editDistance(left: string, right: string, limit = 3): number {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= right.length; j += 1) {
      const value = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + (left[i - 1] === right[j - 1] ? 0 : 1));
      current.push(value);
      best = Math.min(best, value);
    }
    if (best > limit) return limit + 1;
    previous = current;
  }
  return previous[right.length]!;
}

export type GuessResult = 'right' | 'close' | 'wrong';

/** Right when it matches an answer (one typo allowed from 6 letters), close when it is one or two letters off. */
export function checkGuess(guess: string, answers: readonly string[]): GuessResult {
  const folded = foldGuess(guess);
  if (!folded) return 'wrong';
  let close = false;
  for (const answer of answers) {
    const target = foldGuess(answer);
    if (!target) continue;
    if (folded === target) return 'right';
    const distance = editDistance(folded, target, 2);
    if (distance === 1 && target.length >= 6) return 'right';
    if (distance <= 2 && target.length >= 4) close = true;
  }
  return close ? 'close' : 'wrong';
}

/** Points for guessing Lilith's drawing: 100, plus up to 100 for guessing before she is done. */
export function guessPoints(progress: number): number {
  return 100 + Math.round(100 * (1 - Math.max(0, Math.min(1, progress))));
}

export type Point = readonly [x: number, y: number];
export type Stroke = Point[];

/**
 * The outline of a picture as points: pixels whose brightness or opacity differs clearly from a
 * neighbour's. `rgba` is canvas ImageData (width × height × 4); `step` thins the grid.
 */
export function outlinePoints(rgba: ArrayLike<number>, width: number, height: number, step = 2, threshold = 60): Point[] {
  const value = (x: number, y: number) => {
    const at = (y * width + x) * 4;
    const alpha = rgba[at + 3]! / 255;
    // On white: transparent pixels count as white, so the emoji's edge against the page is found too.
    const gray = 0.299 * rgba[at]! + 0.587 * rgba[at + 1]! + 0.114 * rgba[at + 2]!;
    return gray * alpha + 255 * (1 - alpha);
  };
  const points: Point[] = [];
  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const center = value(x, y);
      const gx = value(x + step, y) - value(x - step, y);
      const gy = value(x, y + step) - value(x, y - step);
      if (Math.hypot(gx, gy) >= threshold && center < 250) points.push([x, y]);
    }
  }
  return points;
}

/**
 * Chains points into pen strokes: always on to the nearest unvisited point, lifting the pen when
 * that is further than `jump`. Strokes are returned in drawing order, short specks dropped.
 */
export function orderStrokes(points: readonly Point[], jump = 6, minLength = 3): Stroke[] {
  const cell = Math.max(1, jump);
  const grid = new Map<string, number[]>();
  const key = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  points.forEach(([x, y], index) => {
    const bucket = grid.get(key(x, y));
    if (bucket) bucket.push(index);
    else grid.set(key(x, y), [index]);
  });
  const used = new Uint8Array(points.length);
  const nearest = (x: number, y: number): number => {
    let best = -1;
    let bestDistance = jump * jump;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (const index of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
          if (used[index]) continue;
          const [px, py] = points[index]!;
          const distance = (px - x) ** 2 + (py - y) ** 2;
          if (distance <= bestDistance) {
            bestDistance = distance;
            best = index;
          }
        }
      }
    }
    return best;
  };
  const strokes: Stroke[] = [];
  // Start each stroke at the top-most, left-most free point, the way people tend to draw.
  const order = points.map((_, index) => index).sort((a, b) => points[a]![1] - points[b]![1] || points[a]![0] - points[b]![0]);
  for (const start of order) {
    if (used[start]) continue;
    used[start] = 1;
    const stroke: Point[] = [points[start]!];
    for (let next = nearest(...points[start]!); next >= 0; next = nearest(...points[next]!)) {
      used[next] = 1;
      stroke.push(points[next]!);
    }
    if (stroke.length >= minLength) strokes.push(stroke);
  }
  return strokes;
}
