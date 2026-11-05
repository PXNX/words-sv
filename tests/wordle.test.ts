import { describe, expect, it } from 'vitest';
import { evaluateWordleGuess, fiveLetterWords } from '../src/lib/wordle/wordleWords';
import { keyboardLayoutFor, keyboardMarksFrom, layoutLetters, physicalKeyAction, typeableWords } from '../src/lib/wordle/keyboardLayouts';
import { readWordleState, writeWordleState } from '../src/lib/wordle/wordleState';

describe('Wordle scoring', () => {
  it('marks a repeated guess letter only as often as the answer has it', () => {
    expect(evaluateWordleGuess('APFEL', 'TASSE')).toEqual(['absent', 'present', 'absent', 'absent', 'present']);
    // Two E guessed, one E in the answer, already green: the other E is absent.
    expect(evaluateWordleGuess('KÄLTE', 'EEEEE')).toEqual(['absent', 'absent', 'absent', 'absent', 'correct']);
    expect(evaluateWordleGuess('TASSE', 'SASSE')).toEqual(['absent', 'correct', 'correct', 'correct', 'correct']);
  });

  it('keeps the best mark per key', () => {
    const marks = keyboardMarksFrom([{ word: 'SASSE', marks: evaluateWordleGuess('TASSE', 'SASSE') }]);
    expect(marks.S).toBe('correct');
  });
});

describe('Wordle words and keys', () => {
  const german = layoutLetters(keyboardLayoutFor('de'));

  it('drops words the keyboard cannot type and uppercases ß to SS', () => {
    const words = fiveLetterWords(['Apfel', 'groß', 'Café', 'Kälte'], 5);
    expect(words).toEqual(['APFEL', 'GROSS', 'KÄLTE']);
    expect(typeableWords(fiveLetterWords(['Café'], 4), german)).toEqual([]);
    expect(german.has('ẞ')).toBe(false);
  });

  it('maps physical keys to letters, delete and enter', () => {
    expect(physicalKeyAction('a', german)).toEqual({ kind: 'letters', value: 'A' });
    expect(physicalKeyAction('ä', german)).toEqual({ kind: 'letters', value: 'Ä' });
    expect(physicalKeyAction('ß', german)).toEqual({ kind: 'letters', value: 'SS' });
    expect(physicalKeyAction('é', german)).toBeNull();
    expect(physicalKeyAction('1', german)).toBeNull();
    expect(physicalKeyAction('Shift', german)).toBeNull();
    expect(physicalKeyAction('Backspace', german)).toEqual({ kind: 'remove' });
    expect(physicalKeyAction('Enter', german)).toEqual({ kind: 'enter' });
    expect(physicalKeyAction('ж', layoutLetters(keyboardLayoutFor('uk')))).toEqual({ kind: 'letters', value: 'Ж' });
  });
});

describe('Wordle saved round', () => {
  const candidates = ['APFEL', 'TASSE', 'KÄLTE'];
  const context = { language: 'de', level: 'a1', candidates };

  it('restores an in-progress round only for the same language and level', () => {
    const serialized = writeWordleState({ ...context, target: 'APFEL', entries: [{ word: 'TASSE', marks: evaluateWordleGuess('APFEL', 'TASSE') }], guess: 'KÄL' });
    expect(readWordleState(serialized, context)).toEqual({ target: 'APFEL', entries: [{ word: 'TASSE', marks: evaluateWordleGuess('APFEL', 'TASSE') }], guess: 'KÄL' });
    expect(readWordleState(serialized, { ...context, level: 'a2' })).toBeNull();
  });

  it('rejects completed, exhausted, tampered and broken state', () => {
    const valid = JSON.parse(writeWordleState({ ...context, target: 'APFEL', entries: [], guess: '' }));
    expect(readWordleState(JSON.stringify({ ...valid, entries: [{ word: 'APFEL', marks: evaluateWordleGuess('APFEL', 'APFEL') }] }), context)).toBeNull();
    expect(readWordleState(JSON.stringify({ ...valid, entries: Array.from({ length: 6 }, () => ({ word: 'TASSE', marks: evaluateWordleGuess('APFEL', 'TASSE') })) }), context)).toBeNull();
    expect(readWordleState(JSON.stringify({ ...valid, entries: [{ word: 'TASSE', marks: ['absent', 'absent', 'absent', 'absent', 'absent'] }] }), context)).toBeNull();
    expect(readWordleState('{not-json', context)).toBeNull();
  });
});
