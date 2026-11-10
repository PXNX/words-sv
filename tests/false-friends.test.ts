import { describe, expect, it } from 'vitest';
import { buildFalseFriendPrompt, falseFriendSets, falseFriendsFor } from '../src/lib/grammar/falseFriends';

describe('false friends', () => {
  it('picks the set of the interface language', () => {
    expect(falseFriendsFor('de', 'ru')?.source).toBe('ru');
    expect(falseFriendsFor('en', 'pt-BR')?.source).toBe('pt');
    expect(falseFriendsFor('en', 'de')?.source).toBe('de');
  });

  it('falls back to English for German and German for English', () => {
    expect(falseFriendsFor('de', 'fa')?.source).toBe('en');
    expect(falseFriendsFor('de', 'de')?.source).toBe('en');
    expect(falseFriendsFor('en', 'en')?.source).toBe('de');
    expect(falseFriendsFor('fr', 'en')).toBeNull();
  });

  it('has no duplicate words and never the trap as the answer', () => {
    for (const sets of Object.values(falseFriendSets)) {
      for (const pairs of Object.values(sets)) {
        const words = pairs!.map((pair) => pair.word);
        expect(new Set(words).size).toBe(words.length);
        for (const pair of pairs!) expect(pair.correctMeaning).not.toBe(pair.trapMeaning);
      }
    }
  });

  it('offers the real meaning, the trap and one more', () => {
    const { pairs } = falseFriendsFor('de', 'ru')!;
    const prompt = buildFalseFriendPrompt(pairs[0]!, pairs, () => 0, (values) => values, 'Q?');
    expect(prompt.choices).toEqual(expect.arrayContaining([pairs[0]!.correctMeaning, pairs[0]!.trapMeaning]));
    expect(prompt.choices).toHaveLength(3);
    expect(prompt.question).toBe('Q?');
  });
});
