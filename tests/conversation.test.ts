import { describe, expect, it } from 'vitest';
import { chatMessages, cleanReply, HISTORY_TURNS, pickTargetWords, systemPrompt, usedWords, usesWord, type Turn } from '../src/lib/conversation/conversation.js';

describe('conversation mode', () => {
  it('picks distinct target words from the pool', () => {
    const words = pickTargetWords(['HUND', 'KATZE', 'HAUS', 'HUND', 'BAUM', 'TEE', 'BROT'], 5, () => 0.3);
    expect(words).toHaveLength(5);
    expect(new Set(words).size).toBe(5);
  });

  it('tells the model the language, level and words', () => {
    const prompt = systemPrompt('de', 'a1', ['Hund', 'Katze'], 'Felix');
    expect(prompt).toContain('Speak only German');
    expect(prompt).toContain('A1');
    expect(prompt).toContain('Hund, Katze');
    expect(prompt).toContain('Felix');
  });

  it('starts the history with a hidden opening request and maps speakers to roles', () => {
    const turns: Turn[] = [{ speaker: 'partner', text: 'Hallo!' }, { speaker: 'learner', text: 'Hallo.' }];
    const messages = chatMessages('de', 'a1', ['Hund'], turns);
    expect(messages.map((message) => message.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(chatMessages('de', 'a1', ['Hund'], []).map((message) => message.role)).toEqual(['system', 'user']);
  });

  it('keeps only the most recent turns', () => {
    const turns: Turn[] = Array.from({ length: 30 }, (_, index) => ({ speaker: index % 2 ? 'learner' : 'partner', text: `turn ${index}` }));
    const messages = chatMessages('de', 'a1', ['Hund'], turns);
    expect(messages.filter((message) => message.role !== 'system' && message.content.startsWith('turn'))).toHaveLength(HISTORY_TURNS);
    expect(messages.at(-1)?.content).toBe('turn 29');
  });

  it('strips markdown and role labels from replies', () => {
    expect(cleanReply('Assistant: **Hallo**!  Wie  geht es?')).toBe('Hallo! Wie geht es?');
    expect(cleanReply('<think>hmm</think>Ciao!')).toBe('Ciao!');
  });

  it('recognises target words in inflected forms, case-insensitively', () => {
    expect(usesWord('Ich habe zwei Hunde.', 'Hund', 'de')).toBe(true);
    expect(usesWord('Wir spielen Fußball', 'spielen', 'de')).toBe(true);
    expect(usesWord('Er spielt gern', 'spielen', 'de')).toBe(true);
    expect(usesWord('Das ist ein Schlund', 'Hund', 'de')).toBe(false);
  });

  it('counts only what the learner said', () => {
    const turns: Turn[] = [{ speaker: 'partner', text: 'Hast du eine Katze?' }, { speaker: 'learner', text: 'Nein, ich habe einen Hund.' }];
    expect(usedWords(turns, ['HUND', 'KATZE'], (word) => word, 'de')).toEqual(['HUND']);
  });
});
