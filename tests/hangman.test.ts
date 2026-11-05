import { describe, expect, it } from 'vitest';
import { hangmanCandidates, HANGMAN_LIVES, isHangmanLost, isHangmanWon, letterFromKey, readHangmanState, wrongLetters, writeHangmanState } from '../src/lib/hangman/hangman';
import { keyboardLayoutFor } from '../src/lib/wordle/keyboardLayouts';

const de = keyboardLayoutFor('de');
const fr = keyboardLayoutFor('fr');

describe('hangman', () => {
  it('only offers words of four to eight letters the keyboard can type', () => {
    expect(hangmanCandidates(['Café', 'Haus', 'Haus', 'Tür', 'ab', 'Straße', 'E-Mail', 'Bahnhofstraße'], de)).toEqual(['HAUS', 'STRASSE']);
    expect(hangmanCandidates(['café'], fr)).toEqual(['CAFÉ']);
  });

  it('counts wrong letters and decides win and loss', () => {
    expect(wrongLetters('HAUS', ['H', 'X', 'A', 'Q'])).toEqual(['X', 'Q']);
    expect(isHangmanWon('HAUS', ['S', 'U', 'A', 'H'])).toBe(true);
    expect(isHangmanWon('', [])).toBe(false);
    const misses = ['B', 'C', 'D', 'E', 'F', 'G'];
    expect(misses).toHaveLength(HANGMAN_LIVES);
    expect(isHangmanLost('HAUS', misses.slice(0, 5))).toBe(false);
    expect(isHangmanLost('HAUS', misses)).toBe(true);
  });

  it('maps physical keys to keyboard letters', () => {
    expect(letterFromKey('a', de)).toBe('A');
    expect(letterFromKey('ä', de)).toBe('Ä');
    expect(letterFromKey('é', fr)).toBe('É');
    expect(letterFromKey('é', de)).toBeNull();
    expect(letterFromKey('Enter', de)).toBeNull();
    expect(letterFromKey('1', de)).toBeNull();
  });

  it('restores only an unfinished round for the same language and level', () => {
    const context = { language: 'de', level: 'a1', candidates: ['HAUS', 'BAUM'], layout: de };
    const saved = writeHangmanState({ language: 'de', level: 'a1', target: 'HAUS', guessed: ['H', 'X'] });
    expect(readHangmanState(saved, context)).toEqual({ target: 'HAUS', guessed: ['H', 'X'] });
    expect(readHangmanState(saved, { ...context, level: 'a2' })).toBeNull();
    expect(readHangmanState(saved, { ...context, candidates: ['BAUM'] })).toBeNull();
    expect(readHangmanState(writeHangmanState({ language: 'de', level: 'a1', target: 'HAUS', guessed: ['H', 'A', 'U', 'S'] }), context)).toBeNull();
    expect(readHangmanState(writeHangmanState({ language: 'de', level: 'a1', target: 'HAUS', guessed: ['H', 'H'] }), context)).toBeNull();
    expect(readHangmanState('{oops', context)).toBeNull();
    expect(readHangmanState(null, context)).toBeNull();
  });
});
