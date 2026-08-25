<script lang="ts">
  /* Paper & Ink: a tactile editorial puzzle surface where the grid, word readout, and letter wheel are the primary instruments. */
  import '../app.css';
  import wordsDeCommon from '$lib/data/words.de.common.json';
  import wordsDeRare from '$lib/data/words.de.rare.json';
  import wordsEnCommon from '$lib/data/words.en.common.json';
  import wordsEnRare from '$lib/data/words.en.rare.json';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconClose from '~icons/material-symbols/cancel-rounded';
  import IconDark from '~icons/material-symbols/dark-mode-rounded';
  import IconLight from '~icons/material-symbols/light-mode-rounded';
  import IconVibrate from '~icons/material-symbols/vibration-rounded';

  type Language = 'de' | 'en';
  type Commonality = 'common' | 'rare';
  type Theme = 'light' | 'dark';
  type Orientation = 'across' | 'down';
  type Placement = { word: string; row: number; col: number; orientation: Orientation };
  type Round = { words: string[]; letters: string[]; cells: Map<string, string>; placements: Placement[]; bounds: [number, number, number, number] };
  type StoredGame = { version: 2; language: Language; commonality: Commonality; includeCommon: boolean; roundNumber: number; words: string[]; letters: string[]; placements: Placement[]; solvedWords: string[]; startedAt: number; completedDuration?: number };

  const CIRCLE = 146;
  const RADIUS = 108;
  const GAME_KEY = 'wordcircle-round-v2';
  const TOTAL_KEY = 'wordcircle-completed-v2';
  const HISTORY_KEY = 'wordcircle-history-v2';
  const COMMONALITY_KEY = 'wordcircle-commonality-v2';
  const INCLUDE_COMMON_KEY = 'wordcircle-include-common-v2';
  const brandMark = '/manus-storage/wordcircle-mark_cfd35b66.png';
  const paperWorkbench = '/manus-storage/wordcircle-paper-workbench_e732c526.jpg';
  const settingsTexture = '/manus-storage/wordcircle-settings-card_96c34da4.jpg';
  const successTexture = '/manus-storage/wordcircle-success-texture_77b47970.jpg';
  const pools: Record<Language, Record<Commonality, string[]>> = {
    de: { common: wordsDeCommon as string[], rare: wordsDeRare as string[] },
    en: { common: wordsEnCommon as string[], rare: wordsEnRare as string[] }
  };
  const copy = {
    de: { label: 'Wortkreis', hint: 'Ziehe über die Buchstaben, Wort für Wort.', allDone: 'Rätsel gelöst', time: 'Lösungszeit', continue: 'Nächstes Blatt', language: 'Sprache', commonality: 'Häufigkeit', common: 'Häufig', rare: 'Selten', includeCommon: 'Häufige Wörter beimischen', appearance: 'Darstellung', light: 'Hell', dark: 'Dunkel', settings: 'Einstellungen', vibration: 'Vibration', settingsHint: 'Spur ziehen. Wort finden. Nachschlagen.', round: 'Blatt', completed: 'Gelöste Blätter', tracePrompt: 'ZIEHE DIE SPUR', traceActive: 'DEINE SPUR', explanation: 'Wiktionary öffnen', sourceNote: 'Wortdaten & Quellen' },
    en: { label: 'WordCircle', hint: 'Trace the letters, one word at a time.', allDone: 'Puzzle solved', time: 'Solve time', continue: 'Next sheet', language: 'Language', commonality: 'Commonality', common: 'Common', rare: 'Rare', includeCommon: 'Mix in common words', appearance: 'Appearance', light: 'Light', dark: 'Dark', settings: 'Settings', vibration: 'Vibration', settingsHint: 'Trace. Find. Look it up.', round: 'Sheet', completed: 'Sheets solved', tracePrompt: 'TRACE THE WORD', traceActive: 'YOUR TRACE', explanation: 'Open Wiktionary', sourceNote: 'Word data & sources' }
  } as const;

  const stored = readStored();
  let lang = $state<Language>(stored?.language ?? 'de');
  let commonality = $state<Commonality>(stored?.commonality ?? readCommonality());
  let includeCommon = $state(stored?.includeCommon ?? readBoolean(INCLUDE_COMMON_KEY));
  let theme = $state<Theme>(readTheme());
  let vibration = $state(!isStored('wordcircle-vibration', 'off'));
  let settingsOpen = $state(false);
  let roundNumber = $state(stored?.roundNumber ?? 1);
  let completedRounds = $state(readNumber(TOTAL_KEY));
  let recentBases = $state<string[]>(readHistory());
  let solvedWords = $state<string[]>(stored?.solvedWords ?? []);
  let selectedPath = $state<number[]>([]);
  let feedback = $state<'correct' | 'wrong' | null>(null);
  let feedbackWord = $state('');
  let shakeGrid = $state(false);
  let isDragging = $state(false);
  let circleEl = $state<SVGSVGElement>();
  let startedAt = $state(stored?.startedAt ?? Date.now());
  let completedDuration = $state<number | null>(stored?.completedDuration ?? null);
  let currentRound = $state<Round>(stored ? roundFromStored(stored) : createRound(pools.de.common, [], randomSeed()));

  const labels = $derived(copy[lang]);
  const letters = $derived(currentRound.letters);
  const activeWord = $derived(selectedPath.map((index) => letters[index]).join(''));
  const previewWord = $derived(activeWord || feedbackWord);
  const allSolved = $derived(solvedWords.length === currentRound.words.length);
  const solvedSet = $derived(new Set(solvedWords));
  const solvedCells = $derived.by(() => {
    const cells = new Set<string>();
    currentRound.placements.filter((entry) => solvedSet.has(entry.word)).forEach((entry) => entry.word.split('').forEach((_letter, index) => cells.add(cellKey(entry.row + (entry.orientation === 'down' ? index : 0), entry.col + (entry.orientation === 'across' ? index : 0)))));
    return cells;
  });

  $effect(() => { document.documentElement.dataset.theme = theme; document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('wordcircle-theme', theme); });
  $effect(() => { localStorage.setItem('wordcircle-vibration', vibration ? 'on' : 'off'); });
  $effect(() => { localStorage.setItem(COMMONALITY_KEY, commonality); localStorage.setItem(INCLUDE_COMMON_KEY, includeCommon ? 'on' : 'off'); });
  $effect(() => { localStorage.setItem(TOTAL_KEY, String(completedRounds)); localStorage.setItem(HISTORY_KEY, JSON.stringify(recentBases)); });
  $effect(() => {
    const game: StoredGame = { version: 2, language: lang, commonality, includeCommon, roundNumber, words: currentRound.words, letters: currentRound.letters, placements: currentRound.placements, solvedWords, startedAt, completedDuration: completedDuration ?? undefined };
    localStorage.setItem(GAME_KEY, JSON.stringify(game));
  });

  function isStored(key: string, value: string) { return typeof localStorage !== 'undefined' && localStorage.getItem(key) === value; }
  function readTheme(): Theme { return isStored('wordcircle-theme', 'dark') ? 'dark' : 'light'; }
  function readCommonality(): Commonality { return isStored(COMMONALITY_KEY, 'rare') ? 'rare' : 'common'; }
  function readBoolean(key: string) { return isStored(key, 'on'); }
  function readNumber(key: string) { const value = Number(typeof localStorage === 'undefined' ? 0 : localStorage.getItem(key)); return Number.isSafeInteger(value) && value > 0 ? value : 0; }
  function readHistory(): string[] { try { const value: unknown = JSON.parse(typeof localStorage === 'undefined' ? '[]' : localStorage.getItem(HISTORY_KEY) ?? '[]'); return Array.isArray(value) ? value.filter((word): word is string => typeof word === 'string').slice(0, 20) : []; } catch { return []; } }
  function readStored(): StoredGame | null { try { const value: unknown = JSON.parse(typeof localStorage === 'undefined' ? 'null' : localStorage.getItem(GAME_KEY) ?? 'null'); if (!value || typeof value !== 'object') return null; const game = value as Partial<StoredGame>; return game.version === 2 && (game.language === 'de' || game.language === 'en') && (game.commonality === 'common' || game.commonality === 'rare') && typeof game.includeCommon === 'boolean' && Number.isInteger(game.roundNumber) && Number.isInteger(game.startedAt) && Array.isArray(game.words) && Array.isArray(game.letters) && Array.isArray(game.placements) && Array.isArray(game.solvedWords) ? game as StoredGame : null; } catch { return null; } }
  function cellKey(row: number, col: number) { return `${row}:${col}`; }
  function randomSeed() { const values = new Uint32Array(1); crypto.getRandomValues(values); return values[0]; }
  function rng(seed: number) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
  function shuffle<T>(values: T[], next: () => number) { const result = [...values]; for (let index = result.length - 1; index > 0; index -= 1) { const swap = Math.floor(next() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]; } return result; }
  function canSpell(word: string, letters: string[]) { const count = (value: string) => [...value].reduce<Record<string, number>>((map, character) => ({ ...map, [character]: (map[character] ?? 0) + 1 }), {}); const available = count(letters.join('')); return Object.entries(count(word)).every(([character, amount]) => (available[character] ?? 0) >= amount); }
  function selectedPool() { return commonality === 'rare' && includeCommon ? [...pools[lang].rare, ...pools[lang].common] : pools[lang][commonality]; }
  function place(cells: Map<string, string>, placements: Placement[], entry: Placement) { placements.push(entry); entry.word.split('').forEach((letter, index) => cells.set(cellKey(entry.row + (entry.orientation === 'down' ? index : 0), entry.col + (entry.orientation === 'across' ? index : 0)), letter)); }
  function bounds(cells: Map<string, string>): [number, number, number, number] { const positions = [...cells.keys()].map((key) => key.split(':').map(Number)); return [Math.min(...positions.map(([row]) => row)), Math.max(...positions.map(([row]) => row)), Math.min(...positions.map(([, col]) => col)), Math.max(...positions.map(([, col]) => col))]; }
  function createRound(pool: string[], excluded: string[], seed: number): Round {
    const next = rng(seed);
    const usable = [...new Set(pool.map((word) => word.trim().toUpperCase()).filter((word) => /^[A-ZÄÖÜ]+$/.test(word) && word.length >= 3 && word.length <= 8))];
    const bases = shuffle(usable.filter((word) => word.length >= 5 && usable.filter((candidate) => candidate !== word && canSpell(candidate, [...word])).length >= 4), next);
    for (const base of [...bases.filter((word) => !excluded.includes(word)), ...bases]) {
      const cells = new Map<string, string>();
      const placements: Placement[] = [];
      const usedColumns = new Set<number>();
      place(cells, placements, { word: base, row: 0, col: 0, orientation: 'across' });
      for (const word of shuffle(usable.filter((candidate) => candidate !== base && canSpell(candidate, [...base])), next)) {
        const match = word.split('').map((letter, wordIndex) => ({ wordIndex, baseIndex: base.indexOf(letter) })).find((entry) => entry.baseIndex >= 0 && !usedColumns.has(entry.baseIndex));
        if (!match) continue;
        place(cells, placements, { word, row: -match.wordIndex, col: match.baseIndex, orientation: 'down' });
        usedColumns.add(match.baseIndex);
        if (placements.length >= 6) break;
      }
      if (placements.length >= 5) return { words: placements.map((entry) => entry.word), letters: [...base], cells, placements, bounds: bounds(cells) };
    }
    const fallback = usable.find((word) => word.length >= 5) ?? 'WORT';
    const cells = new Map<string, string>(); const placements: Placement[] = [];
    place(cells, placements, { word: fallback, row: 0, col: 0, orientation: 'across' });
    return { words: [fallback], letters: [...fallback], cells, placements, bounds: bounds(cells) };
  }
  function roundFromStored(game: StoredGame): Round { const cells = new Map<string, string>(); game.placements.forEach((entry) => place(cells, [], entry)); return { words: game.words, letters: game.letters, cells, placements: game.placements, bounds: bounds(cells) }; }
  function newRound(nextLanguage = lang, reset = false) { lang = nextLanguage; if (reset) roundNumber = 0; currentRound = createRound(selectedPool(), recentBases, randomSeed()); recentBases = [currentRound.words[0], ...recentBases.filter((word) => word !== currentRound.words[0])].slice(0, 20); roundNumber += 1; solvedWords = []; selectedPath = []; feedback = null; feedbackWord = ''; completedDuration = null; startedAt = Date.now(); }
  function selectCommonality(next: Commonality) { commonality = next; if (next === 'common') includeCommon = false; newRound(); }
  function point(index: number) { const angle = (index / letters.length) * Math.PI * 2 - Math.PI / 2; return { x: CIRCLE + RADIUS * Math.cos(angle), y: CIRCLE + RADIUS * Math.sin(angle) }; }
  function pointFromEvent(event: PointerEvent) { const rect = circleEl?.getBoundingClientRect(); return rect ? { x: ((event.clientX - rect.left) / rect.width) * 292, y: ((event.clientY - rect.top) / rect.height) * 292 } : null; }
  function nearest(pointValue: { x: number; y: number }) { let best = -1; let distance = Infinity; letters.forEach((_letter, index) => { const candidate = point(index); const nextDistance = Math.hypot(pointValue.x - candidate.x, pointValue.y - candidate.y); if (nextDistance < distance) { best = index; distance = nextDistance; } }); return distance < 38 ? best : -1; }
  function choose(index: number) { if (allSolved || selectedPath.includes(index)) return; feedback = null; feedbackWord = ''; selectedPath = [...selectedPath, index]; if (vibration && 'vibrate' in navigator) navigator.vibrate(7); }
  function start(event: PointerEvent, known = -1) { if (allSolved) return; event.preventDefault(); (event.currentTarget as Element).setPointerCapture?.(event.pointerId); isDragging = true; selectedPath = []; feedback = null; feedbackWord = ''; const location = pointFromEvent(event); const index = known >= 0 ? known : location ? nearest(location) : -1; if (index >= 0) choose(index); }
  function move(event: PointerEvent) { if (!isDragging) return; const location = pointFromEvent(event); const index = location ? nearest(location) : -1; if (index >= 0 && index !== selectedPath.at(-1)) choose(index); }
  function end() { if (!isDragging) return; isDragging = false; const word = activeWord; selectedPath = []; feedbackWord = word; if (currentRound.words.includes(word) && !solvedSet.has(word)) { solvedWords = [...solvedWords, word]; feedback = 'correct'; if (vibration && 'vibrate' in navigator) navigator.vibrate([16, 18, 28]); if (solvedWords.length === currentRound.words.length) { completedDuration = Date.now() - startedAt; completedRounds += 1; } } else if (word.length > 1) { feedback = 'wrong'; shakeGrid = true; window.setTimeout(() => (shakeGrid = false), 260); } }
  function pathPoints() { return selectedPath.map((index) => { const spot = point(index); return `${spot.x},${spot.y}`; }).join(' '); }
  function duration(value: number | null) { const seconds = Math.floor((value ?? 0) / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
  function wiktionary(word: string) { const entry = lang === 'de' ? word[0] + word.slice(1).toLowerCase() : word.toLowerCase(); return `https://${lang}.wiktionary.org/wiki/${encodeURIComponent(entry)}`; }
</script>

<svelte:head><title>{labels.label} · WordCircle</title><meta name="description" content="Ein zweisprachiges Wortspiel mit häufigen und seltenen Wortlisten." /></svelte:head>
<svelte:window onpointerup={end} onpointercancel={end} />

<main class="game-shell" style={`--paper-workbench: url(${paperWorkbench});`}>
  <section class="game-paper" aria-label={labels.label}>
    <header class="game-header"><div class="brand-lockup"><span class="brand-icon"><img src={brandMark} alt="" onerror={(event) => ((event.currentTarget as HTMLImageElement).style.display = 'none')} /></span><div><p class="eyebrow">A printed word puzzle</p><h1><i>Word</i>Circle</h1></div></div><button class="settings-trigger" aria-expanded={settingsOpen} aria-controls="game-settings" onclick={() => (settingsOpen = true)}><span class="settings-mark" aria-hidden="true"></span><span class="sr-only">{labels.settings}</span></button></header>
    {#if settingsOpen}
      <aside id="game-settings" class="settings-panel" aria-label={labels.settings} style={`--settings-texture: url(${settingsTexture});`}>
        <button class="settings-close" onclick={() => (settingsOpen = false)} aria-label="Close settings"><IconClose /></button><div class="settings-intro"><span class="brand-icon"><img src={brandMark} alt="" onerror={(event) => ((event.currentTarget as HTMLImageElement).style.display = 'none')} /></span><div><strong><i>Word</i>Circle</strong><p>{labels.settingsHint}</p></div></div>
        <div class="setting-row"><span>{labels.language}</span><div class="segmented"><button class:chosen={lang === 'de'} onclick={() => { lang = 'de'; newRound('de', true); }}>DE</button><button class:chosen={lang === 'en'} onclick={() => { lang = 'en'; newRound('en', true); }}>EN</button></div></div>
        <div class="frequency-group"><div class="setting-row frequency-row"><span>{labels.commonality}</span><div class="segmented"><button class:chosen={commonality === 'common'} onclick={() => selectCommonality('common')}>{labels.common}</button><button class:chosen={commonality === 'rare'} onclick={() => selectCommonality('rare')}>{labels.rare}</button></div></div>{#if commonality === 'rare'}<div class="setting-row no-divider"><span>{labels.includeCommon}</span><input aria-label={labels.includeCommon} type="checkbox" class="toggle toggle-sm" checked={includeCommon} onchange={(event) => { includeCommon = (event.currentTarget as HTMLInputElement).checked; newRound(); }} /></div>{/if}</div>
        <div class="setting-row"><span>{labels.appearance}</span><div class="segmented"><button class:chosen={theme === 'light'} onclick={() => (theme = 'light')}><IconLight />{labels.light}</button><button class:chosen={theme === 'dark'} onclick={() => (theme = 'dark')}><IconDark />{labels.dark}</button></div></div>
        <div class="setting-row"><span><IconVibrate />{labels.vibration}</span><input aria-label={labels.vibration} type="checkbox" class="toggle toggle-sm" bind:checked={vibration} /></div><div class="setting-row completion-total"><span>{labels.completed}</span><strong>{completedRounds}</strong></div>
        <a class="settings-link" href="/word-data-attribution.txt" target="_blank" rel="noreferrer">{labels.sourceNote}</a><a class="settings-link" href="https://github.com/PXNX/words-sv" target="_blank" rel="noreferrer">GitHub · PXNX/words-sv</a>
      </aside>
    {/if}
    <div class:shake={shakeGrid} class="crossword-frame" aria-label="Crossword"><div class="crossword-scroll"><div class="crossword" style={`grid-template-columns: repeat(${currentRound.bounds[3] - currentRound.bounds[2] + 1}, var(--cell-size));`}>
      {#each Array(currentRound.bounds[1] - currentRound.bounds[0] + 1) as _, rowIndex}{#each Array(currentRound.bounds[3] - currentRound.bounds[2] + 1) as _, colIndex}{@const row = currentRound.bounds[0] + rowIndex}{@const col = currentRound.bounds[2] + colIndex}{@const letter = currentRound.cells.get(cellKey(row, col))}{#if letter}<div class:solved={solvedCells.has(cellKey(row, col))} class="crossword-cell">{solvedCells.has(cellKey(row, col)) ? letter : ''}</div>{:else}<div class="crossword-void"></div>{/if}{/each}{/each}
    </div></div><div class="frame-corner top-left"></div><div class="frame-corner top-right"></div><div class="frame-corner bottom-left"></div><div class="frame-corner bottom-right"></div></div>
    <div class="selection-area" aria-live="polite"><span class="round-chip">{labels.round} {roundNumber}</span><div class:has-word={previewWord.length > 0} class:correct={feedback === 'correct'} class:wrong={feedback === 'wrong'} class="selected-word"><span>{previewWord}</span>{#if feedback === 'correct'}<IconCheck aria-label="Correct" /><a class="word-reference" href={wiktionary(feedbackWord)} target="_blank" rel="noreferrer" aria-label={`${labels.explanation}: ${feedbackWord}`}>?</a>{:else if feedback === 'wrong'}<IconClose aria-label="Incorrect" />{/if}</div></div>
    <div class="wheel-stage"><svg bind:this={circleEl} viewBox="0 0 292 292" class="letter-wheel" role="application" aria-label={labels.hint} onpointerdown={start} onpointermove={move}><circle cx={CIRCLE} cy={CIRCLE} r={RADIUS} class="outer-ring" /><circle cx={CIRCLE} cy={CIRCLE} r="64" class="inner-ring" /><path d="M124 146a22 22 0 1 0 44 0a22 22 0 1 1-44 0Z" class="core-mark" /><text x={CIRCLE} y="142" text-anchor="middle" class:active-core={activeWord.length > 0} class="core-word">{activeWord || labels.tracePrompt}</text><text x={CIRCLE} y="162" text-anchor="middle" class="core-caption">{activeWord ? labels.traceActive : '·'}</text>{#if selectedPath.length > 1}<polyline points={pathPoints()} class="selection-line" />{/if}{#each letters as letter, index (index)}{@const spot = point(index)}<g transform={`translate(${spot.x} ${spot.y})`} class:active={selectedPath.includes(index)} class="letter-node" role="button" tabindex="0" aria-label={`Letter ${letter}`} onpointerdown={(event) => { event.stopPropagation(); start(event, index); }} onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') choose(index); }}><circle r="28"></circle><text text-anchor="middle" dominant-baseline="central">{letter}</text></g>{/each}</svg>
      {#if allSolved}<div class="completion-mark" aria-live="assertive" style={`--success-texture: url(${successTexture});`}><span class="completion-symbol" aria-hidden="true">✓</span><span>{labels.allDone}</span><span class="completion-time">{labels.time} <strong>{duration(completedDuration)}</strong></span><button class="completion-continue" onclick={() => newRound()}>{labels.continue}</button></div>{/if}
    </div>
  </section>
</main>

<style>
  /* Paper & Ink: warm paper, dark ink, and a localized wheel overlay; no orphaned dots or rectangles. */
  :global(.sr-only){position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.game-shell{min-height:100svh;padding:clamp(.7rem,3vw,2rem);display:grid;place-items:center;background-image:linear-gradient(rgba(245,240,230,.78),rgba(245,240,230,.88)),var(--paper-workbench);background-size:cover;background-position:center}.game-paper{position:relative;isolation:isolate;overflow:hidden;width:min(100%,690px);padding:clamp(.75rem,3vw,1.55rem);border:1px solid rgba(23,42,69,.2);background:rgba(255,253,247,.94);box-shadow:0 24px 70px rgba(30,33,44,.18),0 2px 0 rgba(23,42,69,.08)}.game-paper::before{content:'';position:absolute;z-index:-1;inset:8px;border:1px solid rgba(23,42,69,.12);pointer-events:none}.game-header{min-height:3.2rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0 .05rem .65rem;border-bottom:2px solid #172a45}.brand-lockup,.settings-intro{display:flex;align-items:center;gap:.7rem;color:#172a45}.brand-icon{position:relative;display:grid;place-items:center;width:2.55rem;height:2.55rem;flex:none}.brand-icon::before,.brand-icon::after{content:'';position:absolute;border:2px solid #172a45;border-radius:50%}.brand-icon::before{inset:.14rem}.brand-icon::after{inset:.45rem;transform:translate(-.15rem,.14rem)}.brand-icon img{position:relative;z-index:1;width:100%;height:100%;object-fit:contain}.eyebrow{margin:0 0 .1rem;color:#a45e38;font-size:.55rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.brand-lockup h1{margin:0;font-family:'DM Serif Display',serif;font-size:1.72rem;font-weight:400;letter-spacing:-.06em;line-height:.9}.brand-lockup h1 i,.settings-intro strong i{color:#a45e38;font-weight:400}.settings-intro strong{display:block;font-family:'DM Serif Display',serif;font-size:1.85rem;font-weight:400;letter-spacing:-.055em;line-height:.9}.settings-intro p{margin:.32rem 0 0;color:#a45e38;font-family:'DM Serif Display',serif;font-size:.93rem}.settings-trigger,.settings-close{display:grid;place-items:center;width:2.2rem;height:2.2rem;border:1px solid rgba(23,42,69,.25);border-radius:50%;background:#fffdf7;color:#172a45;transition:transform .16s cubic-bezier(.23,1,.32,1),background .16s ease}.settings-trigger:active,.settings-close:active,.completion-continue:active,.word-reference:active{transform:scale(.96)}.settings-mark{position:relative;width:.9rem;height:.9rem;border:2px solid currentColor;border-radius:50%}.settings-mark::before,.settings-mark::after{content:'';position:absolute;background:currentColor;border-radius:2px}.settings-mark::before{width:2px;height:1.25rem;top:-.35rem;left:.32rem}.settings-mark::after{width:1.25rem;height:2px;top:.32rem;left:-.35rem}.settings-panel{position:absolute;z-index:60;inset:0;margin:0;padding:clamp(4.8rem,16vw,6.2rem) clamp(1rem,5vw,2rem) 1.1rem;overflow-y:auto;border:0;background-color:#fffdf7;background-image:linear-gradient(rgba(255,253,247,.91),rgba(255,253,247,.98)),var(--settings-texture);background-size:cover;background-position:center;box-shadow:0 18px 55px rgba(23,42,69,.2);animation:drop-in .2s cubic-bezier(.23,1,.32,1)}.settings-close{position:absolute;top:.78rem;right:.78rem;background:#172a45;color:#fffdf7}.settings-close :global(svg){width:1.1rem;height:1.1rem}.setting-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:.82rem;margin-top:.82rem;border-top:1px solid rgba(23,42,69,.15);color:#172a45;font-size:.66rem;font-weight:800;letter-spacing:.055em;text-transform:uppercase}.setting-row.no-divider{border-top:0;margin-top:.35rem;padding-top:.35rem}.frequency-group{margin-top:.82rem;border-top:1px solid rgba(23,42,69,.15)}.frequency-group .setting-row{margin-top:0;border-top:0}.setting-row>span{display:inline-flex;align-items:center;gap:.35rem}.setting-row :global(svg){width:.9rem;height:.9rem}.segmented{display:flex;padding:2px;border:1px solid rgba(23,42,69,.22);border-radius:99px}.segmented button{min-height:1.7rem;padding:0 .58rem;display:inline-flex;align-items:center;gap:.25rem;border:0;border-radius:99px;background:transparent;color:rgba(23,42,69,.65);font-size:.61rem;font-weight:800}.segmented button :global(svg){width:.78rem;height:.78rem}.segmented button.chosen{background:#172a45;color:#fffdf7}.completion-total strong{color:#34824d;font-family:'DM Serif Display',serif;font-size:1.45rem;line-height:1}.settings-link{display:block;margin-top:1.2rem;color:#172a45;font-size:.62rem;font-weight:800;letter-spacing:.065em;text-transform:uppercase;text-decoration-color:#e6a527;text-underline-offset:.28rem}.crossword-frame{position:relative;min-height:215px;display:grid;place-items:stretch;padding:clamp(.5rem,3vw,1rem);background-color:#ede4d5;background-image:linear-gradient(rgba(23,42,69,.038) 1px,transparent 1px),linear-gradient(90deg,rgba(23,42,69,.038) 1px,transparent 1px);background-size:20px 20px;border-top:3px double #172a45;border-bottom:2px solid rgba(23,42,69,.45);transition:transform .16s cubic-bezier(.23,1,.32,1)}.crossword-frame.shake{animation:shake .26s cubic-bezier(.23,1,.32,1)}.crossword-scroll{min-width:0;min-height:0;overflow:auto;display:grid;place-items:center;padding:clamp(.7rem,3vw,1.25rem);overscroll-behavior:contain}.crossword{--cell-size:clamp(2.3rem,10vw,3.08rem);display:grid;width:max-content;min-width:calc(var(--cell-size)*3)}.crossword-cell{aspect-ratio:1;display:grid;place-items:center;border:1px solid #172a45;background:#fffdf7;color:#172a45;font-size:clamp(.76rem,3.4vw,1.1rem);font-weight:800;line-height:1;transition:background .18s ease,color .18s ease,transform .18s cubic-bezier(.23,1,.32,1)}.crossword-cell.solved{background:#e6a527;transform:scale(.965);animation:solve-cell .3s cubic-bezier(.23,1,.32,1)}.crossword-void{aspect-ratio:1}.frame-corner{position:absolute;width:13px;height:13px;border-color:#e6a527;border-style:solid;pointer-events:none}.top-left{top:7px;left:7px;border-width:2px 0 0 2px}.top-right{top:7px;right:7px;border-width:2px 2px 0 0}.bottom-left{bottom:7px;left:7px;border-width:0 0 2px 2px}.bottom-right{right:7px;bottom:7px;border-width:0 2px 2px 0}.selection-area{position:relative;min-height:57px;padding:.65rem 0 .35rem;text-align:center}.round-chip{position:absolute;top:.9rem;left:0;color:#172a45;font-size:.6rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.selected-word{min-height:1.8rem;display:inline-flex;align-items:center;justify-content:center;gap:.42rem;color:rgba(23,42,69,.35);font-family:'DM Serif Display',serif;font-size:clamp(1.35rem,5vw,1.8rem);letter-spacing:.12em;line-height:1}.selected-word :global(svg){width:1.35rem;height:1.35rem;letter-spacing:0}.selected-word.has-word{color:#172a45;animation:word-rise .18s cubic-bezier(.23,1,.32,1)}.selected-word.correct{color:#34824d}.selected-word.wrong{color:#b45045}.word-reference{display:grid;place-items:center;width:1.35rem;height:1.35rem;border:1px solid currentColor;border-radius:50%;color:inherit;font-family:'DM Sans',sans-serif;font-size:.73rem;font-weight:800;letter-spacing:0;text-decoration:none;transition:transform .16s cubic-bezier(.23,1,.32,1),background .16s ease}.word-reference:hover{background:rgba(52,130,77,.1)}.wheel-stage{position:relative;display:grid;place-items:center;min-height:clamp(18rem,61vw,25rem);padding:1.25rem 0 .65rem;border-top:1px dashed rgba(23,42,69,.3);background-image:linear-gradient(90deg,transparent 0,transparent 1.8rem,rgba(23,42,69,.11) 1.8rem,rgba(23,42,69,.11) calc(100% - 1.8rem),transparent calc(100% - 1.8rem)),linear-gradient(rgba(23,42,69,.022) 1px,transparent 1px);background-size:100% 100%,14px 14px}.wheel-stage::before{content:'TRACE / WORTKREIS';position:absolute;top:.4rem;left:50%;transform:translateX(-50%);color:rgba(23,42,69,.48);font-size:.54rem;font-weight:800;letter-spacing:.18em;white-space:nowrap}.letter-wheel{width:min(100%,23rem);overflow:visible;touch-action:none;user-select:none}.outer-ring{fill:none;stroke:#172a45;stroke-width:1.4;opacity:.58}.inner-ring{fill:rgba(230,165,39,.1);stroke:#e6a527;stroke-width:1.35}.core-mark{fill:#172a45}.core-word{fill:#172a45;font-family:'DM Serif Display',serif;font-size:14px;font-weight:400;letter-spacing:.7px}.core-word.active-core{fill:#a45e38}.core-caption{fill:#a45e38;font-family:'DM Sans',sans-serif;font-size:8px;font-weight:800;letter-spacing:2px}.selection-line{fill:none;stroke:#e6a527;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;opacity:.85}.letter-node{cursor:pointer}.letter-node circle{fill:#fffdf7;stroke:#172a45;stroke-width:2;filter:drop-shadow(0 3px 0 rgba(23,42,69,.12));transition:fill .16s ease,transform .16s cubic-bezier(.23,1,.32,1)}.letter-node text{fill:#172a45;font-family:'DM Sans',sans-serif;font-size:20px;font-weight:800;pointer-events:none}.letter-node.active circle{fill:#e6a527;stroke:#e6a527}.completion-mark{position:absolute;z-index:5;inset:10% 8%;display:grid;place-content:center;justify-items:center;gap:.5rem;border:1px solid rgba(52,130,77,.4);border-radius:1.25rem;background-color:rgba(255,253,247,.85);background-image:linear-gradient(rgba(255,253,247,.78),rgba(255,253,247,.9)),var(--success-texture);background-size:cover;background-position:center;color:#34824d;box-shadow:0 16px 42px rgba(23,42,69,.17);backdrop-filter:blur(10px);animation:completion-in .3s cubic-bezier(.23,1,.32,1) both}.completion-symbol{display:grid;place-items:center;width:clamp(3.8rem,16vw,5.1rem);height:clamp(3.8rem,16vw,5.1rem);border:.32rem solid currentColor;border-radius:50%;font-family:'DM Sans',sans-serif;font-size:clamp(2.5rem,10vw,3.6rem);font-weight:800;line-height:1}.completion-mark>span:nth-child(2){font-family:'DM Serif Display',serif;font-size:clamp(1.2rem,5vw,1.65rem);letter-spacing:-.02em}.completion-time{color:#172a45;font-size:.64rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.completion-time strong{color:#34824d;font-family:'DM Serif Display',serif;font-size:1.05rem;letter-spacing:0}.completion-continue{min-height:2.35rem;padding:0 1.05rem;border:1px solid #34824d;border-radius:999px;background:#34824d;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;box-shadow:none;transition:transform .16s cubic-bezier(.23,1,.32,1),background .16s ease}@keyframes drop-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}@keyframes completion-in{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}@keyframes word-rise{from{opacity:.35;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes solve-cell{from{transform:scale(.82)}to{transform:scale(.965)}}@keyframes shake{20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}@media(prefers-reduced-motion:reduce){.settings-panel,.completion-mark,.selected-word,.crossword-cell{animation:none!important}}@media(max-width:430px){.game-shell{padding:.35rem;place-items:start center}.game-paper{min-height:100svh;width:100%;border:0}.wheel-stage{min-height:18rem}.round-chip{font-size:.53rem}.crossword-frame{min-height:195px}}
</style>
