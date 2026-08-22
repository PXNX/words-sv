<!-- WordCircle design reminder: editorial word magazine, warm paper, inky navy structure, sun-amber interaction. -->
<script lang="ts">
  import '../app.css';
  import wordsDe from '$lib/data/words.de';
  import wordsEn from '$lib/data/words.en';
  import IconBackspace from '~icons/material-symbols/backspace-outline-rounded';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconLanguage from '~icons/material-symbols/translate-rounded';
  import IconRefresh from '~icons/material-symbols/refresh-rounded';
  import IconShuffle from '~icons/material-symbols/shuffle-rounded';
  import IconSpark from '~icons/material-symbols/auto-awesome-rounded';

  type Language = 'de' | 'en';
  type Orientation = 'across' | 'down';
  type Placement = { word: string; row: number; col: number; orientation: Orientation };
  type BoardCell = { letter: string; words: string[] };
  type Grid = { cells: Map<string, BoardCell>; placements: Placement[]; minRow: number; maxRow: number; minCol: number; maxCol: number };
  type Notice = { tone: 'success' | 'error'; text: string } | null;

  const puzzleData = { de: wordsDe, en: wordsEn };
  const copy = {
    de: {
      label: 'Wortkreis', kicker: 'Wischrätsel', hint: 'Zieh Buchstaben zusammen – jedes Wort öffnet einen neuen Weg.', found: 'Gefunden', words: 'Wörter',
      reset: 'Neu starten', shuffle: 'Mischen', undo: 'Zurück', clear: 'Leeren', next: 'Nächster Kreis',
      allDone: 'Alle Wörter gefunden. Schön gezogen!', correct: 'Richtig:', wrong: 'Kein Lösungswort:', puzzle: 'Rätsel', language: 'Deutsch', letters: 'Buchstaben',
      swipeHelp: 'Halte gedrückt und verbinde die Buchstaben in der richtigen Reihenfolge.', active: 'Aktuelle Auswahl'
    },
    en: {
      label: 'Word circle', kicker: 'Swipe puzzle', hint: 'Pull the letters together — each word opens a new way.', found: 'Found', words: 'words',
      reset: 'Restart', shuffle: 'Shuffle', undo: 'Undo', clear: 'Clear', next: 'Next circle',
      allDone: 'Every word is found. Nicely drawn!', correct: 'Correct:', wrong: 'Not a puzzle word:', puzzle: 'Puzzle', language: 'English', letters: 'letters',
      swipeHelp: 'Press and connect the letters in the right order.', active: 'Current selection'
    }
  } as const;

  let lang = $state<Language>('de');
  let puzzleIndex = $state(0);
  let arrangement = $state<number[]>([0, 1, 2, 3, 4, 5]);
  let selectedPath = $state<number[]>([]);
  let solvedWords = $state<string[]>([]);
  let notice = $state<Notice>(null);
  let shakeGrid = $state(false);
  let isDragging = $state(false);
  let circleEl = $state<SVGSVGElement>();

  const currentPuzzle = $derived(puzzleData[lang][puzzleIndex]);
  const labels = $derived(copy[lang]);
  const circleLetters = $derived(arrangement.map((index) => currentPuzzle.letters[index]));
  const grid = $derived(createGrid(currentPuzzle.words));
  const solvedSet = $derived(new Set(solvedWords));
  const allSolved = $derived(solvedWords.length === currentPuzzle.words.length);
  const activeWord = $derived(selectedPath.map((index) => circleLetters[index]).join(''));
  const solvedCells = $derived.by(() => {
    const keys = new Set<string>();
    grid.placements.filter((entry) => solvedSet.has(entry.word)).forEach((entry) => {
      entry.word.split('').forEach((_letter, index) => keys.add(cellKey(entry.row + (entry.orientation === 'down' ? index : 0), entry.col + (entry.orientation === 'across' ? index : 0))));
    });
    return keys;
  });

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
            if (canWrite(word, row, col, orientation)) {
              candidate = { word, row, col, orientation };
              break;
            }
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

  function resetBoard(nextLanguage = lang, nextPuzzle = puzzleIndex) {
    lang = nextLanguage;
    puzzleIndex = nextPuzzle;
    arrangement = puzzleData[nextLanguage][nextPuzzle].letters.map((_letter, index) => index);
    selectedPath = [];
    solvedWords = [];
    notice = null;
    shakeGrid = false;
  }

  function selectLanguage(nextLanguage: Language) { resetBoard(nextLanguage, 0); }

  function nextPuzzle() {
    if (!allSolved) return;
    resetBoard(lang, (puzzleIndex + 1) % puzzleData[lang].length);
  }

  function shuffleLetters() {
    const mixed = [...arrangement];
    for (let index = mixed.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [mixed[index], mixed[swap]] = [mixed[swap], mixed[index]];
    }
    arrangement = mixed;
    selectedPath = [];
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
      if (nextDistance < distance) { distance = nextDistance; closest = index; }
    });
    return distance < 34 ? closest : -1;
  }

  function startSwipe(event: PointerEvent, knownIndex = -1) {
    event.preventDefault();
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    isDragging = true;
    selectedPath = [];
    const index = knownIndex >= 0 ? knownIndex : (pointFromEvent(event) ? nearestLetter(pointFromEvent(event)!) : -1);
    if (index >= 0) selectedPath = [index];
  }

  function extendSwipe(event: PointerEvent) {
    if (!isDragging) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const index = nearestLetter(point);
    if (index < 0 || selectedPath.includes(index)) return;
    selectedPath = [...selectedPath, index];
  }

  function endSwipe() {
    if (!isDragging) return;
    isDragging = false;
    if (selectedPath.length >= 2) submitWord();
    else selectedPath = [];
  }

  function submitWord() {
    const word = activeWord;
    if (currentPuzzle.words.includes(word) && !solvedSet.has(word)) {
      solvedWords = [...solvedWords, word];
      notice = { tone: 'success', text: `${labels.correct} ${word}` };
      if (solvedWords.length + 1 === currentPuzzle.words.length) notice = { tone: 'success', text: labels.allDone };
    } else {
      notice = { tone: 'error', text: `${labels.wrong} ${word}` };
      shakeGrid = true;
      window.setTimeout(() => (shakeGrid = false), 280);
    }
    selectedPath = [];
  }

  function undo() { selectedPath = selectedPath.slice(0, -1); }
  function pathPoints() { return selectedPath.map((index) => { const point = position(index, circleLetters.length); return `${point.x},${point.y}`; }).join(' '); }
  function inRange(row: number, col: number) { return grid.cells.get(cellKey(row, col)); }
  function hideBrokenImage(event: Event) { (event.currentTarget as HTMLImageElement).style.display = 'none'; }
