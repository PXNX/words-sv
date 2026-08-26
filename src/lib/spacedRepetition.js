const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS = [1, 2, 4, 8, 16, 32];

/** @typedef {{ repetitions: number, dueAt: number }} ReviewProgress */

/** @param {unknown} value @returns {ReviewProgress} */
export function normalizeReviewProgress(value) {
  if (!value || typeof value !== 'object') return { repetitions: 0, dueAt: 0 };
  const progress = /** @type {Partial<ReviewProgress>} */ (value);
  const repetitions = typeof progress.repetitions === 'number' && Number.isSafeInteger(progress.repetitions) && progress.repetitions >= 0 ? progress.repetitions : 0;
  const dueAt = typeof progress.dueAt === 'number' && Number.isSafeInteger(progress.dueAt) && progress.dueAt >= 0 ? progress.dueAt : 0;
  return {
    repetitions,
    dueAt
  };
}

/** @param {Record<string, ReviewProgress>} progressByWord @param {string} word @param {boolean} correct @param {number} [now] @returns {Record<string, ReviewProgress>} */
export function updateReviewProgress(progressByWord, word, correct, now = Date.now()) {
  const current = normalizeReviewProgress(progressByWord[word]);
  const repetitions = correct ? current.repetitions + 1 : 0;
  const intervalDays = correct ? INTERVAL_DAYS[Math.min(repetitions - 1, INTERVAL_DAYS.length - 1)] : 1;
  return {
    ...progressByWord,
    [word]: { repetitions, dueAt: now + intervalDays * DAY_MS }
  };
}

/** @param {string[]} words @param {Record<string, ReviewProgress>} progressByWord @param {number} [now] @returns {string[]} */
export function prioritizeLearningWords(words, progressByWord, now = Date.now()) {
  return [...words].sort((left, right) => {
    const leftProgress = normalizeReviewProgress(progressByWord[left]);
    const rightProgress = normalizeReviewProgress(progressByWord[right]);
    const leftDue = leftProgress.dueAt <= now ? 0 : leftProgress.dueAt;
    const rightDue = rightProgress.dueAt <= now ? 0 : rightProgress.dueAt;
    if (leftDue !== rightDue) return leftDue - rightDue;
    return leftProgress.repetitions - rightProgress.repetitions;
  });
}
