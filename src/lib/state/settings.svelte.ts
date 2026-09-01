import { requiresCumulativePool } from '$lib/circle/engine';
import { wordPools, isLanguage, isVocabularyLevel, type Language, type VocabularyLevel } from '$lib/data/vocabulary';
import { readStreak, syncStreak, type ClientStreak, type StreakEvent } from '$lib/clientStreak';
import type { Locale } from '$lib/paraglide/runtime';

export type Theme = 'light' | 'dark';
export type InterfaceLocale = Locale;
export type WordleLength = 3 | 4 | 5 | 6 | 7;

export const interfaceLocales = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'fa', label: 'فارسی' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
  { code: 'uk', label: 'Українська' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ml', label: 'മലയാളം' }
] as const satisfies ReadonlyArray<{ code: InterfaceLocale; label: string }>;

const THEME_KEY = 'wordcircle-theme';
const VIBRATION_KEY = 'wordcircle-vibration';
const SOUND_KEY = 'wordcircle-sound';
const BACKWARD_WORDS_KEY = 'wordcircle-backward-words-v1';
const VOCABULARY_LEVEL_KEY = 'wordcircle-vocabulary-level-v1';
const INCLUDE_LOWER_VOCABULARY_KEY = 'wordcircle-include-lower-vocabulary-v1';
const LANGUAGE_KEY = 'wordcircle-language-v1';
const INTERFACE_LOCALE_KEY = 'wordcircle-interface-locale-v1';
const ROUND_TOTAL_KEY = 'wordcircle-completed-rounds-v1';
const WORDLE_LENGTH_KEY = 'wordcircle-wordle-length-v1';

function isInterfaceLocale(value: unknown): value is InterfaceLocale {
  return typeof value === 'string' && interfaceLocales.some((locale) => locale.code === value);
}
function readLanguage(): Language {
  if (typeof localStorage === 'undefined') return 'de';
  const value = localStorage.getItem(LANGUAGE_KEY);
  return isLanguage(value) ? value : 'de';
}
function preferredInterfaceLocale(): InterfaceLocale {
  for (const candidate of typeof navigator === 'undefined' ? [] : navigator.languages) {
    const base = candidate.toLowerCase().split('-')[0];
    if (isInterfaceLocale(base)) return base;
  }
  return 'en';
}
function readInterfaceLocale(): InterfaceLocale {
  if (typeof localStorage === 'undefined') return 'de';
  const value = localStorage.getItem(INTERFACE_LOCALE_KEY);
  if (isInterfaceLocale(value)) return value;
  const learningLanguage = readLanguage();
  return isInterfaceLocale(learningLanguage) ? learningLanguage : 'en';
}
function readVocabularyLevel(): VocabularyLevel {
  if (typeof localStorage === 'undefined') return 'a1';
  const value = localStorage.getItem(VOCABULARY_LEVEL_KEY);
  return isVocabularyLevel(value) ? value : 'a1';
}
function readCompletedRounds() {
  if (typeof localStorage === 'undefined') return 0;
  const value = Number(localStorage.getItem(ROUND_TOTAL_KEY));
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
function readWordleLength(): WordleLength {
  if (typeof localStorage === 'undefined') return 5;
  const value = Number(localStorage.getItem(WORDLE_LENGTH_KEY));
  return Number.isInteger(value) && value >= 3 && value <= 7 ? value as WordleLength : 5;
}

class SettingsStore {
  theme = $state<Theme>(typeof localStorage !== 'undefined' && localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');
  vibration = $state(typeof localStorage === 'undefined' || localStorage.getItem(VIBRATION_KEY) !== 'off');
  sound = $state(typeof localStorage === 'undefined' || localStorage.getItem(SOUND_KEY) !== 'off');
  lang = $state<Language>(readLanguage());
  interfaceLocale = $state<InterfaceLocale>(readInterfaceLocale());
  vocabularyLevel = $state<VocabularyLevel>(readVocabularyLevel());
  includeLowerVocabulary = $state(typeof localStorage !== 'undefined' && localStorage.getItem(INCLUDE_LOWER_VOCABULARY_KEY) === 'on');
  allowBackwardWords = $state(typeof localStorage !== 'undefined' && localStorage.getItem(BACKWARD_WORDS_KEY) === 'on');
  completedRounds = $state(readCompletedRounds());
  wordleLength = $state<WordleLength>(readWordleLength());
  streak = $state<ClientStreak>(readStreak());

  hasStoredInterfaceLocale() {
    return typeof localStorage !== 'undefined' && Boolean(localStorage.getItem(INTERFACE_LOCALE_KEY));
  }
  applyPreferredInterfaceLocale() {
    this.setInterfaceLocale(preferredInterfaceLocale());
  }
  setTheme(next: Theme) {
    this.theme = next;
    localStorage.setItem(THEME_KEY, next);
  }
  setVibration(next: boolean) {
    this.vibration = next;
    localStorage.setItem(VIBRATION_KEY, next ? 'on' : 'off');
  }
  setSound(next: boolean) {
    this.sound = next;
    localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
  }
  setInterfaceLocale(next: InterfaceLocale) {
    this.interfaceLocale = next;
    localStorage.setItem(INTERFACE_LOCALE_KEY, next);
  }
  setLang(next: Language) {
    this.lang = next;
    localStorage.setItem(LANGUAGE_KEY, next);
    this.normalizeVocabulary();
  }
  setVocabularyLevel(next: VocabularyLevel) {
    this.vocabularyLevel = next;
    localStorage.setItem(VOCABULARY_LEVEL_KEY, next);
    this.normalizeVocabulary();
  }
  setIncludeLowerVocabulary(next: boolean) {
    this.includeLowerVocabulary = next;
    localStorage.setItem(INCLUDE_LOWER_VOCABULARY_KEY, next ? 'on' : 'off');
  }
  setAllowBackwardWords(next: boolean) {
    this.allowBackwardWords = next;
    localStorage.setItem(BACKWARD_WORDS_KEY, next ? 'on' : 'off');
  }
  setWordleLength(next: WordleLength) {
    this.wordleLength = next;
    localStorage.setItem(WORDLE_LENGTH_KEY, String(next));
  }
  private normalizeVocabulary() {
    if ((this.vocabularyLevel === 'a1' || requiresCumulativePool(wordPools[this.lang], this.vocabularyLevel)) && !this.includeLowerVocabulary) {
      this.setIncludeLowerVocabulary(this.vocabularyLevel !== 'a1');
    }
  }
  recordRoundCompleted() {
    this.completedRounds += 1;
    localStorage.setItem(ROUND_TOTAL_KEY, String(this.completedRounds));
  }
  async recordStreak(event: Exclude<StreakEvent, 'sync'>) {
    this.streak = await syncStreak(event, this.streak);
  }
  async refreshStreak() {
    this.streak = readStreak();
    this.streak = await syncStreak('sync', this.streak);
  }
}

export const settings = new SettingsStore();
