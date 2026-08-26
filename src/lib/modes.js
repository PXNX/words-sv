// @ts-nocheck

export function normalizePlayableWord(value) {
	return value.trim().normalize('NFC').toLocaleUpperCase();
}

function isLetterWord(word, minimum, maximum = minimum) {
	const length = [...word].length;
	return length >= minimum && length <= maximum && /^\p{L}+$/u.test(word);
}

export function fiveLetterWords(words) {
	return [...new Set(words.map(normalizePlayableWord).filter((word) => isLetterWord(word, 5)))];
}

export function isValidWordleGuess(candidates, value) {
	const normalized = normalizePlayableWord(value);
	return isLetterWord(normalized, 5) && candidates.includes(normalized);
}

export function evaluateWordleGuess(answer, guess) {
  const normalizedAnswer = normalizePlayableWord(answer);
  const normalizedGuess = normalizePlayableWord(guess);
  if (normalizedAnswer.length !== 5 || normalizedGuess.length !== 5) throw new Error('Wordle words must contain five letters.');

  const marks = Array(5).fill('absent');
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

export function pickLearningSection(words, random, size = 6) {
	const normalized = [...new Set(words.map(normalizePlayableWord).filter((word) => isLetterWord(word, 3, 18)))];
  const shuffled = [...normalized];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled.slice(0, Math.min(size, shuffled.length));
}

function shuffled(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function definitionChoiceWords(currentWord, candidates, definitions, random, size = 3) {
  const correctWord = normalizePlayableWord(currentWord);
  if (!definitions[correctWord]) return [];
  const distractors = [...new Set(candidates.map(normalizePlayableWord))].filter((word) => word !== correctWord && Boolean(definitions[word]));
  if (distractors.length < size - 1) return [];
  return shuffled([correctWord, ...shuffled(distractors, random).slice(0, size - 1)], random);
}

export function insertLearningRepeat(queue, position, word, delay = 3) {
  const nextQueue = [...queue];
  nextQueue.splice(Math.min(position + delay, nextQueue.length), 0, normalizePlayableWord(word));
  return nextQueue;
}

export function definitionAnswerResult(choice, currentWord, queue, position, alreadyRequeued = false) {
  const isCorrect = normalizePlayableWord(choice) === normalizePlayableWord(currentWord);
  if (isCorrect || alreadyRequeued) return { isCorrect, queue: [...queue], requeued: alreadyRequeued };
  return { isCorrect, queue: insertLearningRepeat(queue, position, currentWord), requeued: true };
}
