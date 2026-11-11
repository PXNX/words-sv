import { describe, expect, it } from 'vitest';
import { checkTyped, editDistance, isBuildable, isRecall, pickPromptKind, scrambleLetters, type PromptInput } from '../src/lib/learn/modality';
import { hasPictures, pictureFor, picturedWords } from '../src/lib/learn/pictures';

const base: PromptInput = { style: 'mixed', pass: 1, index: 0, repetitions: 0, hasPicture: true, canHear: true, buildable: true };

describe('prompt kinds', () => {
  it('asks a first card as recognition', () => {
    for (const style of ['mixed', 'hear', 'see', 'write', 'do'] as const) {
      for (let index = 0; index < 12; index += 1) expect(isRecall(pickPromptKind({ ...base, style, index, repetitions: 5 }))).toBe(false);
    }
  });

  it('leads with the learner\'s channel and still mixes in others', () => {
    const kinds = (style: PromptInput['style']) => Array.from({ length: 12 }, (_, index) => pickPromptKind({ ...base, style, index }));
    expect(kinds('hear').filter((kind) => kind === 'listen').length).toBeGreaterThanOrEqual(8);
    expect(new Set(kinds('hear')).size).toBeGreaterThan(1);
    expect(kinds('see').filter((kind) => kind === 'picture').length).toBeGreaterThanOrEqual(8);
    expect(new Set(kinds('mixed')).size).toBe(3);
  });

  it('never picks a kind the word or device cannot do', () => {
    for (let index = 0; index < 12; index += 1) {
      expect(pickPromptKind({ ...base, style: 'see', index, hasPicture: false })).not.toBe('picture');
      expect(pickPromptKind({ ...base, style: 'hear', index, canHear: false })).not.toBe('listen');
      expect(pickPromptKind({ ...base, style: 'hear', index, pass: 2, repetitions: 3, canHear: false })).not.toBe('dictation');
      expect(pickPromptKind({ ...base, style: 'do', index, pass: 2, repetitions: 3, buildable: false })).not.toBe('build');
    }
    expect(pickPromptKind({ ...base, hasPicture: false, canHear: false })).toBe('meaning');
  });

  it('keeps a new word on recognition for its second card, through another channel', () => {
    const second = pickPromptKind({ ...base, pass: 2, repetitions: 0, firstKind: 'picture' });
    expect(isRecall(second)).toBe(false);
    expect(second).not.toBe('picture');
  });

  it('asks a known word to be produced on its second card', () => {
    expect(pickPromptKind({ ...base, style: 'write', pass: 2, repetitions: 2 })).toBe('type');
    expect(pickPromptKind({ ...base, style: 'do', pass: 2, repetitions: 2 })).toBe('build');
    expect(pickPromptKind({ ...base, style: 'hear', pass: 2, repetitions: 2 })).toBe('dictation');
    expect(isRecall(pickPromptKind({ ...base, style: 'mixed', pass: 2, repetitions: 1, index: 7 }))).toBe(true);
  });
});

describe('typed answers', () => {
  it('ignores capitals, spaces and a leading article', () => {
    expect(checkTyped('Haus', ' haus ', 'de')).toBe('exact');
    expect(checkTyped('Haus', 'das Haus', 'de')).toBe('exact');
    expect(checkTyped('apple', 'The Apple', 'en')).toBe('exact');
  });

  it('accepts German umlauts written out', () => {
    expect(checkTyped('Bäckerei', 'baeckerei', 'de')).toBe('exact');
    expect(checkTyped('Straße', 'strasse', 'de')).toBe('exact');
  });

  it('calls a missing accent or a single slip close', () => {
    expect(checkTyped('café', 'cafe', 'fr')).toBe('close');
    expect(checkTyped('Bahnhof', 'Banhhof', 'de')).toBe('close');
    expect(checkTyped('Schule', 'Schuhle', 'de')).toBe('close');
  });

  it('rejects short near misses, other words and nothing at all', () => {
    expect(checkTyped('Bus', 'Bub', 'de')).toBe('wrong');
    expect(checkTyped('Bahnhof', 'Flughafen', 'de')).toBe('wrong');
    expect(checkTyped('Haus', '   ', 'de')).toBe('wrong');
  });

  it('counts letters apart', () => {
    expect(editDistance('haus', 'haus')).toBe(0);
    expect(editDistance('haus', 'maus')).toBe(1);
    expect(editDistance('haus', 'huas')).toBe(1);
    expect(editDistance('haus', 'h')).toBe(3);
  });
});

describe('letter tiles', () => {
  it('builds single words of a sensible length only', () => {
    expect(isBuildable('Haus')).toBe(true);
    expect(isBuildable('Ei')).toBe(false);
    expect(isBuildable('S-Bahn')).toBe(false);
    expect(isBuildable('guten Morgen')).toBe(false);
    expect(isBuildable('Donaudampfschifffahrt')).toBe(false);
  });

  it('shuffles the letters without ever showing the word', () => {
    for (const word of ['Haus', 'Ei', 'Banane', 'ab']) {
      const letters = scrambleLetters(word, () => 0.999);
      expect([...letters].sort()).toEqual([...word].sort());
      expect(letters.join('')).not.toBe(word);
    }
    expect(scrambleLetters('aaa')).toEqual(['a', 'a', 'a']);
  });
});

describe('word pictures', () => {
  it('finds a picture whatever the capitals', () => {
    expect(pictureFor('de', 'Apfel')).toBe('🍎');
    expect(pictureFor('de', 'APFEL')).toBe('🍎');
    expect(pictureFor('en', 'apple')).toBe('🍎');
    expect(pictureFor('de', 'aber')).toBeNull();
    expect(pictureFor('xx', 'Apfel')).toBeNull();
  });

  it('knows which languages have pictures', () => {
    expect(hasPictures('de')).toBe(true);
    expect(hasPictures('uk')).toBe(false);
    expect(picturedWords('de').length).toBeGreaterThan(300);
    expect(picturedWords('en').length).toBeGreaterThan(300);
  });
});
