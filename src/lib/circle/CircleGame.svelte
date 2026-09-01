<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import { settings } from '$lib/state/settings.svelte';
  import { playSuccessSound } from '$lib/sounds';
  import { hintableBaseWords, wordDefinitions, wordMetadata, wordPools, type Language } from '$lib/data/vocabulary';
  import { wiktionaryUrl } from '$lib/wiktionary';
  import {
    buildRound, cellKey, gridFromPlacements, isPlacement, placementCells, randomSeed, roundFromStoredGame, selectedPool,
    type Placement, type Round, type StoredGame
  } from './engine';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconClose from '~icons/material-symbols/cancel-rounded';
  import IconDownload from '~icons/material-symbols/download-rounded';
  import IconHelp from '~icons/material-symbols/help-rounded';
  import IconProgressActivity from '~icons/material-symbols/progress-activity';
  import { tick } from 'svelte';

  type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> };

  const CIRCLE_TUTORIAL_STATE_KEY = 'wordcircle-tutorial-state-v1';

  /**
   * A tutorial round is hand-picked, so its words are not guaranteed to be spellable
   * from a single base word the way a generated round is. The wheel must instead carry
   * the union of every word's letters (each letter repeated as many times as its
   * neediest word requires), or a crossing word could ask for a letter the wheel never offers.
   */
  function lettersForWords(words: string[]): string[] {
    const counts = new Map<string, number>();
    for (const word of words) {
      const local = new Map<string, number>();
      for (const letter of word) local.set(letter, (local.get(letter) ?? 0) + 1);
      for (const [letter, count] of local) counts.set(letter, Math.max(counts.get(letter) ?? 0, count));
    }
    return [...counts.entries()].flatMap(([letter, count]) => Array<string>(count).fill(letter));
  }
  function tutorialRound(words: string[], placements: Placement[]): Round {
    return { words, letters: lettersForWords(words), grid: gridFromPlacements(placements) };
  }
  const circleTutorialRounds: Partial<Record<'de' | 'en', Round>> = {
    de: tutorialRound(
      ['GARTEN', 'GAS', 'TEE'],
      [
        { word: 'GARTEN', row: 0, col: 0, orientation: 'across' },
        { word: 'GAS', row: 0, col: 0, orientation: 'down' },
        { word: 'TEE', row: 0, col: 3, orientation: 'down' }
      ]
    ),
    en: tutorialRound(
      ['PLANET', 'PEN', 'TEA'],
      [
        { word: 'PLANET', row: 0, col: 0, orientation: 'across' },
        { word: 'PEN', row: 0, col: 0, orientation: 'down' },
        { word: 'TEA', row: 0, col: 5, orientation: 'down' }
      ]
    )
  };
  const circleTutorialHints: Record<'de' | 'en', string> = {
    de: 'G••••• · G•• · T••',
    en: 'P••••• · P•• · T••'
  };

  let { practiceLanguage = null }: { practiceLanguage?: 'de' | 'en' | null } = $props();

  // The circle route mounts a fresh component per navigation, so practiceLanguage never
  // changes after mount; freeze it once here rather than reading the prop repeatedly below.
  // svelte-ignore state_referenced_locally
  const startingPracticeLanguage = practiceLanguage;

  const CIRCLE = 146;
  const LETTER_RADIUS = 120;
  const LETTER_BUBBLE_OUTWARD = 8;
  const GAME_STORAGE_KEY = 'wordcircle-active-round-v1';
  const ROUND_HISTORY_KEY = 'wordcircle-recent-base-words-v1';

  function readRecentBases(): string[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const value: unknown = JSON.parse(localStorage.getItem(ROUND_HISTORY_KEY) ?? '[]');
      return Array.isArray(value) ? value.filter((word): word is string => typeof word === 'string' && /^\p{L}+$/u.test(word)).slice(0, 24) : [];
    } catch {
      return [];
    }
  }
  function readStoredGame(): StoredGame<Language> | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) ?? 'null');
      if (!parsed || typeof parsed !== 'object') return null;
      const game = parsed as Partial<StoredGame<Language>>;
      const words = game.words;
      const letters = game.letters;
      const placements = game.placements;
      const solvedWords = game.solvedWords;
      const validWords = Array.isArray(words) && words.length > 0 && words.every((word) => typeof word === 'string' && /^\p{L}+$/u.test(word));
      const validLetters = Array.isArray(letters) && letters.length >= 3 && letters.length <= 8 && letters.every((letter) => typeof letter === 'string' && /^\p{L}$/u.test(letter));
      const validPlacements = Array.isArray(placements) && placements.length === words?.length && placements.every(isPlacement);
      const validSolvedWords = Array.isArray(solvedWords) && solvedWords.every((word) => typeof word === 'string' && words?.includes(word));
      const validStartedAt = typeof game.startedAt === 'undefined' || (Number.isSafeInteger(game.startedAt) && game.startedAt > 0);
      const validCompletedDuration = typeof game.completedDuration === 'undefined' || (Number.isSafeInteger(game.completedDuration) && game.completedDuration >= 0);
      if (game.version !== 1 || game.language !== settings.lang || !Number.isInteger(game.roundNumber) || (game.roundNumber ?? 0) < 1 || !validWords || !validLetters || !validPlacements || !validSolvedWords || !validStartedAt || !validCompletedDuration) return null;
      return { version: 1, language: game.language, roundNumber: game.roundNumber, words: words as string[], letters: letters as string[], placements: placements as Placement[], solvedWords: [...new Set(solvedWords as string[])], startedAt: game.startedAt, completedDuration: game.completedDuration };
    } catch {
      return null;
    }
  }

  if (startingPracticeLanguage) settings.setLang(startingPracticeLanguage);

  const initialGame = startingPracticeLanguage ? null : readStoredGame();
  const initialRecentBases = readRecentBases();
  const isPractice = Boolean(startingPracticeLanguage);
  const initialRound: Round = startingPracticeLanguage
    ? circleTutorialRounds[startingPracticeLanguage]!
    : initialGame
      ? roundFromStoredGame(initialGame)
      : buildRound(selectedPool(wordPools[settings.lang], settings.vocabularyLevel, settings.includeLowerVocabulary), randomSeed(), [], settings.allowBackwardWords, hintableBaseWords);

  let roundNumber = $state(initialGame?.roundNumber ?? 1);
  let recentBaseWords = $state<string[]>(initialGame ? [...new Set([initialGame.words[0], ...initialRecentBases])] : initialRecentBases);
  let currentRound = $state<Round>(initialRound);
  let selectedPath = $state<number[]>([]);
  let solvedWords = $state<string[]>(initialGame?.solvedWords ?? []);
  let feedback = $state<'correct' | 'wrong' | null>(null);
  let feedbackWord = $state('');
  let shakeGrid = $state(false);
  let isDragging = $state(false);
  let circleEl = $state<SVGSVGElement>();
  let celebration = $state(!isPractice && initialGame ? initialGame.solvedWords.length === initialGame.words.length : false);
  let startedAt = $state(initialGame?.startedAt ?? Date.now());
  let completedDuration = $state<number | null>(initialGame?.completedDuration ?? null);
  let installPrompt = $state<InstallPromptEvent | null>(null);
  let tutorialPractice = $state(isPractice);
  let idleHintReady = $state(false);
  let revealedHintWord = $state<string | null>(null);
  let idleHintTimer: number | null = null;
  let explainOpen = $state(false);
  let loadingNextRound = $state(false);

  const labels = $derived({
    hint: m.hint({}, { locale: settings.interfaceLocale }),
    allDone: m.all_done({}, { locale: settings.interfaceLocale }),
    time: m.time({}, { locale: settings.interfaceLocale }),
    continue: m.continue({}, { locale: settings.interfaceLocale }),
    explain: m.explain({}, { locale: settings.interfaceLocale }),
    readMore: m.read_more({}, { locale: settings.interfaceLocale }),
    install: m.install({}, { locale: settings.interfaceLocale }),
    installHint: m.install_hint({}, { locale: settings.interfaceLocale }),
    tracePrompt: m.trace_prompt({}, { locale: settings.interfaceLocale }),
    traceActive: m.trace_active({}, { locale: settings.interfaceLocale }),
    tutorial: m.tutorial({}, { locale: settings.interfaceLocale }),
    idleHint: m.idle_hint({}, { locale: settings.interfaceLocale })
  });

  const circleLetters = $derived(currentRound.letters);
  const grid = $derived(currentRound.grid);
  const solvedSet = $derived(new Set(solvedWords));
  const activeWord = $derived(selectedPath.map((index) => circleLetters[index]).join(''));
  const previewWord = $derived(activeWord || feedbackWord);
  const coreReadout = $derived(activeWord || labels.tracePrompt);
  const traceCaption = $derived(activeWord ? labels.traceActive : labels.tracePrompt);
  const tutorialHint = $derived(practiceLanguage ? circleTutorialHints[practiceLanguage] : '');
  const hintDefinition = $derived(revealedHintWord ? wordDefinitions[settings.lang][revealedHintWord] ?? null : null);
  const feedbackSpelling = $derived(wordMetadata[settings.lang][feedbackWord]?.spelling ?? feedbackWord);
  const feedbackDefinition = $derived(wordDefinitions[settings.lang][feedbackWord] ?? null);
  const feedbackWiktionaryHref = $derived(wiktionaryUrl(settings.lang, feedbackSpelling));
  const hintedCells = $derived.by(() => {
    if (!revealedHintWord) return new Set<string>();
    const placement = grid.placements.find((entry) => entry.word === revealedHintWord);
    return new Set((placement ? placementCells(placement) : []).map((point) => cellKey(point.row, point.col)));
  });
  const solvedCells = $derived.by(() => {
    const keys = new Set<string>();
    grid.placements.filter((entry) => solvedSet.has(entry.word)).forEach((entry) => {
      entry.word.split('').forEach((_letter, index) => keys.add(cellKey(entry.row + (entry.orientation === 'down' ? index : 0), entry.col + (entry.orientation === 'across' ? index : 0))));
    });
    return keys;
  });

  $effect(() => {
    localStorage.setItem(ROUND_HISTORY_KEY, JSON.stringify(recentBaseWords));
  });
  $effect(() => {
    if (tutorialPractice) return;
    const snapshot: StoredGame<Language> = { version: 1, language: settings.lang, roundNumber, words: currentRound.words, letters: currentRound.letters, placements: currentRound.grid.placements, solvedWords, startedAt, completedDuration: completedDuration ?? undefined };
    try {
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* Storage is optional; the game remains playable without it. */
    }
  });
  $effect(() => {
    currentRound;
    solvedWords.length;
    celebration;
    tutorialPractice;
    scheduleIdleHint();
    return () => clearIdleHintTimer();
  });
  $effect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPrompt = event as InstallPromptEvent;
    };
    const clearInstallPrompt = () => (installPrompt = null);
    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', clearInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', clearInstallPrompt);
    };
  });

  function clearIdleHintTimer() {
    if (idleHintTimer !== null) window.clearTimeout(idleHintTimer);
    idleHintTimer = null;
  }
  function scheduleIdleHint(keepVisible = false) {
    if (typeof window === 'undefined') return;
    clearIdleHintTimer();
    idleHintReady = false;
    if (!keepVisible) revealedHintWord = null;
    if (celebration || currentRound.words.every((word) => solvedSet.has(word) || !wordDefinitions[settings.lang][word])) return;
    idleHintTimer = window.setTimeout(() => {
      revealedHintWord = null;
      idleHintReady = true;
    }, 60_000);
  }
  function noteGameInput() {
    scheduleIdleHint();
  }
  function showIdleHint() {
    const candidates = currentRound.words.filter((word) => !solvedSet.has(word) && Boolean(wordDefinitions[settings.lang][word]));
    const target = candidates.length > 0 ? candidates[Math.floor(randomSeed() % candidates.length)] : null;
    if (!target) return;
    revealedHintWord = target;
    scheduleIdleHint(true);
  }
  function buzz(pattern: number | number[]) {
    if (settings.vibration && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  }
  function newRound(resetCount = false) {
    if (resetCount) roundNumber = 0;
    const nextRound = buildRound(selectedPool(wordPools[settings.lang], settings.vocabularyLevel, settings.includeLowerVocabulary), randomSeed(), recentBaseWords, settings.allowBackwardWords, hintableBaseWords);
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
    scheduleIdleHint();
  }
  function completeTutorial() {
    localStorage.setItem(CIRCLE_TUTORIAL_STATE_KEY, 'complete');
    tutorialPractice = false;
    newRound(true);
  }
  async function continueRound() {
    if (loadingNextRound) return;
    loadingNextRound = true;
    // Let the button render its busy state before generating the next round.
    await tick();
    if (tutorialPractice) completeTutorial();
    else newRound();
    loadingNextRound = false;
  }
  function position(index: number, total: number, outward = 0) {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    const radius = LETTER_RADIUS + outward;
    return { x: CIRCLE + radius * Math.cos(angle), y: CIRCLE + radius * Math.sin(angle) };
  }
  function pointFromEvent(event: PointerEvent) {
    const rect = circleEl?.getBoundingClientRect();
    if (!rect) return null;
    return { x: ((event.clientX - rect.left) / rect.width) * 292, y: ((event.clientY - rect.top) / rect.height) * 292 };
  }
  function nearestLetter(point: { x: number; y: number }) {
    let closest = -1;
    let distance = Infinity;
    circleLetters.forEach((_letter, index) => {
      const letter = position(index, circleLetters.length);
      const nextDistance = Math.hypot(point.x - letter.x, point.y - letter.y);
      if (nextDistance < distance) {
        distance = nextDistance;
        closest = index;
      }
    });
    return distance < 36 ? closest : -1;
  }
  function chooseLetter(index: number) {
    if (celebration || selectedPath.includes(index)) return;
    noteGameInput();
    feedback = null;
    feedbackWord = '';
    explainOpen = false;
    selectedPath = [...selectedPath, index];
    buzz(7);
  }
  function startSwipe(event: PointerEvent, knownIndex = -1) {
    if (celebration) return;
    event.preventDefault();
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    isDragging = true;
    selectedPath = [];
    feedback = null;
    feedbackWord = '';
    explainOpen = false;
    const point = pointFromEvent(event);
    const index = knownIndex >= 0 ? knownIndex : point ? nearestLetter(point) : -1;
    if (index >= 0) chooseLetter(index);
  }
  function extendSwipe(event: PointerEvent) {
    if (!isDragging) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const index = nearestLetter(point);
    if (index >= 0 && index !== selectedPath.at(-1)) chooseLetter(index);
  }
  function endSwipe() {
    if (!isDragging) return;
    isDragging = false;
    if (selectedPath.length >= 2) submitWord();
    else selectedPath = [];
  }
  function submitWord() {
    const word = activeWord;
    feedbackWord = word;
    if (currentRound.words.includes(word) && !solvedSet.has(word)) {
      const completed = solvedWords.length + 1 === currentRound.words.length;
      solvedWords = [...solvedWords, word];
      feedback = 'correct';
      buzz(completed ? [24, 28, 40, 28, 70] : [16, 20, 26]);
      playSuccessSound(settings.sound, 'circle');
      if (completed) {
        completedDuration = Math.max(0, Date.now() - startedAt);
        if (!tutorialPractice) {
          settings.recordRoundCompleted();
          void settings.recordStreak('circle_completed');
        }
        celebration = true;
      }
    } else {
      feedback = 'wrong';
      shakeGrid = true;
      buzz([18, 18, 18]);
      window.setTimeout(() => (shakeGrid = false), 280);
    }
    selectedPath = [];
  }
  function formatDuration(duration: number | null) {
    const seconds = Math.floor((duration ?? 0) / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function pathPoints() {
    return selectedPath.map((index) => {
      const point = position(index, circleLetters.length, LETTER_BUBBLE_OUTWARD);
      return `${point.x},${point.y}`;
    }).join(' ');
  }
  function selectionAreaClasses() {
    if (celebration) return 'relative z-[55] flex items-center justify-center h-[70px] min-h-[70px] p-0 bg-transparent max-[579px]:h-[54px] max-[579px]:min-h-[54px]';
    const base = 'relative z-[1] flex-none pt-[.75rem] pb-[.35rem] text-center bg-[linear-gradient(90deg,transparent,rgba(23,42,69,.025)_22%,rgba(23,42,69,.025)_78%,transparent)] max-[579px]:pt-[.45rem] max-[579px]:pb-[.1rem]';
    const heights = installPrompt && !previewWord ? 'min-h-[96px] max-[579px]:min-h-[70px]' : 'min-h-[70px] max-[579px]:min-h-[54px]';
    return `${base} ${heights}`;
  }
  function inRange(row: number, col: number) {
    return grid.cells.get(cellKey(row, col));
  }
  function isWordStart(row: number, col: number, orientation: 'across' | 'down') {
    return grid.placements.some((entry) => entry.orientation === orientation && entry.row === row && entry.col === col);
  }
  function isWordEnd(row: number, col: number, orientation: 'across' | 'down') {
    return grid.placements.some((entry) => entry.orientation === orientation && row === entry.row + (orientation === 'down' ? entry.word.length - 1 : 0) && col === entry.col + (orientation === 'across' ? entry.word.length - 1 : 0));
  }
  async function installApp() {
    const prompt = installPrompt;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    installPrompt = null;
  }
</script>

<svelte:window onpointerup={endSwipe} onpointercancel={endSwipe} />

<div
  class="relative min-h-[205px] min-[580px]:min-h-[260px] flex-1 grid place-items-stretch mt-0 p-[clamp(.35rem,1.6vw,.7rem)] bg-[#ede4d5] bg-[image:linear-gradient(rgba(23,42,69,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(23,42,69,.018)_1px,transparent_1px)] bg-[length:24px_24px] border-t-0 border-b-2 border-b-[rgba(23,42,69,.45)] [transition:transform_.16s_cubic-bezier(.23,1,.32,1)] dark:bg-[#213a5d] dark:border-b-primary {shakeGrid ? 'animate-[shake_.28s_cubic-bezier(.23,1,.32,1)]' : ''}"
  aria-label="Crossword"
>
  <div class="relative z-[1] min-w-0 min-h-0 overflow-auto grid place-items-center p-[clamp(.65rem,3vw,1.25rem)] [overscroll-behavior:contain] [touch-action:pan-x_pan-y] border border-[rgba(23,42,69,.12)] bg-[linear-gradient(90deg,rgba(255,253,247,.3),rgba(255,253,247,.08)_18%,rgba(255,253,247,.08)_82%,rgba(255,253,247,.3))] shadow-[inset_0_0_0_6px_rgba(255,253,247,.15)] outline-0 [scrollbar-color:rgba(23,42,69,.4)_transparent]" aria-label="Scrollable crossword grid">
    <div class="relative grid w-max min-w-[calc(var(--cell-size)*3)] [--cell-size:clamp(2.35rem,10.2vw,3.1rem)]" style={`grid-template-columns: repeat(${grid.maxCol - grid.minCol + 1}, var(--cell-size));`}>
      {#each Array(grid.maxRow - grid.minRow + 1) as _, rowIndex}
        {#each Array(grid.maxCol - grid.minCol + 1) as _, colIndex}
          {@const row = grid.minRow + rowIndex}{@const col = grid.minCol + colIndex}{@const cell = inRange(row, col)}
          {@const solved = solvedCells.has(cellKey(row, col))}
          {@const hinted = hintedCells.has(cellKey(row, col)) && !solved}
          {#if cell}<div
            class="aspect-square min-w-0 grid place-items-center border border-[#172a45] bg-[#fffdf7] text-[#172a45] text-[clamp(.7rem,3.4vw,1.1rem)] font-extrabold leading-none uppercase [transition:background_.18s_ease,color_.18s_ease,transform_.18s_cubic-bezier(.23,1,.32,1)]"
            class:border-l-4={isWordStart(row, col, 'across')}
            class:border-r-4={isWordEnd(row, col, 'across')}
            class:border-t-4={isWordStart(row, col, 'down')}
            class:border-b-4={isWordEnd(row, col, 'down')}
            class:relative={hinted}
            class:z-[1]={hinted}
            class:outline={hinted}
            class:outline-[3px]={hinted}
            class:outline-offset-[-4px]={hinted}
            class:outline-primary={hinted}
            class:bg-[#fff7dd]={hinted}
            class:bg-primary={solved}
            class:scale-[.965]={solved}
            class:animate-[solve-cell_.32s_cubic-bezier(.23,1,.32,1)]={solved}
            aria-label={solved ? cell.letter : 'open cell'}
          >{solved ? cell.letter : ''}</div>{:else}<div class="aspect-square"></div>{/if}
        {/each}
      {/each}
    </div>
  </div>
  <div class="absolute z-[2] w-[13px] h-[13px] border-primary [border-style:solid] pointer-events-none top-[7px] left-[7px] [border-width:2px_0_0_2px]"></div><div class="absolute z-[2] w-[13px] h-[13px] border-primary [border-style:solid] pointer-events-none top-[7px] right-[7px] [border-width:2px_2px_0_0]"></div><div class="absolute z-[2] w-[13px] h-[13px] border-primary [border-style:solid] pointer-events-none bottom-[7px] left-[7px] [border-width:0_0_2px_2px]"></div><div class="absolute z-[2] w-[13px] h-[13px] border-primary [border-style:solid] pointer-events-none right-[7px] bottom-[7px] [border-width:0_2px_2px_0]"></div>
</div>

<div class={selectionAreaClasses()} aria-live="polite">
  {#if celebration}
    <div class="relative z-[56] flex items-center justify-center w-full h-full gap-[.6rem] m-0 text-success animate-[completion-in_.24s_cubic-bezier(.23,1,.32,1)_both] motion-reduce:animate-none">
      <span class="grid place-items-center w-[1.8rem] h-[1.8rem] flex-none border-2 border-current rounded-full font-['DM_Sans'] text-[1.25rem] font-extrabold leading-none" aria-hidden="true">✓</span>
      <span class="grid gap-[.08rem] justify-items-start text-left">
        <strong class="text-success font-['DM_Serif_Display'] text-[1.05rem] font-normal tracking-[-.02em] leading-none">{labels.allDone}</strong>
        <small class="block text-base-content dark:text-base-content/74 font-['DM_Sans'] text-[.55rem] font-extrabold tracking-[.06em] leading-[1.2] uppercase">{labels.time} <b class="text-success font-['DM_Serif_Display'] text-[.88rem] tracking-normal">{formatDuration(completedDuration)}</b></small>
      </span>
      <button class="inline-flex items-center justify-center gap-[.35rem] min-h-[1.85rem] px-[.8rem] border border-success rounded-full bg-success text-[#fffdf7] font-['DM_Sans'] text-[.58rem] font-extrabold tracking-[.08em] uppercase [transition:transform_.16s_cubic-bezier(.23,1,.32,1),background_.16s_ease] active:scale-[.96] disabled:cursor-wait disabled:opacity-80" onclick={continueRound} disabled={loadingNextRound} aria-busy={loadingNextRound}>
        {#if loadingNextRound}<IconProgressActivity class="w-[.85rem] h-[.85rem] animate-[startup-spin_1s_linear_infinite] motion-reduce:animate-none" aria-hidden="true" />{/if}
        <span>{labels.continue}</span>
      </button>
    </div>
  {:else}
    {#if idleHintReady}<button class="absolute z-[70] top-[.48rem] left-0 inline-flex items-center gap-[.3rem] min-h-[1.85rem] px-[.55rem] border border-[rgba(164,94,56,.58)] rounded-full bg-[#fffdf7] text-accent font-['DM_Sans'] text-[.56rem] font-extrabold tracking-[.07em] uppercase opacity-0 translate-y-1 animate-[hint-fade-in_.28s_cubic-bezier(.23,1,.32,1)_forwards] active:translate-y-1 active:scale-[.96]" onclick={showIdleHint}><IconHelp class="w-[.9rem] h-[.9rem]" aria-hidden="true" /><span>{labels.idleHint}</span></button>{/if}
    <div
      class="min-h-[2.1rem] inline-flex items-center justify-center gap-[.48rem] text-[rgba(23,42,69,.35)] font-['DM_Serif_Display'] text-[clamp(1.35rem,5vw,1.75rem)] tracking-[.16em] leading-none"
      class:text-base-content={previewWord.length > 0 && feedback !== 'wrong' && !(feedback === 'correct' && !explainOpen)}
      class:text-error={feedback === 'wrong'}
    >
      {#if hintDefinition}
        <span class="max-w-[min(32rem,74vw)] text-accent font-['DM_Sans'] text-[clamp(.63rem,2.5vw,.78rem)] font-bold tracking-[.01em] leading-[1.35] text-center">{hintDefinition}</span>
      {:else if explainOpen && feedback === 'correct'}
        <span class="max-w-[min(32rem,74vw)] text-accent font-['DM_Sans'] text-[clamp(.63rem,2.5vw,.78rem)] font-bold tracking-[.01em] leading-[1.35] text-center">{feedbackDefinition}<a class="ml-1 text-primary font-extrabold underline decoration-2 underline-offset-2 whitespace-nowrap" href={feedbackWiktionaryHref} target="_blank" rel="noreferrer">{labels.readMore}</a></span>
      {:else if previewWord}
        <span class={feedback === 'correct' ? 'text-[#3f7a50]' : ''}>{previewWord}</span>{#if feedback === 'correct'}<IconCheck class="w-[1.45rem] h-[1.45rem]" aria-label="Correct" />{#if feedbackDefinition}<button type="button" class="grid place-items-center w-[1.25rem] h-[1.25rem] border border-[#8b949c] rounded-full bg-[#edf0ef] text-[#69727a] tracking-normal [transition:transform_.16s_cubic-bezier(.23,1,.32,1),background_.16s_ease,color_.16s_ease] hover:bg-[#c9d0cf] hover:text-[#3f484e] focus-visible:bg-[#c9d0cf] focus-visible:text-[#3f484e] focus-visible:outline-0 active:scale-[.94] dark:border-[#84909b] dark:bg-[#2b3d57] dark:text-[#d8dde1]" onclick={() => (explainOpen = true)} aria-label={`${labels.explain}: ${feedbackSpelling}`}><IconHelp class="w-[.85rem] h-[.85rem]" aria-hidden="true" /></button>{:else}<a class="grid place-items-center w-[1.25rem] h-[1.25rem] border border-[#8b949c] rounded-full bg-[#edf0ef] text-[#69727a] tracking-normal [transition:transform_.16s_cubic-bezier(.23,1,.32,1),background_.16s_ease,color_.16s_ease] hover:bg-[#c9d0cf] hover:text-[#3f484e] focus-visible:bg-[#c9d0cf] focus-visible:text-[#3f484e] focus-visible:outline-0 active:scale-[.94] dark:border-[#84909b] dark:bg-[#2b3d57] dark:text-[#d8dde1]" href={feedbackWiktionaryHref} target="_blank" rel="noreferrer" aria-label={`${labels.explain}: ${feedbackSpelling}`}><IconHelp class="w-[.85rem] h-[.85rem]" aria-hidden="true" /><span class="sr-only">{labels.explain}</span></a>{/if}{:else if feedback === 'wrong'}<IconClose class="w-[1.45rem] h-[1.45rem]" aria-label="Incorrect" />{/if}
      {/if}
    </div>
    {#if tutorialPractice}<p class="flex items-center justify-center gap-[.5rem] mt-[.2rem] text-accent font-['DM_Sans'] text-[.54rem] font-extrabold tracking-[.07em] uppercase"><span>{labels.tutorial}</span><b class="text-base-content text-[.58rem] tracking-[.11em]">{tutorialHint}</b></p>{/if}
    {#if installPrompt && !previewWord}
      <button class="absolute z-[5] bottom-[.25rem] left-1/2 -translate-x-1/2 inline-flex items-center gap-[.42rem] min-h-[1.75rem] py-[.22rem] px-[.62rem] border border-[#172a45] rounded-[.2rem] bg-[#172a45] text-[#fffdf7] shadow-[0_3px_0_rgba(23,42,69,.16)] font-['DM_Sans'] text-left [transition:transform_.16s_cubic-bezier(.23,1,.32,1),background_.16s_ease] active:scale-[.97]" onclick={installApp}>
        <IconDownload class="w-[1rem] h-[1rem] text-primary" aria-hidden="true" />
        <span class="grid gap-[.02rem] leading-none whitespace-nowrap"><strong class="text-[.57rem] font-extrabold tracking-[.07em] uppercase">{labels.install}</strong><small class="text-[rgba(255,253,247,.72)] text-[.5rem] font-bold tracking-[.03em]">{labels.installHint}</small></span>
      </button>
    {/if}
  {/if}
</div>

<div class="relative flex-[0_0_clamp(214px,34svh,270px)] min-h-0 grid place-items-center border-t border-b border-[rgba(23,42,69,.16)] min-[580px]:min-h-[300px] min-[580px]:flex-auto">
  <svg bind:this={circleEl} viewBox="0 0 292 292" class="w-[min(100%,238px)] min-[580px]:w-[292px] [touch-action:none] overflow-visible select-none" role="application" aria-label={labels.hint} onpointerdown={(event) => startSwipe(event)} onpointermove={extendSwipe}>
    <circle cx={CIRCLE} cy={CIRCLE} r={LETTER_RADIUS} class="[fill:none] stroke-[#172a45] [stroke-width:1.1] opacity-[.28] dark:stroke-[#fffdf7]" /><circle cx={CIRCLE} cy={CIRCLE} r="68" class="[fill:none] stroke-[#172a45] [stroke-width:1] opacity-[.12] dark:stroke-[#fffdf7]" /><circle cx={CIRCLE} cy={CIRCLE} r="47" class="[fill:none] stroke-primary [stroke-width:1.8] opacity-90" /><path d="M124 146a22 22 0 1 0 44 0a22 22 0 1 1-44 0Z" class="fill-[#172a45] opacity-[.83] dark:fill-[#fffdf7]" />
    <text x={CIRCLE} y="142" text-anchor="middle" class={`font-['DM_Serif_Display'] text-[13px] tracking-[.08em] fill-[rgba(23,42,69,.52)] dark:fill-[rgba(255,253,247,.55)] ${activeWord.length > 0 ? 'fill-[#c98220] dark:fill-primary' : 'fill-[#a0621d] font-[\'DM_Sans\'] text-[10.8px] font-extrabold tracking-[.08em]'}`}>{coreReadout}</text><text x={CIRCLE} y="161" text-anchor="middle" class="fill-[rgba(23,42,69,.5)] font-['DM_Sans'] text-[5.8px] font-extrabold tracking-[.18em] dark:fill-[rgba(255,253,247,.55)]">{activeWord ? traceCaption : '·'}</text>
    {#if selectedPath.length > 1}<polyline points={pathPoints()} class="[fill:none] stroke-primary [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:10] opacity-90" />{/if}
    {#each circleLetters as letter, index (index)}
      {@const active = selectedPath.includes(index)}
      {@const point = position(index, circleLetters.length, active ? LETTER_BUBBLE_OUTWARD : 0)}
      <g transform={`translate(${point.x} ${point.y})`} class="[cursor:crosshair] transition-transform duration-[220ms] ease-[cubic-bezier(.34,1.56,.64,1)] motion-reduce:transition-none" role="button" tabindex="0" aria-label={`Letter ${letter}`} onpointerdown={(event) => { event.stopPropagation(); startSwipe(event, index); }} onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') chooseLetter(index); }}>
        <circle r="30" class="[transform-box:fill-box] [transform-origin:center] [transition:transform_.18s_cubic-bezier(.34,1.56,.64,1),fill_.18s_ease,stroke_.18s_ease] motion-reduce:transition-none {active ? 'fill-primary stroke-[#c98220] scale-[1.066667] dark:stroke-primary' : 'fill-[#fffdf7] stroke-[#172a45] [stroke-width:2] dark:fill-[#172a45] dark:stroke-[#fffdf7]'}"></circle><text text-anchor="middle" dominant-baseline="central" class="fill-[#172a45] font-['DM_Sans'] text-[20px] font-extrabold pointer-events-none">{letter}</text>
      </g>
    {/each}
  </svg>
</div>
