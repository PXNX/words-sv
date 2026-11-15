import { describe, expect, it } from 'vitest';
import { bareWord, cleanAvatar, cleanLines, MAX_LINE_POINTS, revealPattern, scribblePoints, scoreTarget, tableKey } from '../server/_lib/scribbleGame.js';

describe('live Scribble rules', () => {
  it('pays the guesser more the faster, and the drawer half of it', () => {
    expect(scribblePoints(0)).toEqual({ guesser: 200, drawer: 100 });
    expect(scribblePoints(45)).toEqual({ guesser: 150, drawer: 75 });
    expect(scribblePoints(500)).toEqual({ guesser: 100, drawer: 50 });
  });

  it('counts letters without the article', () => {
    expect(bareWord('der Apfel')).toBe('Apfel');
    expect(bareWord('the dog')).toBe('dog');
    expect(bareWord('Haus')).toBe('Haus');
  });

  it('accepts only sane lines from the drawer', () => {
    expect(cleanLines([{ c: '#172a45', s: 4, p: [0, 0, 640, 640] }])).toEqual([{ c: '#172a45', s: 4, p: [0, 0, 640, 640] }]);
    expect(cleanLines([{ c: 'red', s: 4, p: [0, 0] }])).toBeNull();
    expect(cleanLines([{ c: '#172a45', s: 4, p: [0, 0, 700, 1] }])).toBeNull();
    expect(cleanLines([{ c: '#172a45', s: 4, p: [0] }])).toBeNull();
    expect(cleanLines([{ c: '#172a45', s: 4, p: Array.from({ length: (MAX_LINE_POINTS + 1) * 2 }, () => 1) }])).toBeNull();
    expect(cleanLines('nope')).toBeNull();
  });

  it('keys a group by its chat and an inline game by its message, far below any chat id', () => {
    expect(tableKey(-1001234567890, null)).toBe(-1001234567890);
    const inline = tableKey(null, 'BAAAAAbcdef');
    expect(inline).toBe(tableKey(undefined, 'BAAAAAbcdef'));
    expect(inline).not.toBe(tableKey(null, 'BAAAAAbcdeg'));
    expect(inline).toBeLessThan(-5e15);
    expect(Number.isSafeInteger(inline)).toBe(true);
  });

  it('reveals letters one by one when turned on, never more than half, the same for everyone', () => {
    const blank = revealPattern('der Apfelbaum', 7, 0, 90, true);
    expect(blank).toHaveLength(9);
    expect(blank.every((slot) => slot === null)).toBe(true);
    // Four of nine letters at most, one more every 90 / 5 seconds.
    const count = (elapsed: number) => revealPattern('der Apfelbaum', 7, elapsed, 90, true).filter((slot) => slot !== null).length;
    expect([count(17), count(18), count(36), count(89), count(500)]).toEqual([0, 1, 2, 4, 4]);
    const later = revealPattern('der Apfelbaum', 7, 89, 90, true);
    expect(revealPattern('der Apfelbaum', 7, 30, 90, true).every((slot, index) => slot === null || slot === later[index])).toBe(true);
    expect(later.every((slot, index) => slot === null || slot === 'Apfelbaum'[index])).toBe(true);
    expect(revealPattern('Apfelbaum', 7, 89, 90, false).every((slot) => slot === null)).toBe(true);
    expect(revealPattern('ice cream', 3, 0, 90, true)[3]).toBe(' ');
  });

  it('takes an avatar only as a short JSON object', () => {
    expect(cleanAvatar('{"skin":"#f0c9a8"}')).toBe('{"skin":"#f0c9a8"}');
    expect(cleanAvatar('[1]')).toBeNull();
    expect(cleanAvatar('nope')).toBeNull();
    expect(cleanAvatar(`{"a":"${'x'.repeat(400)}"}`)).toBeNull();
  });

  it('sends scores to the inline message when the table has one', () => {
    expect(scoreTarget({ inline_message_id: 'abc' }, -5, 7)).toEqual({ inline_message_id: 'abc' });
    expect(scoreTarget({ inline_message_id: null }, -5, 7)).toEqual({ chat_id: -5, message_id: 7 });
  });
});

describe('Scribble wins on the device', async () => {
  const { readScribbleWins, recordScribbleWins } = await import('../src/lib/scribble/scribbleWins');
  it('keeps the highest count and never lowers it', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
    expect(readScribbleWins(storage)).toBe(0);
    recordScribbleWins(2, storage);
    recordScribbleWins(1, storage);
    expect(readScribbleWins(storage)).toBe(2);
  });
});
