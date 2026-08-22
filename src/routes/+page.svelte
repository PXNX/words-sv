<!-- WordCircle design reminder: a minimal, tactile word instrument with warm paper, midnight ink and amber success cues. -->
<script lang="ts">
  import '../app.css';
  import wordsDeJson from '$lib/data/words.de.json';
  import wordsEnJson from '$lib/data/words.en.json';
  import IconDark from '~icons/material-symbols/dark-mode-rounded';
  import IconFeedbackCheck from '~icons/material-symbols/check-circle-rounded';
  import IconFeedbackClose from '~icons/material-symbols/cancel-rounded';
  import IconLight from '~icons/material-symbols/light-mode-rounded';
  import IconLanguage from '~icons/material-symbols/translate-rounded';
  import IconSettings from '~icons/material-symbols/settings-rounded';
  import IconSpark from '~icons/material-symbols/auto-awesome-rounded';
  import IconVibrate from '~icons/material-symbols/vibration-rounded';

  type Language = 'de' | 'en';
  type Theme = 'light' | 'dark';
  type Difficulty = 'classic' | 'repeat';
  type Orientation = 'across' | 'down';
  type Puzzle = { letters: string[]; words: string[]; repeat?: boolean };
  type Placement = { word: string; row: number; col: number; orientation: Orientation };
  type BoardCell = { letter: string; words: string[] };
  type Grid = { cells: Map<string, BoardCell>; placements: Placement[]; minRow: number; maxRow: number; minCol: number; maxCol: number };

  const puzzleData: Record<Language, Puzzle[]> = { de: wordsDeJson as Puzzle[], en: wordsEnJson as Puzzle[] };
  const copy = {
    de: {
      label: 'Wortkreis', kicker: 'Wischrätsel', hint: 'Zieh die Spur, Wort für Wort.', active: 'Dein Wort',
      reset: 'Neu ziehen', shuffle: 'Kreis drehen', undo: 'Spur kürzen', clear: 'Leeren', next: 'Nächster Kreis',
      allDone: 'Kreis gelöst!', correct: 'Richtig:', wrong: 'Noch nicht im Raster:', puzzle: 'Rätsel',
      language: 'Sprache', appearance: 'Darstellung', light: 'Hell', dark: 'Dunkel', settings: 'Einstellungen',
      vibration: 'Vibration', settingsHint: 'Dein Wortspiel, deine Stimmung.', difficulty: 'Schwierigkeit', classic: 'Klassisch', repeat: 'Wiederholen', newRound: 'Neue Runde'
    },
    en: {
      label: 'Word circle', kicker: 'Swipe puzzle', hint: 'Draw the path, one word at a time.', active: 'Your word',
      reset: 'Fresh draw', shuffle: 'Turn circle', undo: 'Shorten path', clear: 'Clear', next: 'Next circle',
      allDone: 'Circle solved!', correct: 'Correct:', wrong: 'Not in the grid yet:', puzzle: 'Puzzle',
      language: 'Language', appearance: 'Appearance', light: 'Light', dark: 'Dark', settings: 'Settings',
      vibration: 'Vibration', settingsHint: 'Your word game, your mood.', difficulty: 'Difficulty', classic: 'Classic', repeat: 'Repeat', newRound: 'New round'
    }
  } as const;
  const confettiPieces = Array.from({ length: 36 }, (_item, index) => index);

  const initialTheme: Theme = typeof localStorage !== 'undefined' && localStorage.getItem('wordcircle-theme') === 'dark' ? 'dark' : 'light';
  const initialVibration = typeof localStorage === 'undefined' || localStorage.getItem('wordcircle-vibration') !== 'off';
  const initialDifficulty: Difficulty = typeof localStorage !== 'undefined' && localStorage.getItem('wordcircle-difficulty') === 'repeat' ? 'repeat' : 'classic';

  let lang = $state<Language>('de');
  let theme = $state<Theme>(initialTheme);
  let vibration = $state(initialVibration);
  let difficulty = $state<Difficulty>(initialDifficulty);
  let settingsOpen = $state(false);
  let puzzleIndex = $state(0);
  let arrangement = $state<number[]>([0, 1, 2, 3, 4, 5]);
  let selectedPath = $state<number[]>([]);
  let solvedWords = $state<string[]>([]);
  let feedback = $state<'correct' | 'wrong' | null>(null);
  let feedbackWord = $state('');
  let shakeGrid = $state(false);
  let isDragging = $state(false);
  let circleEl = $state<SVGSVGElement>();
  let celebration = $state(false);
  let pulseIndex = $state(-1);

  const availablePuzzles = $derived(puzzleData[lang].filter((puzzle) => difficulty === 'repeat' || !puzzle.repeat));
  const currentPuzzle = $derived(availablePuzzles[puzzleIndex]);
  const labels = $derived(copy[lang]);
  const circleLetters = $derived(arrangement.map((index) => currentPuzzle.letters[index]));
  const grid = $derived(createGrid(currentPuzzle.words));
  const solvedSet = $derived(new Set(solvedWords));
  const activeWord = $derived(selectedPath.map((index) => circleLetters[index]).join(''));
  const previewWord = $derived(activeWord || feedbackWord);
  const solvedCells = $derived.by(() => {
    const keys = new Set<string>();
    grid.placements.filter((entry) => solvedSet.has(entry.word)).forEach((entry) => {
      entry.word.split('').forEach((_letter, index) => keys.add(cellKey(entry.row + (entry.orientation === 'down' ? index : 0), entry.col + (entry.orientation === 'across' ? index : 0))));
    });
    return keys;
  });

  $effect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('wordcircle-theme', theme);
  });
  $effect(() => { localStorage.setItem('wordcircle-vibration', vibration ? 'on' : 'off'); });
  $effect(() => { localStorage.setItem('wordcircle-difficulty', difficulty); });

  const CIRCLE = 146;
  const LETTER_RADIUS = 109;
  function cellKey(row: number, col: number) { return `${row}:${col}`; }

  function createGrid(words: string[]): Grid {
    const orderedWords = [...words].sort((a, b) => b.length - a.length);
    const cells = new Map<string, BoardCell>();
    const placements: Placement[] = [];
    function write(entry: Placement) {
      placements.push(entry);
      entry.word.split('').forEach((letter, index) => {
        const row = entry.row + (entry.orientation === 'down' ? index : 0);
        const col = entry.col + (entry.orientation === 'across' ? index : 0);
        const key = cellKey(row, col);
        const cell = cells.get(key);
        cells.set(key, { letter, words: [...(cell?.words ?? []), entry.word] });
      });
    }
    function canWrite(word: string, row: number, col: number, orientation: Orientation) {
      return word.split('').every((letter, index) => {
        const key = cellKey(row + (orientation === 'down' ? index : 0), col + (orientation === 'across' ? index : 0));
        const existing = cells.get(key);
        return !existing || existing.letter === letter;
      });
    }
    const first = orderedWords.shift();
    if (first) write({ word: first, row: 0, col: 0, orientation: 'across' });
    orderedWords.forEach((word) => {
      let candidate: Placement | null = null;
      for (const placed of placements) {
        for (let placedIndex = 0; placedIndex < placed.word.length; placedIndex += 1) {
          for (let wordIndex = 0; wordIndex < word.length; wordIndex += 1) {
            if (placed.word[placedIndex] !== word[wordIndex]) continue;
            const orientation: Orientation = placed.orientation === 'across' ? 'down' : 'across';
            const row = placed.orientation === 'across' ? placed.row - wordIndex : placed.row + placedIndex;
            const col = placed.orientation === 'across' ? placed.col + placedIndex : placed.col - wordIndex;
            if (canWrite(word, row, col, orientation)) { candidate = { word, row, col, orientation }; break; }
          }
          if (candidate) break;
        }
        if (candidate) break;
      }
      write(candidate ?? { word, row: placements.length * 2, col: 0, orientation: 'across' });
    });
    const rows = [...cells.keys()].map((key) => Number(key.split(':')[0]));
    const cols = [...cells.keys()].map((key) => Number(key.split(':')[1]));
    return { cells, placements, minRow: Math.min(...rows), maxRow: Math.max(...rows), minCol: Math.min(...cols), maxCol: Math.max(...cols) };
  }

  function buzz(pattern: number | number[]) {
    if (vibration && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  }
  function resetBoard(nextLanguage = lang, nextPuzzle = puzzleIndex) {
    lang = nextLanguage;
    const available = puzzleData[nextLanguage].filter((puzzle) => difficulty === 'repeat' || !puzzle.repeat);
    const normalizedPuzzle = nextPuzzle % available.length;
    puzzleIndex = normalizedPuzzle;
    arrangement = available[normalizedPuzzle].letters.map((_letter, index) => index);
    selectedPath = [];
    solvedWords = [];
    feedback = null;
    feedbackWord = '';
    shakeGrid = false;
    celebration = false;
  }
  function selectLanguage(nextLanguage: Language) { resetBoard(nextLanguage, 0); settingsOpen = false; }
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
    let closest = -1; let distance = Infinity;
    circleLetters.forEach((_letter, index) => { const letter = position(index, circleLetters.length); const nextDistance = Math.hypot(point.x - letter.x, point.y - letter.y); if (nextDistance < distance) { distance = nextDistance; closest = index; } });
    return distance < 36 ? closest : -1;
  }
  function chooseLetter(index: number) {
    if (difficulty === 'classic' && selectedPath.includes(index)) return;
    feedback = null;
    feedbackWord = '';
    selectedPath = [...selectedPath, index]; pulseIndex = index; buzz(7); window.setTimeout(() => (pulseIndex = -1), 180);
  }
  function startSwipe(event: PointerEvent, knownIndex = -1) {
    event.preventDefault(); (event.currentTarget as Element).setPointerCapture?.(event.pointerId); isDragging = true; selectedPath = []; feedback = null; feedbackWord = '';
    const point = pointFromEvent(event); const index = knownIndex >= 0 ? knownIndex : point ? nearestLetter(point) : -1;
    if (index >= 0) chooseLetter(index);
  }
  function extendSwipe(event: PointerEvent) {
    if (!isDragging) return;
    const point = pointFromEvent(event); if (!point) return;
    const index = nearestLetter(point); if (index >= 0 && index !== selectedPath.at(-1)) chooseLetter(index);
  }
  function endSwipe() { if (!isDragging) return; isDragging = false; if (selectedPath.length >= 2) submitWord(); else selectedPath = []; }
  function submitWord() {
    const word = activeWord;
    feedbackWord = word;
    if (currentPuzzle.words.includes(word) && !solvedSet.has(word)) {
      const completed = solvedWords.length + 1 === currentPuzzle.words.length;
      solvedWords = [...solvedWords, word]; feedback = 'correct'; buzz(completed ? [24, 28, 40, 28, 70] : [16, 20, 26]);
      if (completed) {
        celebration = true;
        window.setTimeout(() => resetBoard(lang, (puzzleIndex + 1) % availablePuzzles.length), 3600);
      }
    } else {
      feedback = 'wrong'; shakeGrid = true; buzz([18, 18, 18]); window.setTimeout(() => (shakeGrid = false), 280);
    }
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
  {#if celebration}
    <div class="confetti-field" aria-hidden="true">
      {#each confettiPieces as piece (piece)}<i class="confetti-piece" style={confettiStyle(piece)}></i>{/each}
    </div>
  {/if}
  <section class="game-paper" aria-label={labels.label}>
    <header class="masthead">
      <a class="brand" href="/" aria-label="WordCircle – neue Runde"><span class="brand-mark" aria-hidden="true"><i></i><b></b></span><span>WordCircle</span></a>
      <div class="top-actions">
        <span class="puzzle-count">{puzzleIndex + 1}<small>/{puzzleData[lang].length}</small></span>
        <button class:open={settingsOpen} class="settings-trigger" aria-expanded={settingsOpen} aria-controls="game-settings" onclick={() => (settingsOpen = !settingsOpen)}><IconSettings /><span class="sr-only">{labels.settings}</span></button>
      </div>
    </header>

    {#if settingsOpen}
      <aside id="game-settings" class="settings-panel" aria-label={labels.settings}>
        <div class="settings-intro"><IconSpark /><p>{labels.settingsHint}</p></div>
        <div class="setting-row"><span>{labels.language}</span><div class="segmented"><button class:chosen={lang === 'de'} onclick={() => selectLanguage('de')}>DE</button><button class:chosen={lang === 'en'} onclick={() => selectLanguage('en')}>EN</button></div></div>
        <div class="setting-row"><span>{labels.difficulty}</span><div class="segmented"><button class:chosen={difficulty === 'classic'} onclick={() => { difficulty = 'classic'; resetBoard(lang, 0); }}>{labels.classic}</button><button class:chosen={difficulty === 'repeat'} onclick={() => { difficulty = 'repeat'; resetBoard(lang, 0); }}>{labels.repeat}</button></div></div>
        <div class="setting-row"><span>{labels.appearance}</span><div class="segmented"><button class:chosen={theme === 'light'} onclick={() => (theme = 'light')}><IconLight />{labels.light}</button><button class:chosen={theme === 'dark'} onclick={() => (theme = 'dark')}><IconDark />{labels.dark}</button></div></div>
        <div class="setting-row vibration-row"><span><IconVibrate />{labels.vibration}</span><input aria-label={labels.vibration} type="checkbox" class="toggle toggle-sm" bind:checked={vibration} /></div>
      </aside>
    {/if}

    <div class:shake={shakeGrid} class="crossword-frame" aria-label="Kreuzworträtsel">
      <div class="crossword" style={`grid-template-columns: repeat(${grid.maxCol - grid.minCol + 1}, 1fr);`}>
        {#each Array(grid.maxRow - grid.minRow + 1) as _, rowIndex}
          {#each Array(grid.maxCol - grid.minCol + 1) as _, colIndex}
            {@const row = grid.minRow + rowIndex}{@const col = grid.minCol + colIndex}{@const cell = inRange(row, col)}
            {#if cell}<div class:solved={solvedCells.has(cellKey(row, col))} class:startAcross={isWordStart(row, col, 'across')} class:endAcross={isWordEnd(row, col, 'across')} class:startDown={isWordStart(row, col, 'down')} class:endDown={isWordEnd(row, col, 'down')} class="crossword-cell" aria-label={solvedCells.has(cellKey(row, col)) ? cell.letter : 'offenes Feld'}>{solvedCells.has(cellKey(row, col)) ? cell.letter : ''}</div>{:else}<div class="crossword-void"></div>{/if}
          {/each}
        {/each}
      </div>
      <div class="frame-corner top-left"></div><div class="frame-corner top-right"></div><div class="frame-corner bottom-left"></div><div class="frame-corner bottom-right"></div>
    </div>

    <div class="selection-area" aria-live="polite"><div class:has-word={previewWord.length > 0} class:correct={feedback === 'correct'} class:wrong={feedback === 'wrong'} class="selected-word"><span>{previewWord || '—'}</span>{#if feedback === 'correct'}<IconFeedbackCheck aria-label="Correct" />{:else if feedback === 'wrong'}<IconFeedbackClose aria-label="Incorrect" />{/if}</div></div>

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
  :global(.sr-only) { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  :global(.game-shell) { min-height: 100svh; padding: clamp(1rem, 3vw, 3rem); display: grid; place-items: center; }
  .game-paper { position: relative; isolation: isolate; overflow: hidden; width: min(100%, 660px); padding: clamp(1.1rem, 4vw, 2.4rem); border: 1px solid rgba(23, 42, 69, .17); background: rgba(255, 253, 247, .9); box-shadow: 0 24px 70px rgba(30, 33, 44, .13), 0 2px 0 rgba(23, 42, 69, .08); }
  .game-paper::before { content: ''; position: absolute; z-index: -1; inset: 10px; border: 1px solid rgba(23, 42, 69, .13); pointer-events: none; }
  .masthead, .title-row, .controls { display: flex; align-items: center; }.masthead { justify-content: space-between; padding-bottom: 1rem; border-bottom: 1px solid rgba(23, 42, 69, .16); }
  .brand { display: inline-flex; gap: .73rem; align-items: center; color: #172a45; font-family: 'DM Serif Display', serif; font-size: 1.5rem; letter-spacing: -.035em; text-decoration: none; }.brand-mark { position: relative; width: 31px; height: 31px; display: block; }.brand-mark i, .brand-mark b { position: absolute; display: block; width: 21px; height: 21px; border: 2px solid #172a45; border-radius: 50%; }.brand-mark i { top: 1px; left: 1px; }.brand-mark b { right: 1px; bottom: 1px; border-color: #e6a527; }
  .top-actions { display: flex; align-items: center; gap: .7rem; }.puzzle-count { color: #172a45; font-size: .75rem; font-weight: 800; letter-spacing: .06em; }.puzzle-count small { color: rgba(23,42,69,.45); font-size: inherit; }.settings-trigger { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; border: 1px solid rgba(23,42,69,.24); border-radius: 50%; background: transparent; color: #172a45; transition: transform .18s cubic-bezier(.23,1,.32,1), background .18s ease; }.settings-trigger :global(svg) { width: 1.15rem; height: 1.15rem; }.settings-trigger.open { background: #172a45; color: #fffdf7; transform: rotate(45deg); }
  .settings-panel { margin-top: .8rem; padding: .9rem 1rem; border: 1px solid rgba(23,42,69,.18); background: rgba(237,228,213,.68); animation: drop-in .2s cubic-bezier(.23,1,.32,1); }.settings-intro { display: flex; align-items: center; gap: .45rem; color: #a45e38; }.settings-intro :global(svg) { width: 1rem; height: 1rem; }.settings-intro p { margin: 0; font-family: 'DM Serif Display', serif; font-size: .95rem; }.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: .75rem; margin-top: .75rem; border-top: 1px solid rgba(23,42,69,.14); color: #172a45; font-size: .69rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }.segmented { display: flex; padding: 2px; border: 1px solid rgba(23,42,69,.22); border-radius: 99px; }.segmented button { min-height: 1.65rem; padding: 0 .55rem; display: inline-flex; align-items: center; gap: .25rem; border: 0; border-radius: 99px; background: transparent; color: rgba(23,42,69,.62); font-size: .62rem; font-weight: 800; }.segmented button :global(svg) { width: .78rem; height: .78rem; }.segmented button.chosen { background: #172a45; color: #fffdf7; }.vibration-row > span { display: inline-flex; align-items: center; gap: .35rem; }.vibration-row :global(svg) { width: .9rem; height: .9rem; }
  .title-row { justify-content: space-between; gap: 1rem; padding: clamp(1.2rem, 4vw, 2rem) 0 1rem; }.eyebrow { margin: 0 0 .32rem; color: #a45e38; font-size: .65rem; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }h1 { margin: 0; font-family: 'DM Serif Display', Georgia, serif; font-size: clamp(2.15rem, 9vw, 3.6rem); font-weight: 400; letter-spacing: -.045em; line-height: .92; }.solved-stamp { display: inline-flex; align-items: center; gap: .3rem; padding: .4rem .55rem; color: #486842; border: 1px solid currentColor; border-radius: 99px; font-size: .65rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; animation: pop-in .24s cubic-bezier(.23,1,.32,1); }.solved-stamp :global(svg) { width: .9rem; height: .9rem; }
  .crossword-frame { position: relative; min-height: 240px; display: grid; place-items: center; padding: clamp(.8rem,3.8vw,1.4rem); background-color: #ede4d5; background-image: linear-gradient(rgba(23,42,69,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(23,42,69,.035) 1px,transparent 1px); background-size: 20px 20px; border-top: 3px double #172a45; border-bottom: 2px solid rgba(23,42,69,.45); transition: transform .16s cubic-bezier(.23,1,.32,1); }.crossword-frame::before,.crossword-frame::after { content: ''; position: absolute; z-index: 0; width: 2.6rem; height: 1px; background: #172a45; opacity: .42; }.crossword-frame::before { top: 14px; left: 50%; transform: translateX(-50%); }.crossword-frame::after { bottom: 14px; left: 50%; transform: translateX(-50%); }.crossword-frame.shake { animation: shake .28s cubic-bezier(.23,1,.32,1); }.crossword { position: relative; z-index: 1; display: grid; width: min(99%,456px); filter: drop-shadow(6px 7px 0 rgba(23,42,69,.09)); }.crossword-cell { aspect-ratio: 1; min-width: 23px; display: grid; place-items: center; border: 1.35px solid #172a45; background: #fffdf7; color: #172a45; font-size: clamp(.78rem,4vw,1.2rem); font-weight: 800; line-height: 1; text-transform: uppercase; transition: background .18s ease,color .18s ease,transform .18s cubic-bezier(.23,1,.32,1); }.crossword-cell.startAcross { border-left-width: 4px; }.crossword-cell.endAcross { border-right-width: 4px; }.crossword-cell.startDown { border-top-width: 4px; }.crossword-cell.endDown { border-bottom-width: 4px; }.crossword-cell.solved { background: #e6a527; transform: scale(.965); animation: solve-cell .32s cubic-bezier(.23,1,.32,1); }.crossword-void { aspect-ratio: 1; }.frame-corner { position: absolute; width: 13px; height: 13px; border-color: #e6a527; border-style: solid; }.top-left { top: 7px; left: 7px; border-width: 2px 0 0 2px; }.top-right { top: 7px; right: 7px; border-width: 2px 2px 0 0; }.bottom-left { bottom: 7px; left: 7px; border-width: 0 0 2px 2px; }.bottom-right { right: 7px; bottom: 7px; border-width: 0 2px 2px 0; }
  .selection-area { min-height: 95px; padding: 1rem 0 .65rem; text-align: center; }.selected-word { min-height: 2rem; display: inline-flex; align-items: center; justify-content: center; gap: .48rem; color: rgba(23,42,69,.35); font-family: 'DM Serif Display', serif; font-size: 1.75rem; letter-spacing: .16em; line-height: 1; }.selected-word :global(svg) { width: 1.55rem; height: 1.55rem; letter-spacing: 0; }.selected-word.has-word { color: #172a45; animation: word-rise .18s cubic-bezier(.23,1,.32,1); }.selected-word.correct { color: #3f7a50; }.selected-word.wrong { color: #b54442; }.selected-word.correct :global(svg),.selected-word.wrong :global(svg) { animation: feedback-pop .24s cubic-bezier(.23,1,.32,1); }
  .wheel-stage { position: relative; min-height: 314px; display: grid; place-items: center; border-top: 1px solid rgba(23,42,69,.16); border-bottom: 1px solid rgba(23,42,69,.16); }.letter-wheel { width: min(100%,310px); touch-action: none; overflow: visible; user-select: none; }.outer-ring,.inner-ring,.core-ring { fill: none; }.outer-ring { stroke: #172a45; stroke-width: 1.7; stroke-dasharray: 2 5; opacity: .63; }.inner-ring { stroke: #172a45; stroke-width: 2.5; opacity: .19; }.core-ring { stroke: #e6a527; stroke-width: 1.6; opacity: .9; }.core-mark { fill: #172a45; opacity: .83; }.core-word { fill: rgba(23,42,69,.42); font-family: 'DM Serif Display',serif; font-size: 12px; letter-spacing: .08em; }.core-word.active-core { fill: #c98220; }.core-caption { fill: rgba(23,42,69,.38); font-family: 'DM Sans',sans-serif; font-size: 5.6px; font-weight: 800; letter-spacing: .16em; }.selection-line { fill: none; stroke: #e6a527; stroke-linecap: round; stroke-linejoin: round; stroke-width: 10; opacity: .9; }.letter-node { cursor: crosshair; }.letter-node > circle:nth-child(2) { fill: #fffdf7; stroke: #172a45; stroke-width: 2; filter: drop-shadow(0 3px 0 rgba(23,42,69,.16)); transition: fill .14s ease,transform .14s cubic-bezier(.23,1,.32,1),filter .14s ease; transform-box: fill-box; transform-origin: center; }.bubble-shine { fill: rgba(255,255,255,.72); stroke: none; transform: translate(-4px,-5px) scale(.34); transform-origin: center; pointer-events: none; }.letter-node text { fill: #172a45; font-family: 'DM Sans',sans-serif; font-size: 20px; font-weight: 800; pointer-events: none; }.letter-node.active > circle:nth-child(2) { fill: #e6a527; transform: scale(1.12); filter: drop-shadow(0 5px 0 rgba(151,94,16,.2)); }.letter-node.pulse > circle:nth-child(2) { animation: bubble-pop .18s cubic-bezier(.23,1,.32,1); }.letter-node:not(.active) { animation: bubble-drift 3.2s ease-in-out infinite; }.letter-node:nth-of-type(2n) { animation-delay: -.8s; }.letter-node:nth-of-type(3n) { animation-delay: -1.5s; }
  .controls { justify-content: center; gap: 0; flex-wrap: wrap; padding-top: .85rem; }.controls .editorial-control { min-height: 2.35rem; border: 0; border-top: 1px solid rgba(23,42,69,.25); border-bottom: 1px solid rgba(23,42,69,.25); border-radius: 0; color: #172a45; font-size: .66rem; font-weight: 800; letter-spacing: .04em; box-shadow: none; transition: transform .16s cubic-bezier(.23,1,.32,1),background .16s ease; }.controls .editorial-control:not(:last-child) { border-right: 1px solid rgba(23,42,69,.25); }.controls .editorial-control :global(svg) { width: .95rem; height: .95rem; }.controls .next-button { background: #e6a527; border-color: #e6a527; }.controls .editorial-control:disabled { opacity: .42; }.controls .editorial-control:active { transform: scale(.97); }
  /* Compact interaction-first composition: the grid and letter instrument fit together above the fold. */
  :global(.game-shell) { padding: clamp(.5rem, 2vw, 1.35rem); align-items: start; }
  .game-paper { padding: clamp(.8rem, 3vw, 1.5rem); }
  .crossword-frame { min-height: 205px; margin-top: .72rem; padding: clamp(.62rem, 3vw, 1rem); }
  .selection-area { min-height: 60px; padding: .68rem 0 .36rem; }
  .selection-area p { display: none; }
  .wheel-stage { min-height: 278px; }
  .letter-wheel { width: min(100%, 292px); }
  .bubble-ripple { fill: none; stroke: #e6a527; stroke-width: 2; opacity: 0; pointer-events: none; transform-box: fill-box; transform-origin: center; }
  .letter-node.active > circle:first-child { fill: none; }
  .letter-node.active > circle:nth-child(2) { animation: selected-bubble .42s cubic-bezier(.23,1,.32,1) both; }
  .letter-node.pulse .bubble-ripple { animation: bubble-ripple .48s cubic-bezier(.23,1,.32,1) both; }
  .letter-node.pulse > circle:nth-child(2) { animation: bubble-pop .24s cubic-bezier(.23,1,.32,1); }
  .confetti-field { position: fixed; z-index: 20; inset: 0; pointer-events: none; overflow: hidden; }.confetti-piece { position: absolute; left: 50%; top: 48%; width: 8px; height: 13px; background: #e6a527; border-radius: 2px; animation: confetti 1.7s var(--delay) cubic-bezier(.13,.79,.31,1) forwards; }.confetti-piece:nth-child(3n) { background: #c96e4d; }.confetti-piece:nth-child(4n) { background: #172a45; }.confetti-piece:nth-child(5n) { width: 6px; height: 6px; border-radius: 50%; }
  @keyframes drop-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }@keyframes shake { 25% { transform: translateX(-7px); } 55% { transform: translateX(6px); } 80% { transform: translateX(-3px); } }@keyframes solve-cell { 0% { transform: scale(.84); } 70% { transform: scale(1.05); } 100% { transform: scale(.965); } }@keyframes bubble-drift { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }@keyframes bubble-pop { 0% { transform: scale(.85); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }@keyframes selected-bubble { 0% { transform: scale(.86); } 58% { transform: scale(1.2); } 100% { transform: scale(1.12); } }@keyframes bubble-ripple { 0% { opacity: .8; transform: scale(.72); } 100% { opacity: 0; transform: scale(1.45); } }@keyframes feedback-pop { 0% { opacity: .1; transform: scale(.72); } 75% { transform: scale(1.16); } 100% { opacity: 1; transform: scale(1); } }@keyframes word-rise { from { opacity: .2; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }@keyframes pop-in { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }@keyframes confetti { 0% { opacity: 0; transform: translate(-50%,-50%) rotate(0); } 12% { opacity: 1; } 100% { opacity: 0; transform: translate(calc(-50% + var(--x)),calc(-50% + var(--y))) rotate(var(--r)); } }
  :global(html.dark) .game-paper { background: rgba(23,42,69,.96); border-color: rgba(255,253,247,.18); box-shadow: 0 24px 70px rgba(0,0,0,.35); }:global(html.dark) .game-paper::before { border-color: rgba(255,253,247,.14); }:global(html.dark) .masthead,:global(html.dark) .wheel-stage,:global(html.dark) .controls .editorial-control { border-color: rgba(255,253,247,.18); }:global(html.dark) .brand,:global(html.dark) .puzzle-count,:global(html.dark) h1,:global(html.dark) .settings-trigger,:global(html.dark) .setting-row,:global(html.dark) .selected-word.has-word { color: #fffdf7; }:global(html.dark) .brand-mark i { border-color: #fffdf7; }:global(html.dark) .settings-trigger { border-color: rgba(255,253,247,.3); }:global(html.dark) .settings-panel { background: rgba(255,253,247,.08); }:global(html.dark) .setting-row,:global(html.dark) .controls .editorial-control { color: #fffdf7; border-color: rgba(255,253,247,.22); }:global(html.dark) .segmented { border-color: rgba(255,253,247,.25); }:global(html.dark) .segmented button { color: rgba(255,253,247,.64); }:global(html.dark) .crossword-frame { background-color: #213a5d; border-color: #e6a527; }:global(html.dark) .crossword-cell { background: #fffdf7; }:global(html.dark) .outer-ring { stroke: #fffdf7; }:global(html.dark) .inner-ring { stroke: #fffdf7; }:global(html.dark) .core-mark { fill: #fffdf7; }:global(html.dark) .core-word,:global(html.dark) .core-caption { fill: rgba(255,253,247,.55); }:global(html.dark) .core-word.active-core { fill: #e6a527; }:global(html.dark) .letter-node > circle:nth-child(2) { fill: #172a45; stroke: #fffdf7; filter: drop-shadow(0 3px 0 rgba(0,0,0,.3)); }:global(html.dark) .letter-node.active > circle:nth-child(2) { fill: #e6a527; stroke: #e6a527; }:global(html.dark) .letter-node.active text { fill: #172a45; }
  @media (max-width: 579px) { :global(.game-shell) { padding: .4rem; }.game-paper { padding: .65rem; }.game-paper::before { inset: 7px; }.masthead { padding-bottom: .62rem; }.brand { gap: .5rem; font-size: 1.27rem; }.brand-mark { transform: scale(.87); transform-origin: left center; }.crossword-frame { min-height: 0; margin-top: .52rem; padding: .5rem; }.crossword { width: min(82vw, 290px); }.crossword-cell { min-width: 0; }.selection-area { min-height: 42px; padding: .5rem 0 .22rem; }.selected-word { min-height: 1.6rem; font-size: 1.35rem; }.wheel-stage { min-height: 228px; }.letter-wheel { width: 238px; } }
  @media (min-width: 580px) { .crossword-frame { min-height: 250px; }.wheel-stage { min-height: 300px; } }
  @media (prefers-reduced-motion: reduce) { .letter-node:not(.active), .confetti-piece, .settings-panel, .solved-stamp, .crossword-cell.solved { animation: none; } }
</style>
