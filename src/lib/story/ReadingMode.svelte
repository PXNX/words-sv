<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { playErrorSound, playSuccessSound } from '#lib/sounds.js';
  import { readingCatalog } from './readingCatalog';
  import { isCorrectAnswer, readingParagraphs } from './prose';
  import {
    isReadingArticle,
    lookupReadingWord,
    matchReadingCharacter,
    readingArticleNoun,
    tokenizeReadingText,
    type ReadingToken,
    type ReadingWordInfo
  } from './readingWords';
  import { characterNames, type CharacterId } from './stories';
  import StoryCharacter from './StoryCharacter.svelte';
  import { clearMissedWord, readMissedWords, recordMissedWord } from './missedWords';
  import { clearWordRepeat, markWordForRepeat } from '#lib/vocab/spacedRepetition.js';
  import { wiktionaryUrl } from '#lib/wiktionary.js';
  import IconMenuBook from '~icons/material-symbols/menu-book-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';
  import IconChevronLeft from '~icons/material-symbols/chevron-left-rounded';
  import IconChevronRight from '~icons/material-symbols/chevron-right-rounded';
  import IconQuestion from '~icons/material-symbols/question-mark-rounded';

  const PROGRESS_KEY = 'wordcircle-reading-progress-v1';
  type SavedReading = {
    fingerprint: string;
    id: string;
    solved: Record<string, Record<number, true>>;
    wrong: Record<string, Record<number, string[]>>;
  };

  const labels = $derived({
    kicker: m.reading_kicker({}, { locale: settings.interfaceLocale }),
    title: m.reading_title({}, { locale: settings.interfaceLocale }),
    shelf: m.reading_shelf({}, { locale: settings.interfaceLocale }),
    textKind: m.reading_text_kind({}, { locale: settings.interfaceLocale }),
    storyKind: m.reading_story_kind({}, { locale: settings.interfaceLocale }),
    questions: m.reading_questions({}, { locale: settings.interfaceLocale }),
    words: m.reading_words({}, { locale: settings.interfaceLocale }),
    previous: m.reading_previous({}, { locale: settings.interfaceLocale }),
    next: m.reading_next({}, { locale: settings.interfaceLocale }),
    empty: m.reading_empty({}, { locale: settings.interfaceLocale }),
    tapHint: m.reading_tap_hint({}, { locale: settings.interfaceLocale }),
    meaning: m.reading_word_meaning({}, { locale: settings.interfaceLocale }),
    cases: m.reading_word_cases({}, { locale: settings.interfaceLocale }),
    noun: m.reading_word_noun({}, { locale: settings.interfaceLocale }),
    verb: m.reading_word_verb({}, { locale: settings.interfaceLocale }),
    adjective: m.reading_word_adjective({}, { locale: settings.interfaceLocale }),
    otherType: m.reading_word_other({}, { locale: settings.interfaceLocale }),
    masculine: m.reading_word_gender_masculine({}, { locale: settings.interfaceLocale }),
    feminine: m.reading_word_gender_feminine({}, { locale: settings.interfaceLocale }),
    neuter: m.reading_word_gender_neuter({}, { locale: settings.interfaceLocale }),
    mark: m.reading_word_mark({}, { locale: settings.interfaceLocale }),
    unmark: m.reading_word_unmark({}, { locale: settings.interfaceLocale }),
    noDefinition: m.reading_word_no_definition({}, { locale: settings.interfaceLocale }),
    close: m.reading_word_close({}, { locale: settings.interfaceLocale }),
    explain: m.explain({}, { locale: settings.interfaceLocale }),
    nominative: m.reading_word_case_nominative({}, { locale: settings.interfaceLocale }),
    genitive: m.reading_word_case_genitive({}, { locale: settings.interfaceLocale }),
    accusative: m.reading_word_case_accusative({}, { locale: settings.interfaceLocale }),
    dative: m.reading_word_case_dative({}, { locale: settings.interfaceLocale }),
    singular: m.reading_word_singular({}, { locale: settings.interfaceLocale }),
    plural: m.reading_word_plural({}, { locale: settings.interfaceLocale }),
    currentCase: m.reading_word_current_case({}, { locale: settings.interfaceLocale }),
    character: m.reading_character({}, { locale: settings.interfaceLocale })
  });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  const name = $derived(settings.firstName);
  const fingerprint = $derived(`${settings.lang}|${settings.vocabularyLevel}|${settings.includeLowerVocabulary}`);
  const catalog = $derived(readingCatalog(settings.lang, settings.vocabularyLevel, settings.includeLowerVocabulary, name));

  type Sheet =
    | { kind: 'word'; info: ReadingWordInfo }
    | { kind: 'character'; id: CharacterId; name: string };
  type Highlight = { paragraph: number; start: number; end: number };

  let currentId = $state<string | null>(null);
  let solved = $state<Record<string, Record<number, true>>>({});
  let wrong = $state<Record<string, Record<number, string[]>>>({});
  let ready = $state(false);
  let paper = $state<HTMLElement | null>(null);
  let sheet = $state<Sheet | null>(null);
  let highlighted = $state<Highlight | null>(null);
  let markedWords = $state<Set<string>>(new Set());
  let closeButton = $state<HTMLButtonElement | null>(null);
  let wordTrigger: HTMLButtonElement | null = null;

  const current = $derived(catalog.find((item) => item.id === currentId) ?? catalog[0] ?? null);
  const paragraphs = $derived(current ? readingParagraphs(current.blocks, current.language, name) : []);
  const currentIndex = $derived(current ? catalog.findIndex((item) => item.id === current.id) : -1);
  const previousItem = $derived(currentIndex > 0 ? catalog[currentIndex - 1] : catalog.at(-1) ?? null);
  const nextItem = $derived(currentIndex >= 0 ? catalog[currentIndex + 1] ?? catalog[0] ?? null : null);
  const currentSolved = $derived<Record<number, true>>(current ? solved[current.id] ?? {} : {});
  const currentWrong = $derived<Record<number, string[]>>(current ? wrong[current.id] ?? {} : {});
  const answered = $derived(current ? current.questions.filter((_, index) => currentSolved[index]).length : 0);
  const firstTry = $derived(current ? current.questions.filter((_, index) => currentSolved[index] && !currentWrong[index]?.length).length : 0);

  function readSaved(): SavedReading | null {
    try {
      const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null') as Partial<SavedReading> | null;
      if (!parsed || parsed.fingerprint !== fingerprint || typeof parsed.id !== 'string') return null;
      return {
        fingerprint: parsed.fingerprint,
        id: parsed.id,
        solved: parsed.solved ?? {},
        wrong: parsed.wrong ?? {}
      };
    } catch {
      return null;
    }
  }

  function typeLabel(type: string) {
    if (type === 'noun') return labels.noun;
    if (type === 'verb') return labels.verb;
    if (type === 'adjective') return labels.adjective;
    return labels.otherType;
  }

  function genderLabel(gender: ReadingWordInfo['gender']) {
    if (gender === 'masculine') return labels.masculine;
    if (gender === 'feminine') return labels.feminine;
    if (gender === 'neuter') return labels.neuter;
    return null;
  }

  function caseLabel(grammarCase: ReadingWordInfo['cases'][number]['grammarCase']) {
    if (grammarCase === 'nominative') return labels.nominative;
    if (grammarCase === 'genitive') return labels.genitive;
    if (grammarCase === 'accusative') return labels.accusative;
    return labels.dative;
  }

  async function focusSheet(trigger: HTMLButtonElement) {
    wordTrigger = trigger;
    await tick();
    closeButton?.focus();
  }

  async function openWord(info: ReadingWordInfo, trigger: HTMLButtonElement) {
    sheet = { kind: 'word', info };
    highlighted = null;
    await focusSheet(trigger);
  }

  // An article opens the noun it belongs to and keeps that noun highlighted in the text, so the
  // reader can see both the grammar and where it sits in the sentence.
  async function openArticle(info: ReadingWordInfo, highlight: Highlight, trigger: HTMLButtonElement) {
    sheet = { kind: 'word', info };
    highlighted = highlight;
    await focusSheet(trigger);
  }

  async function openCharacter(id: CharacterId, trigger: HTMLButtonElement) {
    const language = current?.language ?? settings.lang;
    sheet = { kind: 'character', id, name: characterNames[id][language] };
    highlighted = null;
    await focusSheet(trigger);
  }

  function closeSheet() {
    sheet = null;
    highlighted = null;
    const trigger = wordTrigger;
    wordTrigger = null;
    // Return the reader to the word they tapped, not to the top of the page.
    if (trigger?.isConnected) trigger.focus();
  }

  function isHighlighted(paragraph: number, token: ReadingToken) {
    return highlighted?.paragraph === paragraph && highlighted.start === token.start && highlighted.end === token.end;
  }

  // Marking a word does two things: it lands on the missed-word list (so stories and the
  // progress page see it) and its review progress takes a lapse, which floats it to the front
  // of the next vocabulary session until it is answered right.
  function toggleMark() {
    const info = sheet?.kind === 'word' ? sheet.info : null;
    if (!info) return;
    if (markedWords.has(info.word)) {
      clearWordRepeat(settings.lang, info.word);
      clearMissedWord(settings.lang, info.word);
    } else {
      markWordForRepeat(settings.lang, info.word);
      recordMissedWord(settings.lang, info.word);
    }
    markedWords = new Set(readMissedWords(settings.lang).map((entry) => entry.word));
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && sheet) closeSheet();
  }

  function choose(option: string, index: number) {
    const item = current;
    if (!item || currentSolved[index]) return;
    const question = item.questions[index];
    if (isCorrectAnswer(question, option)) {
      solved = { ...solved, [item.id]: { ...currentSolved, [index]: true } };
      if (settings.sound) playSuccessSound(settings.sound, 'vocab');
    } else {
      wrong = { ...wrong, [item.id]: { ...currentWrong, [index]: [...(currentWrong[index] ?? []), option] } };
      if (settings.sound) playErrorSound(settings.sound, 'vocab');
      if (settings.vibration && 'vibrate' in navigator) navigator.vibrate(60);
    }
  }

  async function select(id: string) {
    currentId = id;
    await tick();
    paper?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onMount(() => {
    if (!settings.firstName) {
      void goto('/', { replace: true });
      return;
    }
    const saved = readSaved();
    if (saved) {
      solved = saved.solved;
      wrong = saved.wrong;
      if (catalog.some((item) => item.id === saved.id)) currentId = saved.id;
    }
    ready = true;
  });

  // The chosen text and the answers survive leaving the page; the list is rebuilt per language and level.
  $effect(() => {
    const item = current;
    const answers = solved;
    const misses = wrong;
    if (!ready || !item) return;
    try {
      const snapshot: SavedReading = { fingerprint, id: item.id, solved: answers, wrong: misses };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(snapshot));
    } catch {
      // A full or blocked storage must not stop the reading.
    }
  });

  // Marks are per learning language, so switching language reloads the highlighted words.
  $effect(() => {
    const language = settings.lang;
    markedWords = new Set(readMissedWords(language).map((entry) => entry.word));
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet readingWords(text: string, paragraph: number)}
  {#each tokenizeReadingText(text) as token, index (index)}
    {@const info = token.word ? lookupReadingWord(settings.lang, token.text, { text, start: token.start, end: token.end }) : null}
    {@const character = token.word ? matchReadingCharacter(settings.lang, current?.cast ?? [], token.text) : null}
    {#if character}
      <button type="button" class="reading-word reading-character" class:highlighted={isHighlighted(paragraph, token)} onclick={(event) => void openCharacter(character, event.currentTarget)}>{token.text}</button>
    {:else if token.word && isReadingArticle(token.text)}
      {@const noun = readingArticleNoun(settings.lang, text, token.start, token.end)}
      {#if noun}
        {@const nounInfo = lookupReadingWord(settings.lang, noun.text, { text, start: noun.start, end: noun.end })}
        {#if nounInfo}
          <button type="button" class="reading-word reading-article" onclick={(event) => void openArticle(nounInfo, { paragraph, start: noun.start, end: noun.end }, event.currentTarget)}>{token.text}</button>
        {:else}
          {token.text}
        {/if}
      {:else}
        {token.text}
      {/if}
    {:else if info}
      <button type="button" class="reading-word" class:marked={markedWords.has(info.word)} class:highlighted={isHighlighted(paragraph, token)} onclick={(event) => void openWord(info, event.currentTarget)}>{token.text}</button>
    {:else}
      {token.text}
    {/if}
  {/each}
{/snippet}

<svelte:head>
  <title>{current ? `${current.title} · WordCircle` : `${labels.title} · WordCircle`}</title>
</svelte:head>

<section class="reading-view" aria-label={labels.title} dir={interfaceDirection} lang={settings.interfaceLocale}>
  {#if current}
    <header class="reading-header">
      <p class="reading-kicker">{labels.kicker} · {current.level.toUpperCase()}</p>
      <h1 lang={current.language}>{current.title}</h1>
      <p class="reading-subtitle" lang={current.language}>{current.subtitle}</p>
      <p class="reading-hint">{labels.tapHint}</p>
    </header>

    <details class="reading-shelf">
      <summary>
        <span><IconMenuBook aria-hidden="true" />{labels.shelf}</span>
        <small>{catalog.length}</small>
      </summary>
      <ul>
        {#each catalog as item (item.id)}
          <li>
            <button type="button" class:active={item.id === current.id} onclick={() => select(item.id)}>
              <span class="reading-shelf-level">{item.level.toUpperCase()}</span>
              <span class="reading-shelf-title" lang={item.language}>{item.title}</span>
              <span class="reading-shelf-kind">{item.kind === 'text' ? labels.textKind : labels.storyKind}</span>
            </button>
          </li>
        {/each}
      </ul>
    </details>

    <article class="reading-paper" bind:this={paper} lang={current.language}>
      {#each paragraphs as paragraph, index (index)}
        <p class="reading-paragraph">{@render readingWords(paragraph, index)}</p>
      {/each}
    </article>

    {#if current.keyWords.length}
      <details class="reading-words">
        <summary>{labels.words} <small>{current.keyWords.length}</small></summary>
        <ul>{#each current.keyWords as word (word)}<li>{word}</li>{/each}</ul>
      </details>
    {/if}

    {#if current.questions.length}
      <section class="reading-questions" aria-label={labels.questions}>
        <h2>{labels.questions}</h2>
        <ol>
          {#each current.questions as question, index (index)}
            <li class:solved={currentSolved[index]}>
              <span class="reading-question-badge" aria-hidden="true">{#if currentSolved[index]}<IconCheck />{:else}<IconQuestion />{/if}</span>
              <div>
                <p>{question.prompt}</p>
                {#if currentSolved[index]}
                  <span class="reading-answer">{question.answer}</span>
                {:else}
                  <div class="reading-options">
                    {#each question.options as option (option)}
                      {@const missed = currentWrong[index]?.includes(option)}
                      <button type="button" class="btn-play btn-play-choice" class:missed disabled={missed} onclick={() => choose(option, index)}>{option}{#if missed}<IconClose aria-hidden="true" />{/if}</button>
                    {/each}
                  </div>
                {/if}
              </div>
            </li>
          {/each}
        </ol>
        {#if answered === current.questions.length}
          <p class="reading-score">{m.story_score({ correct: String(firstTry), total: String(current.questions.length) }, { locale: settings.interfaceLocale })}</p>
        {:else}
          <p class="reading-score">{m.story_reading_progress({ answered: String(answered), total: String(current.questions.length) }, { locale: settings.interfaceLocale })}</p>
        {/if}
      </section>
    {/if}

    <footer class="reading-footer">
      {#if previousItem}
        <button type="button" class="btn-play btn-play-soft reading-nav" onclick={() => void select(previousItem.id)}><IconChevronLeft aria-hidden="true" /><span>{labels.previous}</span></button>
      {/if}
      {#if nextItem}
        <button type="button" class="btn-play btn-play-ink reading-nav" onclick={() => void select(nextItem.id)}><span>{labels.next}</span><IconChevronRight aria-hidden="true" /></button>
      {/if}
    </footer>
  {:else}
    <p class="reading-empty">{labels.empty}</p>
  {/if}
</section>

{#if sheet}
  <div class="word-sheet-layer">
    <button type="button" class="word-sheet-backdrop" aria-label={labels.close} onclick={closeSheet}></button>
    <div class="word-sheet" role="dialog" aria-modal="true" aria-labelledby="word-sheet-title">
      <header>
        <div class="word-sheet-heading">
          {#if sheet.kind === 'character'}
            <p>{labels.character}</p>
            <h2 id="word-sheet-title" lang={current?.language}>{sheet.name}</h2>
          {:else}
            <p>{typeLabel(sheet.info.type)}{#if genderLabel(sheet.info.gender)} · {genderLabel(sheet.info.gender)}{/if}{#if sheet.info.type === 'noun'} · {sheet.info.number === 'plural' ? labels.plural : labels.singular}{/if}</p>
            <h2 id="word-sheet-title" lang={settings.lang}>{sheet.info.display}</h2>
          {/if}
        </div>
        <button type="button" class="word-sheet-close" bind:this={closeButton} aria-label={labels.close} onclick={closeSheet}><IconClose aria-hidden="true" /></button>
      </header>

      {#if sheet.kind === 'character'}
        <div class="character-portrait" aria-hidden="true">
          <StoryCharacter id={sheet.id} still />
        </div>
      {:else}
        <section class="word-sheet-block">
          <h3>{labels.meaning}</h3>
          <p>{sheet.info.definition || labels.noDefinition}</p>
        </section>

        {#if sheet.info.cases.length}
          <section class="word-sheet-block">
            <h3>{labels.cases}</h3>
            <dl class="word-sheet-cases">
              {#each sheet.info.cases as entry (entry.grammarCase)}
                <div class:current={sheet.info.currentCase === entry.grammarCase}>
                  <dt>
                    {caseLabel(entry.grammarCase)}
                    {#if sheet.info.currentCase === entry.grammarCase}<small>{labels.currentCase}</small>{/if}
                  </dt>
                  <dd lang={settings.lang}>{entry.article} {entry.form}</dd>
                </div>
              {/each}
            </dl>
          </section>
        {/if}

        <div class="word-sheet-actions">
          <button type="button" class="btn-play btn-play-soft word-sheet-mark" class:active={markedWords.has(sheet.info.word)} onclick={toggleMark}>
            {markedWords.has(sheet.info.word) ? labels.unmark : labels.mark}
          </button>
          <a class="word-sheet-link" href={wiktionaryUrl(settings.lang, sheet.info.spelling)} target="_blank" rel="noreferrer">{labels.explain}</a>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .reading-view { flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:.8rem;padding:clamp(.65rem,3vw,1.1rem) clamp(.7rem,3.4vw,1.35rem) clamp(1rem,3vw,1.3rem);overflow-y:auto; }
  .reading-header { display:grid;justify-items:center;gap:.28rem;padding-top:.3rem;text-align:center; }
  .reading-kicker { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase; }
  .reading-header h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.6rem,7vw,2.3rem);font-weight:400;letter-spacing:-.03em;line-height:1.02; }
  .reading-subtitle { max-width:34rem;color:#596477;font-family:'DM Sans',sans-serif;font-size:.75rem;font-weight:700;letter-spacing:0;line-height:1.45; }
  .reading-hint { margin:.2rem 0 0;color:#7b8494;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:600;letter-spacing:0;line-height:1.4; }
  .reading-shelf { width:min(100%,44rem);margin:0 auto;border:1px solid rgba(23,42,69,.16);border-radius:.9rem;background:rgba(255,253,247,.82); }
  .reading-shelf summary { display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.5rem .72rem;cursor:pointer;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:900;letter-spacing:.03em;list-style:none; }
  .reading-shelf summary::-webkit-details-marker { display:none; }
  .reading-shelf summary span { display:inline-flex;align-items:center;gap:.4rem; }
  .reading-shelf summary :global(svg) { width:1rem;height:1rem;color:#a45e38; }
  .reading-shelf summary small { color:#a45e38;font-size:.58rem;font-weight:900; }
  .reading-shelf ul { display:grid;gap:.25rem;margin:0;padding:0 .45rem .55rem;list-style:none;max-height:16rem;overflow-y:auto; }
  .reading-shelf button { display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:.5rem;width:100%;padding:.42rem .5rem;border:1px solid transparent;border-radius:.55rem;background:transparent;color:#172a45;text-align:start;cursor:pointer; }
  .reading-shelf button:hover { background:rgba(247,226,176,.45); }
  .reading-shelf button.active { border-color:rgba(23,42,69,.3);background:#f7e2b0; }
  .reading-shelf button:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }
  .reading-shelf-level { min-width:1.5rem;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.54rem;font-weight:900;letter-spacing:.06em; }
  .reading-shelf-title { overflow:hidden;font-family:'DM Sans',sans-serif;font-size:.7rem;font-weight:800;text-overflow:ellipsis;white-space:nowrap; }
  .reading-shelf-kind { color:#596477;font-family:'DM Sans',sans-serif;font-size:.5rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase; }
  .reading-paper { width:min(100%,44rem);margin:0 auto;padding:clamp(1.15rem,5.4vw,2.2rem) clamp(.95rem,5vw,2.2rem);border:1px solid rgba(23,42,69,.16);border-radius:1.1rem;background:#fffdf7;box-shadow:0 8px 22px rgba(23,42,69,.07);scroll-margin-top:.8rem; }
  .reading-paragraph { margin:0 0 .95em;color:#243449;font-family:'DM Sans',sans-serif;font-size:clamp(.94rem,3.8vw,1.02rem);font-weight:500;line-height:1.85;overflow-wrap:break-word;text-wrap:pretty; }
  .reading-paragraph:last-child { margin-bottom:0; }
  .reading-word { display:inline;margin:0;padding:0 .02em;border:0;border-radius:.22rem;background:transparent;color:inherit;font:inherit;line-height:inherit;text-align:inherit;text-decoration-line:underline;text-decoration-style:dotted;text-decoration-color:transparent;text-underline-offset:.18em;cursor:pointer; }
  .reading-word:hover { background:rgba(247,226,176,.55);text-decoration-color:#e6a527; }
  .reading-word:focus-visible { outline:2px solid #e6a527;outline-offset:1px; }
  .reading-word.marked { background:rgba(217,123,108,.2);text-decoration-color:#c9604e; }
  .reading-word.marked:hover { background:rgba(217,123,108,.3); }
  .reading-word.highlighted { background:#f7e2b0;text-decoration-color:#c9862b; }
  .reading-character { text-decoration-line:none; }
  .reading-character:hover { background:rgba(164,94,56,.14); }
  .reading-article { text-decoration-color:rgba(164,94,56,.32); }
  .reading-words { width:min(100%,44rem);margin:0 auto;border:1px dashed rgba(23,42,69,.24);border-radius:.9rem;background:rgba(255,253,247,.7); }
  .reading-words summary { padding:.55rem .8rem;cursor:pointer;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.66rem;font-weight:900;list-style:none; }
  .reading-words summary::-webkit-details-marker { display:none; }
  .reading-words summary small { color:#a45e38;font-size:.56rem;font-weight:900; }
  .reading-words ul { display:flex;flex-wrap:wrap;gap:.3rem;margin:0;padding:0 .65rem .7rem;list-style:none; }
  .reading-words li { padding:.22rem .5rem;border:1px solid rgba(23,42,69,.18);border-radius:999px;background:#f7e2b0;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:800; }
  .reading-questions { width:min(100%,44rem);margin:0 auto;display:grid;gap:.55rem;padding:clamp(.85rem,4vw,1.2rem);border:1px solid rgba(23,42,69,.2);border-radius:1.15rem;background:#fffdf7;box-shadow:0 8px 20px rgba(23,42,69,.07); }
  .reading-questions h2 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:1.15rem;font-weight:400; }
  .reading-questions ol { display:grid;gap:.55rem;margin:0;padding:0;list-style:none; }
  .reading-questions li { display:grid;grid-template-columns:auto minmax(0,1fr);gap:.5rem;padding:.6rem .65rem;border:1px solid rgba(23,42,69,.14);border-radius:.75rem;background:#fbf7ee; }
  .reading-question-badge { display:grid;place-items:center;width:1.5rem;height:1.5rem;border-radius:50%;background:#f7e2b0;color:#a45e38; }
  .reading-question-badge :global(svg) { width:.9rem;height:.9rem; }
  .reading-questions li.solved .reading-question-badge { background:#cfe6d4;color:#34824d; }
  .reading-questions li p { margin:0;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.76rem;font-weight:800;line-height:1.4; }
  .reading-answer { display:inline-flex;align-items:center;gap:.3rem;margin-top:.35rem;color:#34824d;font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:900; }
  .reading-options { display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.45rem; }
  .reading-options button { flex:1 1 10rem; }
  .reading-options button.missed { opacity:.55;text-decoration:line-through; }
  .reading-score { margin:0;padding-top:.15rem;text-align:center;color:#596477;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:800; }
  .reading-footer { display:flex;flex-wrap:wrap;justify-content:center;gap:.45rem;width:min(100%,44rem);margin:0 auto;padding-bottom:.4rem; }
  .reading-nav { display:inline-flex;align-items:center;gap:.3rem;min-height:2.4rem;font-size:.66rem; }
  .reading-nav :global(svg) { width:1rem;height:1rem; }
  .reading-empty { margin:auto;max-width:24rem;text-align:center;color:#596477;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:800; }
  .word-sheet-layer { position:fixed;inset:0;z-index:70;display:flex;align-items:flex-end;justify-content:center; }
  .word-sheet-backdrop { position:absolute;inset:0;border:0;background:rgba(12,24,40,.52);cursor:pointer; }
  .word-sheet { position:relative;z-index:1;display:grid;gap:.75rem;width:min(100%,34rem);max-height:calc(100dvh - 2.5rem);overflow-y:auto;padding:.95rem 1rem calc(1rem + env(safe-area-inset-bottom));border:1px solid rgba(23,42,69,.2);border-bottom:0;border-radius:1.1rem 1.1rem 0 0;background:#fffdf7;box-shadow:0 -12px 34px rgba(23,42,69,.22);animation:word-sheet-in .17s ease-out; }
  .word-sheet header { display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem; }
  .word-sheet-heading p { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .word-sheet-heading h2 { margin:.12rem 0 0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.4rem,6vw,1.8rem);font-weight:400;letter-spacing:-.02em;line-height:1.1; }
  .word-sheet-close { display:grid;place-items:center;flex:0 0 auto;width:2rem;height:2rem;border:1px solid rgba(23,42,69,.2);border-radius:50%;background:#fbf7ee;color:#172a45;cursor:pointer; }
  .word-sheet-close:hover { background:#f7e2b0; }
  .word-sheet-close:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }
  .word-sheet-close :global(svg) { width:1.1rem;height:1.1rem; }
  .character-portrait { display:grid;place-items:center;width:min(11.5rem,48vw);aspect-ratio:120/150;margin:.15rem auto .35rem;padding:.5rem;border:1px solid rgba(23,42,69,.14);border-radius:.9rem;background:radial-gradient(circle at 50% 34%,#f7e2b0 0%,#fffdf7 72%); }
  .character-portrait :global(svg) { width:100%;height:100%; }
  .word-sheet-block { display:grid;gap:.25rem; }
  .word-sheet-block h3 { margin:0;color:#596477;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:900;letter-spacing:.13em;text-transform:uppercase; }
  .word-sheet-block p { margin:0;color:#243449;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:500;line-height:1.6; }
  .word-sheet-cases { display:grid;gap:.28rem;margin:0; }
  .word-sheet-cases div { display:flex;align-items:baseline;justify-content:space-between;gap:.6rem;padding:.34rem .55rem;border:1px solid rgba(23,42,69,.13);border-radius:.5rem;background:#fbf7ee; }
  .word-sheet-cases div.current { border-color:#e6a527;background:#f7e2b0; }
  .word-sheet-cases dt { display:flex;align-items:center;gap:.35rem;color:#596477;font-family:'DM Sans',sans-serif;font-size:.68rem;font-weight:800; }
  .word-sheet-cases div.current dt { color:#172a45;font-weight:900; }
  .word-sheet-cases dt small { padding:.12rem .34rem;border-radius:999px;background:#e6a527;color:#172a45;font-size:.5rem;font-weight:900;letter-spacing:.01em; }
  .word-sheet-cases dd { margin:0;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.76rem;font-weight:900; }
  .word-sheet-actions { display:flex;flex-wrap:wrap;align-items:center;gap:.45rem;padding-top:.15rem; }
  .word-sheet-mark { flex:1 1 12rem;min-height:2.4rem;font-size:.66rem; }
  .word-sheet-mark.active { border-color:rgba(201,96,78,.5);background:rgba(217,123,108,.22); }
  .word-sheet-link { flex:1 1 10rem;padding:.5rem .6rem;border-radius:.65rem;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:900;text-align:center;text-decoration:underline;text-underline-offset:.16em; }
  .word-sheet-link:hover { background:rgba(247,226,176,.5); }
  @keyframes word-sheet-in { from { opacity:0;transform:translateY(1.1rem); } to { opacity:1;transform:none; } }
  @media (prefers-reduced-motion:reduce) { .word-sheet { animation:none; } }
  @media (min-width:640px) {
    .reading-header h1 { font-size:clamp(2rem,5vw,2.6rem); }
    .reading-subtitle { font-size:.84rem; }
    .reading-shelf-title { font-size:.76rem; }
    .reading-paragraph { font-size:1.03rem; }
  }
  :global(html.dark) .reading-header h1,
  :global(html.dark) .reading-shelf summary,
  :global(html.dark) .reading-shelf button,
  :global(html.dark) .reading-questions h2,
  :global(html.dark) .reading-questions li p,
  :global(html.dark) .reading-words summary { color:#fffdf7; }
  :global(html.dark) .reading-subtitle,
  :global(html.dark) .reading-shelf-kind,
  :global(html.dark) .reading-score { color:rgba(255,253,247,.68) !important; }
  :global(html.dark) .reading-shelf,
  :global(html.dark) .reading-words { border-color:rgba(255,253,247,.24);background:rgba(15,30,50,.7); }
  :global(html.dark) .reading-shelf button:hover { background:rgba(230,165,39,.16); }
  :global(html.dark) .reading-shelf button.active { border-color:#e6a527;background:#2b4a73; }
  :global(html.dark) .reading-paper,
  :global(html.dark) .reading-questions { border-color:rgba(255,253,247,.24);background:#152b47;box-shadow:0 10px 28px rgba(0,0,0,.3); }
  :global(html.dark) .reading-paragraph { color:rgba(255,253,247,.9); }
  :global(html.dark) .reading-questions li { border-color:rgba(255,253,247,.14);background:rgba(255,253,247,.05); }
  :global(html.dark) .reading-words li { border-color:rgba(255,253,247,.2);background:#2b4a73;color:#fffdf7; }
  :global(html.dark) .reading-hint { color:rgba(255,253,247,.6); }
  :global(html.dark) .reading-kicker { color:#e9b07d; }
  :global(html.dark) .reading-word:hover { background:rgba(230,165,39,.2); }
  :global(html.dark) .reading-word.marked { background:rgba(217,123,108,.28); }
  :global(html.dark) .reading-word.highlighted { background:rgba(230,165,39,.34);text-decoration-color:#e9b07d; }
  :global(html.dark) .reading-character:hover { background:rgba(233,176,125,.2); }
  :global(html.dark) .word-sheet { border-color:rgba(255,253,247,.24);background:#152b47;box-shadow:0 -12px 34px rgba(0,0,0,.45); }
  :global(html.dark) .word-sheet-heading h2,
  :global(html.dark) .word-sheet-cases dd { color:#fffdf7; }
  :global(html.dark) .word-sheet-block h3,
  :global(html.dark) .word-sheet-cases dt { color:rgba(255,253,247,.7); }
  :global(html.dark) .word-sheet-block p { color:rgba(255,253,247,.9); }
  :global(html.dark) .word-sheet-close { border-color:rgba(255,253,247,.24);background:rgba(255,253,247,.08);color:#fffdf7; }
  :global(html.dark) .word-sheet-cases div { border-color:rgba(255,253,247,.14);background:rgba(255,253,247,.06); }
  :global(html.dark) .word-sheet-cases div.current { border-color:#e6a527;background:rgba(230,165,39,.18); }
  :global(html.dark) .word-sheet-cases div.current dt { color:#fffdf7; }
  :global(html.dark) .word-sheet-cases dt small { background:#e6a527;color:#152b47; }
  :global(html.dark) .character-portrait { border-color:rgba(255,253,247,.2);background:radial-gradient(circle at 50% 34%,#2b4a73 0%,#152b47 72%); }
</style>
