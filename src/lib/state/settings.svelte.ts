import { LEARNING_STYLES, type LearningStyle } from '#lib/today/homeModes.js';
import { requiresCumulativePool } from '#lib/circle/engine.js';
import { chatModel, DEFAULT_CHAT_MODEL, type ChatModelId } from '#lib/conversation/models.js';
import { engineFor, ownsClipKey, setBrowserVoicesUsable, storedVoiceEngine, voiceEngineIds, voiceEngines, type VoiceEngineId } from '#lib/voice/engines.js';
import { wordPools, isLanguage, isVocabularyLevel, type Language, type VocabularyLevel, warmLanguage, refreshHintableBaseWords } from '#lib/data/vocabulary.js';
import { normalizeVocabularyGoal, dateKey, readStreak, repairCandidate, repairStreak as repairStoredStreak, syncStreak, syncStreakGoal, type ClientStreak, type StreakRepair, type StreakEvent } from '#lib/streak/clientStreak.js';
import { recordActivity, type ActivityKind } from '#lib/progress/activity.js';
import { logAnswer } from '#lib/progress/eventLog.js';
import type { EventMode } from '#lib/progress/events.js';
import { publishReminderState } from '#lib/pwa/pwaReminders.js';
import { reminderExtras } from '#lib/reminders/reminderSnapshot.js';
import type { Locale } from '#lib/paraglide/runtime.js';
import { loadLocaleMessages } from '#lib/i18n/messages.js';
import { parseAvatar, type Avatar } from '#lib/profile/avatar.js';
import { setKumarStandIn } from '#lib/story/standIn.js';
import { resolveFormatContext, type FormatCalendar, type FormatContext, type FormatDigits, type FormatSource } from '#lib/format/format.js';

// Completions logged here; answers in vocab, grammar, reading, hangman and writing are logged
// where they happen (with the word or the score).
const EVENT_MODE_BY_STREAK: Partial<Record<StreakEvent, EventMode>> = {
  circle_completed: 'circle',
  definitions_completed: 'circle',
  wordle_completed: 'wordle',
  alltag_correct: 'alltag',
  story_completed: 'story',
  listen_completed: 'listen'
};

const ACTIVITY_BY_EVENT: Partial<Record<StreakEvent, ActivityKind>> = {
  vocab_correct: 'vocab',
  grammar_correct: 'grammar',
  circle_completed: 'circle',
  definitions_completed: 'circle',
  wordle_completed: 'wordle',
  hangman_completed: 'hangman',
  taboo_completed: 'taboo',
  alltag_correct: 'alltag'
};

export type Theme = 'light' | 'dark';
export type InterfaceLocale = Locale;
export type WordleLength = 3 | 4 | 5 | 6 | 7;
// Story voices: one engine from voice/engines.ts, which describes each of them.
export type VoiceQuality = VoiceEngineId;
export const voiceQualities: readonly VoiceQuality[] = voiceEngineIds;
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
const LEARNING_STYLE_KEY = 'wordcircle-learning-style-v1';
const VOICE_QUALITY_KEY = 'wordcircle-voice-quality-v1';
const NATURAL_MODEL_KEY = 'wordcircle-natural-model-v1';
const CHAT_MODEL_KEY = 'wordcircle-chat-model-v1';
const DIALECTS_KEY = 'wordcircle-dialects-v1';
const BACKWARD_WORDS_KEY = 'wordcircle-backward-words-v1';
const VOCABULARY_LEVEL_KEY = 'wordcircle-vocabulary-level-v1';
const INCLUDE_LOWER_VOCABULARY_KEY = 'wordcircle-include-lower-vocabulary-v1';
const LANGUAGE_KEY = 'wordcircle-language-v1';
const INTERFACE_LOCALE_KEY = 'wordcircle-interface-locale-v1';
const ROUND_TOTAL_KEY = 'wordcircle-completed-rounds-v1';
const WORDLE_LENGTH_KEY = 'wordcircle-wordle-length-v1';
const FIRST_NAME_KEY = 'wordcircle-first-name-v1';
const AVATAR_KEY = 'wordcircle-avatar-v1';
const FORMAT_SOURCE_KEY = 'wordcircle-format-source-v1';
const INTERFACE_CALENDAR_KEY = 'wordcircle-interface-calendar-v1';
const INTERFACE_DIGITS_KEY = 'wordcircle-interface-digits-v1';
export const FIRST_NAME_MAX_LENGTH = 30;

