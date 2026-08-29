import { isLetterWord, normalizePlayableWord } from '$lib/wordle/wordleWords';

export function pickLearningSection(words: string[], random: () => number, size = 6): string[] {
	const normalized = [...new Set(words.map(normalizePlayableWord).filter((word) => isLetterWord(word, 3, 18)))];
  const shuffled = [...normalized];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled.slice(0, Math.min(size, shuffled.length));
}

function shuffled<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function definitionChoiceWords(currentWord: string, candidates: string[], definitions: Record<string, string>, random: () => number, size = 3): string[] {
  const correctWord = normalizePlayableWord(currentWord);
  if (!definitions[correctWord]) return [];
  const distractors = [...new Set(candidates.map(normalizePlayableWord))].filter((word) => word !== correctWord && Boolean(definitions[word]));
  if (distractors.length < size - 1) return [];
  return shuffled([correctWord, ...shuffled(distractors, random).slice(0, size - 1)], random);
}

export function insertLearningRepeat(queue: string[], position: number, word: string, delay = 3): string[] {
  const nextQueue = [...queue];
  nextQueue.splice(Math.min(position + delay, nextQueue.length), 0, normalizePlayableWord(word));
  return nextQueue;
}

export function definitionAnswerResult(choice: string, currentWord: string, queue: string[], position: number, alreadyRequeued = false): { isCorrect: boolean; queue: string[]; requeued: boolean } {
  const isCorrect = normalizePlayableWord(choice) === normalizePlayableWord(currentWord);
  if (isCorrect || alreadyRequeued) return { isCorrect, queue: [...queue], requeued: alreadyRequeued };
  return { isCorrect, queue: insertLearningRepeat(queue, position, currentWord), requeued: true };
}
