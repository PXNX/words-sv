<script lang="ts">
  /* Papier & Tinte: a compact, tactile editorial puzzle surface where the grid and letter wheel are the primary instruments. */
  import '../app.css';
  import wordsDeA1 from '$lib/data/words.de.a1.json';
  import wordsDeA2 from '$lib/data/words.de.a2.json';
  import wordsDeB1 from '$lib/data/words.de.b1.json';
  import wordsDeB2 from '$lib/data/words.de.b2.json';
  import wordsDeC1 from '$lib/data/words.de.c1.json';
  import wordsDeC2 from '$lib/data/words.de.c2.json';
  import wordsEnA1 from '$lib/data/words.en.a1.json';
  import wordsEnA2 from '$lib/data/words.en.a2.json';
  import wordsEnB1 from '$lib/data/words.en.b1.json';
  import wordsEnB2 from '$lib/data/words.en.b2.json';
  import wordsEnC1 from '$lib/data/words.en.c1.json';
  import wordsEnC2 from '$lib/data/words.en.c2.json';
  import { m } from '$lib/paraglide/messages';
  import { getTextDirection, setLocale, type Locale } from '$lib/paraglide/runtime';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconClose from '~icons/material-symbols/cancel-rounded';
  import IconDark from '~icons/material-symbols/dark-mode-rounded';
  import IconDownload from '~icons/material-symbols/download-rounded';
  import IconHelp from '~icons/material-symbols/help-rounded';
  import IconGithub from '~icons/fa6-brands/github';
  import IconLanguage from '~icons/material-symbols/language-rounded';
  import IconTelegram from '~icons/fa6-brands/telegram';
  import IconLight from '~icons/material-symbols/light-mode-rounded';
  import IconSettings from '~icons/material-symbols/settings-rounded';
  import IconVibrate from '~icons/material-symbols/vibration-rounded';

  type Language = 'de' | 'en';
  type InterfaceLocale = Locale;
  type Theme = 'light' | 'dark';
  type VocabularyLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';
  type Orientation = 'across' | 'down';
  type Placement = { word: string; row: number; col: number; orientation: Orientation; reversed?: boolean };
  type BoardCell = { letter: string; words: string[] };
  type Grid = { cells: Map<string, BoardCell>; placements: Placement[]; minRow: number; maxRow: number; minCol: number; maxCol: number };
  type Round = { words: string[]; letters: string[]; grid: Grid };
  type StoredGame = { version: 1; language: Language; roundNumber: number; words: string[]; letters: string[]; placements: Placement[]; solvedWords: string[]; startedAt?: number; completedDuration?: number; vocabularyLevel?: VocabularyLevel; includeLowerVocabulary?: boolean };
  type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> };

  const vocabularyLevels: VocabularyLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
  const wordPools: Record<Language, Record<VocabularyLevel, string[]>> = {
    de: { a1: wordsDeA1 as string[], a2: wordsDeA2 as string[], b1: wordsDeB1 as string[], b2: wordsDeB2 as string[], c1: wordsDeC1 as string[], c2: wordsDeC2 as string[] },
    en: { a1: wordsEnA1 as string[], a2: wordsEnA2 as string[], b1: wordsEnB1 as string[], b2: wordsEnB2 as string[], c1: wordsEnC1 as string[], c2: wordsEnC2 as string[] }
  };
  const interfaceLocales = [
    { code: 'de', label: 'Deutsch' }, { code: 'en', label: 'English' }, { code: 'fa', label: 'فارسی' }, { code: 'pt', label: 'Português' }, { code: 'ru', label: 'Русский' }, { code: 'ar', label: 'العربية' }, { code: 'uk', label: 'Українська' }, { code: 'hi', label: 'हिन्दी' }, { code: 'ml', label: 'മലയാളം' }
  ] as const satisfies ReadonlyArray<{ code: InterfaceLocale; label: string }>;
  const GAME_STORAGE_KEY = 'wordcircle-active-round-v1';
  const ROUND_TOTAL_KEY = 'wordcircle-completed-rounds-v1';
  const ROUND_HISTORY_KEY = 'wordcircle-recent-base-words-v1';
  const BACKWARD_WORDS_KEY = 'wordcircle-backward-words-v1';
  const VOCABULARY_LEVEL_KEY = 'wordcircle-vocabulary-level-v1';
  const INCLUDE_LOWER_VOCABULARY_KEY = 'wordcircle-include-lower-vocabulary-v1';
  const LANGUAGE_KEY = 'wordcircle-language-v1';
  const INTERFACE_LOCALE_KEY = 'wordcircle-interface-locale-v1';
  const TUTORIAL_STATE_KEY = 'wordcircle-tutorial-state-v1';

  const initialTheme: Theme = typeof localStorage !== 'undefined' && localStorage.getItem('wordcircle-theme') === 'dark' ? 'dark' : 'light';
  const initialVibration = typeof localStorage === 'undefined' || localStorage.getItem('wordcircle-vibration') !== 'off';
  const initialBackwardWords = typeof localStorage !== 'undefined' && localStorage.getItem(BACKWARD_WORDS_KEY) === 'on';
  const initialVocabularyLevel = readVocabularyLevel();
  const initialIncludeLowerVocabulary = typeof localStorage !== 'undefined' && localStorage.getItem(INCLUDE_LOWER_VOCABULARY_KEY) === 'on';
  const initialGame = readStoredGame();
  const initialLanguage = readLanguage();
  const initialInterfaceLocale = readInterfaceLocale();
  const initialCompletedRounds = readCompletedRounds();
  const initialRecentBases = readRecentBases();
  const initialTutorialState = typeof localStorage === 'undefined' ? null : localStorage.getItem(TUTORIAL_STATE_KEY);
  const initialTutorialOpen = initialTutorialState === 'open' || (initialTutorialState !== 'complete' && !initialGame && initialCompletedRounds === 0);
  const CIRCLE = 146;
  const LETTER_RADIUS = 109;
  const tutorialRounds: Record<Language, Round> = {
    de: { words: ['GARTEN', 'GAS', 'TEE'], letters: [...'GARTEN'], grid: gridFromPlacements([{ word: 'GARTEN', row: 0, col: 0, orientation: 'across' }, { word: 'GAS', row: 0, col: 0, orientation: 'down' }, { word: 'TEE', row: 0, col: 3, orientation: 'down' }]) },
    en: { words: ['PLANET', 'PEN', 'TEA'], letters: [...'PLANET'], grid: gridFromPlacements([{ word: 'PLANET', row: 0, col: 0, orientation: 'across' }, { word: 'PEN', row: 0, col: 0, orientation: 'down' }, { word: 'TEA', row: 0, col: 5, orientation: 'down' }]) }
  };

  let lang = $state<Language>(initialGame?.language ?? initialLanguage);
  let interfaceLocale = $state<InterfaceLocale>(initialInterfaceLocale);
  let theme = $state<Theme>(initialTheme);
  let vibration = $state(initialVibration);
  let allowBackwardWords = $state(initialBackwardWords);
  let vocabularyLevel = $state<VocabularyLevel>(initialGame?.vocabularyLevel ?? initialVocabularyLevel);
  let includeLowerVocabulary = $state(initialGame?.includeLowerVocabulary ?? initialIncludeLowerVocabulary);
  let settingsOpen = $state(false);
  let roundNumber = $state(initialGame?.roundNumber ?? 1);
  let completedRounds = $state(initialCompletedRounds);
  let recentBaseWords = $state<string[]>(initialGame ? [...new Set([initialGame.words[0], ...initialRecentBases])] : initialRecentBases);
  let needsFreshRound = $state(!initialGame);
  let currentRound = $state<Round>(initialGame ? roundFromStoredGame(initialGame) : buildRound(selectedPool(initialLanguage, initialVocabularyLevel, initialIncludeLowerVocabulary), 483719, [], initialBackwardWords));
  let selectedPath = $state<number[]>([]);
  let solvedWords = $state<string[]>(initialGame?.solvedWords ?? []);
  let feedback = $state<'correct' | 'wrong' | null>(null);
  let feedbackWord = $state('');
  let shakeGrid = $state(false);
  let isDragging = $state(false);
  let circleEl = $state<SVGSVGElement>();
  let celebration = $state(initialGame ? initialGame.solvedWords.length === initialGame.words.length : false);
  let startedAt = $state(initialGame?.startedAt ?? Date.now());
  let completedDuration = $state<number | null>(initialGame?.completedDuration ?? null);
  let installPrompt = $state<InstallPromptEvent | null>(null);
  let tutorialOpen = $state(initialTutorialOpen);
  let tutorialPractice = $state(false);
  let tutorialLanguage = $state<Language>(initialGame?.language ?? initialLanguage);

  const labels = $derived.by(() => {
    const options = { locale: interfaceLocale };
    return {
      label: m.label({}, options), hint: m.hint({}, options), allDone: m.all_done({}, options), time: m.time({}, options), continue: m.continue({}, options), explain: m.explain({}, options), install: m.install({}, options), installHint: m.install_hint({}, options), gameLanguage: m.game_language({}, options), interfaceLanguage: m.interface_language({}, options), vocabulary: m.vocabulary({}, options), includeLower: m.include_lower({}, options), appearance: m.appearance({}, options), light: m.light({}, options), dark: m.dark({}, options), settings: m.settings({}, options), vibration: m.vibration({}, options), backwards: m.backwards({}, options), settingsHint: m.settings_hint({}, options), completed: m.completed({}, options), tracePrompt: m.trace_prompt({}, options), traceActive: m.trace_active({}, options), tutorial: m.tutorial({}, options), tutorialKicker: m.tutorial_kicker({}, options), tutorialTitle: m.tutorial_title({}, options), tutorialTrace: m.tutorial_trace({}, options), tutorialGrid: m.tutorial_grid({}, options), tutorialHelp: m.tutorial_help({}, options), tutorialStart: m.tutorial_start({}, options), tutorialRestart: m.tutorial_restart({}, options), telegramShare: m.telegram_share({}, options)
    };
  });
  const interfaceDirection = $derived(getTextDirection(interfaceLocale));
  const telegramHref = $derived(interfaceLocale === 'fa' ? 'https://t.me/yasamanabedin' : interfaceLocale === 'de' || interfaceLocale === 'en' ? 'https://t.me/deutschstunde1' : null);
  const circleLetters = $derived(currentRound.letters);
  const grid = $derived(currentRound.grid);
  const solvedSet = $derived(new Set(solvedWords));
  const activeWord = $derived(selectedPath.map((index) => circleLetters[index]).join(''));
  const previewWord = $derived(activeWord || feedbackWord);
  const coreReadout = $derived(activeWord || labels.tracePrompt);
  const traceCaption = $derived(activeWord ? labels.traceActive : labels.tracePrompt);
  const allSolved = $derived(solvedWords.length === currentRound.words.length);
  const tutorialHint = $derived(tutorialLanguage === 'de' ? 'G••••• · G•• · T••' : 'P••••• · P•• · T••');
  const solvedCells = $derived.by(() => {
    const keys = new Set<string>();
    grid.placements.filter((entry) => solvedSet.has(entry.word)).forEach((entry) => {
      entry.word.split('').forEach((_letter, index) => keys.add(cellKey(entry.row + (entry.orientation === 'down' ? index : 0), entry.col + (entry.orientation === 'across' ? index : 0))));
    });
    return keys;
  });

  $effect(() => { document.documentElement.dataset.theme = theme; document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('wordcircle-theme', theme); });
  $effect(() => { localStorage.setItem(LANGUAGE_KEY, lang); });
  $effect(() => { localStorage.setItem(INTERFACE_LOCALE_KEY, interfaceLocale); document.documentElement.lang = interfaceLocale; document.documentElement.dir = interfaceDirection; void setLocale(interfaceLocale, { reload: false }); });
  $effect(() => { localStorage.setItem('wordcircle-vibration', vibration ? 'on' : 'off'); });
  $effect(() => { localStorage.setItem(BACKWARD_WORDS_KEY, allowBackwardWords ? 'on' : 'off'); });
  $effect(() => { if ((vocabularyLevel === 'a1' || requiresCumulativePool(lang, vocabularyLevel)) && !includeLowerVocabulary) includeLowerVocabulary = vocabularyLevel !== 'a1'; localStorage.setItem(VOCABULARY_LEVEL_KEY, vocabularyLevel); localStorage.setItem(INCLUDE_LOWER_VOCABULARY_KEY, includeLowerVocabulary ? 'on' : 'off'); });
  $effect(() => { localStorage.setItem(ROUND_TOTAL_KEY, String(completedRounds)); });
  $effect(() => { localStorage.setItem(ROUND_HISTORY_KEY, JSON.stringify(recentBaseWords)); });
  $effect(() => { if (tutorialOpen) localStorage.setItem(TUTORIAL_STATE_KEY, 'open'); });
  $effect(() => {
    const snapshot: StoredGame = { version: 1, language: lang, roundNumber, words: currentRound.words, letters: currentRound.letters, placements: currentRound.grid.placements, solvedWords, startedAt, completedDuration: completedDuration ?? undefined, vocabularyLevel, includeLowerVocabulary };
    try { localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* Storage is optional; the game remains playable without it. */ }
  });
  $effect(() => {
    if (!needsFreshRound) return;
    needsFreshRound = false;
    newRound(lang, true);
  });

  $effect(() => {
    const captureInstallPrompt = (event: Event) => { event.preventDefault(); installPrompt = event as InstallPromptEvent; };
    const clearInstallPrompt = () => { installPrompt = null; };
    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', clearInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', clearInstallPrompt);
    };
  });

  function cellKey(row: number, col: number) { return `${row}:${col}`; }
  function setTutorialRound(nextLanguage = tutorialLanguage) {
    tutorialLanguage = nextLanguage;
    lang = nextLanguage;
    currentRound = tutorialRounds[nextLanguage];
    selectedPath = [];
    solvedWords = [];
    feedback = null;
    feedbackWord = '';
    shakeGrid = false;
    celebration = false;
    startedAt = Date.now();
    completedDuration = null;
  }
  function beginTutorialPractice() { setTutorialRound(tutorialLanguage); tutorialOpen = false; tutorialPractice = true; }
  function completeTutorial() { localStorage.setItem(TUTORIAL_STATE_KEY, 'complete'); tutorialPractice = false; tutorialOpen = false; newRound(lang, true); }
  function continueRound() { if (tutorialPractice) completeTutorial(); else newRound(); }
  function restartTutorial() { localStorage.setItem(TUTORIAL_STATE_KEY, 'open'); settingsOpen = false; tutorialPractice = false; tutorialLanguage = lang; tutorialOpen = true; }
  function isLanguage(value: unknown): value is Language { return value === 'de' || value === 'en'; }
  function readLanguage(): Language { if (typeof localStorage === 'undefined') return 'de'; const value = localStorage.getItem(LANGUAGE_KEY); return isLanguage(value) ? value : 'de'; }
  function isInterfaceLocale(value: unknown): value is InterfaceLocale { return typeof value === 'string' && interfaceLocales.some((locale) => locale.code === value); }
  function readInterfaceLocale(): InterfaceLocale { if (typeof localStorage === 'undefined') return 'de'; const value = localStorage.getItem(INTERFACE_LOCALE_KEY); if (isInterfaceLocale(value)) return value; return readLanguage(); }
  function isVocabularyLevel(value: unknown): value is VocabularyLevel { return typeof value === 'string' && vocabularyLevels.includes(value as VocabularyLevel); }
  function readVocabularyLevel(): VocabularyLevel { if (typeof localStorage === 'undefined') return 'a1'; const value = localStorage.getItem(VOCABULARY_LEVEL_KEY); return isVocabularyLevel(value) ? value : 'a1'; }
  function viableBaseCount(pool: string[]) {
    const normalized = [...new Set(pool.map((word) => word.trim().toUpperCase()).filter((word) => /^[A-ZÄÖÜẞ]+$/.test(word) && word.length >= 3 && word.length <= 8))];
    return normalized.filter((word) => word.length >= 5 && word.length <= 8 && normalized.filter((candidate) => candidate !== word && canSpell(candidate, [...word])).length >= 5).length;
  }
  function requiresCumulativePool(language: Language, level: VocabularyLevel) { return level !== 'a1' && viableBaseCount(wordPools[language][level]) === 0; }
  function selectedPool(language: Language, level: VocabularyLevel, includeLower = false) { const end = vocabularyLevels.indexOf(level); const levels = includeLower || requiresCumulativePool(language, level) ? vocabularyLevels.slice(0, end + 1) : [level]; return levels.flatMap((entry) => wordPools[language][entry]); }
  function coordinate(key: string) { const [row, col] = key.split(':').map(Number); return { row, col }; }
  function makeRng(seed: number) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
  function shuffle<T>(values: T[], rng: () => number) { const result = [...values]; for (let index = result.length - 1; index > 0; index -= 1) { const swap = Math.floor(rng() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]; } return result; }
  function inventory(word: string) { return [...word].reduce<Record<string, number>>((counts, letter) => ({ ...counts, [letter]: (counts[letter] ?? 0) + 1 }), {}); }
  function canSpell(word: string, letters: string[]) { const available = inventory(letters.join('')); return Object.entries(inventory(word)).every(([letter, count]) => (available[letter] ?? 0) >= count); }
  function emptyGrid() { return { cells: new Map<string, BoardCell>(), placements: [], minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 } as Grid; }
  function placementLetters(entry: Placement) { const letters = [...entry.word]; return entry.reversed ? letters.reverse() : letters; }
  function gridFromPlacements(placements: Placement[]) { const grid = emptyGrid(); placements.forEach((placement) => writePlacement(grid, placement)); return grid; }
  function isPlacement(value: unknown): value is Placement {
    if (!value || typeof value !== 'object') return false;
    const entry = value as Partial<Placement>;
    return typeof entry.word === 'string' && Number.isInteger(entry.row) && Number.isInteger(entry.col) && (entry.orientation === 'across' || entry.orientation === 'down') && (typeof entry.reversed === 'undefined' || typeof entry.reversed === 'boolean');
  }
  function readCompletedRounds() {
    if (typeof localStorage === 'undefined') return 0;
    const value = Number(localStorage.getItem(ROUND_TOTAL_KEY));
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }
  function readRecentBases() {
    if (typeof localStorage === 'undefined') return [];
    try {
      const value: unknown = JSON.parse(localStorage.getItem(ROUND_HISTORY_KEY) ?? '[]');
      return Array.isArray(value) ? value.filter((word): word is string => typeof word === 'string' && /^[A-ZÄÖÜ]+$/.test(word)).slice(0, 24) : [];
    } catch { return []; }
  }
  function readStoredGame(): StoredGame | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) ?? 'null');
      if (!parsed || typeof parsed !== 'object') return null;
      const game = parsed as Partial<StoredGame>;
      const language = game.language;
      const roundNumber = game.roundNumber;
      const words = game.words;
      const letters = game.letters;
      const placements = game.placements;
      const solvedWords = game.solvedWords;
      const validLanguage = language === 'de' || language === 'en';
      const validWords = Array.isArray(words) && words.length > 0 && words.every((word) => typeof word === 'string' && /^[A-ZÄÖÜ]+$/.test(word));
      const validLetters = Array.isArray(letters) && letters.length >= 3 && letters.length <= 8 && letters.every((letter) => typeof letter === 'string' && /^[A-ZÄÖÜ]$/.test(letter));
      const validPlacements = Array.isArray(placements) && placements.length === words?.length && placements.every(isPlacement);
      const validSolvedWords = Array.isArray(solvedWords) && solvedWords.every((word) => typeof word === 'string' && words?.includes(word));
      const validStartedAt = typeof game.startedAt === 'undefined' || (Number.isSafeInteger(game.startedAt) && game.startedAt > 0);
      const validCompletedDuration = typeof game.completedDuration === 'undefined' || (Number.isSafeInteger(game.completedDuration) && game.completedDuration >= 0);
      const validVocabularyLevel = typeof game.vocabularyLevel === 'undefined' || isVocabularyLevel(game.vocabularyLevel);
      const validIncludeLowerVocabulary = typeof game.includeLowerVocabulary === 'undefined' || typeof game.includeLowerVocabulary === 'boolean';
      if (game.version !== 1 || !validLanguage || !Number.isInteger(roundNumber) || (roundNumber ?? 0) < 1 || !validWords || !validLetters || !validPlacements || !validSolvedWords || !validStartedAt || !validCompletedDuration || !validVocabularyLevel || !validIncludeLowerVocabulary) return null;
      return { version: 1, language: language as Language, roundNumber: roundNumber as number, words: words as string[], letters: letters as string[], placements: placements as Placement[], solvedWords: [...new Set(solvedWords as string[])], startedAt: game.startedAt, completedDuration: game.completedDuration, vocabularyLevel: game.vocabularyLevel, includeLowerVocabulary: game.includeLowerVocabulary };
    } catch { return null; }
  }
  function roundFromStoredGame(game: StoredGame): Round { return { words: game.words, letters: game.letters, grid: gridFromPlacements(game.placements) }; }
  function refreshBounds(grid: Grid) { const coordinates = [...grid.cells.keys()].map(coordinate); grid.minRow = Math.min(...coordinates.map((point) => point.row)); grid.maxRow = Math.max(...coordinates.map((point) => point.row)); grid.minCol = Math.min(...coordinates.map((point) => point.col)); grid.maxCol = Math.max(...coordinates.map((point) => point.col)); }
  function writePlacement(grid: Grid, entry: Placement) {
    grid.placements.push(entry);
    placementLetters(entry).forEach((letter, index) => {
      const row = entry.row + (entry.orientation === 'down' ? index : 0);
      const col = entry.col + (entry.orientation === 'across' ? index : 0);
      const key = cellKey(row, col);
      const existing = grid.cells.get(key);
      grid.cells.set(key, { letter, words: [...(existing?.words ?? []), entry.word] });
    });
    refreshBounds(grid);
  }
  function placementCells(entry: Placement) { return entry.word.split('').map((_letter, index) => ({ row: entry.row + (entry.orientation === 'down' ? index : 0), col: entry.col + (entry.orientation === 'across' ? index : 0), index })); }
  function canPlace(grid: Grid, entry: Placement, crossing: { row: number; col: number }) {
    const points = placementCells(entry);
    const planned = new Set(points.map((point) => cellKey(point.row, point.col)));
    let crossings = 0;
    for (const point of points) {
      const key = cellKey(point.row, point.col);
      const existing = grid.cells.get(key);
      if (existing) {
        if (existing.letter !== placementLetters(entry)[point.index] || key !== cellKey(crossing.row, crossing.col) || existing.words.length !== 1) return false;
        crossings += 1;
        continue;
      }
      for (const [rowDelta, colDelta] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const neighbourKey = cellKey(point.row + rowDelta, point.col + colDelta);
        const neighbour = grid.cells.get(neighbourKey);
        if (!neighbour || planned.has(neighbourKey)) continue;
        if (neighbourKey === cellKey(crossing.row, crossing.col)) continue;
        return false;
      }
    }
    if (crossings !== 1) return false;
    const allRows = [...grid.cells.keys()].map(coordinate).map((point) => point.row).concat(points.map((point) => point.row));
    const allCols = [...grid.cells.keys()].map(coordinate).map((point) => point.col).concat(points.map((point) => point.col));
    return Math.max(...allRows) - Math.min(...allRows) <= 12 && Math.max(...allCols) - Math.min(...allCols) <= 12;
  }
  function findPlacement(grid: Grid, word: string, rng: () => number, allowBackward = false) {
    const openCells = shuffle([...grid.cells.entries()].filter(([, cell]) => cell.words.length === 1), rng);
    for (const reversed of allowBackward ? [false, true] : [false]) {
      for (const [key, cell] of openCells) {
        const crossing = coordinate(key);
        const crossedWord = cell.words[0];
        const crossedPlacement = grid.placements.find((entry) => entry.word === crossedWord);
        if (!crossedPlacement) continue;
        const orientation: Orientation = crossedPlacement.orientation === 'across' ? 'down' : 'across';
        const renderedLetters = reversed ? [...word].reverse() : [...word];
        for (const wordIndex of shuffle(renderedLetters.map((_letter, index) => index).filter((index) => renderedLetters[index] === cell.letter), rng)) {
          const entry: Placement = { word, reversed, orientation, row: orientation === 'down' ? crossing.row - wordIndex : crossing.row, col: orientation === 'across' ? crossing.col - wordIndex : crossing.col };
          if (canPlace(grid, entry, crossing)) return entry;
        }
      }
    }
    return null;
  }
  function buildRound(pool: string[], seed: number, excludedBases: string[] = [], allowBackward = false): Round {
    const rng = makeRng(seed);
    const normalized = [...new Set(pool.map((word) => word.trim().toUpperCase()).filter((word) => /^[A-ZÄÖÜ]+$/.test(word) && word.length >= 3 && word.length <= 8))];
    const bases = shuffle(normalized.filter((word) => word.length >= 5 && word.length <= 8 && normalized.filter((candidate) => candidate !== word && canSpell(candidate, [...word])).length >= 5), rng);
    const freshBases = bases.filter((word) => !excludedBases.includes(word));
    for (const base of freshBases.length > 0 ? freshBases : bases) {
      const grid = emptyGrid();
      writePlacement(grid, { word: base, row: 0, col: 0, orientation: 'across' });
      const selected = [base];
      const target = 6 + Math.floor(rng() * 3);
      const candidates = shuffle(normalized.filter((word) => word !== base && word.length >= 3 && canSpell(word, [...base])), rng);
      while (selected.length < target) {
        let placed = false;
        for (const candidate of candidates) {
          if (selected.includes(candidate)) continue;
          const entry = findPlacement(grid, candidate, rng, allowBackward);
          if (!entry) continue;
          writePlacement(grid, entry);
          selected.push(candidate);
          placed = true;
          break;
        }
        if (!placed) break;
      }
      if (selected.length >= 6) return { words: selected, letters: [...base], grid };
    }
    const fallback = freshBases[0] ?? bases[0] ?? normalized.find((word) => word.length >= 5) ?? 'WORT';
    const grid = emptyGrid();
    writePlacement(grid, { word: fallback, row: 0, col: 0, orientation: 'across' });
    return { words: [fallback], letters: [...fallback], grid };
  }
  function randomSeed() {
    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) { const values = new Uint32Array(1); crypto.getRandomValues(values); return values[0]; }
    return Math.floor(Math.random() * 2147483647) ^ Date.now();
  }
  function buzz(pattern: number | number[]) { if (vibration && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern); }
  function newRound(nextLanguage = lang, resetCount = false) {
    lang = nextLanguage;
    if (resetCount) roundNumber = 0;
    const nextRound = buildRound(selectedPool(nextLanguage, vocabularyLevel, includeLowerVocabulary), randomSeed(), recentBaseWords, allowBackwardWords);
    currentRound = nextRound;
    recentBaseWords = [nextRound.words[0], ...recentBaseWords.filter((word) => word !== nextRound.words[0])].slice(0, 24);
    roundNumber += 1;
    selectedPath = [];
    solvedWords = [];
    feedback = null;
    feedbackWord = '';
    shakeGrid = false;
    celebration = false;
    startedAt = Date.now();
    completedDuration = null;
  }
  function selectLanguage(nextLanguage: Language) { newRound(nextLanguage, true); if (interfaceLocale !== 'fa') interfaceLocale = nextLanguage; settingsOpen = false; }
  function selectInterfaceLocale(nextLocale: InterfaceLocale) { interfaceLocale = nextLocale; }
  function selectInterfaceLocaleFromEvent(event: Event) { const nextLocale = (event.currentTarget as HTMLSelectElement).value; if (isInterfaceLocale(nextLocale)) selectInterfaceLocale(nextLocale); }
  function selectTutorialLanguage(nextLocale: InterfaceLocale) { interfaceLocale = nextLocale; }
  function selectTutorialGameLanguage(nextLanguage: Language) { tutorialLanguage = nextLanguage; }
  function selectBackwardWords(nextValue: boolean) { allowBackwardWords = nextValue; newRound(); }
  function selectVocabularyLevel(nextLevel: VocabularyLevel) { vocabularyLevel = nextLevel; includeLowerVocabulary = nextLevel !== 'a1' && requiresCumulativePool(lang, nextLevel); newRound(); }
  function selectIncludeLowerVocabulary(nextValue: boolean) { includeLowerVocabulary = nextValue; newRound(); }
  function position(index: number, total: number) { const angle = (index / total) * Math.PI * 2 - Math.PI / 2; return { x: CIRCLE + LETTER_RADIUS * Math.cos(angle), y: CIRCLE + LETTER_RADIUS * Math.sin(angle) }; }
  function pointFromEvent(event: PointerEvent) { const rect = circleEl?.getBoundingClientRect(); if (!rect) return null; return { x: ((event.clientX - rect.left) / rect.width) * 292, y: ((event.clientY - rect.top) / rect.height) * 292 }; }
  function nearestLetter(point: { x: number; y: number }) { let closest = -1; let distance = Infinity; circleLetters.forEach((_letter, index) => { const letter = position(index, circleLetters.length); const nextDistance = Math.hypot(point.x - letter.x, point.y - letter.y); if (nextDistance < distance) { distance = nextDistance; closest = index; } }); return distance < 36 ? closest : -1; }
  function chooseLetter(index: number) { if (celebration || selectedPath.includes(index)) return; feedback = null; feedbackWord = ''; selectedPath = [...selectedPath, index]; buzz(7); }
  function startSwipe(event: PointerEvent, knownIndex = -1) { if (celebration) return; event.preventDefault(); (event.currentTarget as Element).setPointerCapture?.(event.pointerId); isDragging = true; selectedPath = []; feedback = null; feedbackWord = ''; const point = pointFromEvent(event); const index = knownIndex >= 0 ? knownIndex : point ? nearestLetter(point) : -1; if (index >= 0) chooseLetter(index); }
  function extendSwipe(event: PointerEvent) { if (!isDragging) return; const point = pointFromEvent(event); if (!point) return; const index = nearestLetter(point); if (index >= 0 && index !== selectedPath.at(-1)) chooseLetter(index); }
  function endSwipe() { if (!isDragging) return; isDragging = false; if (selectedPath.length >= 2) submitWord(); else selectedPath = []; }
  function submitWord() {
    const word = activeWord;
    feedbackWord = word;
    if (currentRound.words.includes(word) && !solvedSet.has(word)) {
      const completed = solvedWords.length + 1 === currentRound.words.length;
      solvedWords = [...solvedWords, word]; feedback = 'correct'; buzz(completed ? [24, 28, 40, 28, 70] : [16, 20, 26]);
      if (completed) { completedDuration = Math.max(0, Date.now() - startedAt); if (!tutorialPractice) completedRounds += 1; celebration = true; }
    } else { feedback = 'wrong'; shakeGrid = true; buzz([18, 18, 18]); window.setTimeout(() => (shakeGrid = false), 280); }
    selectedPath = [];
  }
  function formatDuration(duration: number | null) { const seconds = Math.floor((duration ?? 0) / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
  function pathPoints() { return selectedPath.map((index) => { const point = position(index, circleLetters.length); return `${point.x},${point.y}`; }).join(' '); }
  function wiktionaryUrl(word: string) {
    const locale = lang === 'de' ? 'de-DE' : 'en-US';
    const normalized = word.toLocaleLowerCase(locale);
    const dictionaryTerm = lang === 'de' ? `${normalized.slice(0, 1).toLocaleUpperCase(locale)}${normalized.slice(1)}` : normalized;
    const host = lang === 'de' ? 'https://de.wiktionary.org/wiki/' : 'https://en.wiktionary.org/wiki/';
    return `${host}${encodeURIComponent(dictionaryTerm)}`;
  }
  function inRange(row: number, col: number) { return grid.cells.get(cellKey(row, col)); }
  function isWordStart(row: number, col: number, orientation: Orientation) { return grid.placements.some((entry) => entry.orientation === orientation && entry.row === row && entry.col === col); }
  function isWordEnd(row: number, col: number, orientation: Orientation) { return grid.placements.some((entry) => entry.orientation === orientation && row === entry.row + (orientation === 'down' ? entry.word.length - 1 : 0) && col === entry.col + (orientation === 'across' ? entry.word.length - 1 : 0)); }
  async function installApp() {
    const prompt = installPrompt;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    installPrompt = null;
  }
</script>

<svelte:head><title>{labels.label} · WordCircle</title></svelte:head>
<svelte:window onpointerup={endSwipe} onpointercancel={endSwipe} />

<main class="game-shell">
  <section class="game-paper" aria-label={labels.label}>
    {#if tutorialOpen}
      <div class="tutorial-panel" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
        <div class="tutorial-card" dir={interfaceDirection} lang={interfaceLocale}>
          <p class="tutorial-kicker">{labels.tutorialKicker}</p>
          <label class="tutorial-language"><span>{labels.interfaceLanguage}</span><span class="locale-dropdown"><IconLanguage aria-hidden="true" /><select aria-label={labels.interfaceLanguage} value={interfaceLocale} onchange={selectInterfaceLocaleFromEvent}>{#each interfaceLocales as locale}<option value={locale.code}>{locale.label}</option>{/each}</select></span></label>
          <h1 id="tutorial-title">{labels.tutorialTitle}</h1>
          <ol class="tutorial-steps">
            <li><b>1</b><span>{labels.tutorialTrace}</span></li>
            <li><b>2</b><span>{labels.tutorialGrid}</span></li>
            <li><b>3</b><span>{labels.tutorialHelp}</span></li>
          </ol>
          <div class="tutorial-solve-language"><span>{labels.gameLanguage}</span><div class="segmented"><button class:chosen={tutorialLanguage === 'de'} onclick={() => selectTutorialGameLanguage('de')}>DE</button><button class:chosen={tutorialLanguage === 'en'} onclick={() => selectTutorialGameLanguage('en')}>EN</button></div></div>
          <p class="tutorial-practice-hint"><strong>{labels.hint}</strong><span>{tutorialHint}</span></p>
          <button class="tutorial-start" onclick={beginTutorialPractice}>{labels.tutorialStart}</button>
        </div>
      </div>
    {/if}
    {#if settingsOpen}
      <aside id="game-settings" class="settings-panel" aria-label={labels.settings} dir={interfaceDirection} lang={interfaceLocale}>
        <button class="settings-close" onclick={() => (settingsOpen = false)} aria-label="Close settings"><IconClose /></button>
        <div class="settings-intro"><span class="brand-mark" aria-hidden="true"><i></i><b></b></span><div><strong>WordCircle</strong><p>{labels.settingsHint}</p></div></div>
        <div class="setting-row"><span>{labels.gameLanguage}</span><div class="segmented"><button class:chosen={lang === 'de'} onclick={() => selectLanguage('de')}>DE</button><button class:chosen={lang === 'en'} onclick={() => selectLanguage('en')}>EN</button></div></div>
        <label class="setting-row interface-locale-row"><span>{labels.interfaceLanguage}</span><span class="locale-dropdown"><IconLanguage aria-hidden="true" /><select aria-label={labels.interfaceLanguage} value={interfaceLocale} onchange={selectInterfaceLocaleFromEvent}>{#each interfaceLocales as locale}<option value={locale.code}>{locale.label}</option>{/each}</select></span></label>
        <div class="setting-row vocabulary-row"><span>{labels.vocabulary}</span><div class="segmented level-segmented">{#each vocabularyLevels as level}<button class:chosen={vocabularyLevel === level} onclick={() => selectVocabularyLevel(level)}>{level.toUpperCase()}</button>{/each}</div></div>
        {#if vocabularyLevel !== 'a1'}<div class="setting-row vibration-row include-lower-row"><span>{labels.includeLower}</span><input aria-label={labels.includeLower} type="checkbox" class="toggle toggle-sm" checked={includeLowerVocabulary} onchange={(event) => selectIncludeLowerVocabulary((event.currentTarget as HTMLInputElement).checked)} /></div>{/if}
        <div class="setting-row"><span>{labels.appearance}</span><div class="segmented"><button class:chosen={theme === 'light'} onclick={() => (theme = 'light')}><IconLight />{labels.light}</button><button class:chosen={theme === 'dark'} onclick={() => (theme = 'dark')}><IconDark />{labels.dark}</button></div></div>
        <div class="setting-row vibration-row"><span><IconVibrate />{labels.vibration}</span><input aria-label={labels.vibration} type="checkbox" class="toggle toggle-sm" bind:checked={vibration} /></div>
        <div class="setting-row vibration-row"><span>{labels.backwards}</span><input aria-label={labels.backwards} type="checkbox" class="toggle toggle-sm" checked={allowBackwardWords} onchange={(event) => selectBackwardWords((event.currentTarget as HTMLInputElement).checked)} /></div>
        <div class="setting-row tutorial-restart-row"><span>{labels.tutorial}</span><button onclick={restartTutorial}>{labels.tutorialRestart}</button></div>
        <div class="setting-row completion-total"><span>{labels.completed}</span><strong>{completedRounds}</strong></div>
        {#if telegramHref}<a class="settings-telegram" href={telegramHref} target="_blank" rel="noreferrer" lang={interfaceLocale} dir={interfaceDirection}><IconTelegram aria-hidden="true" /><span>{labels.telegramShare}</span></a>{/if}
        <a class="settings-github" href="https://github.com/PXNX/words-sv" target="_blank" rel="noreferrer"><IconGithub aria-hidden="true" /><span>GitHub · PXNX/words-sv</span></a>
      </aside>
    {/if}

    <div class:shake={shakeGrid} class="crossword-frame" aria-label="Crossword">
      <div class="crossword-scroll" aria-label="Scrollable crossword grid">
      <div class="crossword" style={`grid-template-columns: repeat(${grid.maxCol - grid.minCol + 1}, var(--cell-size));`}>
        {#each Array(grid.maxRow - grid.minRow + 1) as _, rowIndex}
          {#each Array(grid.maxCol - grid.minCol + 1) as _, colIndex}
            {@const row = grid.minRow + rowIndex}{@const col = grid.minCol + colIndex}{@const cell = inRange(row, col)}
            {#if cell}<div class:solved={solvedCells.has(cellKey(row, col))} class:startAcross={isWordStart(row, col, 'across')} class:endAcross={isWordEnd(row, col, 'across')} class:startDown={isWordStart(row, col, 'down')} class:endDown={isWordEnd(row, col, 'down')} class="crossword-cell" aria-label={solvedCells.has(cellKey(row, col)) ? cell.letter : 'open cell'}>{solvedCells.has(cellKey(row, col)) ? cell.letter : ''}</div>{:else}<div class="crossword-void"></div>{/if}
          {/each}
        {/each}
      </div>
      </div>
      <div class="frame-corner top-left"></div><div class="frame-corner top-right"></div><div class="frame-corner bottom-left"></div><div class="frame-corner bottom-right"></div>
    </div>

    <div class:install-ready={installPrompt && !previewWord && !celebration} class:completion-area={celebration} class="selection-area" aria-live="polite">
      {#if celebration}
        <div class="completion-inline">
          <span class="completion-symbol" aria-hidden="true">✓</span>
          <span class="completion-result"><strong>{labels.allDone}</strong><small>{labels.time} <b>{formatDuration(completedDuration)}</b></small></span>
          <button class="completion-continue" onclick={continueRound}>{labels.continue}</button>
        </div>
      {:else}
        {#if !settingsOpen}<button class="settings-trigger" aria-expanded="false" aria-controls="game-settings" onclick={() => (settingsOpen = true)}><IconSettings aria-hidden="true" /><span class="sr-only">{labels.settings}</span></button>{/if}
        <div class:has-word={previewWord.length > 0} class:correct={feedback === 'correct'} class:wrong={feedback === 'wrong'} class="selected-word">
          {#if previewWord}
            <span>{previewWord}</span>{#if feedback === 'correct'}<IconCheck aria-label="Correct" /><a class="wiktionary-link" href={wiktionaryUrl(feedbackWord)} target="_blank" rel="noreferrer" aria-label={`${labels.explain}: ${feedbackWord}`}><IconHelp aria-hidden="true" /><span class="sr-only">{labels.explain}</span></a>{:else if feedback === 'wrong'}<IconClose aria-label="Incorrect" />{/if}
          {/if}
        </div>
        {#if tutorialPractice}<p class="tutorial-practice-status"><span>{labels.tutorial}</span><b>{tutorialHint}</b></p>{/if}
        {#if installPrompt && !previewWord}
          <button class="install-prompt" onclick={installApp}>
            <IconDownload aria-hidden="true" />
            <span><strong>{labels.install}</strong><small>{labels.installHint}</small></span>
          </button>
        {/if}
      {/if}
    </div>

    <div class="wheel-stage">
      <svg bind:this={circleEl} viewBox="0 0 292 292" class="letter-wheel" role="application" aria-label={labels.hint} onpointerdown={(event) => startSwipe(event)} onpointermove={extendSwipe}>
        <circle cx={CIRCLE} cy={CIRCLE} r={LETTER_RADIUS} class="outer-ring" /><circle cx={CIRCLE} cy={CIRCLE} r="68" class="inner-ring" /><circle cx={CIRCLE} cy={CIRCLE} r="47" class="core-ring" /><path d="M124 146a22 22 0 1 0 44 0a22 22 0 1 1-44 0Z" class="core-mark" />
        <text x={CIRCLE} y="142" text-anchor="middle" class:active-core={activeWord.length > 0} class:idle-core={!activeWord} class="core-word">{coreReadout}</text><text x={CIRCLE} y="161" text-anchor="middle" class="core-caption">{activeWord ? traceCaption : '·'}</text>
        {#if selectedPath.length > 1}<polyline points={pathPoints()} class="selection-line" />{/if}
        {#each circleLetters as letter, index (index)}
          {@const point = position(index, circleLetters.length)}
          <g transform={`translate(${point.x} ${point.y})`} class:active={selectedPath.includes(index)} class="letter-node" role="button" tabindex="0" aria-label={`Letter ${letter}`} onpointerdown={(event) => { event.stopPropagation(); startSwipe(event, index); }} onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') chooseLetter(index); }}>
            <circle r="28"></circle><text text-anchor="middle" dominant-baseline="central">{letter}</text>
          </g>
        {/each}
      </svg>
    </div>
  </section>
</main>

<style>
  /* Papier & Tinte: restrained print frame, navy ink structure, amber selection, green only for completion. */
  :global(.sr-only) { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0; }
  :global(.game-shell) { min-height:100svh;padding:clamp(.4rem,2vw,1.35rem);display:grid;place-items:start center; }
  .game-paper { position:relative;isolation:isolate;overflow:hidden;width:min(100%,660px);padding:clamp(.65rem,3vw,1.5rem);border:1px solid rgba(23,42,69,.17);background:rgba(255,253,247,.9);box-shadow:0 24px 70px rgba(30,33,44,.13),0 2px 0 rgba(23,42,69,.08); }
  .game-paper::before { content:'';position:absolute;z-index:-1;inset:8px;border:1px solid rgba(23,42,69,.13);pointer-events:none; }
  .tutorial-panel { position:absolute;z-index:90;inset:0;display:grid;place-items:center;padding:clamp(1rem,6vw,2rem);background:#fffdf7;color:#172a45;animation:drop-in .22s cubic-bezier(.23,1,.32,1) both; }.tutorial-card { width:min(100%,25rem);padding:clamp(1.1rem,5vw,1.7rem);border:1px solid rgba(23,42,69,.24);border-top:3px double #172a45;background:#fffdf7;box-shadow:8px 8px 0 rgba(230,165,39,.18); }.tutorial-kicker { margin:0 0 .45rem;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase; }.tutorial-card h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.8rem,8vw,2.55rem);font-weight:400;letter-spacing:-.045em;line-height:.92; }.tutorial-steps { display:grid;gap:.72rem;margin:1.35rem 0 1.2rem;padding:0;list-style:none; }.tutorial-steps li { display:grid;grid-template-columns:1.55rem 1fr;gap:.62rem;align-items:start;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:700;line-height:1.35; }.tutorial-steps b { display:grid;place-items:center;width:1.35rem;height:1.35rem;border:1px solid #172a45;border-radius:50%;background:#fffdf7;color:#a45e38;font-family:'DM Serif Display',serif;font-size:.9rem;font-weight:400; }.tutorial-start { width:100%;min-height:2.45rem;border:1px solid #172a45;border-radius:0;background:#172a45;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.67rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;box-shadow:3px 3px 0 #e6a527;transition:transform .16s cubic-bezier(.23,1,.32,1),box-shadow .16s ease; }.tutorial-start:active { transform:translate(2px,2px);box-shadow:1px 1px 0 #e6a527; }
  .tutorial-panel { position:absolute;z-index:90;inset:0;display:grid;place-items:center;padding:clamp(1rem,6vw,2rem);background:#fffdf7;color:#172a45;animation:drop-in .22s cubic-bezier(.23,1,.32,1) both; }.tutorial-card { width:min(100%,25rem);padding:clamp(1.1rem,5vw,1.7rem);border:1px solid rgba(23,42,69,.24);border-top:3px double #172a45;background:#fffdf7;box-shadow:8px 8px 0 rgba(230,165,39,.18); }.tutorial-kicker { margin:0 0 .45rem;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase; }.tutorial-card h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.8rem,8vw,2.55rem);font-weight:400;letter-spacing:-.045em;line-height:.92; }.tutorial-steps { display:grid;gap:.72rem;margin:1.35rem 0 1.2rem;padding:0;list-style:none; }.tutorial-steps li { display:grid;grid-template-columns:1.55rem 1fr;gap:.62rem;align-items:start;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:700;line-height:1.35; }.tutorial-steps b { display:grid;place-items:center;width:1.35rem;height:1.35rem;border:1px solid #172a45;border-radius:50%;background:#fffdf7;color:#a45e38;font-family:'DM Serif Display',serif;font-size:.9rem;font-weight:400; }.tutorial-solve-language { display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin:0 0 .7rem;padding-top:.7rem;border-top:1px solid rgba(23,42,69,.14);color:#172a45;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase; }.tutorial-practice-hint { display:flex;align-items:center;justify-content:space-between;gap:.65rem;margin:0 0 1rem;padding:.55rem .65rem;border:1px solid rgba(230,165,39,.56);background:rgba(230,165,39,.08);color:#172a45;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:800;letter-spacing:.05em; }.tutorial-practice-hint strong { color:#a45e38;font-size:.56rem;letter-spacing:.08em;text-transform:uppercase; }.tutorial-practice-hint span { white-space:nowrap; }.tutorial-start { width:100%;min-height:2.45rem;border:1px solid #172a45;border-radius:0;background:#172a45;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.67rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;box-shadow:3px 3px 0 #e6a527;transition:transform .16s cubic-bezier(.23,1,.32,1),box-shadow .16s ease; }.tutorial-start:active { transform:translate(2px,2px);box-shadow:1px 1px 0 #e6a527; }
  .brand-mark { position:relative;width:34px;height:34px;display:block;flex:none; }.brand-mark i,.brand-mark b { position:absolute;display:block;width:21px;height:21px;border:2px solid #172a45;border-radius:50%; }.brand-mark i { top:1px;left:1px; }.brand-mark b { right:1px;bottom:1px;border-color:#e6a527; }
  .settings-trigger,.settings-close { display:grid;place-items:center;width:2.15rem;height:2.15rem;border:1px solid rgba(23,42,69,.24);border-radius:50%;background:rgba(255,253,247,.86);color:#172a45;transition:transform .18s cubic-bezier(.23,1,.32,1),background .18s ease; }.settings-trigger :global(svg),.settings-close :global(svg) { width:1.1rem;height:1.1rem; }.settings-close { position:absolute;z-index:2;top:.72rem;right:.72rem;background:#172a45;color:#fffdf7; }.settings-close:active { transform:scale(.94); }
  .settings-panel { position:absolute;z-index:60;inset:0;margin:0;padding:clamp(4.5rem,16vw,6rem) clamp(1rem,5vw,2rem) clamp(1rem,5vw,2rem);overflow-y:auto;border:0;background:rgba(255,253,247,.98);box-shadow:0 18px 55px rgba(23,42,69,.2);animation:drop-in .2s cubic-bezier(.23,1,.32,1); }.settings-intro { display:flex;align-items:center;gap:.75rem;color:#172a45; }.settings-intro strong { display:block;font-family:'DM Serif Display',serif;font-size:clamp(1.45rem,6vw,2rem);font-weight:400;letter-spacing:-.04em;line-height:.9; }.settings-intro p { margin:.35rem 0 0;color:#a45e38;font-family:'DM Serif Display',serif;font-size:.94rem; }.setting-row { display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:.82rem;margin-top:.82rem;border-top:1px solid rgba(23,42,69,.14);color:#172a45;font-size:.67rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase; }.include-lower-row { margin-top:.25rem;padding-top:.35rem;border-top:0; }.segmented { display:flex;padding:2px;border:1px solid rgba(23,42,69,.22);border-radius:99px; }.segmented button { min-height:1.65rem;padding:0 .55rem;display:inline-flex;align-items:center;gap:.25rem;border:0;border-radius:99px;background:transparent;color:rgba(23,42,69,.62);font-size:.62rem;font-weight:800; }.segmented button :global(svg) { width:.78rem;height:.78rem; }.segmented button.chosen { background:#172a45;color:#fffdf7; }.vibration-row>span { display:inline-flex;align-items:center;gap:.35rem; }.vibration-row :global(svg) { width:.9rem;height:.9rem; }.level-segmented button { min-width:1.65rem;padding:0 .32rem; }.vocabulary-row { align-items:flex-start; }.completion-total strong { color:#34824d;font-family:'DM Serif Display',serif;font-size:1.45rem;line-height:1; }
  .crossword-frame { position:relative;min-height:205px;display:grid;place-items:stretch;margin-top:.55rem;padding:clamp(.5rem,3vw,1rem);background-color:#ede4d5;background-image:linear-gradient(rgba(23,42,69,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(23,42,69,.035) 1px,transparent 1px);background-size:20px 20px;border-top:3px double #172a45;border-bottom:2px solid rgba(23,42,69,.45);transition:transform .16s cubic-bezier(.23,1,.32,1); }.crossword-frame.shake { animation:shake .28s cubic-bezier(.23,1,.32,1); }.crossword-scroll { position:relative;z-index:1;min-width:0;min-height:0;overflow:scroll;display:grid;place-items:center;padding:clamp(.65rem,3vw,1.25rem);overscroll-behavior:contain;scrollbar-color:rgba(23,42,69,.4) transparent; }.crossword { --cell-size:clamp(2.35rem,10.2vw,3.1rem);position:relative;display:grid;width:max-content;min-width:calc(var(--cell-size) * 3); }.crossword-cell { aspect-ratio:1;min-width:0;display:grid;place-items:center;border:1px solid #172a45;background:#fffdf7;color:#172a45;font-size:clamp(.7rem,3.4vw,1.1rem);font-weight:800;line-height:1;text-transform:uppercase;transition:background .18s ease,color .18s ease,transform .18s cubic-bezier(.23,1,.32,1); }.crossword-cell.startAcross { border-left-width:4px; }.crossword-cell.endAcross { border-right-width:4px; }.crossword-cell.startDown { border-top-width:4px; }.crossword-cell.endDown { border-bottom-width:4px; }.crossword-cell.solved { background:#e6a527;transform:scale(.965);animation:solve-cell .32s cubic-bezier(.23,1,.32,1); }.crossword-void { aspect-ratio:1; }.frame-corner { position:absolute;z-index:2;width:13px;height:13px;border-color:#e6a527;border-style:solid;pointer-events:none; }.top-left { top:7px;left:7px;border-width:2px 0 0 2px; }.top-right { top:7px;right:7px;border-width:2px 2px 0 0; }.bottom-left { bottom:7px;left:7px;border-width:0 0 2px 2px; }.bottom-right { right:7px;bottom:7px;border-width:0 2px 2px 0; }
  .completion-inline { position:relative;z-index:56;display:inline-flex;align-items:center;justify-content:center;gap:.6rem;min-height:2.5rem;margin:auto;color:#34824d;animation:completion-in .24s cubic-bezier(.23,1,.32,1) both; }.completion-symbol { display:grid;place-items:center;width:1.8rem;height:1.8rem;flex:none;border:2px solid currentColor;border-radius:50%;font-family:'DM Sans',sans-serif;font-size:1.25rem;font-weight:800;line-height:1; }.completion-result { display:grid;gap:.08rem;justify-items:start;text-align:left; }.completion-result strong { color:#34824d;font-family:'DM Serif Display',serif;font-size:1.05rem;font-weight:400;letter-spacing:-.02em;line-height:1; }.completion-result small { color:#172a45;font-family:'DM Sans',sans-serif;font-size:.55rem;font-weight:800;letter-spacing:.06em;line-height:1.2;text-transform:uppercase; }.completion-result b { color:#34824d;font-family:'DM Serif Display',serif;font-size:.88rem;letter-spacing:0; }.completion-continue { min-height:1.85rem;padding:0 .8rem;border:1px solid #34824d;border-radius:999px;background:#34824d;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;transition:transform .16s cubic-bezier(.23,1,.32,1),background .16s ease; }.completion-continue:active { transform:scale(.96); }
  .selection-area { position:relative;z-index:1;min-height:52px;padding:.55rem 0 .2rem;text-align:center;background:linear-gradient(90deg,transparent,rgba(23,42,69,.025) 22%,rgba(23,42,69,.025) 78%,transparent); }.selection-area.install-ready { min-height:82px; }.selection-area.completion-area { z-index:55;display:grid;place-items:center;min-height:58px;padding:.35rem 0;background:transparent; }.selection-area .settings-trigger { position:absolute;z-index:70;top:.38rem;right:0; }.selected-word { min-height:1.7rem;display:inline-flex;align-items:center;justify-content:center;gap:.48rem;color:rgba(23,42,69,.35);font-family:'DM Serif Display',serif;font-size:clamp(1.35rem,5vw,1.75rem);letter-spacing:.16em;line-height:1; }.selected-word :global(svg) { width:1.45rem;height:1.45rem;letter-spacing:0; }.selected-word.has-word { color:#172a45; }.selected-word.correct { color:#3f7a50; }.selected-word.wrong { color:#b54442; }.tutorial-practice-status { display:flex;align-items:center;justify-content:center;gap:.5rem;margin:.2rem 0 0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.54rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase; }.tutorial-practice-status b { color:#172a45;font-size:.58rem;letter-spacing:.11em; }.wiktionary-link { display:grid;place-items:center;width:1.25rem;height:1.25rem;border:1px solid currentColor;border-radius:50%;color:inherit;letter-spacing:0;transition:transform .16s cubic-bezier(.23,1,.32,1),background .16s ease,color .16s ease; }.wiktionary-link:hover,.wiktionary-link:focus-visible { background:#3f7a50;color:#fffdf7;outline:0; }.wiktionary-link:active { transform:scale(.94); }.selected-word .wiktionary-link :global(svg) { width:.85rem;height:.85rem;animation:none; }.install-prompt { position:absolute;z-index:5;bottom:.25rem;left:50%;display:inline-flex;align-items:center;gap:.42rem;min-height:1.75rem;padding:.22rem .62rem;border:1px solid #172a45;border-radius:.2rem;background:#172a45;color:#fffdf7;box-shadow:0 3px 0 rgba(23,42,69,.16);font-family:'DM Sans',sans-serif;text-align:left;transform:translateX(-50%);transition:transform .16s cubic-bezier(.23,1,.32,1),background .16s ease; }.install-prompt:active { transform:translateX(-50%) scale(.97); }.install-prompt :global(svg) { width:1rem;height:1rem;color:#e6a527; }.install-prompt span { display:grid;gap:.02rem;line-height:1;white-space:nowrap; }.install-prompt strong { font-size:.57rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase; }.install-prompt small { color:rgba(255,253,247,.72);font-size:.5rem;font-weight:700;letter-spacing:.03em; }
  .wheel-stage { position:relative;min-height:235px;display:grid;place-items:center;border-top:1px solid rgba(23,42,69,.16);border-bottom:1px solid rgba(23,42,69,.16); }.letter-wheel { width:min(100%,248px);touch-action:none;overflow:visible;user-select:none; }.outer-ring,.inner-ring,.core-ring { fill:none; }.outer-ring { stroke:#172a45;stroke-width:1.1;stroke-dasharray:none;opacity:.28; }.inner-ring { stroke:#172a45;stroke-width:1;opacity:.12; }.core-ring { stroke:#e6a527;stroke-width:1.8;opacity:.9; }.core-mark { fill:#172a45;opacity:.83; }.core-word { fill:rgba(23,42,69,.52);font-family:'DM Serif Display',serif;font-size:13px;letter-spacing:.08em; }.core-word.active-core { fill:#c98220; }.core-caption { fill:rgba(23,42,69,.5);font-family:'DM Sans',sans-serif;font-size:5.8px;font-weight:800;letter-spacing:.18em; }.selection-line { fill:none;stroke:#e6a527;stroke-linecap:round;stroke-linejoin:round;stroke-width:10;opacity:.9; }.letter-node { cursor:crosshair; }.letter-node>circle { fill:#fffdf7;stroke:#172a45;stroke-width:2;transform-box:fill-box;transform-origin:center; }.letter-node text { fill:#172a45;font-family:'DM Sans',sans-serif;font-size:20px;font-weight:800;pointer-events:none; }.letter-node.active>circle { fill:#e6a527;stroke:#c98220;transform:scale(1.22); }.letter-node.active text { fill:#172a45; }
  @keyframes drop-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes shake { 25% { transform: translateX(-7px); } 55% { transform: translateX(6px); } 80% { transform: translateX(-3px); } }
  @keyframes solve-cell { 0% { transform: scale(.84); } 70% { transform: scale(1.05); } 100% { transform: scale(.965); } }
  @keyframes completion-in { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
  :global(html.dark) .game-paper { background:rgba(23,42,69,.96);border-color:rgba(255,253,247,.18);box-shadow:0 24px 70px rgba(0,0,0,.35); }:global(html.dark) .game-paper::before { border-color:rgba(255,253,247,.14); }:global(html.dark) .tutorial-panel,:global(html.dark) .tutorial-card { background:#172a45;color:#fffdf7; }:global(html.dark) .tutorial-card { border-color:rgba(255,253,247,.32); }:global(html.dark) .tutorial-card h1,:global(html.dark) .tutorial-steps li { color:#fffdf7; }:global(html.dark) .tutorial-steps b { border-color:#fffdf7;background:#172a45;color:#e6a527; }:global(html.dark) .tutorial-start { border-color:#e6a527;background:#e6a527;color:#172a45; }:global(html.dark) .wheel-stage { border-color:rgba(255,253,247,.18); }:global(html.dark) .settings-trigger,:global(html.dark) .setting-row,:global(html.dark) .selected-word.has-word { color:#fffdf7; }:global(html.dark) .brand-mark i { border-color:#fffdf7; }:global(html.dark) .settings-trigger { border-color:rgba(255,253,247,.3);background:rgba(23,42,69,.8); }:global(html.dark) .settings-panel { background:rgba(23,42,69,.99); }:global(html.dark) .settings-intro { color:#fffdf7; }:global(html.dark) .setting-row { color:#fffdf7;border-color:rgba(255,253,247,.22); }:global(html.dark) .segmented { border-color:rgba(255,253,247,.25); }:global(html.dark) .segmented button { color:rgba(255,253,247,.64); }:global(html.dark) .crossword-frame { background-color:#213a5d;border-color:#e6a527; }:global(html.dark) .crossword-cell { background:#fffdf7; }:global(html.dark) .outer-ring { stroke:#fffdf7; }:global(html.dark) .inner-ring { stroke:#fffdf7; }:global(html.dark) .core-mark { fill:#fffdf7; }:global(html.dark) .core-word,:global(html.dark) .core-caption { fill:rgba(255,253,247,.55); }:global(html.dark) .core-word.active-core { fill:#e6a527; }:global(html.dark) .letter-node>circle { fill:#172a45;stroke:#fffdf7; }:global(html.dark) .letter-node.active>circle { fill:#e6a527;stroke:#e6a527; }:global(html.dark) .letter-node.active text { fill:#172a45; }:global(html.dark) .completion-result small { color:rgba(255,253,247,.74); }
  @media (min-width:580px) { .crossword-frame { min-height:260px; }.wheel-stage { min-height:300px; }.letter-wheel { width:292px; } }
  /* Compact mobile composition: the grid inhabits the free middle field and the wheel stays docked to the bottom edge. */
  :global(.game-shell) { min-height:100svh;padding:clamp(.25rem,1.2vw,.55rem);display:flex;align-items:stretch;justify-content:center; }
  .game-paper { box-sizing:border-box;width:min(100%,660px);height:calc(100svh - clamp(.5rem,2.4vw,1.1rem));min-height:0;padding:clamp(.35rem,1.75vw,.7rem);display:flex;flex-direction:column; }
  .crossword-frame { flex:1 1 auto;min-height:0;margin-top:0;padding:clamp(.35rem,1.6vw,.7rem);border-top:0; }
  .crossword { width:max-content;min-width:calc(var(--cell-size) * 3); }
  .selection-area { flex:0 0 auto;min-height:40px;padding:.35rem 0 .05rem; }.selection-area.install-ready { min-height:70px; }.selection-area.completion-area { min-height:54px;padding:.2rem 0; }
  .settings-trigger { overflow:visible; }
  .wheel-stage { flex:0 0 clamp(206px,33svh,260px);min-height:0; }
  .letter-wheel { width:min(100%,238px); }
  .crossword-frame { background-image:linear-gradient(rgba(23,42,69,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(23,42,69,.018) 1px,transparent 1px);background-size:24px 24px; }
  .crossword-scroll { overflow:auto;touch-action:pan-x pan-y;border:1px solid rgba(23,42,69,.12);background:linear-gradient(90deg,rgba(255,253,247,.3),rgba(255,253,247,.08) 18%,rgba(255,253,247,.08) 82%,rgba(255,253,247,.3));box-shadow:inset 0 0 0 6px rgba(255,253,247,.15);outline:0; }
  .core-word.idle-core { fill:#a0621d;font-family:'DM Sans',sans-serif;font-size:10.8px;font-weight:800;letter-spacing:.08em; }
  .settings-github { display:block;margin-top:1rem;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.66rem;font-weight:800;letter-spacing:.05em;text-align:center;text-decoration:none;text-transform:uppercase; }
  .settings-github:focus-visible { outline:2px solid #e6a527;outline-offset:3px; }
  /* Input rail: completion occupies the exact input slot; helper and repository controls remain secondary to word feedback. */
  .selection-area.completion-area { display:flex;align-items:center;justify-content:center;height:58px;min-height:58px;padding:0; }
  .selection-area.completion-area .completion-inline { display:flex;align-items:center;justify-content:center;width:100%;height:100%;margin:0; }
  .wiktionary-link { border-color:#8b949c;background:#edf0ef;color:#69727a; }
  .wiktionary-link:hover,.wiktionary-link:focus-visible { background:#c9d0cf;color:#3f484e; }
  :global(html.dark) .wiktionary-link { border-color:#84909b;background:#2b3d57;color:#d8dde1; }
  .settings-github { display:flex;align-items:center;justify-content:center;gap:.42rem; }
  .settings-github :global(svg) { width:1rem;height:1rem; }
  .locale-dropdown { display:inline-flex;align-items:center;gap:.4rem;min-width:0;padding:.1rem .38rem;border:1px solid #172a45;background:rgba(255,253,247,.78);color:#172a45; }.locale-dropdown :global(svg) { width:.98rem;height:.98rem;flex:none; }.locale-dropdown select { min-width:0;max-width:9.4rem;border:0;background:transparent;color:inherit;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:800;letter-spacing:.02em;outline:0; }.locale-dropdown select:focus-visible { outline:2px solid #e6a527;outline-offset:3px; }
  .settings-telegram { display:flex;align-items:center;justify-content:center;gap:.48rem;margin-top:1rem;padding:.54rem .7rem;border:1px solid #2aab2e;background:rgba(42,171,46,.08);color:#237a26;font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:700;line-height:1.45;text-align:right;text-decoration:none; }.settings-telegram :global(svg) { width:1.12rem;height:1.12rem;flex:none; }.settings-telegram:hover,.settings-telegram:focus-visible { background:#2aab2e;color:#fffdf7;outline:0; }.settings-telegram:focus-visible { outline:2px solid #e6a527;outline-offset:3px; }
  :global(html.dark) .settings-telegram { border-color:#56c85a;background:rgba(86,200,90,.13);color:#a9e8ab; }
  .tutorial-restart-row button { min-height:1.85rem;padding:0 .62rem;border:1px solid #a45e38;border-radius:0;background:transparent;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.57rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;transition:background .16s ease,color .16s ease,transform .16s cubic-bezier(.23,1,.32,1); }.tutorial-restart-row button:hover,.tutorial-restart-row button:focus-visible { background:#a45e38;color:#fffdf7;outline:0; }.tutorial-restart-row button:active { transform:scale(.97); }
  :global(html.dark) .tutorial-restart-row button { border-color:#e6a527;color:#e6a527; }:global(html.dark) .tutorial-restart-row button:hover,:global(html.dark) .tutorial-restart-row button:focus-visible { background:#e6a527;color:#172a45; }
  @media (max-width:579px) { .selection-area.completion-area { height:54px;min-height:54px;padding:0; } }
  /* Papier & Tinte onboarding: a calm vertical folio with registration details, kept outside the idle game-input preview. */
  .tutorial-panel { isolation:isolate;background:linear-gradient(90deg,rgba(23,42,69,.055) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#fffdf7; }
  .tutorial-panel::before { content:'WORDCIRCLE · DAILY LANGUAGE FOLIO'; position:absolute;z-index:-1;top:1.35rem;left:1.55rem;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.48rem;font-weight:800;letter-spacing:.16em;opacity:.68; }
  .tutorial-panel::after { content:'';position:absolute;z-index:-1;right:1.55rem;bottom:1.45rem;width:1.12rem;height:1.12rem;border:1px solid #172a45;border-radius:50%;box-shadow:.42rem .42rem 0 -1px #fffdf7,.42rem .42rem 0 0 #e6a527;opacity:.72; }
  .tutorial-card { position:relative;box-shadow:8px 8px 0 rgba(230,165,39,.18),0 0 0 4px rgba(255,253,247,.8); }
  .tutorial-language { display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin:0 0 .75rem;padding-bottom:.55rem;border-bottom:1px solid rgba(23,42,69,.18); }.tutorial-language>span { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.56rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase; }.tutorial-language .locale-dropdown { flex:none; }
  :global(html.dark) .tutorial-language { border-color:rgba(255,253,247,.25); }.tutorial-language .locale-dropdown,:global(html.dark) .locale-dropdown { border-color:#fffdf7;background:rgba(23,42,69,.55);color:#fffdf7; }
  .tutorial-card::after { content:'01';position:absolute;right:.7rem;bottom:.55rem;color:rgba(23,42,69,.48);font-family:'DM Sans',sans-serif;font-size:.48rem;font-weight:800;letter-spacing:.12em; }
  :global(html.dark) .tutorial-panel { background:linear-gradient(90deg,rgba(255,253,247,.11) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#172a45; }.tutorial-panel::before { color:#fffdf7; }.tutorial-panel::after { border-color:#fffdf7;box-shadow:.42rem .42rem 0 -1px #172a45,.42rem .42rem 0 0 #e6a527; }.tutorial-card::after { color:rgba(255,253,247,.56); }
  @media (prefers-reduced-motion:reduce) { .letter-node:not(.active),.settings-panel,.crossword-cell.solved,.completion-inline { animation:none; } }
</style>
