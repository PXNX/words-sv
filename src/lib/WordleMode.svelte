<script lang="ts">
	  import { onMount } from 'svelte';
	  import { evaluateWordleGuess, fiveLetterWords, isValidWordleGuess, normalizePlayableWord } from '$lib/modes.js';
	  import { readWordleState, WORDLE_STATE_KEY, writeWordleState } from '$lib/wordleState.js';

  type WordleMark = 'correct' | 'present' | 'absent';
  type Entry = { word: string; marks: WordleMark[] };
  type Labels = {
    title: string; subtitle: string; empty: string; input: string; submit: string; invalid: string; win: string; again: string;
    tutorialTitle: string; tutorialExplain: string; tutorialPrompt: string; tutorialComplete: string; tutorialRepeat: string;
  };
  type TutorialRound = { target: string; warmup: string };

	  let { words, level, language, labels, onGreen = () => {}, onWin = () => {}, tutorialRequested = 0 }: { words: string[]; level: string; language: string; labels: Labels; onGreen?: () => void; onWin?: () => void; tutorialRequested?: number } = $props();
	  const WORDLE_TUTORIAL_KEY = 'wordcircle-wordle-tutorial-v1';
	  const keyboardLayouts: Record<string, { rows: string[]; extras: string[] }> = {
		de: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: ['Ä', 'Ö', 'Ü', 'ẞ'] }, en: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: [] },
		fr: { rows: ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'], extras: ['À', 'É', 'È', 'Ê', 'Ë', 'Î', 'Ï', 'Ô', 'Ù', 'Û', 'Ü', 'Ç', 'Œ'] }, it: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: ['À', 'È', 'É', 'Ì', 'Ò', 'Ù'] },
		es: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ü', 'Ñ'] }, pt: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: ['Á', 'À', 'Â', 'Ã', 'É', 'Ê', 'Í', 'Ó', 'Ô', 'Õ', 'Ú', 'Ç'] },
		uk: { rows: ['ЙЦУКЕНГШЩЗХ', 'ФІВАПРОЛДЖЄ', 'ЯЧСМИТЬБЮ'], extras: ['Ґ', 'Ї'] }
	  };
  const tutorialRounds: Record<'de' | 'en', TutorialRound> = {
    de: { target: 'TASSE', warmup: 'TASES' },
    en: { target: 'TASTE', warmup: 'TATES' }
  };

  let target = $state('');
  let guess = $state('');
  let entries = $state<Entry[]>([]);
  let notice = $state('');
  let tutorialOpen = $state(false);
  let tutorialStep = $state(0);
  let tutorialGuess = $state('');
  let tutorialEntries = $state<Entry[]>([]);
  let observedTutorialRequest = $state(0);

  const candidates = $derived(fiveLetterWords(words));
  const won = $derived(entries.some((entry) => entry.word === target));
  const exhausted = $derived(entries.length >= 6 && !won);
	  const keyboardLayout = $derived(keyboardLayouts[language] ?? keyboardLayouts.en);
	  const tutorialRound = $derived(tutorialRounds[language as 'de' | 'en'] ?? null);
	  const tutorialExpected = $derived(tutorialRound ? (tutorialStep === 0 ? tutorialRound.warmup : tutorialRound.target) : '');
  const tutorialFinished = $derived(tutorialStep >= 2);
  const tutorialHint = $derived(tutorialFinished ? labels.tutorialComplete : `${labels.tutorialPrompt} ${tutorialExpected}`);
  const keyboardMarks = $derived.by(() => {
    const priority: Record<WordleMark, number> = { absent: 1, present: 2, correct: 3 };
    const marks: Record<string, WordleMark> = {};
    for (const entry of entries) {
      for (const [index, letter] of Array.from(entry.word).entries()) {
        const mark = entry.marks[index];
        if (!marks[letter] || priority[mark] > priority[marks[letter]]) marks[letter] = mark;
      }
    }
    return marks;
  });

	  function start() {
	    target = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : '';
	    guess = '';
	    entries = [];
	    notice = '';
	    if (typeof localStorage !== 'undefined') localStorage.removeItem(WORDLE_STATE_KEY);
	  }

	  function restoreOrStart() {
	    if (typeof localStorage === 'undefined' || candidates.length === 0) {
	      start();
	      return;
	    }
	    const saved = readWordleState(localStorage.getItem(WORDLE_STATE_KEY), { language, level, candidates });
	    if (!saved) {
	      start();
	      return;
	    }
	    target = saved.target;
	    entries = saved.entries;
	    guess = saved.guess;
	    notice = '';
	  }

	function submit() {
	  const normalized = normalizePlayableWord(guess);
	  if (won || exhausted) return;
	  if (!isValidWordleGuess(candidates, normalized) || entries.some((entry) => entry.word === normalized)) {
	    notice = labels.invalid;
	    guess = '';
	    return;
    }
    const marks = evaluateWordleGuess(target, normalized) as WordleMark[];
    entries = [...entries, { word: normalized, marks }];
    guess = '';
    if (marks.some((mark) => mark === 'correct')) onGreen();
	    if (normalized === target) { notice = labels.win; onWin(); } else notice = '';
  }

  function press(letter: string) {
    if (won || exhausted) return;
    const nextGuess = normalizePlayableWord(`${guess}${letter}`).slice(0, 5);
	  guess = nextGuess;
	  if (nextGuess.length === 5) {
	    submit();
    } else notice = '';
  }

  function removeLetter() {
    guess = guess.slice(0, -1);
    notice = '';
  }

	function openTutorial() {
		if (!tutorialRound) return;
	    tutorialOpen = true;
    tutorialStep = 0;
    tutorialGuess = '';
    tutorialEntries = [];
  }

  function completeTutorial() {
    tutorialStep = 2;
    if (typeof localStorage !== 'undefined') localStorage.setItem(WORDLE_TUTORIAL_KEY, 'complete');
  }

  function closeTutorial() {
    if (!tutorialFinished) return;
    tutorialOpen = false;
    start();
  }

  function tutorialPress(letter: string) {
		if (tutorialFinished || !tutorialRound) return;
    const expectedLetter = tutorialExpected[tutorialGuess.length];
    if (letter !== expectedLetter) return;
    const nextGuess = `${tutorialGuess}${letter}`;
    tutorialGuess = nextGuess;
    if (nextGuess.length === 5) {
      const marks = evaluateWordleGuess(tutorialRound.target, nextGuess) as WordleMark[];
      tutorialEntries = [...tutorialEntries, { word: nextGuess, marks }];
      tutorialGuess = '';
      if (marks.some((mark) => mark === 'correct')) onGreen();
      if (tutorialStep === 0) tutorialStep = 1;
      else completeTutorial();
    }
  }

  function tutorialRemove() {
    tutorialGuess = tutorialGuess.slice(0, -1);
  }

	  $effect(() => {
	    words;
	    level;
	    language;
	    candidates;
	    restoreOrStart();
	  });

	  $effect(() => {
	    if (typeof localStorage === 'undefined' || !target) return;
	    if (won || exhausted) {
	      localStorage.removeItem(WORDLE_STATE_KEY);
	      return;
	    }
	    localStorage.setItem(WORDLE_STATE_KEY, writeWordleState({ language, level, target, entries, guess }));
	  });

  $effect(() => {
    if (tutorialRequested === observedTutorialRequest) return;
    observedTutorialRequest = tutorialRequested;
    openTutorial();
  });

  onMount(() => {
	    if (tutorialRound && localStorage.getItem(WORDLE_TUTORIAL_KEY) !== 'complete') openTutorial();
  });
