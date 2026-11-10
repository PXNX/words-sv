import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const dataDir = join(dirname(new URL(import.meta.url).pathname), '..', '..', 'src', 'lib', 'data');
const catalogFiles = ['de', 'en', 'fr', 'it', 'es', 'pt', 'uk'].map((l) => `catalog.${l}.json`);
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const languages = ['de', 'en', 'fr', 'it', 'es', 'pt', 'uk'];

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(`${dataDir}/${file}`, 'utf8')) as T;
}

describe('merged vocabulary catalogs', () => {
  for (const language of languages) {
    it(`${language}: has a merged catalog file`, () => {
      const catalog = loadJson<Record<string, { levels: string[]; definition?: string; type?: string; article?: string }>>(`catalog.${language}.json`);
      expect(Object.keys(catalog).length).toBeGreaterThan(0);
    });
  }
});

describe('merged vocabulary catalogs against level files', () => {
  for (const language of languages) {
    const catalog = loadJson<Record<string, { levels: string[]; definition?: string; type?: string; article?: string }>>(`catalog.${language}.json`);

    // Collect every uppercase word across all levels
    const allWords: Record<string, Set<string>> = {};
    for (const level of levels) {
      const levelData = loadJson<Record<string, { definition?: string; type?: string; genus?: string; article?: string }>>(`${language}.${level}.json`);
      for (const word of Object.keys(levelData)) {
        const key = word.toUpperCase();
        if (!allWords[key]) allWords[key] = new Set();
        allWords[key].add(level);
      }
    }

    for (const [key, expectedLevels] of Object.entries(allWords)) {
      it(`${language}: "${key}" is registered in the catalog with levels ${[...expectedLevels].join(',')}`, () => {
        expect(catalog[key], `${language}: ${key} not found in catalog`).toBeDefined();
        if (!catalog[key]) return;
        const foundLevels = catalog[key].levels ?? [];
        const sortedExpected = [...expectedLevels].sort();
        const sortedFound = [...foundLevels].sort();
        expect(sortedFound).toEqual(sortedExpected);
        // Presence of any field when the source had none is fine.
      });
    }
  }

  for (const language of languages) {
    it(`${language}: all catalog entries have at least one level`, () => {
      const catalog = loadJson<Record<string, { levels: string[] }>>(`catalog.${language}.json`);
      for (const [key, entry] of Object.entries(catalog)) {
        expect(Array.isArray(entry.levels), `${language}: ${key} levels must be an array`).toBe(true);
        expect(entry.levels.length, `${language}: ${key} has no levels`).toBeGreaterThan(0);
      }
    });
  }
});

describe('catalog file presence', () => {
  it('all 7 catalog files exist', () => {
    for (const file of catalogFiles) {
      expect(readdirSync(dataDir)).toContain(file);
    }
  });
});
