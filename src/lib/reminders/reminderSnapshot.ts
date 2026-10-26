/*
 * The small, local slice of progress that the reminder service worker cannot read for itself:
 * due review words, the text the learner stopped in, and whether today is recap day. The app
 * publishes it together with the streak state; the service worker only reads IndexedDB.
 */
import type { Language, VocabularyLevel } from '#lib/data/vocabulary.js';
import { dueReviewCount } from '#lib/review/ledger.js';
import type { ReminderExtras } from '#lib/pwaReminders.js';

const READING_PROGRESS_KEY = 'wordcircle-reading-progress-v1';

type SavedReading = {
  fingerprint?: string;
  id?: string;
  title?: string;
  remaining?: number;
  solved?: Record<string, Record<number, true>>;
};

/** Monday is recap day, matching the weekly panel on `/progress`. */
export function isWeeklyRecapDay(now = new Date()): boolean {
  return now.getDay() === 1;
}

export function unfinishedReadingTitle(language: Language, level: VocabularyLevel, includeLower: boolean): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const fingerprint = `${language}|${level}|${includeLower}`;
    const parsed = JSON.parse(localStorage.getItem(READING_PROGRESS_KEY) ?? 'null') as SavedReading | null;
    if (!parsed || parsed.fingerprint !== fingerprint || typeof parsed.id !== 'string') return null;
    if (typeof parsed.title !== 'string' || !parsed.title) return null;
    return typeof parsed.remaining === 'number' && parsed.remaining > 0 ? parsed.title : null;
  } catch {
    return null;
  }
}

export function reminderExtras(language: Language, level: VocabularyLevel, includeLower: boolean, _name = '', now = new Date()): ReminderExtras {
  return {
    dueWords: dueReviewCount(language),
    readingTitle: unfinishedReadingTitle(language, level, includeLower),
    weeklyReady: isWeeklyRecapDay(now)
  };
}
