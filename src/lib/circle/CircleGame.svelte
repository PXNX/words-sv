<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import { settings } from '$lib/state/settings.svelte';
  import { playSuccessSound } from '$lib/sounds';
  import { hintableBaseWords, wordDefinitions, wordPools, type Language } from '$lib/data/vocabulary';
  import {
    buildRound, cellKey, gridFromPlacements, isPlacement, placementCells, randomSeed, roundFromStoredGame, selectedPool,
    type Placement, type Round, type StoredGame
  } from './engine';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconClose from '~icons/material-symbols/cancel-rounded';
  import IconDownload from '~icons/material-symbols/download-rounded';
  import IconHelp from '~icons/material-symbols/help-rounded';

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

  const labels = $derived({
    hint: m.hint({}, { locale: settings.interfaceLocale }),
    allDone: m.all_done({}, { locale: settings.interfaceLocale }),
    time: m.time({}, { locale: settings.interfaceLocale }),
    continue: m.continue({}, { locale: settings.interfaceLocale }),
    explain: m.explain({}, { locale: settings.interfaceLocale }),
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
  function continueRound() {
    if (tutorialPractice) completeTutorial();
    else newRound();
  }
  function position(index: number, total: number) {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    return { x: CIRCLE + LETTER_RADIUS * Math.cos(angle), y: CIRCLE + LETTER_RADIUS * Math.sin(angle) };
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
      const point = position(index, circleLetters.length);
      return `${point.x},${point.y}`;
    }).join(' ');
  }
  function wiktionaryUrl(word: string) {
    const locale = settings.lang === 'de' ? 'de-DE' : 'en-US';
    const normalized = word.toLocaleLowerCase(locale);
    const dictionaryTerm = settings.lang === 'de' ? `${normalized.slice(0, 1).toLocaleUpperCase(locale)}${normalized.slice(1)}` : normalized;
    const host = settings.lang === 'de' ? 'https://de.wiktionary.org/wiki/' : 'https://en.wiktionary.org/wiki/';
    return `${host}${encodeURIComponent(dictionaryTerm)}`;
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

<div class:shake={shakeGrid} class="crossword-frame" aria-label="Crossword">
  <div class="crossword-scroll" aria-label="Scrollable crossword grid">
    <div class="crossword" style={`grid-template-columns: repeat(${grid.maxCol - grid.minCol + 1}, var(--cell-size));`}>
      {#each Array(grid.maxRow - grid.minRow + 1) as _, rowIndex}
        {#each Array(grid.maxCol - grid.minCol + 1) as _, colIndex}
          {@const row = grid.minRow + rowIndex}{@const col = grid.minCol + colIndex}{@const cell = inRange(row, col)}
          {#if cell}<div class:solved={solvedCells.has(cellKey(row, col))} class:hinted={hintedCells.has(cellKey(row, col)) && !solvedCells.has(cellKey(row, col))} class:startAcross={isWordStart(row, col, 'across')} class:endAcross={isWordEnd(row, col, 'across')} class:startDown={isWordStart(row, col, 'down')} class:endDown={isWordEnd(row, col, 'down')} class="crossword-cell" aria-label={solvedCells.has(cellKey(row, col)) ? cell.letter : 'open cell'}>{solvedCells.has(cellKey(row, col)) ? cell.letter : ''}</div>{:else}<div class="crossword-void"></div>{/if}
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
    {#if idleHintReady}<button class="idle-hint-trigger" onclick={showIdleHint}><IconHelp aria-hidden="true" /><span>{labels.idleHint}</span></button>{/if}
    <div class:has-word={previewWord.length > 0} class:correct={feedback === 'correct'} class:wrong={feedback === 'wrong'} class="selected-word">
      {#if hintDefinition}
        <span class="hint-definition">{hintDefinition}</span>
      {:else if previewWord}
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
        <circle r="30"></circle><text text-anchor="middle" dominant-baseline="central">{letter}</text>
      </g>
    {/each}
  </svg>
</div>

<style>
  .crossword-frame { position:relative;min-height:205px;flex:1 1 auto;display:grid;place-items:stretch;margin-top:0;padding:clamp(.35rem,1.6vw,.7rem);background-color:#ede4d5;background-image:linear-gradient(rgba(23,42,69,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(23,42,69,.018) 1px,transparent 1px);background-size:24px 24px;border-top:0;border-bottom:2px solid rgba(23,42,69,.45);transition:transform .16s cubic-bezier(.23,1,.32,1); }.crossword-frame.shake { animation:shake .28s cubic-bezier(.23,1,.32,1); }
  .crossword-scroll { position:relative;z-index:1;min-width:0;min-height:0;overflow:auto;display:grid;place-items:center;padding:clamp(.65rem,3vw,1.25rem);overscroll-behavior:contain;touch-action:pan-x pan-y;border:1px solid rgba(23,42,69,.12);background:linear-gradient(90deg,rgba(255,253,247,.3),rgba(255,253,247,.08) 18%,rgba(255,253,247,.08) 82%,rgba(255,253,247,.3));box-shadow:inset 0 0 0 6px rgba(255,253,247,.15);outline:0;scrollbar-color:rgba(23,42,69,.4) transparent; }
  .crossword { --cell-size:clamp(2.35rem,10.2vw,3.1rem);position:relative;display:grid;width:max-content;min-width:calc(var(--cell-size) * 3); }
  .crossword-cell { aspect-ratio:1;min-width:0;display:grid;place-items:center;border:1px solid #172a45;background:#fffdf7;color:#172a45;font-size:clamp(.7rem,3.4vw,1.1rem);font-weight:800;line-height:1;text-transform:uppercase;transition:background .18s ease,color .18s ease,transform .18s cubic-bezier(.23,1,.32,1); }
  .crossword-cell.startAcross { border-left-width:4px; }.crossword-cell.endAcross { border-right-width:4px; }.crossword-cell.startDown { border-top-width:4px; }.crossword-cell.endDown { border-bottom-width:4px; }
  .crossword-cell.hinted { position:relative;z-index:1;outline:3px solid #e6a527;outline-offset:-4px;background:#fff7dd; }
  .crossword-cell.solved { background:#e6a527;transform:scale(.965);animation:solve-cell .32s cubic-bezier(.23,1,.32,1); }
  .crossword-void { aspect-ratio:1; }
  .frame-corner { position:absolute;z-index:2;width:13px;height:13px;border-color:#e6a527;border-style:solid;pointer-events:none; }.top-left { top:7px;left:7px;border-width:2px 0 0 2px; }.top-right { top:7px;right:7px;border-width:2px 2px 0 0; }.bottom-left { bottom:7px;left:7px;border-width:0 0 2px 2px; }.bottom-right { right:7px;bottom:7px;border-width:0 2px 2px 0; }
  .completion-inline { position:relative;z-index:56;display:flex;align-items:center;justify-content:center;width:100%;height:100%;gap:.6rem;margin:0;color:#34824d;animation:completion-in .24s cubic-bezier(.23,1,.32,1) both; }
  .completion-symbol { display:grid;place-items:center;width:1.8rem;height:1.8rem;flex:none;border:2px solid currentColor;border-radius:50%;font-family:'DM Sans',sans-serif;font-size:1.25rem;font-weight:800;line-height:1; }
  .completion-result { display:grid;gap:.08rem;justify-items:start;text-align:left; }.completion-result strong { color:#34824d;font-family:'DM Serif Display',serif;font-size:1.05rem;font-weight:400;letter-spacing:-.02em;line-height:1; }.completion-result small { color:#172a45;font-family:'DM Sans',sans-serif;font-size:.55rem;font-weight:800;letter-spacing:.06em;line-height:1.2;text-transform:uppercase; }.completion-result b { color:#34824d;font-family:'DM Serif Display',serif;font-size:.88rem;letter-spacing:0; }
  .completion-continue { min-height:1.85rem;padding:0 .8rem;border:1px solid #34824d;border-radius:999px;background:#34824d;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;transition:transform .16s cubic-bezier(.23,1,.32,1),background .16s ease; }.completion-continue:active { transform:scale(.96); }
  .selection-area { position:relative;z-index:1;flex:0 0 auto;min-height:70px;padding:.75rem 0 .35rem;text-align:center;background:linear-gradient(90deg,transparent,rgba(23,42,69,.025) 22%,rgba(23,42,69,.025) 78%,transparent); }.selection-area.install-ready { min-height:96px; }.selection-area.completion-area { z-index:55;display:flex;align-items:center;justify-content:center;height:70px;min-height:70px;padding:0;background:transparent; }
  @media (max-width:579px) { .selection-area { min-height:54px;padding:.45rem 0 .1rem; }.selection-area.install-ready { min-height:70px; }.selection-area.completion-area { height:54px;min-height:54px; } }
  .idle-hint-trigger { position:absolute;z-index:70;top:.48rem;left:0;display:inline-flex;align-items:center;gap:.3rem;min-height:1.85rem;padding:0 .55rem;border:1px solid rgba(164,94,56,.58);border-radius:999px;background:#fffdf7;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.56rem;font-weight:800;letter-spacing:.07em;opacity:0;transform:translateY(4px);animation:hint-fade-in .28s cubic-bezier(.23,1,.32,1) forwards;text-transform:uppercase; }.idle-hint-trigger :global(svg) { width:.9rem;height:.9rem; }.idle-hint-trigger:active { transform:translateY(4px) scale(.96); }
  .selected-word { min-height:2.1rem;display:inline-flex;align-items:center;justify-content:center;gap:.48rem;color:rgba(23,42,69,.35);font-family:'DM Serif Display',serif;font-size:clamp(1.35rem,5vw,1.75rem);letter-spacing:.16em;line-height:1; }.selected-word :global(svg) { width:1.45rem;height:1.45rem;letter-spacing:0; }.selected-word.has-word { color:#172a45; }.selected-word.correct { color:#3f7a50; }.selected-word.wrong { color:#b54442; }
  .hint-definition { max-width:min(32rem,74vw);color:#a45e38;font-family:'DM Sans',sans-serif;font-size:clamp(.63rem,2.5vw,.78rem);font-weight:700;letter-spacing:.01em;line-height:1.35;text-align:center; }
  .tutorial-practice-status { display:flex;align-items:center;justify-content:center;gap:.5rem;margin:.2rem 0 0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.54rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase; }.tutorial-practice-status b { color:#172a45;font-size:.58rem;letter-spacing:.11em; }
  .wiktionary-link { display:grid;place-items:center;width:1.25rem;height:1.25rem;border:1px solid #8b949c;border-radius:50%;background:#edf0ef;color:#69727a;letter-spacing:0;transition:transform .16s cubic-bezier(.23,1,.32,1),background .16s ease,color .16s ease; }.wiktionary-link:hover,.wiktionary-link:focus-visible { background:#c9d0cf;color:#3f484e;outline:0; }.wiktionary-link:active { transform:scale(.94); }.selected-word .wiktionary-link :global(svg) { width:.85rem;height:.85rem;animation:none; }
  .install-prompt { position:absolute;z-index:5;bottom:.25rem;left:50%;display:inline-flex;align-items:center;gap:.42rem;min-height:1.75rem;padding:.22rem .62rem;border:1px solid #172a45;border-radius:.2rem;background:#172a45;color:#fffdf7;box-shadow:0 3px 0 rgba(23,42,69,.16);font-family:'DM Sans',sans-serif;text-align:left;transform:translateX(-50%);transition:transform .16s cubic-bezier(.23,1,.32,1),background .16s ease; }.install-prompt:active { transform:translateX(-50%) scale(.97); }.install-prompt :global(svg) { width:1rem;height:1rem;color:#e6a527; }.install-prompt span { display:grid;gap:.02rem;line-height:1;white-space:nowrap; }.install-prompt strong { font-size:.57rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase; }.install-prompt small { color:rgba(255,253,247,.72);font-size:.5rem;font-weight:700;letter-spacing:.03em; }
  .wheel-stage { position:relative;flex:0 0 clamp(214px,34svh,270px);min-height:0;display:grid;place-items:center;border-top:1px solid rgba(23,42,69,.16);border-bottom:1px solid rgba(23,42,69,.16); }
  .letter-wheel { width:min(100%,238px);touch-action:none;overflow:visible;user-select:none; }.outer-ring,.inner-ring,.core-ring { fill:none; }.outer-ring { stroke:#172a45;stroke-width:1.1;stroke-dasharray:none;opacity:.28; }.inner-ring { stroke:#172a45;stroke-width:1;opacity:.12; }.core-ring { stroke:#e6a527;stroke-width:1.8;opacity:.9; }.core-mark { fill:#172a45;opacity:.83; }
  .core-word { fill:rgba(23,42,69,.52);font-family:'DM Serif Display',serif;font-size:13px;letter-spacing:.08em; }.core-word.active-core { fill:#c98220; }.core-word.idle-core { fill:#a0621d;font-family:'DM Sans',sans-serif;font-size:10.8px;font-weight:800;letter-spacing:.08em; }.core-caption { fill:rgba(23,42,69,.5);font-family:'DM Sans',sans-serif;font-size:5.8px;font-weight:800;letter-spacing:.18em; }
  .selection-line { fill:none;stroke:#e6a527;stroke-linecap:round;stroke-linejoin:round;stroke-width:10;opacity:.9; }
  .letter-node { cursor:crosshair; }.letter-node>circle { fill:#fffdf7;stroke:#172a45;stroke-width:2;transform-box:fill-box;transform-origin:center; }.letter-node text { fill:#172a45;font-family:'DM Sans',sans-serif;font-size:20px;font-weight:800;pointer-events:none; }.letter-node.active>circle { fill:#e6a527;stroke:#c98220;transform:scale(1.066667); }.letter-node.active text { fill:#172a45; }
  @keyframes shake { 25% { transform: translateX(-7px); } 55% { transform: translateX(6px); } 80% { transform: translateX(-3px); } }
  @keyframes solve-cell { 0% { transform: scale(.84); } 70% { transform: scale(1.05); } 100% { transform: scale(.965); } }
  @keyframes completion-in { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
  @keyframes hint-fade-in { to { opacity:1;transform:translateY(0); } }
  :global(html.dark) .crossword-frame { background-color:#213a5d;border-color:#e6a527; }:global(html.dark) .crossword-cell { background:#fffdf7; }:global(html.dark) .outer-ring { stroke:#fffdf7; }:global(html.dark) .inner-ring { stroke:#fffdf7; }:global(html.dark) .core-mark { fill:#fffdf7; }:global(html.dark) .core-word,:global(html.dark) .core-caption { fill:rgba(255,253,247,.55); }:global(html.dark) .core-word.active-core { fill:#e6a527; }:global(html.dark) .letter-node>circle { fill:#172a45;stroke:#fffdf7; }:global(html.dark) .letter-node.active>circle { fill:#e6a527;stroke:#e6a527; }:global(html.dark) .letter-node.active text { fill:#172a45; }
  :global(html.dark) .selected-word.has-word { color:#fffdf7; }:global(html.dark) .completion-result small { color:rgba(255,253,247,.74); }
  :global(html.dark) .wiktionary-link { border-color:#84909b;background:#2b3d57;color:#d8dde1; }
  @media (min-width:580px) { .crossword-frame { min-height:260px; }.wheel-stage { min-height:300px;flex-basis:auto; }.letter-wheel { width:292px; } }
  @media (prefers-reduced-motion:reduce) { .letter-node:not(.active),.crossword-cell.solved,.completion-inline { animation:none; } }
</style>
