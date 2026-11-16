import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const load = (name: string) => JSON.parse(readFileSync(new URL(`../../src/lib/data/${name}`, import.meta.url), 'utf8')) as Record<string, { definition?: string; type?: string }>;
const toeflCore = JSON.parse(readFileSync(new URL('../fixtures/toefl-core.json', import.meta.url), 'utf8')) as string[];

const levels = Object.fromEntries(['a1', 'a2', 'b1'].map((level) => [level, load(`en.${level}.json`)]));

describe('English learning content', () => {
  it('covers the TOEFL core words at B1 with a definition and a word type', () => {
    const missing = toeflCore.filter((word) => {
      const entry = levels.b1![word];
      return !entry || !entry.definition?.trim() || !entry.type;
    });
    expect(missing).toEqual([]);
  });

  // These were tagged as nouns although their definitions describe a quality. The type decides
  // which words can stand as answer options together, so a wrong type teaches the wrong thing.
  const adjectives = [
    'bad', 'better', 'big', 'clever', 'correct', 'fine', 'flat', 'good', 'handsome', 'merry', 'sure',
    'alright', 'basic', 'classic', 'comic', 'creative', 'crisp', 'cross', 'female', 'fresh', 'gentle',
    'mad', 'male', 'modern', 'negative', 'peaceful', 'proper', 'sleepy', 'slim', 'specific', 'suitable',
    'unhappy', 'upset', 'antique', 'athletic', 'bent', 'bold', 'bound', 'broad', 'cautious', 'cheerful',
    'definite', 'earnest', 'even', 'fancy', 'generous', 'handy', 'historic', 'humorous', 'narrow', 'pale',
    'plain', 'positive', 'ripe', 'secure', 'serious', 'shadowy', 'shiny', 'slight', 'stable', 'steady',
    'thorough', 'unique'
  ];

  it('types quality words as adjectives from A1 to B1', () => {
    const wrong = adjectives.filter((word) => {
      const level = (['a1', 'a2', 'b1'] as const).find((name) => levels[name]![word]);
      return level ? levels[level]![word]!.type !== 'adjective' : true;
    });
    expect(wrong).toEqual([]);
  });
});