</script>

<svelte:head>
  <title>{labels.label} · WordCircle</title>
</svelte:head>

<svelte:window onpointerup={endSwipe} onpointercancel={endSwipe} />

<main class="game-shell">
  <section class="game-paper" aria-labelledby="game-title">
    <header class="masthead">
      <a class="brand" href="/" aria-label="WordCircle – Neustart">
        <span class="brand-logo-wrap" aria-hidden="true"><span class="brand-mark"><i></i><b></b></span><img src="/manus-storage/wordcircle-mark_bde1bc7c.png" alt="" onerror={hideBrokenImage} /></span>
        <span>WordCircle</span>
      </a>
      <div class="language-switch" aria-label="Sprache / Language">
        <button class:chosen={lang === 'de'} onclick={() => selectLanguage('de')}>DE</button>
        <button class:chosen={lang === 'en'} onclick={() => selectLanguage('en')}>EN</button>
      </div>
    </header>

    <div class="title-row">
      <div>
        <p class="eyebrow">{labels.kicker} · {labels.puzzle} {puzzleIndex + 1}/3</p>
        <h1 id="game-title">{labels.label}</h1>
      </div>
      <div class="score" aria-label={`${labels.found} ${solvedWords.length} ${labels.words}`}>
        <span>{labels.found}</span><strong>{solvedWords.length}/{currentPuzzle.words.length}</strong>
      </div>
    </div>

    <div class:shake={shakeGrid} class="crossword-frame" aria-label="Kreuzworträtsel">
      <div class="crossword" style={`grid-template-columns: repeat(${grid.maxCol - grid.minCol + 1}, 1fr);`}>
        {#each Array(grid.maxRow - grid.minRow + 1) as _, rowIndex}
          {#each Array(grid.maxCol - grid.minCol + 1) as _, colIndex}
            {@const row = grid.minRow + rowIndex}
            {@const col = grid.minCol + colIndex}
            {@const cell = inRange(row, col)}
            {#if cell}
              <div class:solved={solvedCells.has(cellKey(row, col))} class="crossword-cell" aria-label={solvedCells.has(cellKey(row, col)) ? cell.letter : 'leeres Feld'}>
                {solvedCells.has(cellKey(row, col)) ? cell.letter : ''}
              </div>
            {:else}
              <div class="crossword-void"></div>
            {/if}
          {/each}
        {/each}
      </div>
      <div class="frame-corner top-left"></div><div class="frame-corner top-right"></div><div class="frame-corner bottom-left"></div><div class="frame-corner bottom-right"></div>
    </div>

    <div class="selection-area" aria-live="polite">
      <span class="selection-label">{labels.active}</span>
      <div class="selected-word" class:has-word={activeWord.length > 0}>{activeWord || '—'}</div>
      {#if notice}
        <div class:notice-success={notice.tone === 'success'} class:notice-error={notice.tone === 'error'} class="notice">
          {#if notice.tone === 'success'}<IconCheck />{/if}
          <span>{notice.text}</span>
        </div>
      {:else}
        <p>{labels.hint}</p>
      {/if}
    </div>

    <div class="wheel-stage">
      <img class="wheel-stamp" src="/manus-storage/wordcircle-stamp_6a958b9b.png" alt="" />
      <svg bind:this={circleEl} viewBox="0 0 292 292" class="letter-wheel" role="application" aria-label={labels.swipeHelp} onpointerdown={(event) => startSwipe(event)} onpointermove={extendSwipe}>
        <circle cx={CIRCLE} cy={CIRCLE} r={LETTER_RADIUS} class="outer-ring" />
        <circle cx={CIRCLE} cy={CIRCLE} r="68" class="inner-ring" />
        <circle cx={CIRCLE} cy={CIRCLE} r="47" class="core-ring" />
        <path d="M124 146a22 22 0 1 0 44 0a22 22 0 1 1-44 0Z" class="core-mark" />
        {#if selectedPath.length > 1}
          <polyline points={pathPoints()} class="selection-line" />
        {/if}
        {#each circleLetters as letter, index (index)}
          {@const point = position(index, circleLetters.length)}
          <g transform={`translate(${point.x} ${point.y})`} class:active={selectedPath.includes(index)} class="letter-node" role="button" tabindex="0" aria-label={`Buchstabe ${letter}`} onpointerdown={(event) => { event.stopPropagation(); startSwipe(event, index); }} onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { selectedPath = selectedPath.includes(index) ? selectedPath.filter((item) => item !== index) : [...selectedPath, index]; } }}>
            <circle r="26"></circle>
            <text text-anchor="middle" dominant-baseline="central">{letter}</text>
          </g>
        {/each}
      </svg>
    </div>

    <div class="controls" aria-label="Spielsteuerung">
      <button class="btn btn-ghost btn-sm editorial-control" onclick={undo} disabled={selectedPath.length === 0}><IconBackspace />{labels.undo}</button>
      <button class="btn btn-ghost btn-sm editorial-control" onclick={() => (selectedPath = [])} disabled={selectedPath.length === 0}>{labels.clear}</button>
      <button class="btn btn-ghost btn-sm editorial-control" onclick={shuffleLetters}><IconShuffle />{labels.shuffle}</button>
      <button class="btn btn-outline btn-sm editorial-control" onclick={() => resetBoard()}><IconRefresh />{labels.reset}</button>
      <button class="btn btn-primary btn-sm editorial-control next-button" onclick={nextPuzzle} disabled={!allSolved}><IconSpark />{labels.next}</button>
    </div>

    <footer class="game-footer"><IconLanguage /><span>{labels.language}</span><span aria-hidden="true">•</span><span>{currentPuzzle.letters.length} {labels.letters}</span></footer>
    {#if allSolved}<img class="confetti" src="/manus-storage/wordcircle-confetti_5d6d6ed6.png" alt="" />{/if}
  </section>
</main>

<style>
  :global(.game-shell) { min-height: 100svh; padding: clamp(1rem, 3vw, 3rem); display: grid; place-items: center; }
  .game-paper { position: relative; isolation: isolate; overflow: hidden; width: min(100%, 660px); padding: clamp(1.25rem, 4vw, 2.7rem); border: 1px solid rgba(23, 42, 69, .17); background: rgba(255, 253, 247, .87); box-shadow: 0 24px 70px rgba(30, 33, 44, .13), 0 2px 0 rgba(23, 42, 69, .08); }
  .game-paper::before { content: ''; position: absolute; z-index: -1; inset: 10px; border: 1px solid rgba(23, 42, 69, .13); pointer-events: none; }
  .masthead, .title-row, .controls, .game-footer { display: flex; align-items: center; }
  .masthead { justify-content: space-between; padding-bottom: 1.1rem; border-bottom: 1px solid rgba(23, 42, 69, .16); }
  .brand { display: inline-flex; gap: .73rem; align-items: center; color: #172a45; font-family: 'DM Serif Display', serif; font-size: 1.58rem; letter-spacing: -.035em; text-decoration: none; }
  .brand-logo-wrap { position: relative; display: grid; place-items: center; width: 39px; height: 39px; } .brand img { position: absolute; inset: 0; width: 39px; height: 39px; object-fit: contain; filter: saturate(1.12) contrast(1.05); } .brand-mark { position: relative; width: 30px; height: 30px; display: block; } .brand-mark i, .brand-mark b { position: absolute; display: block; width: 21px; height: 21px; border: 2px solid #172a45; border-radius: 50%; } .brand-mark i { top: 1px; left: 1px; } .brand-mark b { right: 1px; bottom: 1px; border-color: #e6a527; }
  .language-switch { display: flex; border: 1px solid rgba(23, 42, 69, .23); border-radius: 99px; padding: 3px; }
  .language-switch button { width: 2.3rem; height: 1.7rem; border: 0; border-radius: 99px; background: transparent; color: rgba(23, 42, 69, .64); font-size: .7rem; font-weight: 800; letter-spacing: .08em; transition: background .16s ease, color .16s ease, transform .16s ease; }
  .language-switch button.chosen { background: #172a45; color: #fffdf7; }
  .language-switch button:active, .controls .btn:active { transform: scale(.97); }
  .title-row { justify-content: space-between; gap: 1rem; padding: clamp(1.35rem, 4vw, 2.2rem) 0 1.2rem; }
  .eyebrow { margin: 0 0 .32rem; color: #a45e38; font-size: .66rem; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
  h1 { margin: 0; font-family: 'DM Serif Display', Georgia, serif; font-size: clamp(2.2rem, 9vw, 3.7rem); font-weight: 400; letter-spacing: -.045em; line-height: .92; }
  .score { min-width: 74px; padding-left: 1rem; border-left: 1px solid rgba(23, 42, 69, .2); text-align: right; }
  .score span { display: block; font-size: .61rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
  .score strong { display: block; color: #c98220; font-family: 'DM Serif Display', serif; font-size: 1.55rem; font-weight: 400; }
  .crossword-frame { position: relative; min-height: 242px; display: grid; place-items: center; padding: clamp(1rem, 4.5vw, 1.8rem); background-color: #ede4d5; background-image: linear-gradient(rgba(23, 42, 69, .025) 1px, transparent 1px), linear-gradient(90deg, rgba(23, 42, 69, .025) 1px, transparent 1px); background-size: 20px 20px; border-top: 3px double #172a45; border-bottom: 2px solid rgba(23, 42, 69, .45); transition: transform .16s cubic-bezier(.23, 1, .32, 1); }
  .crossword-frame.shake { animation: shake .28s cubic-bezier(.23, 1, .32, 1); }
  .crossword { display: grid; width: min(98%, 438px); filter: drop-shadow(5px 6px 0 rgba(23, 42, 69, .085)); }
  .crossword-cell { aspect-ratio: 1; min-width: 23px; display: grid; place-items: center; border: 1.35px solid #172a45; background: #fffdf7; color: #172a45; font-size: clamp(.78rem, 4vw, 1.2rem); font-weight: 800; line-height: 1; text-transform: uppercase; transition: background .18s ease, color .18s ease, transform .18s cubic-bezier(.23, 1, .32, 1); }
  .crossword-cell.solved { background: #e6a527; transform: scale(.97); }
  .crossword-void { aspect-ratio: 1; }
  .frame-corner { position: absolute; width: 13px; height: 13px; border-color: #e6a527; border-style: solid; }
  .top-left { top: 7px; left: 7px; border-width: 2px 0 0 2px; } .top-right { top: 7px; right: 7px; border-width: 2px 2px 0 0; } .bottom-left { bottom: 7px; left: 7px; border-width: 0 0 2px 2px; } .bottom-right { right: 7px; bottom: 7px; border-width: 0 2px 2px 0; }
  .selection-area { min-height: 96px; padding: 1.05rem 0 .78rem; text-align: center; }
  .selection-label { display: block; margin-bottom: .3rem; color: rgba(23, 42, 69, .58); font-size: .62rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  .selected-word { min-height: 2rem; color: rgba(23, 42, 69, .35); font-family: 'DM Serif Display', serif; font-size: 1.8rem; letter-spacing: .16em; line-height: 1; }
  .selected-word.has-word { color: #172a45; }
  .selection-area p { margin: .48rem 0 0; color: rgba(23, 42, 69, .58); font-size: .78rem; }
  .notice { display: inline-flex; align-items: center; justify-content: center; gap: .35rem; margin-top: .48rem; font-size: .79rem; font-weight: 700; }
  .notice :global(svg) { width: 1rem; height: 1rem; } .notice-success { color: #486842; } .notice-error { color: #a7453e; }
  .wheel-stage { position: relative; min-height: 320px; display: grid; place-items: center; isolation: isolate; border-top: 1px solid rgba(23, 42, 69, .16); border-bottom: 1px solid rgba(23, 42, 69, .16); }
  .wheel-stamp { position: absolute; z-index: -1; width: 100%; max-width: 430px; opacity: .13; mix-blend-mode: multiply; pointer-events: none; }
  .letter-wheel { width: min(100%, 312px); touch-action: none; overflow: visible; user-select: none; }
  .outer-ring, .inner-ring, .core-ring { fill: none; } .outer-ring { stroke: #172a45; stroke-width: 1.7; stroke-dasharray: 2 5; opacity: .63; } .inner-ring { stroke: #172a45; stroke-width: 2.5; opacity: .19; } .core-ring { stroke: #e6a527; stroke-width: 1.2; opacity: .78; } .core-mark { fill: #172a45; opacity: .83; }
  .selection-line { fill: none; stroke: #e6a527; stroke-linecap: round; stroke-linejoin: round; stroke-width: 10; opacity: .9; }
  .letter-node { cursor: crosshair; } .letter-node circle { fill: #fffdf7; stroke: #172a45; stroke-width: 2.1; transition: fill .14s ease, transform .14s cubic-bezier(.23, 1, .32, 1); transform-box: fill-box; transform-origin: center; } .letter-node text { fill: #172a45; font-family: 'DM Sans', sans-serif; font-size: 20px; font-weight: 800; pointer-events: none; } .letter-node.active circle { fill: #e6a527; transform: scale(1.13); }
  .controls { justify-content: center; gap: 0; flex-wrap: wrap; padding-top: .85rem; border-bottom: 1px solid rgba(23, 42, 69, .16); } .controls .editorial-control { min-height: 2.35rem; border: 0; border-top: 1px solid rgba(23, 42, 69, .25); border-radius: 0; color: #172a45; font-size: .66rem; font-weight: 800; letter-spacing: .04em; box-shadow: none; transition: transform .16s cubic-bezier(.23, 1, .32, 1), background .16s ease; } .controls .editorial-control:not(:last-child) { border-right: 1px solid rgba(23, 42, 69, .25); } .controls .editorial-control :global(svg) { width: .95rem; height: .95rem; } .controls .next-button { background: #e6a527; border-color: #e6a527; } .controls .editorial-control:disabled { opacity: .42; }
  .game-footer { justify-content: center; gap: .42rem; padding-top: 1.25rem; color: rgba(23, 42, 69, .55); font-size: .67rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; } .game-footer :global(svg) { width: .95rem; height: .95rem; }
  .confetti { position: absolute; pointer-events: none; width: 130px; right: -28px; bottom: 44px; animation: enter .35s cubic-bezier(.23, 1, .32, 1); }
  @keyframes shake { 25% { transform: translateX(-7px); } 55% { transform: translateX(6px); } 80% { transform: translateX(-3px); } }
  @keyframes enter { from { transform: translateY(10px) rotate(-8deg); opacity: 0; } to { transform: translateY(0) rotate(0); opacity: 1; } }
  @media (min-width: 580px) { .crossword-frame { min-height: 278px; } .wheel-stage { min-height: 320px; } }
</style>
