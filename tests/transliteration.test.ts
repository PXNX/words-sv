import { describe, expect, it } from 'vitest';
import { scriptFor, transliterate } from '../src/lib/script/script.js';

describe('script tables', () => {
  it('knows the Ukrainian alphabet and no other script yet', () => {
    expect(scriptFor('uk')?.letters).toHaveLength(33);
    expect(scriptFor('de')).toBeUndefined();
    expect(scriptFor('en')).toBeUndefined();
  });

  it('reads Cyrillic words letter by letter', () => {
    expect(transliterate('uk', 'дім')).toBe('dim');
    expect(transliterate('uk', 'дим')).toBe('dym');
    expect(transliterate('uk', 'Щука')).toBe('Shchuka');
    expect(transliterate('uk', 'є')).toBe('ie');
    expect(transliterate('uk', 'хустка')).toBe('khustka');
  });

  it('keeps the shape of the word and letters it does not know', () => {
    expect(transliterate('uk', 'ДИМ')).toBe('DYM');
    expect(transliterate('uk', 'кафе!')).toBe('kafe!');
  });

  it('answers nothing for Latin-script languages', () => {
    expect(transliterate('en', 'house')).toBe('');
  });
});
