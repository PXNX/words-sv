import { requiresCumulativePool } from '#lib/circle/engine.js';
import { wordPools, isLanguage, isVocabularyLevel, type Language, type VocabularyLevel, warmLanguage, refreshHintableBaseWords } from '#lib/data/vocabulary.js';
import { normalizeVocabularyGoal, dateKey, readStreak, repairCandidate, repairStreak as repairStoredStreak, syncStreak, syncStreakGoal, type ClientStreak, type StreakRepair, type StreakEvent } from '#lib/clientStreak.js';
import { recordActivity, type ActivityKind } from '#lib/progress/activity.js';
import { publishReminderState } from '#lib/pwaReminders.js';
import { reminderExtras } from '#lib/reminders/reminderSnapshot.js';
import type { Locale } from '#lib/paraglide/runtime.js';

const ACTIVITY_BY_EVENT: Partial<Record<StreakEvent, ActivityKind>> = {
  vocab_correct: 'vocab',
  grammar_correct: 'grammar',
  circle_completed: 'circle',
  definitions_completed: 'circle',
  wordle_completed: 'wordle',
  hangman_completed: 'hangman',
  alltag_correct: 'alltag'
};

export type Theme = 'light' | 'dark';
export type InterfaceLocale = Locale;
export type WordleLength = 3 | 4 | 5 | 6 | 7;
// Story voices: the browser's own ('standard'), neural voices generated on the device ('natural'),
// or the MiniMax cloud API ('minimax'), which needs an API key but gives the most natural speech.
export type VoiceQuality = 'standard' | 'natural' | 'minimax';
// Natural voice packs. Both run on the device; the high packs are larger and take longer to load.
export type NaturalModel = 'standard' | 'high';

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
const VOICE_QUALITY_KEY = 'wordcircle-voice-quality-v1';
const NATURAL_MODEL_KEY = 'wordcircle-natural-model-v1';
const MINIMAX_KEY = 'wordcircle-minimax-api-key-v1';
const DIALECTS_KEY = 'wordcircle-dialects-v1';
const BACKWARD_WORDS_KEY = 'wordcircle-backward-words-v1';
const VOCABULARY_LEVEL_KEY = 'wordcircle-vocabulary-level-v1';
const INCLUDE_LOWER_VOCABULARY_KEY = 'wordcircle-include-lower-vocabulary-v1';
const LANGUAGE_KEY = 'wordcircle-language-v1';
const INTERFACE_LOCALE_KEY = 'wordcircle-interface-locale-v1';
const ROUND_TOTAL_KEY = 'wordcircle-completed-rounds-v1';
const WORDLE_LENGTH_KEY = 'wordcircle-wordle-length-v1';
const FIRST_NAME_KEY = 'wordcircle-first-name-v1';
export const FIRST_NAME_MAX_LENGTH = 30;

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
function readNaturalModel(): NaturalModel {
  if (typeof localStorage === 'undefined') return 'high';
  return localStorage.getItem(NATURAL_MODEL_KEY) === 'standard' ? 'standard' : 'high';
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
    voiceQuality = $state<VoiceQuality>(typeof localStorage !== 'undefined' && localStorage.getItem(VOICE_QUALITY_KEY) === 'natural' ? 'natural' : 'standard');
    naturalModel = $state<NaturalModel>(readNaturalModel());
    minimaxKey = $state<string>(typeof localStorage !== 'undefined' ? localStorage.getItem(MINIMAX_KEY) ?? '' : '');
    dialects = $state(typeof localStorage === 'undefined' || localStorage.getItem(DIALECTS_KEY) !== 'off');
    lang = $state<Language>(readLanguage());
    interfaceLocale = $state<InterfaceLocale>(readInterfaceLocale());
    vocabularyLevel = $state<VocabularyLevel>(readVocabularyLevel());
    includeLowerVocabulary = $state(typeof localStorage !== 'undefined' && localStorage.getItem(INCLUDE_LOWER_VOCABULARY_KEY) === 'on');
    allowBackwardWords = $state(typeof localStorage !== 'undefined' && localStorage.getItem(BACKWARD_WORDS_KEY) === 'on');
    completedRounds = $state(readCompletedRounds());
    wordleLength = $state<WordleLength>(readWordleLength());
    streak = $state<ClientStreak>(readStreak());
    firstName = $state(typeof localStorage === 'undefined' ? '' : localStorage.getItem(FIRST_NAME_KEY) ?? '');

    constructor() {
      // Fetch the learner's vocabulary in the background so game modes that need it don't
      // block on the first render. Other languages stay out of the initial bundle entirely.
      void warmLanguage(this.lang).then(refreshHintableBaseWords);
    }

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
  setVoiceQuality(next: VoiceQuality) {
    this.voiceQuality = next;
    localStorage.setItem(VOICE_QUALITY_KEY, next);
  }
  setNaturalModel(next: NaturalModel) {
    this.naturalModel = next;
    localStorage.setItem(NATURAL_MODEL_KEY, next);
  }
  setMinimaxKey(next: string) {
    this.minimaxKey = next;
    localStorage.setItem(MINIMAX_KEY, next);
    try { import('#lib/voice/minimax.js').then(({ setMinimaxApiKey }) => setMinimaxApiKey(next)); } catch {}
  }
  setDialects(next: boolean) {
    this.dialects = next;
    localStorage.setItem(DIALECTS_KEY, next ? 'on' : 'off');
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
    // Fetch the new language's vocabulary in the background; game modes that need it
    // pick it up from the cache as soon as it arrives.
    void warmLanguage(next).then(refreshHintableBaseWords);
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
  setFirstName(next: string) {
    const name = next.trim().replace(/\s+/g, ' ').slice(0, FIRST_NAME_MAX_LENGTH);
    if (!name) return;
    this.firstName = name;
    localStorage.setItem(FIRST_NAME_KEY, name);
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
    // Boolean modes only need one request per day; counters always add to today's total.
    if (this.streak.dateKey === dateKey() && (
      (event === 'circle_completed' && this.streak.circleCompleted) ||
      (event === 'definitions_completed' && this.streak.definitionsCompleted) ||
      (event === 'wordle_completed' && this.streak.wordleCompleted) ||
      (event === 'reading_completed' && this.streak.readingCompleted) ||
      (event === 'story_completed' && this.streak.storyCompleted) ||
      (event === 'listen_completed' && this.streak.listenCompleted) ||
      (event === 'hangman_completed' && this.streak.hangmanCompleted)
    )) return;
    // Counters drop one timestamp per answer, so the weekly recap can measure real time spent.
    // Reading, story and listening completions are logged where their ids are known.
    const kind = ACTIVITY_BY_EVENT[event];
    if (kind) recordActivity(kind);
    this.streak = await syncStreak(event, this.streak);
  }
  // The goal lives in the streak state, so it travels with the snapshot and survives a reload.
  dailyGoal() {
    return normalizeVocabularyGoal(this.streak.vocabularyGoal);
  }
  async setDailyGoal(goal: number) {
    this.streak = await syncStreakGoal(normalizeVocabularyGoal(goal), this.streak);
  }
  async refreshStreak() {
    this.streak = readStreak();
    this.streak = await syncStreak('sync', this.streak);
    this.publishReminderState();
  }
  // The reminder worker can only read IndexedDB, so due words and the unfinished text travel along.
  publishReminderState() {
    void publishReminderState(this.streak, reminderExtras(this.lang, this.vocabularyLevel, this.includeLowerVocabulary, this.firstName || 'du'));
  }
  repairCandidate(): StreakRepair | null {
    return repairCandidate();
  }
  async repairStreak() {
    this.streak = repairStoredStreak();
    this.publishReminderState();
    // A repaired streak still travels to the server, which keeps its own copy for push reminders.
    this.streak = await syncStreak('sync', this.streak);
  }
}

export const settings = new SettingsStore();