// Only the latest language switch takes effect once its messages have arrived.
let interfaceLocaleRequest = 0;
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
function readVoiceQuality(): VoiceQuality {
  if (typeof localStorage === 'undefined') return 'standard';
  // A retired engine's setting (VoxCPM) moves to its replacement instead of silently resetting.
  return storedVoiceEngine(localStorage.getItem(VOICE_QUALITY_KEY));
}
// The conversation partner's language model (conversation/models.ts), chosen per learning language;
// a language without its own choice uses the last one picked anywhere.
function readChatModel(language: string): ChatModelId {
  if (typeof localStorage === 'undefined') return DEFAULT_CHAT_MODEL;
  return chatModel(localStorage.getItem(`${CHAT_MODEL_KEY}:${language}`) ?? localStorage.getItem(CHAT_MODEL_KEY)).id;
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

function readStored<T extends string>(key: string, values: readonly T[], fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  const value = localStorage.getItem(key);
  return values.find((candidate) => candidate === value) ?? fallback;
}

class SettingsStore {
    theme = $state<Theme>(typeof localStorage !== 'undefined' && localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');
    vibration = $state(typeof localStorage === 'undefined' || localStorage.getItem(VIBRATION_KEY) !== 'off');
    sound = $state(typeof localStorage === 'undefined' || localStorage.getItem(SOUND_KEY) !== 'off');
    // How the learner likes to take things in (today/homeModes.ts); weights the daily mix and the word quiz.
    learningStyle = $state<LearningStyle>(readStored(LEARNING_STYLE_KEY, LEARNING_STYLES, 'mixed'));
    voiceQuality = $state<VoiceQuality>(readVoiceQuality());
    naturalModel = $state<NaturalModel>(readNaturalModel());
    // Whether the browser's own voices can speak at all (voice/browserVoices.ts reports it once at
    // startup); without them the `standard` engine hands over to a rendered one. Optimistic until
    // then, so a slow voice list never pulls a model download.
    browserVoices = $state(true);
    dialects = $state(typeof localStorage === 'undefined' || localStorage.getItem(DIALECTS_KEY) !== 'off');
    lang = $state<Language>(readLanguage());
    chatModel = $state<ChatModelId>(readChatModel(this.lang));
    interfaceLocale = $state<InterfaceLocale>(readInterfaceLocale());
    vocabularyLevel = $state<VocabularyLevel>(readVocabularyLevel());
    includeLowerVocabulary = $state(typeof localStorage !== 'undefined' && localStorage.getItem(INCLUDE_LOWER_VOCABULARY_KEY) === 'on');
    allowBackwardWords = $state(typeof localStorage !== 'undefined' && localStorage.getItem(BACKWARD_WORDS_KEY) === 'on');
    completedRounds = $state(readCompletedRounds());
    wordleLength = $state<WordleLength>(readWordleLength());
    streak = $state<ClientStreak>(readStreak());
    firstName = $state(typeof localStorage === 'undefined' ? '' : localStorage.getItem(FIRST_NAME_KEY) ?? '');
    // The learner's own story character; null until they have made one in the intro or on the profile page.
    avatar = $state<Avatar | null>(parseAvatar(typeof localStorage === 'undefined' ? null : localStorage.getItem(AVATAR_KEY)));
    // Dates, times and numbers follow the learned language unless the learner picks the app language.
    formatSource = $state<FormatSource>(readStored(FORMAT_SOURCE_KEY, ['learning', 'interface'], 'learning'));
    interfaceCalendar = $state<FormatCalendar>(readStored(INTERFACE_CALENDAR_KEY, ['gregory', 'persian'], 'gregory'));
    interfaceDigits = $state<FormatDigits>(readStored(INTERFACE_DIGITS_KEY, ['latn', 'native'], 'latn'));
    // The exam the learner prepares for; drives the weighted readiness on /progress.
    formatContext = $derived<FormatContext>(resolveFormatContext({
      learningLanguage: this.lang,
      interfaceLocale: this.interfaceLocale,
      source: this.formatSource,
      interfaceCalendar: this.interfaceCalendar,
      interfaceDigits: this.interfaceDigits
    }));

    constructor() {
      // Fetch the learner's vocabulary in the background so game modes that need it don't
      // block on the first render. Other languages stay out of the initial bundle entirely.
      void warmLanguage(this.lang).then(refreshHintableBaseWords);
      this.castLearner();
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
    if (next) void import('#lib/feedback/haptics.js').then(({ haptic }) => haptic('success', true));
  }
  // Every voice except the browser's own is played as rendered audio clips; where the browser has
  // no voices at all, its engine has already fallen back to one that renders them (engines.ts).
  get clipVoices() {
    // Read for the dependency: the answer from browserVoices.ts decides which engine speaks.
    void this.browserVoices;
    return voiceEngines[engineFor(this.voiceQuality, this.lang)].clips;
  }
  // Which voices rendered clips belong to, so caches never mix one engine's audio with another's.
  get clipVoiceKey() {
    return ownsClipKey(this.voiceQuality) ? this.voiceQuality : this.naturalModel;
  }
  setBrowserVoices(usable: boolean) {
    this.browserVoices = usable;
    setBrowserVoicesUsable(usable);
  }
  setVoiceQuality(next: VoiceQuality) {
    this.voiceQuality = next;
    localStorage.setItem(VOICE_QUALITY_KEY, next);
  }
  setChatModel(next: ChatModelId) {
    this.chatModel = next;
    localStorage.setItem(CHAT_MODEL_KEY, next);
    localStorage.setItem(`${CHAT_MODEL_KEY}:${this.lang}`, next);
  }
  setNaturalModel(next: NaturalModel) {
    this.naturalModel = next;
    localStorage.setItem(NATURAL_MODEL_KEY, next);
  }
  setDialects(next: boolean) {
    this.dialects = next;
    localStorage.setItem(DIALECTS_KEY, next ? 'on' : 'off');
  }
  setLearningStyle(next: LearningStyle) {
    this.learningStyle = next;
    localStorage.setItem(LEARNING_STYLE_KEY, next);
  }
  setSound(next: boolean) {
    this.sound = next;
    localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
  }
  // The switch waits for the language's messages (their own chunk, cached for offline use by the
  // service worker); if they cannot be fetched the interface stays in the language it has.
  setInterfaceLocale(next: InterfaceLocale) {
    const request = ++interfaceLocaleRequest;
    void loadLocaleMessages(next).then(() => {
      if (request !== interfaceLocaleRequest) return;
      this.interfaceLocale = next;
      localStorage.setItem(INTERFACE_LOCALE_KEY, next);
    }, () => undefined);
  }
  setLang(next: Language) {
    this.lang = next;
    localStorage.setItem(LANGUAGE_KEY, next);
    this.chatModel = readChatModel(next);
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
    this.castLearner();
  }
  setAvatar(next: Avatar) {
    this.avatar = { ...next };
    localStorage.setItem(AVATAR_KEY, JSON.stringify(next));
    this.castLearner();
  }
  // With a character of their own and a name, the learner plays Kumar's part in the stories.
  private castLearner() {
    setKumarStandIn(this.avatar ? this.firstName : null);
  }
  setFormatSource(next: FormatSource) {
    this.formatSource = next;
    localStorage.setItem(FORMAT_SOURCE_KEY, next);
  }
  setInterfaceCalendar(next: FormatCalendar) {
    this.interfaceCalendar = next;
    localStorage.setItem(INTERFACE_CALENDAR_KEY, next);
  }
  setInterfaceDigits(next: FormatDigits) {
    this.interfaceDigits = next;
    localStorage.setItem(INTERFACE_DIGITS_KEY, next);
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
      (event === 'hangman_completed' && this.streak.hangmanCompleted) ||
      (event === 'taboo_completed' && this.streak.tabooCompleted) ||
      (event === 'sentence_completed' && this.streak.sentenceCompleted)
    )) return;
    // Counters drop one timestamp per answer, so the weekly recap can measure real time spent.
    // Reading, story and listening completions are logged where their ids are known.
    const kind = ACTIVITY_BY_EVENT[event];
    if (kind) recordActivity(kind);
    const mode = EVENT_MODE_BY_STREAK[event];
    if (mode) logAnswer(this.lang, mode, `${event.toUpperCase()}:${dateKey()}`, mode === 'alltag' ? true : null, { level: this.vocabularyLevel });
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
