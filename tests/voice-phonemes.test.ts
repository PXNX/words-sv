import { describe, expect, it } from 'vitest';
import { englishPhonemes, fixPhonemes, normalizeEnglish, splitPunctuation } from '../src/lib/voice/phonemes.js';

describe('English phonemes for Kokoro and Kitten', () => {
  it('splits text at punctuation, keeping both sides', () => {
    expect(splitPunctuation('Good morning! Shall we go?')).toEqual([
      { punctuation: false, text: 'Good morning' },
      { punctuation: true, text: '! ' },
      { punctuation: false, text: 'Shall we go' },
      { punctuation: true, text: '?' }
    ]);
    expect(splitPunctuation('no marks')).toEqual([{ punctuation: false, text: 'no marks' }]);
  });

  it('phonemizes only the words and keeps the punctuation in place', async () => {
    const seen: string[] = [];
    const phonemize = async (text: string, language: string) => {
      seen.push(`${language}:${text}`);
      return [text.toLowerCase()];
    };
    expect(await englishPhonemes('Hello,  you!', 'en-gb', phonemize)).toBe('hello, you!');
    expect(seen).toEqual(['en:Hello', 'en:you']);
  });

  it('turns typographic quotes and dashes into plain marks', () => {
    expect(normalizeEnglish('It’s – „fine“')).toBe('It\'s — "fine“');
  });

  it('maps eSpeak symbols to Kokoro\'s phoneme set', () => {
    expect(fixPhonemes('rˈɛd', 'en-us')).toBe('ɹˈɛd');
    expect(fixPhonemes('lˈɔx', 'en-gb')).toBe('lˈɔk');
    // American "ninety" is flapped, British is not.
    expect(fixPhonemes('nˈaɪnti', 'en-us')).toBe('nˈaɪndi');
    expect(fixPhonemes('nˈaɪnti', 'en-gb')).toBe('nˈaɪnti');
  });
});
