import type { WordleMark } from './keyboardLayouts';

export function normalizePlayableWord(value: string): string {
	return value.trim().normalize('NFC').toLocaleUpperCase();
}

export function isLetterWord(word: string, minimum: number, maximum: number = minimum): boolean {
	const length = [...word].length;
	return length >= minimum && length <= maximum && /^\p{L}+$/u.test(word);
}

export function fiveLetterWords(words: string[]): string[] {
	return [...new Set(words.map(normalizePlayableWord).filter((word) => isLetterWord(word, 5)))];
}

export function isValidWordleGuess(candidates: string[], value: string): boolean {
	const normalized = normalizePlayableWord(value);
	return isLetterWord(normalized, 5) && candidates.includes(normalized);
}

export function evaluateWordleGuess(answer: string, guess: string): WordleMark[] {
  const normalizedAnswer = normalizePlayableWord(answer);
  const normalizedGuess = normalizePlayableWord(guess);
  if (normalizedAnswer.length !== 5 || normalizedGuess.length !== 5) throw new Error('Wordle words must contain five letters.');

  const marks: WordleMark[] = Array(5).fill('absent');
  const remaining = [...normalizedAnswer];

  [...normalizedGuess].forEach((letter, index) => {
    if (letter === normalizedAnswer[index]) {
      marks[index] = 'correct';
      remaining[index] = '';
    }
  });

  [...normalizedGuess].forEach((letter, index) => {
    if (marks[index] === 'correct') return;
    const availableIndex = remaining.indexOf(letter);
    if (availableIndex >= 0) {
      marks[index] = 'present';
      remaining[availableIndex] = '';
    }
  });

  return marks;
}
