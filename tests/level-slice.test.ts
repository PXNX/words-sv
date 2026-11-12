import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sliceByLevel } from '../scripts/level-slice.js';
import { stories } from '../src/lib/story/stories.js';
import { germanStories } from '../src/lib/story/germanStories.js';
import { readingTexts } from '../src/lib/story/readingTexts.js';
import { vocabularyLevels } from '../src/lib/data/vocabulary.js';

const read = (name: string) => readFileSync(new URL(`../src/lib/story/${name}.ts`, import.meta.url), 'utf8');
const idsIn = (code: string) => [...code.matchAll(/^\s*id: '([^']+)',?\s*$/gmu)].map((match) => match[1]!);

describe('sliceByLevel', () => {
  const source = `import { helper, more } from './more';
import type { Item } from './types';
import { other } from './other';
// a comment
export const items: Item[] = [
  { id: 'one', level: 'a1', text: helper('a, [b]') },
  { id: 'two', level: 'a2', nested: [{ level: 'a1' }] },
  // between entries
  { id: 'three', level: 'a1' },
  ...more
];
export const plain = [1, 2, 3];
export function pick() { return items; }
`;

  it('keeps the entries of the level and everything without a level', () => {
    const { code, kept, dropped } = sliceByLevel(source, 'a1');
    expect(code).toContain(`{ id: 'one', level: 'a1', text: helper('a, [b]') }`);
    expect(code).toContain(`{ id: 'three', level: 'a1' }`);
    expect(code).toContain('...more');
    expect(code).not.toContain(`id: 'two'`);
    expect(code).toContain('export const plain = [1, 2, 3];');
    expect(code).toContain('export function pick() { return items; }');
    expect({ kept, dropped }).toEqual({ kept: 2, dropped: 1 });
  });

  it('leaves an empty list for a level without entries', () => {
    const { code, kept, dropped } = sliceByLevel(source, 'c2');
    expect(code).not.toMatch(/id: '(one|two|three)'/u);
    expect(code).toContain('...more');
    expect({ kept, dropped }).toEqual({ kept: 0, dropped: 3 });
  });

  it('passes the level on to the corpus files it imports, but not to type imports or other files', () => {
    const { code } = sliceByLevel(source, 'a2', (specifier) => specifier === './more' || specifier === './types');
    expect(code).toContain(`import { helper, more } from "./more?level=a2";`);
    expect(code).toContain(`import type { Item } from './types';`);
    expect(code).toContain(`import { other } from './other';`);
  });

  it('reports a file without levelled entries', () => {
    expect(sliceByLevel('export const list = [1, 2];', 'a1')).toEqual({ code: 'export const list = [1, 2];', kept: 0, dropped: 0 });
  });
});

describe('the corpus, cut by level', () => {
  const corpora = [
    { name: 'stories', all: stories.filter((story) => !germanStories.includes(story)) },
    { name: 'germanStories', all: germanStories },
    { name: 'readingTexts', all: readingTexts }
  ];

  for (const { name, all } of corpora) {
    it(`${name}: every entry lands in exactly its level's slice`, () => {
      const source = read(name);
      let total = 0;
      for (const level of vocabularyLevels) {
        const expected = all.filter((entry) => entry.level === level).map((entry) => entry.id);
        const sliced = sliceByLevel(source, level);
        expect(sliced.kept, `${name} ${level}`).toBe(expected.length);
        // Entry ids sit on their own line; nested objects have none.
        expect(idsIn(sliced.code).filter((id) => expected.includes(id)).sort()).toEqual([...expected].sort());
        for (const other of all.filter((entry) => entry.level !== level)) expect(sliced.code.includes(`id: '${other.id}'`), `${other.id} in ${level}`).toBe(false);
        total += sliced.kept;
      }
      expect(total).toBe(all.length);
    });
  }
});
