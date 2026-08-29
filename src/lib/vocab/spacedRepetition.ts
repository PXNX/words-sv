const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS = [1, 2, 4, 8, 16, 32];

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
