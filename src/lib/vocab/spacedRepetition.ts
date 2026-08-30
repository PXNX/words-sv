const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS = [1, 2, 4, 8, 16, 32];

export const VOCABULARY_REVIEW_STORAGE_PREFIX = 'wordcircle-vocabulary-review-v2';

export type ReviewProgress = { repetitions: number; dueAt: number };

export function normalizeReviewProgress(value: unknown): ReviewProgress {
  if (!value || typeof value !== 'object') return { repetitions: 0, dueAt: 0 };
  const progress = value as Partial<ReviewProgress>;
  const repetitions = typeof progress.repetitions === 'number' && Number.isSafeInteger(progress.repetitions) && progress.repetitions >= 0 ? progress.repetitions : 0;
  const dueAt = typeof progress.dueAt === 'number' && Number.isSafeInteger(progress.dueAt) && progress.dueAt >= 0 ? progress.dueAt : 0;
  return {
    repetitions,
    dueAt
  };
}

export function updateReviewProgress(progressByWord: Record<string, ReviewProgress>, word: string, correct: boolean, now: number = Date.now()): Record<string, ReviewProgress> {
  const current = normalizeReviewProgress(progressByWord[word]);
  const repetitions = correct ? current.repetitions + 1 : 0;
  const intervalDays = correct ? INTERVAL_DAYS[Math.min(repetitions - 1, INTERVAL_DAYS.length - 1)] : 1;
  return {
    ...progressByWord,
    [word]: { repetitions, dueAt: now + intervalDays * DAY_MS }
  };
}

export function prioritizeLearningWords(words: string[], progressByWord: Record<string, ReviewProgress>, now: number = Date.now()): string[] {
  return [...words].sort((left, right) => {
    const leftProgress = normalizeReviewProgress(progressByWord[left]);
    const rightProgress = normalizeReviewProgress(progressByWord[right]);
    const leftDue = leftProgress.dueAt <= now ? 0 : leftProgress.dueAt;
    const rightDue = rightProgress.dueAt <= now ? 0 : rightProgress.dueAt;
    if (leftDue !== rightDue) return leftDue - rightDue;
    return leftProgress.repetitions - rightProgress.repetitions;
  });
}

export type LanguageVocabularyProgress = {
  wordsPracticed: number;
  totalRepetitions: number;
  mostRepeated: { word: string; repetitions: number }[];
};

// Scans every `wordcircle-vocabulary-review-v2:<language>:<level>` entry (one per level the
// learner has practiced) and folds them into one per-language summary, taking the highest
// repetition count seen for a word across its levels.
export function readVocabularyProgressByLanguage(languages: readonly string[]): Record<string, LanguageVocabularyProgress> {
  const result: Record<string, LanguageVocabularyProgress> = {};
  if (typeof localStorage === 'undefined') return result;
  for (const language of languages) {
    const repetitionsByWord = new Map<string, number>();
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(`${VOCABULARY_REVIEW_STORAGE_PREFIX}:${language}:`)) continue;
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
        if (!parsed || typeof parsed !== 'object') continue;
        for (const [word, value] of Object.entries(parsed as Record<string, unknown>)) {
          const repetitions = normalizeReviewProgress(value).repetitions;
          repetitionsByWord.set(word, Math.max(repetitionsByWord.get(word) ?? 0, repetitions));
        }
      } catch {
        /* Skip entries that fail to parse. */
      }
    }
    if (repetitionsByWord.size === 0) continue;
    const mostRepeated = [...repetitionsByWord.entries()]
      .filter(([, repetitions]) => repetitions > 0)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([word, repetitions]) => ({ word, repetitions }));
    result[language] = {
      wordsPracticed: repetitionsByWord.size,
      totalRepetitions: [...repetitionsByWord.values()].reduce((sum, count) => sum + count, 0),
      mostRepeated
    };
  }
  return result;
}
