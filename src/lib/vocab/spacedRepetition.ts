import { vocabularyLevels, wordPools, type Language, type VocabularyLevel } from '#lib/data/vocabulary.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS = [1, 2, 4, 8, 16, 32];

export const VOCABULARY_REVIEW_STORAGE_PREFIX = 'wordcircle-vocabulary-review-v2';

// A word counts as mastered once it has been answered correctly this many times in a row
// (repetitions resets to 0 on a wrong answer, so this reflects a current mastery streak).
export const MASTERY_THRESHOLD = 20;

// `lapses` counts how often a word was rated as hard. It is the strongest sort key in
// `prioritizeLearningWords`, so a word marked in reading (or answered wrong) keeps coming back.
export type ReviewProgress = { repetitions: number; dueAt: number; lapses?: number };

export function normalizeReviewProgress(value: unknown): ReviewProgress {
  if (!value || typeof value !== 'object') return { repetitions: 0, dueAt: 0, lapses: 0 };
  const progress = value as Partial<ReviewProgress>;
  const repetitions = typeof progress.repetitions === 'number' && Number.isSafeInteger(progress.repetitions) && progress.repetitions >= 0 ? progress.repetitions : 0;
  const dueAt = typeof progress.dueAt === 'number' && Number.isSafeInteger(progress.dueAt) && progress.dueAt >= 0 ? progress.dueAt : 0;
  const lapses = typeof progress.lapses === 'number' && Number.isSafeInteger(progress.lapses) && progress.lapses >= 0 ? progress.lapses : 0;
  return {
    repetitions,
    dueAt,
    lapses
  };
}

export function updateReviewProgress(progressByWord: Record<string, ReviewProgress>, word: string, correct: boolean, now: number = Date.now()): Record<string, ReviewProgress> {
  const current = normalizeReviewProgress(progressByWord[word]);
  const repetitions = correct ? current.repetitions + 1 : 0;
  // A wrong answer adds weight; every right answer slowly earns part of it back.
  const lapses = correct ? Math.max(0, (current.lapses ?? 0) - 1) : (current.lapses ?? 0) + 1;
  const intervalDays = correct ? INTERVAL_DAYS[Math.min(repetitions - 1, INTERVAL_DAYS.length - 1)] : 1;
  return {
    ...progressByWord,
    [word]: { repetitions, dueAt: now + intervalDays * DAY_MS, lapses }
  };
}

export function prioritizeLearningWords(words: string[], progressByWord: Record<string, ReviewProgress>, now: number = Date.now()): string[] {
  return [...words].sort((left, right) => {
    const leftProgress = normalizeReviewProgress(progressByWord[left]);
    const rightProgress = normalizeReviewProgress(progressByWord[right]);
    // Words marked as hard come first and stay ahead of unseen words until they are answered right.
    if ((leftProgress.lapses ?? 0) !== (rightProgress.lapses ?? 0)) return (rightProgress.lapses ?? 0) - (leftProgress.lapses ?? 0);
    const leftDue = leftProgress.dueAt <= now ? 0 : leftProgress.dueAt;
    const rightDue = rightProgress.dueAt <= now ? 0 : rightProgress.dueAt;
    if (leftDue !== rightDue) return leftDue - rightDue;
    return leftProgress.repetitions - rightProgress.repetitions;
  });
}

export type LevelMastery = {
  level: VocabularyLevel;
  masteredWords: number;
  totalWords: number;
  percentage: number;
};

export type LanguageVocabularyProgress = {
  wordsPracticed: number;
  totalRepetitions: number;
  mostRepeated: { word: string; repetitions: number }[];
  masteredWords: number;
  totalWords: number;
  percentage: number;
  levelBreakdown: LevelMastery[];
};

function readLevelProgress(language: Language, level: VocabularyLevel): Record<string, unknown> {
  if (typeof localStorage === 'undefined') return {};
  const raw = localStorage.getItem(`${VOCABULARY_REVIEW_STORAGE_PREFIX}:${language}:${level}`);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function writeLevelProgress(language: Language, level: VocabularyLevel, progress: Record<string, unknown>) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${VOCABULARY_REVIEW_STORAGE_PREFIX}:${language}:${level}`, JSON.stringify(progress));
  } catch {
    // A full quota must not stop the learner from marking a word.
  }
}

function levelsWithWord(language: Language, word: string): VocabularyLevel[] {
  return vocabularyLevels.filter((level) => (wordPools[language]?.[level] ?? []).includes(word));
}

/**
 * Marks a word as hard wherever it is taught: the mastery streak resets, the word is due at once
 * and its lapse count grows, so it moves ahead of unseen words in the next practice session and
 * stays in rotation until it is answered right often enough.
 */
export function markWordForRepeat(language: Language, word: string, now: number = Date.now()) {
  const key = word.trim().toLocaleUpperCase();
  for (const level of levelsWithWord(language, key)) {
    const progress = readLevelProgress(language, level);
    const current = normalizeReviewProgress(progress[key]);
    progress[key] = { repetitions: 0, dueAt: now, lapses: (current.lapses ?? 0) + 1 };
    writeLevelProgress(language, level, progress);
  }
}

/** Takes a manual mark back: the word returns to a normal, unseen-like rotation. */
export function clearWordRepeat(language: Language, word: string) {
  const key = word.trim().toLocaleUpperCase();
  for (const level of levelsWithWord(language, key)) {
    const progress = readLevelProgress(language, level);
    if (!(key in progress)) continue;
    const current = normalizeReviewProgress(progress[key]);
    progress[key] = { repetitions: current.repetitions, dueAt: 0, lapses: 0 };
    writeLevelProgress(language, level, progress);
  }
}

// Scans every `wordcircle-vocabulary-review-v2:<language>:<level>` entry (one per level the
// learner has practiced) and folds them into one per-language summary. A word's mastery
// percentage is measured per CEFR level against that level's full word list, then summed
// into an overall percentage across every level of the language.
export function readVocabularyProgressByLanguage(languages: readonly Language[]): Record<string, LanguageVocabularyProgress> {
  const result: Record<string, LanguageVocabularyProgress> = {};
  if (typeof localStorage === 'undefined') return result;
  for (const language of languages) {
    const repetitionsByWord = new Map<string, number>();
    const levelBreakdown: LevelMastery[] = [];
    let masteredWords = 0;
    let totalWords = 0;
    for (const level of vocabularyLevels) {
      const levelWords = wordPools[language]?.[level] ?? [];
      if (levelWords.length === 0) continue;
      const progressByWord = readLevelProgress(language, level);
      let levelMastered = 0;
      for (const word of levelWords) {
        const repetitions = normalizeReviewProgress(progressByWord[word]).repetitions;
        if (repetitions > 0) repetitionsByWord.set(word, Math.max(repetitionsByWord.get(word) ?? 0, repetitions));
        if (repetitions >= MASTERY_THRESHOLD) levelMastered += 1;
      }
      levelBreakdown.push({
        level,
        masteredWords: levelMastered,
        totalWords: levelWords.length,
        percentage: Math.round((levelMastered / levelWords.length) * 100)
      });
      masteredWords += levelMastered;
      totalWords += levelWords.length;
    }
    if (repetitionsByWord.size === 0) continue;
    const mostRepeated = [...repetitionsByWord.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([word, repetitions]) => ({ word, repetitions }));
    result[language] = {
      wordsPracticed: repetitionsByWord.size,
      totalRepetitions: [...repetitionsByWord.values()].reduce((sum, count) => sum + count, 0),
      mostRepeated,
      masteredWords,
      totalWords,
      percentage: totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0,
      levelBreakdown
    };
  }
  return result;
}
