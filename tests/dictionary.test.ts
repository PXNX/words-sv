import { describe, expect, it } from 'vitest';
import { buildIndex, fold, search, splitCompound } from '../src/lib/dictionary/dictionary';
import { loadLevel, vocabularyLevels } from '../src/lib/data/vocabulary';
import { lookupReadingWord } from '../src/lib/story/readingWords';

const levels = await Promise.all(vocabularyLevels.map(async (level) => [level, await loadLevel('de', level)] as const));
const index = buildIndex('de', levels);
const baseOf = (value: string) => lookupReadingWord('de', value)?.word ?? null;

describe('dictionary search', () => {
  it('folds case and accents', () => {
    expect(fold('Über Straße')).toBe('uber strasse');
  });

  it('finds the word itself first, with or without its article', () => {
    expect(search(index, 'Haus', baseOf)[0]).toMatchObject({ match: 'exact', entry: { spelling: 'Haus' } });
    expect(search(index, 'das Haus', baseOf)[0]?.entry.spelling).toBe('Haus');
  });

  it('finds the base word of an inflected form', () => {
    const hits = search(index, 'Häuser', baseOf);
    expect(hits.some((hit) => hit.entry.spelling === 'Haus')).toBe(true);
  });

  it('searches meanings for longer queries', () => {
    expect(search(index, 'Fahrzeug', baseOf).some((hit) => hit.match === 'meaning')).toBe(true);
    expect(search(index, '', baseOf)).toEqual([]);
  });

  it('keeps each word once, at its lowest level', () => {
    expect(new Set(index.entries.map((entry) => entry.word)).size).toBe(index.entries.length);
  });
});

describe('German compounds', () => {
  const known = new Set(['HAUS', 'TÜR', 'KIND', 'ZIMMER', 'ARBEIT', 'PLATZ', 'SONNE', 'SCHEIN', 'HAUSTÜR']);
  it('splits into known words, with linking elements', () => {
    expect(splitCompound('Kinderzimmer', known)).toEqual(['KIND', 'ZIMMER']);
    expect(splitCompound('Arbeitsplatz', known)).toEqual(['ARBEIT', 'PLATZ']);
    expect(splitCompound('Sonnenschein', known)).toEqual(['SONNE', 'SCHEIN']);
  });

  it('leaves alone what is not a compound of known words', () => {
    expect(splitCompound('Haus', known)).toBeNull();
    expect(splitCompound('Haustür', known)).toBeNull();
    expect(splitCompound('Hausaufgabe', known)).toBeNull();
  });
});
