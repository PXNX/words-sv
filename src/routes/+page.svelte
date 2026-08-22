<script lang="ts">
  /* Papier & Tinte: a compact, tactile editorial puzzle surface where the grid and letter wheel are the primary instruments. */
  import '../app.css';
  import wordsDeJson from '$lib/data/words.de.json';
  import wordsEnJson from '$lib/data/words.en.json';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconClose from '~icons/material-symbols/cancel-rounded';
  import IconDark from '~icons/material-symbols/dark-mode-rounded';
  import IconLight from '~icons/material-symbols/light-mode-rounded';
  import IconSettings from '~icons/material-symbols/settings-rounded';
  import IconSpark from '~icons/material-symbols/auto-awesome-rounded';
  import IconVibrate from '~icons/material-symbols/vibration-rounded';

  type Language = 'de' | 'en';
  type Theme = 'light' | 'dark';
  type Orientation = 'across' | 'down';
  type Placement = { word: string; row: number; col: number; orientation: Orientation };
  type BoardCell = { letter: string; words: string[] };
  type Grid = { cells: Map<string, BoardCell>; placements: Placement[]; minRow: number; maxRow: number; minCol: number; maxCol: number };
  type Round = { words: string[]; letters: string[]; grid: Grid };
  type StoredGame = { version: 1; language: Language; roundNumber: number; words: string[]; letters: string[]; placements: Placement[]; solvedWords: string[] };

  const wordPools: Record<Language, string[]> = { de: wordsDeJson as string[], en: wordsEnJson as string[] };
  const GAME_STORAGE_KEY = 'wordcircle-active-round-v1';
  const copy = {
    de: { label: 'Wortkreis', hint: 'Zieh die Spur, Wort für Wort.', allDone: 'Rätsel gelöst', language: 'Sprache', appearance: 'Darstellung', light: 'Hell', dark: 'Dunkel', settings: 'Einstellungen', vibration: 'Vibration', settingsHint: 'Dein Wortspiel, deine Stimmung.', round: 'Runde' },
    en: { label: 'WordCircle', hint: 'Trace the letters, one word at a time.', allDone: 'Puzzle solved', language: 'Language', appearance: 'Appearance', light: 'Light', dark: 'Dark', settings: 'Settings', vibration: 'Vibration', settingsHint: 'Your word game, your mood.', round: 'Round' }
  } as const;
  const confettiPieces = Array.from({ length: 36 }, (_item, index) => index);

  const initialTheme: Theme = typeof localStorage !== 'undefined' && localStorage.getItem('wordcircle-theme') === 'dark' ? 'dark' : 'light';
  const initialVibration = typeof localStorage === 'undefined' || localStorage.getItem('wordcircle-vibration') !== 'off';
  const initialGame = readStoredGame();
  const CIRCLE = 146;
  const LETTER_RADIUS = 109;

  let lang = $state<Language>(initialGame?.language ?? 'de');
  let theme = $state<Theme>(initialTheme);
  let vibration = $state(initialVibration);
  let settingsOpen = $state(false);
  let roundNumber = $state(initialGame?.roundNumber ?? 1);
  let currentRound = $state<Round>(initialGame ? roundFromStoredGame(initialGame) : buildRound(wordPools.de, 483719));
  let selectedPath = $state<number[]>([]);
  let solvedWords = $state<string[]>(initialGame?.solvedWords ?? []);
  let feedback = $state<'correct' | 'wrong' | null>(null);
  let feedbackWord = $state('');
  let shakeGrid = $state(false);
  let isDragging = $state(false);
  let circleEl = $state<SVGSVGElement>();
  let celebration = $state(false);
  let pulseIndex = $state(-1);

  const labels = $derived(copy[lang]);
  const circleLetters = $derived(currentRound.letters);
  const grid = $derived(currentRound.grid);
  const solvedSet = $derived(new Set(solvedWords));
  const activeWord = $derived(selectedPath.map((index) => circleLetters[index]).join(''));
  const previewWord = $derived(activeWord || feedbackWord);
  const allSolved = $derived(solvedWords.length === currentRound.words.length);
  const solvedCells = $derived.by(() => {
    const keys = new Set<string>();
    grid.placements.filter((entry) => solvedSet.has(entry.word)).forEach((entry) => {
      entry.word.split('').forEach((_letter, index) => keys.add(cellKey(entry.row + (entry.orientation === 'down' ? index : 0), entry.col + (entry.orientation === 'across' ? index : 0))));
    });
    return keys;
  });

  $effect(() => { document.documentElement.dataset.theme = theme; document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('wordcircle-theme', theme); });
  $effect(() => { localStorage.setItem('wordcircle-vibration', vibration ? 'on' : 'off'); });
  $effect(() => {
    const snapshot: StoredGame = { version: 1, language: lang, roundNumber, words: currentRound.words, letters: currentRound.letters, placements: currentRound.grid.placements, solvedWords };
    try { localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* Storage is optional; the game remains playable without it. */ }
  });

  function cellKey(row: number, col: number) { return `${row}:${col}`; }
  function coordinate(key: string) { const [row, col] = key.split(':').map(Number); return { row, col }; }
  function makeRng(seed: number) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
  function shuffle<T>(values: T[], rng: () => number) { const result = [...values]; for (let index = result.length - 1; index > 0; index -= 1) { const swap = Math.floor(rng() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]; } return result; }
  function inventory(word: string) { return [...word].reduce<Record<string, number>>((counts, letter) => ({ ...counts, [letter]: (counts[letter] ?? 0) + 1 }), {}); }
  function canSpell(word: string, letters: string[]) { const available = inventory(letters.join('')); return Object.entries(inventory(word)).every(([letter, count]) => (available[letter] ?? 0) >= count); }
  function emptyGrid() { return { cells: new Map<string, BoardCell>(), placements: [], minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 } as Grid; }
  function gridFromPlacements(placements: Placement[]) { const grid = emptyGrid(); placements.forEach((placement) => writePlacement(grid, placement)); return grid; }
  function isPlacement(value: unknown): value is Placement {
    if (!value || typeof value !== 'object') return false;
    const entry = value as Partial<Placement>;
    return typeof entry.word === 'string' && Number.isInteger(entry.row) && Number.isInteger(entry.col) && (entry.orientation === 'across' || entry.orientation === 'down');
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
      if (game.version !== 1 || !validLanguage || !Number.isInteger(roundNumber) || (roundNumber ?? 0) < 1 || !validWords || !validLetters || !validPlacements || !validSolvedWords) return null;
      return { version: 1, language: language as Language, roundNumber: roundNumber as number, words: words as string[], letters: letters as string[], placements: placements as Placement[], solvedWords: [...new Set(solvedWords as string[])] };
    } catch { return null; }
  }
  function roundFromStoredGame(game: StoredGame): Round { return { words: game.words, letters: game.letters, grid: gridFromPlacements(game.placements) }; }
  function refreshBounds(grid: Grid) { const coordinates = [...grid.cells.keys()].map(coordinate); grid.minRow = Math.min(...coordinates.map((point) => point.row)); grid.maxRow = Math.max(...coordinates.map((point) => point.row)); grid.minCol = Math.min(...coordinates.map((point) => point.col)); grid.maxCol = Math.max(...coordinates.map((point) => point.col)); }
  function writePlacement(grid: Grid, entry: Placement) {
    grid.placements.push(entry);
    entry.word.split('').forEach((letter, index) => {
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
        if (existing.letter !== entry.word[point.index] || key !== cellKey(crossing.row, crossing.col) || existing.words.length !== 1) return false;
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
  function findPlacement(grid: Grid, word: string, rng: () => number) {
    const openCells = shuffle([...grid.cells.entries()].filter(([, cell]) => cell.words.length === 1), rng);
    for (const [key, cell] of openCells) {
      const crossing = coordinate(key);
      const crossedWord = cell.words[0];
      const crossedPlacement = grid.placements.find((entry) => entry.word === crossedWord);
      if (!crossedPlacement) continue;
      const orientation: Orientation = crossedPlacement.orientation === 'across' ? 'down' : 'across';
      for (const wordIndex of shuffle(word.split('').map((_letter, index) => index).filter((index) => word[index] === cell.letter), rng)) {
        const entry: Placement = { word, orientation, row: orientation === 'down' ? crossing.row - wordIndex : crossing.row, col: orientation === 'across' ? crossing.col - wordIndex : crossing.col };
        if (canPlace(grid, entry, crossing)) return entry;
      }
    }
    return null;
  }
  function buildRound(pool: string[], seed: number): Round {
    const rng = makeRng(seed);
    const normalized = [...new Set(pool.map((word) => word.trim().toUpperCase()).filter((word) => /^[A-ZÄÖÜ]+$/.test(word) && word.length >= 3 && word.length <= 8))];
    const bases = shuffle(normalized.filter((word) => word.length >= 5 && word.length <= 8 && normalized.filter((candidate) => candidate !== word && canSpell(candidate, [...word])).length >= 5), rng);
    for (const base of bases) {
      const grid = emptyGrid();
      writePlacement(grid, { word: base, row: 0, col: 0, orientation: 'across' });
      const selected = [base];
      const target = 6 + Math.floor(rng() * 3);
      const candidates = shuffle(normalized.filter((word) => word !== base && word.length >= 3 && canSpell(word, [...base])), rng);
      while (selected.length < target) {
        const candidate = candidates.find((word) => !selected.includes(word) && findPlacement(grid, word, rng));
        if (!candidate) break;
        const entry = findPlacement(grid, candidate, rng);
        if (!entry) break;
        writePlacement(grid, entry);
        selected.push(candidate);
      }
      if (selected.length >= 6) return { words: selected, letters: [...base], grid };
    }
    const fallback = normalized.find((word) => word.length >= 5) ?? 'WORT';
    const grid = emptyGrid();
    writePlacement(grid, { word: fallback, row: 0, col: 0, orientation: 'across' });
    return { words: [fallback], letters: [...fallback], grid };
  }
  function buzz(pattern: number | number[]) { if (vibration && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern); }
  function newRound(nextLanguage = lang, resetCount = false) {
    lang = nextLanguage;
    if (resetCount) roundNumber = 0;
    currentRound = buildRound(wordPools[nextLanguage], Math.floor(Math.random() * 2147483647));
    roundNumber += 1;
    selectedPath = [];
    solvedWords = [];
    feedback = null;
    feedbackWord = '';
    shakeGrid = false;
    celebration = false;
  }
  function selectLanguage(nextLanguage: Language) { newRound(nextLanguage, true); settingsOpen = false; }
  function position(index: number, total: number) { const angle = (index / total) * Math.PI * 2 - Math.PI / 2; return { x: CIRCLE + LETTER_RADIUS * Math.cos(angle), y: CIRCLE + LETTER_RADIUS * Math.sin(angle) }; }
  function pointFromEvent(event: PointerEvent) { const rect = circleEl?.getBoundingClientRect(); if (!rect) return null; return { x: ((event.clientX - rect.left) / rect.width) * 292, y: ((event.clientY - rect.top) / rect.height) * 292 }; }
  function nearestLetter(point: { x: number; y: number }) { let closest = -1; let distance = Infinity; circleLetters.forEach((_letter, index) => { const letter = position(index, circleLetters.length); const nextDistance = Math.hypot(point.x - letter.x, point.y - letter.y); if (nextDistance < distance) { distance = nextDistance; closest = index; } }); return distance < 36 ? closest : -1; }
  function chooseLetter(index: number) { if (selectedPath.includes(index)) return; feedback = null; feedbackWord = ''; selectedPath = [...selectedPath, index]; pulseIndex = index; buzz(7); window.setTimeout(() => (pulseIndex = -1), 180); }
  function startSwipe(event: PointerEvent, knownIndex = -1) { event.preventDefault(); (event.currentTarget as Element).setPointerCapture?.(event.pointerId); isDragging = true; selectedPath = []; feedback = null; feedbackWord = ''; const point = pointFromEvent(event); const index = knownIndex >= 0 ? knownIndex : point ? nearestLetter(point) : -1; if (index >= 0) chooseLetter(index); }
  function extendSwipe(event: PointerEvent) { if (!isDragging) return; const point = pointFromEvent(event); if (!point) return; const index = nearestLetter(point); if (index >= 0 && index !== selectedPath.at(-1)) chooseLetter(index); }
  function endSwipe() { if (!isDragging) return; isDragging = false; if (selectedPath.length >= 2) submitWord(); else selectedPath = []; }
  function submitWord() {
    const word = activeWord;
    feedbackWord = word;
    if (currentRound.words.includes(word) && !solvedSet.has(word)) {
      const completed = solvedWords.length + 1 === currentRound.words.length;
      solvedWords = [...solvedWords, word]; feedback = 'correct'; buzz(completed ? [24, 28, 40, 28, 70] : [16, 20, 26]);
      if (completed) { celebration = true; window.setTimeout(() => newRound(), 2500); }
    } else { feedback = 'wrong'; shakeGrid = true; buzz([18, 18, 18]); window.setTimeout(() => (shakeGrid = false), 280); }
    selectedPath = [];
  }
  function pathPoints() { return selectedPath.map((index) => { const point = position(index, circleLetters.length); return `${point.x},${point.y}`; }).join(' '); }
  function inRange(row: number, col: number) { return grid.cells.get(cellKey(row, col)); }
  function isWordStart(row: number, col: number, orientation: Orientation) { return grid.placements.some((entry) => entry.orientation === orientation && entry.row === row && entry.col === col); }
  function isWordEnd(row: number, col: number, orientation: Orientation) { return grid.placements.some((entry) => entry.orientation === orientation && row === entry.row + (orientation === 'down' ? entry.word.length - 1 : 0) && col === entry.col + (orientation === 'across' ? entry.word.length - 1 : 0)); }
  function confettiStyle(index: number) { return `--x:${((index * 73) % 240) - 120}px;--y:${-160 - ((index * 41) % 170)}px;--r:${(index * 47) % 330}deg;--delay:${(index % 7) * 18}ms;`; }
</script>

<svelte:head><title>{labels.label} · WordCircle</title></svelte:head>
<svelte:window onpointerup={endSwipe} onpointercancel={endSwipe} />

<main class:celebrating={celebration} class="game-shell">
  {#if celebration}<div class="confetti-field" aria-hidden="true">{#each confettiPieces as piece (piece)}<i class="confetti-piece" style={confettiStyle(piece)}></i>{/each}</div>{/if}
  <section class="game-paper" aria-label={labels.label}>
    <header class="masthead">
      <button class="brand" onclick={() => newRound()} aria-label={`${labels.label} – neue Runde`}><span class="brand-mark" aria-hidden="true"><i></i><b></b></span><span>WordCircle</span></button>
      <div class="top-actions"><span class="puzzle-count">{labels.round} {roundNumber}</span><button class:open={settingsOpen} class="settings-trigger" aria-expanded={settingsOpen} aria-controls="game-settings" onclick={() => (settingsOpen = !settingsOpen)}><IconSettings /><span class="sr-only">{labels.settings}</span></button></div>
    </header>

    {#if settingsOpen}
      <aside id="game-settings" class="settings-panel" aria-label={labels.settings}>
        <div class="settings-intro"><IconSpark /><p>{labels.settingsHint}</p></div>
        <div class="setting-row"><span>{labels.language}</span><div class="segmented"><button class:chosen={lang === 'de'} onclick={() => selectLanguage('de')}>DE</button><button class:chosen={lang === 'en'} onclick={() => selectLanguage('en')}>EN</button></div></div>
        <div class="setting-row"><span>{labels.appearance}</span><div class="segmented"><button class:chosen={theme === 'light'} onclick={() => (theme = 'light')}><IconLight />{labels.light}</button><button class:chosen={theme === 'dark'} onclick={() => (theme = 'dark')}><IconDark />{labels.dark}</button></div></div>
        <div class="setting-row vibration-row"><span><IconVibrate />{labels.vibration}</span><input aria-label={labels.vibration} type="checkbox" class="toggle toggle-sm" bind:checked={vibration} /></div>
      </aside>
    {/if}

    <div class:shake={shakeGrid} class="crossword-frame" aria-label="Crossword">
      <div class="crossword" style={`grid-template-columns: repeat(${grid.maxCol - grid.minCol + 1}, 1fr);`}>
        {#each Array(grid.maxRow - grid.minRow + 1) as _, rowIndex}
          {#each Array(grid.maxCol - grid.minCol + 1) as _, colIndex}
            {@const row = grid.minRow + rowIndex}{@const col = grid.minCol + colIndex}{@const cell = inRange(row, col)}
            {#if cell}<div class:solved={solvedCells.has(cellKey(row, col))} class:startAcross={isWordStart(row, col, 'across')} class:endAcross={isWordEnd(row, col, 'across')} class:startDown={isWordStart(row, col, 'down')} class:endDown={isWordEnd(row, col, 'down')} class="crossword-cell" aria-label={solvedCells.has(cellKey(row, col)) ? cell.letter : 'open cell'}>{solvedCells.has(cellKey(row, col)) ? cell.letter : ''}</div>{:else}<div class="crossword-void"></div>{/if}
          {/each}
        {/each}
      </div>
      {#if celebration}<div class="completion-mark" aria-live="assertive"><IconCheck /><span>{labels.allDone}</span></div>{/if}
      <div class="frame-corner top-left"></div><div class="frame-corner top-right"></div><div class="frame-corner bottom-left"></div><div class="frame-corner bottom-right"></div>
    </div>

    <div class="selection-area" aria-live="polite"><div class:has-word={previewWord.length > 0} class:correct={feedback === 'correct'} class:wrong={feedback === 'wrong'} class="selected-word"><span>{previewWord || '—'}</span>{#if feedback === 'correct'}<IconCheck aria-label="Correct" />{:else if feedback === 'wrong'}<IconClose aria-label="Incorrect" />{/if}</div></div>

    <div class="wheel-stage">
      <svg bind:this={circleEl} viewBox="0 0 292 292" class="letter-wheel" role="application" aria-label={labels.hint} onpointerdown={(event) => startSwipe(event)} onpointermove={extendSwipe}>
        <circle cx={CIRCLE} cy={CIRCLE} r={LETTER_RADIUS} class="outer-ring" /><circle cx={CIRCLE} cy={CIRCLE} r="68" class="inner-ring" /><circle cx={CIRCLE} cy={CIRCLE} r="47" class="core-ring" /><path d="M124 146a22 22 0 1 0 44 0a22 22 0 1 1-44 0Z" class="core-mark" />
        <text x={CIRCLE} y="142" text-anchor="middle" class:active-core={activeWord.length > 0} class="core-word">{activeWord || '·'}</text><text x={CIRCLE} y="161" text-anchor="middle" class="core-caption">{activeWord ? 'TRACE' : 'DRAW'}</text>
        {#if selectedPath.length > 1}<polyline points={pathPoints()} class="selection-line" />{/if}
        {#each circleLetters as letter, index (index)}
          {@const point = position(index, circleLetters.length)}
          <g transform={`translate(${point.x} ${point.y})`} class:active={selectedPath.includes(index)} class:pulse={pulseIndex === index} class="letter-node" role="button" tabindex="0" aria-label={`Letter ${letter}`} onpointerdown={(event) => { event.stopPropagation(); startSwipe(event, index); }} onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') chooseLetter(index); }}>
            <circle r="31" class="bubble-ripple"></circle><circle r="28"></circle><circle r="22" class="bubble-shine"></circle><text text-anchor="middle" dominant-baseline="central">{letter}</text>
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
  .masthead { display:flex;align-items:center;justify-content:space-between;padding-bottom:.62rem;border-bottom:1px solid rgba(23,42,69,.16); }
  .brand { display:inline-flex;gap:.55rem;align-items:center;padding:0;border:0;background:transparent;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.25rem,4vw,1.5rem);letter-spacing:-.035em; }.brand-mark { position:relative;width:28px;height:28px;display:block; }.brand-mark i,.brand-mark b { position:absolute;display:block;width:18px;height:18px;border:2px solid #172a45;border-radius:50%; }.brand-mark i { top:1px;left:1px; }.brand-mark b { right:1px;bottom:1px;border-color:#e6a527; }
  .top-actions { display:flex;align-items:center;gap:.65rem; }.puzzle-count { color:#172a45;font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase; }.settings-trigger { display:grid;place-items:center;width:2.15rem;height:2.15rem;border:1px solid rgba(23,42,69,.24);border-radius:50%;background:transparent;color:#172a45;transition:transform .18s cubic-bezier(.23,1,.32,1),background .18s ease; }.settings-trigger :global(svg) { width:1.1rem;height:1.1rem; }.settings-trigger.open { background:#172a45;color:#fffdf7;transform:rotate(45deg); }
  .settings-panel { margin-top:.65rem;padding:.85rem 1rem;border:1px solid rgba(23,42,69,.18);background:rgba(237,228,213,.68);animation:drop-in .2s cubic-bezier(.23,1,.32,1); }.settings-intro { display:flex;align-items:center;gap:.45rem;color:#a45e38; }.settings-intro :global(svg) { width:1rem;height:1rem; }.settings-intro p { margin:0;font-family:'DM Serif Display',serif;font-size:.94rem; }.setting-row { display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:.72rem;margin-top:.72rem;border-top:1px solid rgba(23,42,69,.14);color:#172a45;font-size:.67rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase; }.segmented { display:flex;padding:2px;border:1px solid rgba(23,42,69,.22);border-radius:99px; }.segmented button { min-height:1.65rem;padding:0 .55rem;display:inline-flex;align-items:center;gap:.25rem;border:0;border-radius:99px;background:transparent;color:rgba(23,42,69,.62);font-size:.62rem;font-weight:800; }.segmented button :global(svg) { width:.78rem;height:.78rem; }.segmented button.chosen { background:#172a45;color:#fffdf7; }.vibration-row>span { display:inline-flex;align-items:center;gap:.35rem; }.vibration-row :global(svg) { width:.9rem;height:.9rem; }
  .crossword-frame { position:relative;min-height:205px;display:grid;place-items:center;margin-top:.55rem;padding:clamp(.5rem,3vw,1rem);background-color:#ede4d5;background-image:linear-gradient(rgba(23,42,69,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(23,42,69,.035) 1px,transparent 1px);background-size:20px 20px;border-top:3px double #172a45;border-bottom:2px solid rgba(23,42,69,.45);transition:transform .16s cubic-bezier(.23,1,.32,1); }.crossword-frame::before,.crossword-frame::after { content:'';position:absolute;z-index:0;width:2.6rem;height:1px;background:#172a45;opacity:.42; }.crossword-frame::before { top:14px;left:50%;transform:translateX(-50%); }.crossword-frame::after { bottom:14px;left:50%;transform:translateX(-50%); }.crossword-frame.shake { animation:shake .28s cubic-bezier(.23,1,.32,1); }.crossword { position:relative;z-index:1;display:grid;width:min(86vw,440px);filter:drop-shadow(6px 7px 0 rgba(23,42,69,.09)); }.crossword-cell { aspect-ratio:1;min-width:0;display:grid;place-items:center;border:1.35px solid #172a45;background:#fffdf7;color:#172a45;font-size:clamp(.7rem,3.4vw,1.1rem);font-weight:800;line-height:1;text-transform:uppercase;transition:background .18s ease,color .18s ease,transform .18s cubic-bezier(.23,1,.32,1); }.crossword-cell.startAcross { border-left-width:4px; }.crossword-cell.endAcross { border-right-width:4px; }.crossword-cell.startDown { border-top-width:4px; }.crossword-cell.endDown { border-bottom-width:4px; }.crossword-cell.solved { background:#e6a527;transform:scale(.965);animation:solve-cell .32s cubic-bezier(.23,1,.32,1); }.crossword-void { aspect-ratio:1; }.frame-corner { position:absolute;width:13px;height:13px;border-color:#e6a527;border-style:solid; }.top-left { top:7px;left:7px;border-width:2px 0 0 2px; }.top-right { top:7px;right:7px;border-width:2px 2px 0 0; }.bottom-left { bottom:7px;left:7px;border-width:0 0 2px 2px; }.bottom-right { right:7px;bottom:7px;border-width:0 2px 2px 0; }
  .completion-mark { position:absolute;z-index:4;inset:0;display:grid;place-content:center;justify-items:center;gap:.4rem;background:rgba(255,253,247,.72);color:#34824d;backdrop-filter:blur(2px);animation:completion-in .32s cubic-bezier(.23,1,.32,1) both; }.completion-mark :global(svg) { width:clamp(5rem,22vw,7.5rem);height:clamp(5rem,22vw,7.5rem);filter:drop-shadow(0 5px 0 rgba(46,109,63,.18)); }.completion-mark span { font-family:'DM Serif Display',serif;font-size:clamp(1.1rem,5vw,1.6rem);letter-spacing:-.02em; }
  .selection-area { min-height:48px;padding:.55rem 0 .2rem;text-align:center; }.selected-word { min-height:1.7rem;display:inline-flex;align-items:center;justify-content:center;gap:.48rem;color:rgba(23,42,69,.35);font-family:'DM Serif Display',serif;font-size:clamp(1.35rem,5vw,1.75rem);letter-spacing:.16em;line-height:1; }.selected-word :global(svg) { width:1.45rem;height:1.45rem;letter-spacing:0; }.selected-word.has-word { color:#172a45;animation:word-rise .18s cubic-bezier(.23,1,.32,1); }.selected-word.correct { color:#3f7a50; }.selected-word.wrong { color:#b54442; }.selected-word.correct :global(svg),.selected-word.wrong :global(svg) { animation:feedback-pop .24s cubic-bezier(.23,1,.32,1); }
  .wheel-stage { position:relative;min-height:235px;display:grid;place-items:center;border-top:1px solid rgba(23,42,69,.16);border-bottom:1px solid rgba(23,42,69,.16); }.letter-wheel { width:min(100%,248px);touch-action:none;overflow:visible;user-select:none; }.outer-ring,.inner-ring,.core-ring { fill:none; }.outer-ring { stroke:#172a45;stroke-width:1.7;stroke-dasharray:2 5;opacity:.63; }.inner-ring { stroke:#172a45;stroke-width:2.5;opacity:.19; }.core-ring { stroke:#e6a527;stroke-width:1.6;opacity:.9; }.core-mark { fill:#172a45;opacity:.83; }.core-word { fill:rgba(23,42,69,.42);font-family:'DM Serif Display',serif;font-size:12px;letter-spacing:.08em; }.core-word.active-core { fill:#c98220; }.core-caption { fill:rgba(23,42,69,.38);font-family:'DM Sans',sans-serif;font-size:5.6px;font-weight:800;letter-spacing:.16em; }.selection-line { fill:none;stroke:#e6a527;stroke-linecap:round;stroke-linejoin:round;stroke-width:10;opacity:.9; }.letter-node { cursor:crosshair; }.letter-node>circle:nth-child(2) { fill:#fffdf7;stroke:#172a45;stroke-width:2;filter:drop-shadow(0 3px 0 rgba(23,42,69,.16));transition:fill .14s ease,transform .14s cubic-bezier(.23,1,.32,1),filter .14s ease;transform-box:fill-box;transform-origin:center; }.bubble-shine { fill:rgba(255,255,255,.72);stroke:none;transform:translate(-4px,-5px) scale(.34);transform-origin:center;pointer-events:none; }.letter-node text { fill:#172a45;font-family:'DM Sans',sans-serif;font-size:20px;font-weight:800;pointer-events:none; }.letter-node.active>circle:nth-child(2) { fill:#e6a527;transform:scale(1.12);filter:drop-shadow(0 5px 0 rgba(151,94,16,.2));animation:selected-bubble .42s cubic-bezier(.23,1,.32,1) both; }.letter-node.pulse .bubble-ripple { animation:bubble-ripple .48s cubic-bezier(.23,1,.32,1) both; }.letter-node:not(.active) { animation:bubble-drift 3.2s ease-in-out infinite; }.bubble-ripple { fill:none;stroke:#e6a527;stroke-width:2;opacity:0;pointer-events:none;transform-box:fill-box;transform-origin:center; }
  .confetti-field { position:fixed;z-index:20;inset:0;pointer-events:none;overflow:hidden; }.confetti-piece { position:absolute;left:50%;top:48%;width:8px;height:13px;background:#e6a527;border-radius:2px;animation:confetti 1.7s var(--delay) cubic-bezier(.13,.79,.31,1) forwards; }.confetti-piece:nth-child(3n) { background:#c96e4d; }.confetti-piece:nth-child(4n) { background:#172a45; }.confetti-piece:nth-child(5n) { width:6px;height:6px;border-radius:50%; }
  @keyframes drop-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes shake { 25% { transform: translateX(-7px); } 55% { transform: translateX(6px); } 80% { transform: translateX(-3px); } }
  @keyframes solve-cell { 0% { transform: scale(.84); } 70% { transform: scale(1.05); } 100% { transform: scale(.965); } }
  @keyframes bubble-drift { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
  @keyframes selected-bubble { 0% { transform: scale(.86); } 58% { transform: scale(1.2); } 100% { transform: scale(1.12); } }
  @keyframes bubble-ripple { 0% { opacity: .8; transform: scale(.72); } 100% { opacity: 0; transform: scale(1.45); } }
  @keyframes feedback-pop { 0% { opacity: .1; transform: scale(.72); } 75% { transform: scale(1.16); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes word-rise { from { opacity: .2; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes completion-in { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
  @keyframes confetti {
    0% { opacity: 0; transform: translate(-50%, -50%) rotate(0deg); }
    12% { opacity: 1; }
    100% { opacity: 0; transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) rotate(var(--r)); }
  }
  :global(html.dark) .game-paper { background:rgba(23,42,69,.96);border-color:rgba(255,253,247,.18);box-shadow:0 24px 70px rgba(0,0,0,.35); }:global(html.dark) .game-paper::before { border-color:rgba(255,253,247,.14); }:global(html.dark) .masthead,:global(html.dark) .wheel-stage { border-color:rgba(255,253,247,.18); }:global(html.dark) .brand,:global(html.dark) .puzzle-count,:global(html.dark) .settings-trigger,:global(html.dark) .setting-row,:global(html.dark) .selected-word.has-word { color:#fffdf7; }:global(html.dark) .brand-mark i { border-color:#fffdf7; }:global(html.dark) .settings-trigger { border-color:rgba(255,253,247,.3); }:global(html.dark) .settings-panel { background:rgba(255,253,247,.08); }:global(html.dark) .setting-row { color:#fffdf7;border-color:rgba(255,253,247,.22); }:global(html.dark) .segmented { border-color:rgba(255,253,247,.25); }:global(html.dark) .segmented button { color:rgba(255,253,247,.64); }:global(html.dark) .crossword-frame { background-color:#213a5d;border-color:#e6a527; }:global(html.dark) .crossword-cell { background:#fffdf7; }:global(html.dark) .outer-ring { stroke:#fffdf7; }:global(html.dark) .inner-ring { stroke:#fffdf7; }:global(html.dark) .core-mark { fill:#fffdf7; }:global(html.dark) .core-word,:global(html.dark) .core-caption { fill:rgba(255,253,247,.55); }:global(html.dark) .core-word.active-core { fill:#e6a527; }:global(html.dark) .letter-node>circle:nth-child(2) { fill:#172a45;stroke:#fffdf7;filter:drop-shadow(0 3px 0 rgba(0,0,0,.3)); }:global(html.dark) .letter-node.active>circle:nth-child(2) { fill:#e6a527;stroke:#e6a527; }:global(html.dark) .letter-node.active text { fill:#172a45; }:global(html.dark) .completion-mark { background:rgba(23,42,69,.8); }
  @media (min-width:580px) { .crossword-frame { min-height:260px; }.wheel-stage { min-height:300px; }.letter-wheel { width:292px; } }
  @media (prefers-reduced-motion:reduce) { .letter-node:not(.active),.confetti-piece,.settings-panel,.crossword-cell.solved,.completion-mark { animation:none; } }
</style>