</script>

<section class="mode-view wordle-view" aria-label={labels.title}>
  <header class="mode-header">
    <span>{level.toUpperCase()}</span>
    <h1>{labels.title}</h1>
    <p>{labels.subtitle}</p>
  </header>

  {#if candidates.length === 0}
    <div class="mode-empty">{labels.empty}</div>
  {:else}
    <div class="wordle-board">
      <div class="wordle-grid" aria-label={labels.title}>
        {#each Array(6) as _, row}
          {@const entry = entries[row]}
          <div class="wordle-row">
            {#each Array(5) as _, column}
              {@const letter = entry?.word[column] ?? (row === entries.length ? guess[column] : '')}
              {@const mark = entry?.marks[column] ?? ''}
              <span class:correct={mark === 'correct'} class:present={mark === 'present'} class:absent={mark === 'absent'}>{letter}</span>
            {/each}
          </div>
        {/each}
      </div>
      {#if notice}<p class:success={won} class="mode-notice">{notice}</p>{/if}
      {#if exhausted && !won}<p class="mode-notice">{target}</p>{/if}
      {#if won || exhausted}<button class="mode-reset" onclick={start}>{labels.again}</button>{/if}
    </div>

	    <div class="wordle-keyboard" aria-label={labels.input}>
		      {#each keyboardLayout.rows as row}
		        <div>{#each row.split('') as letter}<button type="button" onclick={() => press(letter)} disabled={won || exhausted} class:correct={keyboardMarks[letter] === 'correct'} class:present={keyboardMarks[letter] === 'present'} class:absent={keyboardMarks[letter] === 'absent'}>{letter}</button>{/each}</div>
		      {/each}
		      <div class="wordle-utility">{#each keyboardLayout.extras as letter}<button type="button" onclick={() => press(letter)} disabled={won || exhausted} class:correct={keyboardMarks[letter] === 'correct'} class:present={keyboardMarks[letter] === 'present'} class:absent={keyboardMarks[letter] === 'absent'}>{letter}</button>{/each}<button class="delete-key" type="button" onclick={removeLetter} disabled={won || exhausted}>⌫</button></div>
	    </div>
  {/if}

	  {#if tutorialOpen && tutorialRound}
    <div class="wordle-tutorial" role="dialog" aria-modal="true" aria-labelledby="wordle-tutorial-title">
      <div class="wordle-tutorial-card">
        <p class="tutorial-kicker">{labels.tutorialTitle}</p>
        <h2 id="wordle-tutorial-title">{labels.title}</h2>
        <p class="tutorial-explanation">{labels.tutorialExplain}</p>
        <p class="tutorial-repeats">{labels.tutorialRepeat}</p>
        <div class="wordle-grid tutorial-grid" aria-label={labels.tutorialTitle}>
          {#each Array(2) as _, row}
            {@const entry = tutorialEntries[row]}
            <div class="wordle-row">
              {#each Array(5) as _, column}
                {@const letter = entry?.word[column] ?? (row === tutorialEntries.length && !tutorialFinished ? tutorialGuess[column] : '')}
                {@const mark = entry?.marks[column] ?? ''}
                <span class:correct={mark === 'correct'} class:present={mark === 'present'} class:absent={mark === 'absent'}>{letter}</span>
              {/each}
            </div>
          {/each}
        </div>
        <p class="tutorial-prompt">{tutorialHint}</p>
        {#if tutorialFinished}
          <button class="tutorial-finish" type="button" onclick={closeTutorial}>{labels.again}</button>
        {:else}
	          <div class="wordle-keyboard tutorial-keyboard" aria-label={labels.input}>
	            {#each keyboardLayout.rows as row}
	              <div>{#each row.split('') as letter}<button type="button" onclick={() => tutorialPress(letter)} class:expected={tutorialExpected[tutorialGuess.length] === letter}>{letter}</button>{/each}</div>
	            {/each}
	            <div class="wordle-utility">{#each keyboardLayout.extras as letter}<button type="button" onclick={() => tutorialPress(letter)} class:expected={tutorialExpected[tutorialGuess.length] === letter}>{letter}</button>{/each}<button class="delete-key" type="button" onclick={tutorialRemove}>⌫</button></div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</section>

<style>
  .mode-view { flex:1 1 auto;min-height:0;display:grid;grid-template-rows:auto 1fr auto;align-content:stretch;gap:clamp(.75rem,2.8vw,1.2rem);padding:clamp(1.25rem,7svh,4rem) clamp(.8rem,3vw,1.25rem) clamp(1rem,3vw,1.5rem);overflow:auto;background:linear-gradient(180deg,rgba(237,228,213,.8),rgba(255,253,247,.65));border-top:3px double #172a45; }
  .mode-header { text-align:center; }.mode-header span { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:800;letter-spacing:.14em; }.mode-header h1 { margin:.15rem 0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.65rem,6vw,2.4rem);font-weight:400;line-height:1; }.mode-header p { margin:0;color:#596477;font-family:'DM Sans',sans-serif;font-size:.67rem;font-weight:700;line-height:1.35; }
  .wordle-board { display:grid;align-content:center;justify-items:center;gap:.65rem; }.wordle-grid { display:grid;justify-content:center;gap:clamp(.25rem,1.2vw,.42rem); }.wordle-row { display:grid;grid-template-columns:repeat(5,clamp(2.35rem,12vw,3.35rem));gap:clamp(.25rem,1.2vw,.42rem); }.wordle-row span { display:grid;place-items:center;aspect-ratio:1;border:1px solid rgba(23,42,69,.34);background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:clamp(1rem,5vw,1.35rem);font-weight:900; }.wordle-row span.correct { border-color:#34824d;background:#34824d;color:#fffdf7; }.wordle-row span.present { border-color:#d39723;background:#e6a527;color:#172a45; }.wordle-row span.absent { border-color:#69727a;background:#69727a;color:#fffdf7; }
  .mode-reset { min-height:2.45rem;padding:0 .9rem;border:1px solid #34824d;background:#34824d;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase; }.wordle-keyboard button:disabled { opacity:.45; }
  .mode-notice { min-height:1rem;margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.68rem;font-weight:800;text-align:center; }.mode-notice.success { color:#34824d; }
	  .wordle-keyboard { display:grid;gap:clamp(.24rem,1.1vw,.4rem);justify-content:center;padding-top:.1rem; }.wordle-keyboard>div { display:flex;justify-content:center;gap:clamp(.18rem,.9vw,.34rem); }.wordle-keyboard button { min-width:clamp(1.7rem,7.7vw,2.55rem);height:clamp(2.3rem,10vw,3.05rem);border:1px solid rgba(23,42,69,.28);background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:clamp(.63rem,2.7vw,.82rem);font-weight:900;touch-action:manipulation; }.wordle-keyboard button.correct { border-color:#34824d;background:#34824d;color:#fffdf7; }.wordle-keyboard button.present { border-color:#d39723;background:#e6a527;color:#172a45; }.wordle-keyboard button.absent { border-color:#69727a;background:#69727a;color:#fffdf7; }.wordle-keyboard button:active { transform:scale(.96);background:#e6a527; }.wordle-utility button { min-width:clamp(2rem,8.6vw,2.8rem); }.wordle-utility .delete-key { min-width:clamp(2.35rem,10vw,3.2rem); }
  .mode-empty { padding:1.25rem;border:1px solid rgba(164,94,56,.42);background:rgba(164,94,56,.08);color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.75rem;font-weight:800;text-align:center; }
  .wordle-tutorial { position:absolute;z-index:80;inset:0;display:grid;place-items:center;padding:clamp(.8rem,4vw,1.5rem);background:rgba(255,253,247,.97); }.wordle-tutorial-card { width:min(100%,28rem);display:grid;gap:.7rem;padding:clamp(.9rem,4vw,1.35rem);border:1px solid rgba(23,42,69,.3);border-top:3px double #172a45;background:#fffdf7;box-shadow:7px 7px 0 rgba(230,165,39,.2); }.tutorial-kicker { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }.wordle-tutorial-card h2 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.75rem,8vw,2.5rem);font-weight:400;line-height:.9; }.tutorial-explanation,.tutorial-repeats,.tutorial-prompt { margin:0;font-family:'DM Sans',sans-serif;font-size:.69rem;font-weight:700;line-height:1.4; }.tutorial-explanation { color:#172a45; }.tutorial-repeats { padding:.45rem .55rem;border-left:3px solid #e6a527;background:rgba(230,165,39,.1);color:#76541b; }.tutorial-grid { margin:.1rem auto; }.tutorial-prompt { color:#a45e38;text-align:center; }.tutorial-keyboard { margin-top:.05rem; }.tutorial-keyboard button:not(.expected) { opacity:.42; }.tutorial-keyboard button.expected { border-color:#e6a527;box-shadow:inset 0 0 0 1px #e6a527; }.tutorial-finish { min-height:2.45rem;border:1px solid #172a45;background:#172a45;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }
  :global(html.dark) .mode-view { background:linear-gradient(180deg,#213a5d,#172a45); }.mode-header h1 { color:#172a45; }:global(html.dark) .mode-header h1 { color:#fffdf7; }:global(html.dark) .mode-header p { color:rgba(255,253,247,.7); }:global(html.dark) .wordle-row span,:global(html.dark) .wordle-keyboard button { background:#172a45;border-color:rgba(255,253,247,.38);color:#fffdf7; }:global(html.dark) .wordle-tutorial { background:rgba(23,42,69,.98); }:global(html.dark) .wordle-tutorial-card { background:#172a45;border-color:rgba(255,253,247,.38); }:global(html.dark) .wordle-tutorial-card h2,:global(html.dark) .tutorial-explanation { color:#fffdf7; }:global(html.dark) .tutorial-repeats { color:#ffe3a5; }
  @media (min-width:580px) { .wordle-row { grid-template-columns:repeat(5,clamp(2.8rem,8vw,3.6rem)); } .wordle-keyboard button { min-width:2.6rem;height:3rem; } }
</style>
