import { describe, expect, it } from 'vitest';
import { bareWord, cleanLines, MAX_LINE_POINTS, mention, scribblePoints, standingsText } from '../server/_lib/scribbleGame.js';

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

  it('formats the standings with medals and escapes names', () => {
    expect(standingsText([{ first_name: 'Ana', match_points: 420 }, { first_name: '<b>', match_points: 100 }, { first_name: 'Cem', match_points: 50 }, { first_name: 'Dan', match_points: 10 }])).toBe('🥇 Ana – 420\n🥈 &lt;b&gt; – 100\n🥉 Cem – 50\n4. Dan – 10');
    expect(mention(5, 'A&B')).toBe('<a href="tg://user?id=5">A&amp;B</a>');
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
