import { describe, expect, it } from 'vitest';
import { appendMockResult, bestMockResult, buildMockTest, mockSections, MOCK_SIZES, parseMockResults, scoreMockTest } from '../src/lib/assessment/mockTest';
import { seededRandom } from '../src/lib/assessment/placement';
import a1 from '../src/lib/data/de.a1.json';
import b1 from '../src/lib/data/de.b1.json';
import type { ExamAnswer } from '../src/lib/assessment/examItems';

type Entries = Record<string, { definition?: string; type?: string; genus?: 'masculine' | 'feminine' | 'neuter'; article?: string }>;

describe('mock test', () => {
  it('builds every section for German without asking a word twice', () => {
    const test = buildMockTest('de', 'a1', a1 as Entries, seededRandom(4));
    expect(test.items.reading).toHaveLength(MOCK_SIZES.reading);
    expect(test.items.listening).toHaveLength(MOCK_SIZES.listening);
    expect(test.items.language.length).toBeGreaterThan(2);
    const words = [...test.items.reading, ...test.items.listening].map((item) => item.word);
    expect(new Set(words).size).toBe(words.length);
    expect(mockSections(test)).toEqual(['reading', 'listening', 'language', 'writing']);
    expect(test.writing.de).toBeTruthy();
    expect(test.writing.en).toBeTruthy();
  });

  it('leaves out the language section where there is no grammar', () => {
    // Any language other than German: the same entries, but no articles or grammar gaps.
    const test = buildMockTest('nl', 'a1', a1 as Entries, seededRandom(5));
    expect(mockSections(test)).toEqual(['reading', 'listening', 'writing']);
  });

  it('passes with right answers and a good text, and fails on a weak section', () => {
    const test = buildMockTest('de', 'b1', b1 as Entries, seededRandom(6));
    const right = (section: 'reading' | 'listening' | 'language'): ExamAnswer[] => test.items[section].map((item) => ({ item, chosen: item.correct }));
    const text = 'Ich arbeite seit einem Jahr von zu Hause, und meiner Meinung nach hat das viele Vorteile. Zuerst spare ich jeden Tag eine Stunde, weil ich nicht mit dem Zug fahren muss. Außerdem kann ich mir die Zeit besser einteilen. Obwohl ich meine Kollegen manchmal vermisse, bin ich zufriedener als früher. Trotzdem gibt es auch Nachteile: Man bewegt sich weniger, und die Grenze zwischen Arbeit und Freizeit verschwimmt. Deshalb gehe ich jeden Abend spazieren. Ein Beispiel aus meinem Alltag zeigt das gut: Letzte Woche habe ich bis spät in die Nacht gearbeitet, aber danach habe ich mir einen freien Vormittag genommen.';
    const passed = scoreMockTest(test, { reading: right('reading'), listening: right('listening'), language: right('language') }, text, 'de', 1);
    expect(passed.sections.reading).toBe(1);
    expect(passed.sections.writing).toBeGreaterThan(0.6);
    expect(passed.passed).toBe(true);
    const noWriting = scoreMockTest(test, { reading: right('reading'), listening: right('listening'), language: right('language') }, '', 'de', 2);
    expect(noWriting.total).toBeGreaterThanOrEqual(0.6);
    expect(noWriting.passed).toBe(false);
  });

  it('counts unanswered questions as not known', () => {
    const test = buildMockTest('de', 'a1', a1 as Entries, seededRandom(7));
    expect(scoreMockTest(test, {}, '', 'de').sections.reading).toBe(0);
  });

  it('stores, parses and picks the best result', () => {
    const test = buildMockTest('de', 'a1', a1 as Entries, seededRandom(8));
    const first = scoreMockTest(test, {}, '', 'de', 1);
    const second = { ...first, at: 2, total: 0.7 };
    const stored = appendMockResult(appendMockResult([], first), second);
    expect(parseMockResults(JSON.stringify(stored))).toHaveLength(2);
    expect(parseMockResults('{bad')).toEqual([]);
    expect(bestMockResult(stored, 'de', 'a1')?.at).toBe(2);
    expect(bestMockResult(stored, 'de', 'b1')).toBeNull();
  });
});
