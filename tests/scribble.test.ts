import { describe, expect, it } from 'vitest';
import { answerOptions, checkGuess, drawableWords, editDistance, foldGuess, guessPoints, orderStrokes, outlinePoints, pickWords } from '../src/lib/scribble/scribble';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('Scribble words', () => {
  it('keeps single words with a picture, once', () => {
    expect(drawableWords('de', ['Apfel', 'Apfel', 'Freiheit', 'guten Morgen', 'Hund'])).toEqual(['Apfel', 'Hund']);
    expect(drawableWords('en', ['apple', 'idea', 'freedom'])).toEqual(['apple', 'idea']);
  });

  it('picks different words and options that include the target once', () => {
    const pool = ['Apfel', 'Hund', 'Katze', 'Haus', 'Baum', 'Auto'];
    const picked = pickWords(pool, 3, seeded());
    expect(new Set(picked).size).toBe(3);
    const options = answerOptions('Hund', pool, 'de', 4, seeded(7));
    expect(options).toHaveLength(4);
    expect(options.filter((word) => word === 'Hund')).toHaveLength(1);
  });
});

describe('Scribble guesses', () => {
  it('folds case, accents, punctuation and a leading article', () => {
    expect(foldGuess('Die Äpfel!')).toBe('apfel');
    expect(foldGuess('  the  Dog ')).toBe('dog');
    expect(foldGuess('Straße')).toBe('strasse');
  });

  it('accepts any answer, a typo in long words, and says when a guess is close', () => {
    expect(checkGuess('der apfel', ['Apfel', 'apple'])).toBe('right');
    expect(checkGuess('APPLE', ['Apfel', 'apple'])).toBe('right');
    expect(checkGuess('Kartofel', ['Kartoffel'])).toBe('right');
    expect(checkGuess('Hunt', ['Hund'])).toBe('close');
    expect(checkGuess('Katze', ['Hund'])).toBe('wrong');
    expect(checkGuess('', ['Hund'])).toBe('wrong');
  });

  it('measures edits and stops early', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('a', 'abcdefgh', 2)).toBe(3);
  });

  it('pays more for guessing early', () => {
    expect(guessPoints(0)).toBe(200);
    expect(guessPoints(1)).toBe(100);
    expect(guessPoints(0.5)).toBe(150);
  });
});

describe('Lilith drawing', () => {
  it('traces the outline of a filled square into a few long strokes', () => {
    const size = 40;
    const rgba = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const at = (y * size + x) * 4;
        const inside = x >= 10 && x < 30 && y >= 10 && y < 30;
        rgba.set(inside ? [0, 0, 0, 255] : [0, 0, 0, 0], at);
      }
    }
    const points = outlinePoints(rgba, size, size, 2);
    expect(points.length).toBeGreaterThan(20);
    // Every outline point lies near the square's edge, none deep inside or far outside.
    for (const [x, y] of points) expect(Math.min(Math.abs(x - 10), Math.abs(x - 30), Math.abs(y - 10), Math.abs(y - 30))).toBeLessThanOrEqual(2);
    const strokes = orderStrokes(points, 6);
    expect(strokes.length).toBeGreaterThan(0);
    expect(strokes.length).toBeLessThanOrEqual(4);
    expect(strokes.reduce((sum, stroke) => sum + stroke.length, 0)).toBe(points.length);
  });
});
