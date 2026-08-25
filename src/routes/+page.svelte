<script lang="ts">
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
	import IconCheck from '~icons/material-symbols/check-circle-rounded';
	import IconClose from '~icons/material-symbols/cancel-rounded';
	import IconDark from '~icons/material-symbols/dark-mode-rounded';
	import IconGithub from '~icons/logos/github-icon';
	import IconLight from '~icons/material-symbols/light-mode-rounded';
	import IconSettings from '~icons/material-symbols/settings-rounded';
	import IconVibrate from '~icons/material-symbols/vibration-rounded';

	type Language = 'de' | 'en';
	type Theme = 'light' | 'dark';
	type VocabularyLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';
	type Orientation = 'across' | 'down';
	type Placement = { word: string; row: number; col: number; orientation: Orientation };
	type Round = { words: string[]; letters: string[]; cells: Map<string, string>; placements: Placement[]; bounds: [number, number, number, number] };
	type StoredGame = {
		version: 3;
		language: Language;
		vocabularyLevel: VocabularyLevel;
		includeLowerVocabulary: boolean;
		allowBackwardWords: boolean;
		roundNumber: number;
		words: string[];
		letters: string[];
		placements: Placement[];
		solvedWords: string[];
		startedAt: number;
		completedDuration?: number;
	};

	const CIRCLE = 146;
	const RADIUS = 108;
	const GAME_KEY = 'wordcircle-round-v3';
	const TOTAL_KEY = 'wordcircle-completed-v3';
	const HISTORY_KEY = 'wordcircle-history-v3';
	const LEVEL_KEY = 'wordcircle-vocabulary-level-v3';
	const INCLUDE_LOWER_KEY = 'wordcircle-include-lower-v3';
	const BACKWARD_KEY = 'wordcircle-backwards-v3';
	const levels: VocabularyLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
	const wordPools: Record<Language, Record<VocabularyLevel, string[]>> = {
		de: { a1: wordsDeA1 as string[], a2: wordsDeA2 as string[], b1: wordsDeB1 as string[], b2: wordsDeB2 as string[], c1: wordsDeC1 as string[], c2: wordsDeC2 as string[] },
		en: { a1: wordsEnA1 as string[], a2: wordsEnA2 as string[], b1: wordsEnB1 as string[], b2: wordsEnB2 as string[], c1: wordsEnC1 as string[], c2: wordsEnC2 as string[] }
	};
	const copy = {
		de: {
			label: 'Wortkreis', hint: 'Ziehe über die Buchstaben, Wort für Wort.', allDone: 'Rätsel gelöst', time: 'Lösungszeit', continue: 'Nächstes Blatt', language: 'Sprache', vocabulary: 'Niveau', includeLower: 'Niedrigere Niveaus', reverse: 'Rückwärts schreiben', appearance: 'Darstellung', light: 'Hell', dark: 'Dunkel', settings: 'Einstellungen', vibration: 'Vibration', settingsHint: 'Spur ziehen. Wort finden. Nachschlagen.', round: 'Blatt', completed: 'Gelöste Blätter', tracePrompt: 'ZIEHE DIE SPUR', traceActive: 'DEINE SPUR', explanation: 'Wiktionary öffnen', sourceNote: 'Wortdaten & Quellen'
		},
		en: {
			label: 'WordCircle', hint: 'Trace the letters, one word at a time.', allDone: 'Puzzle solved', time: 'Solve time', continue: 'Next sheet', language: 'Language', vocabulary: 'Level', includeLower: 'Include lower levels', reverse: 'Spell backwards', appearance: 'Appearance', light: 'Light', dark: 'Dark', settings: 'Settings', vibration: 'Vibration', settingsHint: 'Trace. Find. Look it up.', round: 'Sheet', completed: 'Sheets solved', tracePrompt: 'TRACE THE WORD', traceActive: 'YOUR TRACE', explanation: 'Open Wiktionary', sourceNote: 'Word data & sources'
		}
	} as const;

	const stored = readStored();
	let lang = $state<Language>(stored?.language ?? 'de');
	let vocabularyLevel = $state<VocabularyLevel>(stored?.vocabularyLevel ?? readLevel());
	let includeLowerVocabulary = $state(stored?.includeLowerVocabulary ?? isStored(INCLUDE_LOWER_KEY, 'on'));
	let allowBackwardWords = $state(stored?.allowBackwardWords ?? isStored(BACKWARD_KEY, 'on'));
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
	let currentRound = $state<Round>(stored ? roundFromStored(stored) : createRound(wordPools.de.a1, [], randomSeed()));

	const labels = $derived(copy[lang]);
	const letters = $derived(currentRound.letters);
	const activeWord = $derived(selectedPath.map((index) => letters[index]).join(''));
	const previewWord = $derived(activeWord || feedbackWord);
	const allSolved = $derived(solvedWords.length === currentRound.words.length);
	const solvedSet = $derived(new Set(solvedWords));
	const solvedCells = $derived.by(() => {
		const cells = new Set<string>();
		currentRound.placements
			.filter((entry) => solvedSet.has(entry.word))
			.forEach((entry) => entry.word.split('').forEach((_letter, index) => cells.add(cellKey(entry.row + (entry.orientation === 'down' ? index : 0), entry.col + (entry.orientation === 'across' ? index : 0)))));
		return cells;
	});

	$effect(() => {
		document.documentElement.dataset.theme = theme;
		document.documentElement.classList.toggle('dark', theme === 'dark');
		localStorage.setItem('wordcircle-theme', theme);
	});
	$effect(() => localStorage.setItem('wordcircle-vibration', vibration ? 'on' : 'off'));
	$effect(() => localStorage.setItem(LEVEL_KEY, vocabularyLevel));
	$effect(() => localStorage.setItem(INCLUDE_LOWER_KEY, includeLowerVocabulary ? 'on' : 'off'));
	$effect(() => localStorage.setItem(BACKWARD_KEY, allowBackwardWords ? 'on' : 'off'));
	$effect(() => localStorage.setItem(TOTAL_KEY, String(completedRounds)));
	$effect(() => localStorage.setItem(HISTORY_KEY, JSON.stringify(recentBases)));
	$effect(() => {
		const game: StoredGame = { version: 3, language: lang, vocabularyLevel, includeLowerVocabulary, allowBackwardWords, roundNumber, words: currentRound.words, letters: currentRound.letters, placements: currentRound.placements, solvedWords, startedAt, completedDuration: completedDuration ?? undefined };
		localStorage.setItem(GAME_KEY, JSON.stringify(game));
	});

	function isStored(key: string, value: string) { return typeof localStorage !== 'undefined' && localStorage.getItem(key) === value; }
	function readTheme(): Theme { return isStored('wordcircle-theme', 'dark') ? 'dark' : 'light'; }
	function readLevel(): VocabularyLevel { const value = typeof localStorage === 'undefined' ? null : localStorage.getItem(LEVEL_KEY); return levels.includes(value as VocabularyLevel) ? value as VocabularyLevel : 'a1'; }
	function readNumber(key: string) { const value = Number(typeof localStorage === 'undefined' ? 0 : localStorage.getItem(key)); return Number.isSafeInteger(value) && value > 0 ? value : 0; }
	function readHistory(): string[] { try { const value: unknown = JSON.parse(typeof localStorage === 'undefined' ? '[]' : localStorage.getItem(HISTORY_KEY) ?? '[]'); return Array.isArray(value) ? value.filter((word): word is string => typeof word === 'string').slice(0, 20) : []; } catch { return []; } }
	function readStored(): StoredGame | null {
		try {
			const value: unknown = JSON.parse(typeof localStorage === 'undefined' ? 'null' : localStorage.getItem(GAME_KEY) ?? 'null');
			if (!value || typeof value !== 'object') return null;
			const game = value as Partial<StoredGame>;
			if (game.version !== 3 || (game.language !== 'de' && game.language !== 'en') || !levels.includes(game.vocabularyLevel as VocabularyLevel) || typeof game.includeLowerVocabulary !== 'boolean' || typeof game.allowBackwardWords !== 'boolean' || !Number.isInteger(game.roundNumber) || !Number.isInteger(game.startedAt) || !Array.isArray(game.words) || !Array.isArray(game.letters) || !Array.isArray(game.placements) || !Array.isArray(game.solvedWords)) return null;
			return game as StoredGame;
		} catch { return null; }
	}
	function cellKey(row: number, col: number) { return `${row}:${col}`; }
	function randomSeed() { const values = new Uint32Array(1); crypto.getRandomValues(values); return values[0]; }
	function rng(seed: number) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
	function shuffle<T>(values: T[], next: () => number) { const result = [...values]; for (let index = result.length - 1; index > 0; index -= 1) { const swap = Math.floor(next() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]; } return result; }
	function canSpell(word: string, lettersForWord: string[]) { const count = (value: string) => [...value].reduce<Record<string, number>>((map, character) => ({ ...map, [character]: (map[character] ?? 0) + 1 }), {}); const available = count(lettersForWord.join('')); return Object.entries(count(word)).every(([character, amount]) => (available[character] ?? 0) >= amount); }
	function selectedPool(language = lang, level = vocabularyLevel, includeLower = includeLowerVocabulary) { const end = levels.indexOf(level); const selectedLevels = includeLower ? levels.slice(0, end + 1) : [level]; return selectedLevels.flatMap((entry) => wordPools[language][entry]); }
	function place(cells: Map<string, string>, placements: Placement[], entry: Placement) { placements.push(entry); entry.word.split('').forEach((letter, index) => cells.set(cellKey(entry.row + (entry.orientation === 'down' ? index : 0), entry.col + (entry.orientation === 'across' ? index : 0)), letter)); }
	function bounds(cells: Map<string, string>): [number, number, number, number] { const positions = [...cells.keys()].map((key) => key.split(':').map(Number)); return [Math.min(...positions.map(([row]) => row)), Math.max(...positions.map(([row]) => row)), Math.min(...positions.map(([, col]) => col)), Math.max(...positions.map(([, col]) => col))]; }
	function createRound(pool: string[], excluded: string[], seed: number): Round {
		const next = rng(seed);
		const usable = [...new Set(pool.map((word) => word.trim().toUpperCase()).filter((word) => /^[A-ZÄÖÜ]+$/.test(word) && word.length >= 3 && word.length <= 8))];
		const bases = shuffle(usable.filter((word) => word.length >= 5 && usable.filter((candidate) => candidate !== word && canSpell(candidate, [...word])).length >= 4), next);
		for (const base of [...bases.filter((word) => !excluded.includes(word)), ...bases]) {
			const cells = new Map<string, string>(); const placements: Placement[] = []; const usedColumns = new Set<number>();
			place(cells, placements, { word: base, row: 0, col: 0, orientation: 'across' });
			for (const word of shuffle(usable.filter((candidate) => candidate !== base && canSpell(candidate, [...base])), next)) {
				const match = word.split('').map((letter, wordIndex) => ({ wordIndex, baseIndex: base.indexOf(letter) })).find((entry) => entry.baseIndex >= 0 && !usedColumns.has(entry.baseIndex));
				if (!match) continue;
				place(cells, placements, { word, row: -match.wordIndex, col: match.baseIndex, orientation: 'down' }); usedColumns.add(match.baseIndex);
				if (placements.length >= 6) break;
			}
			if (placements.length >= 5) return { words: placements.map((entry) => entry.word), letters: [...base], cells, placements, bounds: bounds(cells) };
		}
		const fallback = usable.find((word) => word.length >= 5) ?? 'WORT'; const cells = new Map<string, string>(); const placements: Placement[] = [];
		place(cells, placements, { word: fallback, row: 0, col: 0, orientation: 'across' }); return { words: [fallback], letters: [...fallback], cells, placements, bounds: bounds(cells) };
	}
	function roundFromStored(game: StoredGame): Round { const cells = new Map<string, string>(); game.placements.forEach((entry) => place(cells, [], entry)); return { words: game.words, letters: game.letters, cells, placements: game.placements, bounds: bounds(cells) }; }
	function newRound(nextLanguage = lang, reset = false) { lang = nextLanguage; if (reset) roundNumber = 0; currentRound = createRound(selectedPool(nextLanguage), recentBases, randomSeed()); recentBases = [currentRound.words[0], ...recentBases.filter((word) => word !== currentRound.words[0])].slice(0, 20); roundNumber += 1; solvedWords = []; selectedPath = []; feedback = null; feedbackWord = ''; completedDuration = null; startedAt = Date.now(); }
	function selectLevel(next: VocabularyLevel) { vocabularyLevel = next; if (next === 'a1') includeLowerVocabulary = false; newRound(); }
	function point(index: number) { const angle = (index / letters.length) * Math.PI * 2 - Math.PI / 2; return { x: CIRCLE + RADIUS * Math.cos(angle), y: CIRCLE + RADIUS * Math.sin(angle) }; }
	function pointFromEvent(event: PointerEvent) { const rect = circleEl?.getBoundingClientRect(); return rect ? { x: ((event.clientX - rect.left) / rect.width) * 292, y: ((event.clientY - rect.top) / rect.height) * 292 } : null; }
	function nearest(pointValue: { x: number; y: number }) { let best = -1; let distance = Infinity; letters.forEach((_letter, index) => { const candidate = point(index); const nextDistance = Math.hypot(pointValue.x - candidate.x, pointValue.y - candidate.y); if (nextDistance < distance) { best = index; distance = nextDistance; } }); return distance < 38 ? best : -1; }
	function choose(index: number) { if (allSolved || selectedPath.includes(index)) return; feedback = null; feedbackWord = ''; selectedPath = [...selectedPath, index]; if (vibration && 'vibrate' in navigator) navigator.vibrate(7); }
	function start(event: PointerEvent, known = -1) { if (allSolved) return; event.preventDefault(); (event.currentTarget as Element).setPointerCapture?.(event.pointerId); isDragging = true; selectedPath = []; feedback = null; feedbackWord = ''; const location = pointFromEvent(event); const index = known >= 0 ? known : location ? nearest(location) : -1; if (index >= 0) choose(index); }
	function move(event: PointerEvent) { if (!isDragging) return; const location = pointFromEvent(event); const index = location ? nearest(location) : -1; if (index >= 0 && index !== selectedPath.at(-1)) choose(index); }
	function end() {
		if (!isDragging) return; isDragging = false; const selected = activeWord; selectedPath = [];
		const reversed = [...selected].reverse().join(''); const resolved = currentRound.words.includes(selected) ? selected : allowBackwardWords && currentRound.words.includes(reversed) ? reversed : null;
		feedbackWord = resolved ?? selected;
		if (resolved && !solvedSet.has(resolved)) { solvedWords = [...solvedWords, resolved]; feedback = 'correct'; if (vibration && 'vibrate' in navigator) navigator.vibrate([16, 18, 28]); if (solvedWords.length === currentRound.words.length) { completedDuration = Date.now() - startedAt; completedRounds += 1; } }
		else if (selected.length > 1) { feedback = 'wrong'; shakeGrid = true; window.setTimeout(() => (shakeGrid = false), 260); }
	}
	function pathPoints() { return selectedPath.map((index) => { const spot = point(index); return `${spot.x},${spot.y}`; }).join(' '); }
	function duration(value: number | null) { const seconds = Math.floor((value ?? 0) / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
	function wiktionary(word: string) { const entry = lang === 'de' ? word[0] + word.slice(1).toLowerCase() : word.toLowerCase(); return `https://${lang}.wiktionary.org/wiki/${encodeURIComponent(entry)}`; }
</script>

<svelte:head><title>{labels.label} · WordCircle</title><meta name="description" content="A bilingual word game with CEFR vocabulary levels." /></svelte:head>
<svelte:window onpointerup={end} onpointercancel={end} />

<main class="game-shell">
	<section class="game-paper" aria-label={labels.label}>
		{#if settingsOpen}
			<aside id="game-settings" class="settings-panel" aria-label={labels.settings}>
				<button class="settings-close" onclick={() => (settingsOpen = false)} aria-label="Close settings"><IconClose /></button>
				<div class="settings-intro"><span class="brand-mark" aria-hidden="true"></span><div><strong><i>Word</i>Circle</strong><p>{labels.settingsHint}</p></div></div>
				<div class="setting-row"><span>{labels.language}</span><div class="segmented"><button class:chosen={lang === 'de'} onclick={() => newRound('de', true)}>DE</button><button class:chosen={lang === 'en'} onclick={() => newRound('en', true)}>EN</button></div></div>
				<div class="setting-row level-row"><span>{labels.vocabulary}</span><div class="segmented level-segmented">{#each levels as level}<button class:chosen={vocabularyLevel === level} onclick={() => selectLevel(level)}>{level.toUpperCase()}</button>{/each}</div></div>
				{#if vocabularyLevel !== 'a1'}<div class="setting-row no-divider"><span>{labels.includeLower}</span><input aria-label={labels.includeLower} type="checkbox" class="toggle toggle-sm" checked={includeLowerVocabulary} onchange={(event) => { includeLowerVocabulary = (event.currentTarget as HTMLInputElement).checked; newRound(); }} /></div>{/if}
				<div class="setting-row"><span>{labels.reverse}</span><input aria-label={labels.reverse} type="checkbox" class="toggle toggle-sm" bind:checked={allowBackwardWords} /></div>
				<div class="setting-row"><span>{labels.appearance}</span><div class="segmented"><button class:chosen={theme === 'light'} onclick={() => (theme = 'light')}><IconLight />{labels.light}</button><button class:chosen={theme === 'dark'} onclick={() => (theme = 'dark')}><IconDark />{labels.dark}</button></div></div>
				<div class="setting-row"><span><IconVibrate />{labels.vibration}</span><input aria-label={labels.vibration} type="checkbox" class="toggle toggle-sm" bind:checked={vibration} /></div>
				<div class="setting-row completion-total"><span>{labels.completed}</span><strong>{completedRounds}</strong></div>
				<a class="settings-link" href="/word-data-attribution.txt" target="_blank" rel="noreferrer">{labels.sourceNote}</a>
				<a class="settings-link settings-github" href="https://github.com/PXNX/words-sv" target="_blank" rel="noreferrer"><IconGithub /><span>GitHub · PXNX/words-sv</span></a>
			</aside>
		{/if}

		<div class:shake={shakeGrid} class="crossword-frame" aria-label="Crossword"><div class="crossword-scroll"><div class="crossword" style={`grid-template-columns: repeat(${currentRound.bounds[3] - currentRound.bounds[2] + 1}, var(--cell-size));`}>
			{#each Array(currentRound.bounds[1] - currentRound.bounds[0] + 1) as _, rowIndex}{#each Array(currentRound.bounds[3] - currentRound.bounds[2] + 1) as _, colIndex}{@const row = currentRound.bounds[0] + rowIndex}{@const col = currentRound.bounds[2] + colIndex}{@const letter = currentRound.cells.get(cellKey(row, col))}{#if letter}<div class:solved={solvedCells.has(cellKey(row, col))} class="crossword-cell">{solvedCells.has(cellKey(row, col)) ? letter : ''}</div>{:else}<div class="crossword-void"></div>{/if}{/each}{/each}
		</div></div><div class="frame-corner top-left"></div><div class="frame-corner top-right"></div><div class="frame-corner bottom-left"></div><div class="frame-corner bottom-right"></div></div>

		<div class="selection-area" aria-live="polite"><span class="round-chip">{labels.round} {roundNumber}</span><button class="settings-trigger" aria-expanded={settingsOpen} aria-controls="game-settings" onclick={() => (settingsOpen = true)}><IconSettings aria-hidden="true" /><span class="sr-only">{labels.settings}</span></button><div class:has-word={previewWord.length > 0} class:correct={feedback === 'correct'} class:wrong={feedback === 'wrong'} class="selected-word"><span>{previewWord}</span>{#if feedback === 'correct'}<IconCheck aria-label="Correct" /><a class="word-reference" href={wiktionary(feedbackWord)} target="_blank" rel="noreferrer" aria-label={`${labels.explanation}: ${feedbackWord}`}>?</a>{:else if feedback === 'wrong'}<IconClose aria-label="Incorrect" />{/if}</div></div>

		<div class="wheel-stage"><svg bind:this={circleEl} viewBox="0 0 292 292" class="letter-wheel" role="application" aria-label={labels.hint} onpointerdown={start} onpointermove={move}><circle cx={CIRCLE} cy={CIRCLE} r={RADIUS} class="outer-ring" /><circle cx={CIRCLE} cy={CIRCLE} r="64" class="inner-ring" /><path d="M124 146a22 22 0 1 0 44 0a22 22 0 1 1-44 0Z" class="core-mark" /><text x={CIRCLE} y="142" text-anchor="middle" class:active-core={activeWord.length > 0} class="core-word">{activeWord || labels.tracePrompt}</text><text x={CIRCLE} y="162" text-anchor="middle" class="core-caption">{activeWord ? labels.traceActive : '·'}</text>{#if selectedPath.length > 1}<polyline points={pathPoints()} class="selection-line" />{/if}{#each letters as letter, index (index)}{@const spot = point(index)}<g transform={`translate(${spot.x} ${spot.y})`} class:active={selectedPath.includes(index)} class="letter-node" role="button" tabindex="0" aria-label={`Letter ${letter}`} onpointerdown={(event) => { event.stopPropagation(); start(event, index); }} onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') choose(index); }}><circle r="28"></circle><text text-anchor="middle" dominant-baseline="central">{letter}</text></g>{/each}</svg>
			{#if allSolved}<div class="completion-mark" aria-live="assertive"><span class="completion-symbol" aria-hidden="true">✓</span><span>{labels.allDone}</span><span class="completion-time">{labels.time} <strong>{duration(completedDuration)}</strong></span><button class="completion-continue" onclick={() => newRound()}>{labels.continue}</button></div>{/if}
		</div>
	</section>
</main>

<style>
	:global(.sr-only){position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
	.game-shell{min-height:100svh;padding:clamp(.4rem,2vw,1.3rem);display:grid;place-items:center;background:radial-gradient(circle at 50% 0,#fffdf7 0,#f5f0e6 66%)}
	.game-paper{position:relative;isolation:isolate;overflow:hidden;width:min(100%,660px);padding:clamp(.65rem,3vw,1.25rem);border:1px solid rgba(23,42,69,.17);background:#fffdf7;box-shadow:0 24px 70px rgba(30,33,44,.13),0 2px 0 rgba(23,42,69,.08)}
	.game-paper::before{content:'';position:absolute;z-index:-1;inset:8px;border:1px solid rgba(23,42,69,.13);pointer-events:none}
	.crossword-frame{position:relative;min-height:205px;display:grid;place-items:stretch;padding:clamp(.5rem,3vw,1rem);background-color:#ede4d5;background-image:linear-gradient(rgba(23,42,69,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(23,42,69,.035) 1px,transparent 1px);background-size:20px 20px;border-top:3px double #172a45;border-bottom:2px solid rgba(23,42,69,.45)}
	.crossword-frame.shake{animation:shake .28s cubic-bezier(.23,1,.32,1)}
	.crossword-scroll{min-width:0;min-height:0;overflow:auto;display:grid;place-items:center;padding:clamp(.65rem,3vw,1.25rem);overscroll-behavior:contain}
	.crossword{--cell-size:clamp(2.25rem,10vw,3rem);display:grid;width:max-content;min-width:calc(var(--cell-size)*3)}
	.crossword-cell{aspect-ratio:1;display:grid;place-items:center;border:1px solid #172a45;background:#fffdf7;color:#172a45;font-size:clamp(.76rem,3.4vw,1.1rem);font-weight:800;line-height:1;transition:background .18s ease,color .18s ease,transform .18s cubic-bezier(.23,1,.32,1)}
	.crossword-cell.solved{background:#e6a527;transform:scale(.965);animation:solve-cell .3s cubic-bezier(.23,1,.32,1)}.crossword-void{aspect-ratio:1}
	.frame-corner{position:absolute;width:13px;height:13px;border-color:#e6a527;border-style:solid;pointer-events:none}.top-left{top:7px;left:7px;border-width:2px 0 0 2px}.top-right{top:7px;right:7px;border-width:2px 2px 0 0}.bottom-left{bottom:7px;left:7px;border-width:0 0 2px 2px}.bottom-right{right:7px;bottom:7px;border-width:0 2px 2px 0}
	.selection-area{position:relative;min-height:52px;padding:.55rem 0 .2rem;text-align:center}.round-chip{position:absolute;top:.75rem;left:0;color:#172a45;font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.settings-trigger,.settings-close{display:grid;place-items:center;width:2.15rem;height:2.15rem;border:1px solid rgba(23,42,69,.24);border-radius:50%;background:#fffdf7;color:#172a45;transition:transform .18s cubic-bezier(.23,1,.32,1),background .18s ease}.settings-trigger :global(svg),.settings-close :global(svg){width:1.1rem;height:1.1rem}.selection-area .settings-trigger{position:absolute;top:.38rem;right:0}.settings-trigger:active,.settings-close:active,.completion-continue:active,.word-reference:active{transform:scale(.96)}
	.selected-word{min-height:1.7rem;display:inline-flex;align-items:center;justify-content:center;gap:.48rem;color:rgba(23,42,69,.35);font-family:'DM Serif Display',serif;font-size:clamp(1.25rem,5vw,1.7rem);letter-spacing:.16em;line-height:1}.selected-word :global(svg){width:1.35rem;height:1.35rem;letter-spacing:0}.selected-word.has-word{color:#172a45;animation:word-rise .18s cubic-bezier(.23,1,.32,1)}.selected-word.correct{color:#3f7a50}.selected-word.wrong{color:#b54442}.word-reference{display:grid;place-items:center;width:1.35rem;height:1.35rem;border:1px solid currentColor;border-radius:50%;color:inherit;font-family:'DM Sans',sans-serif;font-size:.73rem;font-weight:800;letter-spacing:0;text-decoration:none}
	.wheel-stage{position:relative;min-height:235px;display:grid;place-items:center;border-top:1px solid rgba(23,42,69,.16);border-bottom:1px solid rgba(23,42,69,.16)}.letter-wheel{width:min(100%,248px);touch-action:none;overflow:visible;user-select:none}.outer-ring{fill:none;stroke:#172a45;stroke-width:1.1;opacity:.3}.inner-ring{fill:rgba(230,165,39,.1);stroke:#e6a527;stroke-width:1.35}.core-mark{fill:#172a45;opacity:.85}.core-word{fill:rgba(23,42,69,.6);font-family:'DM Serif Display',serif;font-size:13px;letter-spacing:.08em}.core-word.active-core{fill:#c98220}.core-caption{fill:rgba(23,42,69,.5);font-family:'DM Sans',sans-serif;font-size:6px;font-weight:800;letter-spacing:.18em}.selection-line{fill:none;stroke:#e6a527;stroke-linecap:round;stroke-linejoin:round;stroke-width:8;opacity:.9}.letter-node{cursor:crosshair}.letter-node circle{fill:#fffdf7;stroke:#172a45;stroke-width:2;filter:drop-shadow(0 3px 0 rgba(23,42,69,.16));transition:fill .14s ease,transform .14s cubic-bezier(.23,1,.32,1)}.letter-node text{fill:#172a45;font-family:'DM Sans',sans-serif;font-size:20px;font-weight:800;pointer-events:none}.letter-node.active circle{fill:#e6a527;stroke:#e6a527;transform:scale(1.1)}
	.settings-panel{position:absolute;z-index:60;inset:0;margin:0;padding:clamp(4.5rem,16vw,6rem) clamp(1rem,5vw,2rem) 1rem;overflow-y:auto;border:0;background:#fffdf7;box-shadow:0 18px 55px rgba(23,42,69,.2);animation:drop-in .2s cubic-bezier(.23,1,.32,1)}.settings-close{position:absolute;top:.72rem;right:.72rem;background:#172a45;color:#fffdf7}.settings-intro{display:flex;align-items:center;gap:.75rem;color:#172a45}.brand-mark{position:relative;width:34px;height:34px;display:block;flex:none;border:2px solid #172a45;border-radius:50%}.brand-mark::after{content:'';position:absolute;right:-4px;bottom:-4px;width:18px;height:18px;border:2px solid #e6a527;border-radius:50%;background:inherit}.settings-intro strong{display:block;font-family:'DM Serif Display',serif;font-size:clamp(1.45rem,6vw,2rem);font-weight:400;letter-spacing:-.04em;line-height:.9}.settings-intro p{margin:.35rem 0 0;color:#a45e38;font-family:'DM Serif Display',serif;font-size:.94rem}.setting-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:.82rem;margin-top:.82rem;border-top:1px solid rgba(23,42,69,.14);color:#172a45;font-size:.67rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.setting-row.no-divider{border-top:0;margin-top:.35rem;padding-top:.35rem}.setting-row>span{display:inline-flex;align-items:center;gap:.35rem}.setting-row :global(svg){width:.9rem;height:.9rem}.level-row{align-items:flex-start}.segmented{display:flex;padding:2px;border:1px solid rgba(23,42,69,.22);border-radius:99px}.segmented button{min-height:1.65rem;padding:0 .55rem;display:inline-flex;align-items:center;gap:.25rem;border:0;border-radius:99px;background:transparent;color:rgba(23,42,69,.62);font-size:.62rem;font-weight:800}.segmented button :global(svg){width:.78rem;height:.78rem}.segmented button.chosen{background:#172a45;color:#fffdf7}.level-segmented button{min-width:1.65rem;padding:0 .32rem}.completion-total strong{color:#34824d;font-family:'DM Serif Display',serif;font-size:1.45rem;line-height:1}.settings-link{display:block;margin-top:1.2rem;color:#172a45;font-size:.62rem;font-weight:800;letter-spacing:.065em;text-transform:uppercase;text-decoration-color:#e6a527;text-underline-offset:.28rem}.settings-github{display:flex;align-items:center;gap:.45rem}.settings-github :global(svg){width:1rem;height:1rem}
	.completion-mark{position:absolute;z-index:5;inset:8%;display:grid;place-content:center;justify-items:center;gap:.5rem;border:1px solid rgba(52,130,77,.4);border-radius:1.25rem;background:rgba(255,253,247,.94);color:#34824d;box-shadow:0 16px 42px rgba(23,42,69,.17);animation:completion-in .3s cubic-bezier(.23,1,.32,1) both}.completion-symbol{display:grid;place-items:center;width:4.4rem;height:4.4rem;border:.32rem solid currentColor;border-radius:50%;font-size:3rem;font-weight:800;line-height:1}.completion-mark>span:nth-child(2){font-family:'DM Serif Display',serif;font-size:1.45rem}.completion-time{color:#172a45;font-size:.64rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.completion-time strong{color:#34824d;font-family:'DM Serif Display',serif;font-size:1.05rem;letter-spacing:0}.completion-continue{min-height:2.25rem;padding:0 1rem;border:1px solid #34824d;border-radius:999px;background:#34824d;color:#fffdf7;font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
	@keyframes drop-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}@keyframes shake{25%{transform:translateX(-7px)}55%{transform:translateX(6px)}80%{transform:translateX(-3px)}}@keyframes solve-cell{from{transform:scale(.84)}to{transform:scale(.965)}}@keyframes word-rise{from{opacity:.2;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes completion-in{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
	:global(html[data-theme='dark']) .game-shell{background:radial-gradient(circle at 50% 0,#193250 0,#08121f 70%)}:global(html[data-theme='dark']) .game-paper{background:#102238;border-color:rgba(255,253,247,.2);box-shadow:0 24px 70px rgba(0,0,0,.38)}:global(html[data-theme='dark']) .game-paper::before{border-color:rgba(255,253,247,.14)}:global(html[data-theme='dark']) .crossword-frame{background-color:#1b3452;background-image:linear-gradient(rgba(255,253,247,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,253,247,.06) 1px,transparent 1px);border-color:#e6a527}:global(html[data-theme='dark']) .crossword-cell{background:#172a45;border-color:#dce9f7;color:#fffdf7}:global(html[data-theme='dark']) .crossword-cell.solved{color:#172a45}:global(html[data-theme='dark']) .wheel-stage{border-color:rgba(255,253,247,.2)}:global(html[data-theme='dark']) .round-chip,:global(html[data-theme='dark']) .selected-word.has-word{color:#fffdf7}:global(html[data-theme='dark']) .settings-trigger{background:#102238;border-color:rgba(255,253,247,.3);color:#fffdf7}:global(html[data-theme='dark']) .outer-ring{stroke:#fffdf7}:global(html[data-theme='dark']) .core-mark{fill:#fffdf7}:global(html[data-theme='dark']) .core-word,:global(html[data-theme='dark']) .core-caption{fill:rgba(255,253,247,.65)}:global(html[data-theme='dark']) .letter-node circle{fill:#102238;stroke:#fffdf7;filter:drop-shadow(0 3px 0 rgba(0,0,0,.35))}:global(html[data-theme='dark']) .letter-node text{fill:#fffdf7}:global(html[data-theme='dark']) .letter-node.active circle{fill:#e6a527;stroke:#e6a527}:global(html[data-theme='dark']) .letter-node.active text{fill:#172a45}:global(html[data-theme='dark']) .settings-panel{background:#102238}:global(html[data-theme='dark']) .settings-intro,:global(html[data-theme='dark']) .setting-row,:global(html[data-theme='dark']) .settings-link{color:#fffdf7}:global(html[data-theme='dark']) .brand-mark{border-color:#fffdf7}:global(html[data-theme='dark']) .setting-row{border-color:rgba(255,253,247,.2)}:global(html[data-theme='dark']) .segmented{border-color:rgba(255,253,247,.3)}:global(html[data-theme='dark']) .segmented button{color:rgba(255,253,247,.7)}:global(html[data-theme='dark']) .segmented button.chosen{background:#fffdf7;color:#172a45}:global(html[data-theme='dark']) .completion-mark{background:#102238;border-color:rgba(230,165,39,.6)}:global(html[data-theme='dark']) .completion-time{color:#fffdf7}
	@media (min-width:580px){.crossword-frame{min-height:250px}.wheel-stage{min-height:280px}.letter-wheel{width:270px}}@media (max-width:430px){.game-shell{padding:.35rem;place-items:start center}.game-paper{min-height:100svh;width:100%;border:0}.wheel-stage{min-height:220px}.round-chip{font-size:.53rem}.crossword-frame{min-height:190px}}@media(prefers-reduced-motion:reduce){.settings-panel,.completion-mark,.selected-word,.crossword-cell{animation:none!important}}
</style>
