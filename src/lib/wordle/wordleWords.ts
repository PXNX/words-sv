import type { WordleMark } from './keyboardLayouts';

export function normalizePlayableWord(value: string): string {
	return value.trim().normalize('NFC').toLocaleUpperCase();
}

export function isLetterWord(word: string, minimum: number, maximum: number = minimum): boolean {
	const length = [...word].length;
	return length >= minimum && length <= maximum && /^\p{L}+$/u.test(word);
}

export function fiveLetterWords(words: string[], length = 5): string[] {
	return [...new Set(words.map(normalizePlayableWord).filter((word) => isLetterWord(word, length)))];
}

export function isValidWordleGuess(candidates: string[], value: string, length = 5): boolean {
	const normalized = normalizePlayableWord(value);
	return isLetterWord(normalized, length) && candidates.includes(normalized);
}

export function evaluateWordleGuess(answer: string, guess: string): WordleMark[] {
  const normalizedAnswer = normalizePlayableWord(answer);
  const normalizedGuess = normalizePlayableWord(guess);
	if ([...normalizedAnswer].length !== [...normalizedGuess].length || ![3, 4, 5, 6, 7].includes([...normalizedAnswer].length)) throw new Error('Wordle words must contain three to seven letters.');

	const marks: WordleMark[] = Array([...normalizedAnswer].length).fill('absent');
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
