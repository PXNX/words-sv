<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import type { Language } from '#lib/data/vocabulary.js';
  import { playErrorSound, playSuccessSound } from '#lib/sounds.js';
  import { readingCatalog, type ReadingItem } from './readingCatalog';
  import { attribution, isCorrectAnswer, speakerName } from './prose';
  import type { ReadingBlock } from './readingTexts';
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
  type QuoteBlock = Extract<ReadingBlock, { kind: 'quote' }>;

  const quoteMarks: Record<Language, { open: string; close: string }> = {
    de: { open: '„', close: '“' },
    en: { open: '“', close: '”' },
    fr: { open: '« ', close: ' »' },
    it: { open: '« ', close: ' »' },
    es: { open: '« ', close: ' »' },
    pt: { open: '« ', close: ' »' },
    uk: { open: '« ', close: ' »' }
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
    empty: m.reading_empty({}, { locale: settings.interfaceLocale })
  });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  const name = $derived(settings.firstName);
  const fingerprint = $derived(`${settings.lang}|${settings.vocabularyLevel}|${settings.includeLowerVocabulary}`);
  const catalog = $derived(readingCatalog(settings.lang, settings.vocabularyLevel, settings.includeLowerVocabulary, name));

  let currentId = $state<string | null>(null);
  let solved = $state<Record<string, Record<number, true>>>({});
  let wrong = $state<Record<string, Record<number, string[]>>>({});
  let ready = $state(false);
  let paper = $state<HTMLElement | null>(null);

  const current = $derived(catalog.find((item) => item.id === currentId) ?? catalog[0] ?? null);
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

  function quoteLine(block: QuoteBlock, item: ReadingItem) {
    const marks = quoteMarks[item.language];
    const spoken = block.text.trim();
    const strong = /[?!]$/.test(spoken);
    // The closing period belongs to the attribution, so a full stop inside the quote is dropped.
    const body = strong ? spoken : spoken.replace(/[.]+$/, '');
    const speaker = speakerName(block.speaker, item.language, name || (item.language === 'de' ? 'du' : 'you'));
    const verb = attribution(speaker, block.speech ?? 'say', item.language);
    if (item.language === 'en') return `“${body}${strong ? '' : ','}” ${verb}.`;
    return `${marks.open}${body}${marks.close}${strong ? '' : ','} ${verb}.`;
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
</script>

<svelte:head>
  <title>{current ? `${current.title} · WordCircle` : `${labels.title} · WordCircle`}</title>
</svelte:head>

<section class="reading-view" aria-label={labels.title} dir={interfaceDirection} lang={settings.interfaceLocale}>
  {#if current}
    <header class="reading-header">
      <p>{labels.kicker} · {current.level.toUpperCase()}</p>
      <h1 lang={current.language}>{current.title}</h1>
      <p class="reading-subtitle" lang={current.language}>{current.subtitle}</p>
      <span class="reading-kind">{current.kind === 'text' ? labels.textKind : labels.storyKind}</span>
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
      {#each current.blocks as block, index (index)}
        {#if block.kind === 'heading'}
          <h2>{block.text}</h2>
        {:else if block.kind === 'paragraph'}
          <p class="reading-paragraph">{block.text}</p>
        {:else}
          <p class="reading-quote">{quoteLine(block, current)}</p>
        {/if}
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

<style>
  .reading-view { flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:.7rem;padding:clamp(.6rem,3vw,1rem) clamp(.7rem,3.4vw,1.2rem) clamp(.8rem,3vw,1.1rem);overflow-y:auto; }
  .reading-header { display:grid;justify-items:center;gap:.3rem;padding-top:.35rem;text-align:center; }
  .reading-header p { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase; }
  .reading-header h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.6rem,7vw,2.3rem);font-weight:400;letter-spacing:-.03em;line-height:1.02; }
  .reading-subtitle { max-width:34rem;color:#596477 !important;font-family:'DM Sans',sans-serif !important;font-size:.75rem !important;font-weight:700 !important;letter-spacing:0 !important;line-height:1.45;text-transform:none !important; }
  .reading-kind { padding:.2rem .55rem;border:1px solid rgba(23,42,69,.2);border-radius:999px;background:#f7e2b0;color:#7a431f;font-family:'DM Sans',sans-serif;font-size:.56rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }
  .reading-shelf { width:min(100%,46rem);margin:0 auto;border:1px solid rgba(23,42,69,.16);border-radius:.9rem;background:rgba(255,253,247,.82); }
  .reading-shelf summary { display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.55rem .75rem;cursor:pointer;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.66rem;font-weight:900;letter-spacing:.03em;list-style:none; }
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
  .reading-paper { width:min(100%,46rem);margin:0 auto;padding:clamp(1.05rem,5vw,2rem);border:1px solid rgba(23,42,69,.2);border-radius:1.15rem;background:#fffdf7;box-shadow:0 10px 26px rgba(23,42,69,.09);scroll-margin-top:.8rem; }
  .reading-paper h2 { margin:1.15rem 0 .45rem;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase; }
  .reading-paper h2:first-child { margin-top:0; }
  .reading-paragraph { margin:0 0 .9rem;color:#243449;font-family:'DM Sans',sans-serif;font-size:clamp(.88rem,3.6vw,.98rem);font-weight:500;line-height:1.78; }
  .reading-quote { margin:0 0 .9rem;padding:.1rem 0 .1rem .8rem;border-left:3px solid #e6a527;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(.94rem,3.9vw,1.06rem);font-weight:400;line-height:1.6; }
  .reading-words { width:min(100%,46rem);margin:0 auto;border:1px dashed rgba(23,42,69,.24);border-radius:.9rem;background:rgba(255,253,247,.7); }
  .reading-words summary { padding:.55rem .8rem;cursor:pointer;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.66rem;font-weight:900;list-style:none; }
  .reading-words summary::-webkit-details-marker { display:none; }
  .reading-words summary small { color:#a45e38;font-size:.56rem;font-weight:900; }
  .reading-words ul { display:flex;flex-wrap:wrap;gap:.3rem;margin:0;padding:0 .65rem .7rem;list-style:none; }
  .reading-words li { padding:.22rem .5rem;border:1px solid rgba(23,42,69,.18);border-radius:999px;background:#f7e2b0;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:800; }
  .reading-questions { width:min(100%,46rem);margin:0 auto;display:grid;gap:.55rem;padding:clamp(.85rem,4vw,1.2rem);border:1px solid rgba(23,42,69,.2);border-radius:1.15rem;background:#fffdf7;box-shadow:0 8px 20px rgba(23,42,69,.07); }
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
  .reading-footer { display:flex;flex-wrap:wrap;justify-content:center;gap:.45rem;width:min(100%,46rem);margin:0 auto;padding-bottom:.4rem; }
  .reading-nav { display:inline-flex;align-items:center;gap:.3rem;min-height:2.4rem;font-size:.66rem; }
  .reading-nav :global(svg) { width:1rem;height:1rem; }
  .reading-empty { margin:auto;max-width:24rem;text-align:center;color:#596477;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:800; }
  @media (min-width:640px) {
    .reading-header h1 { font-size:clamp(2rem,5vw,2.6rem); }
    .reading-subtitle { font-size:.84rem !important; }
    .reading-shelf-title { font-size:.76rem; }
    .reading-paragraph { font-size:1rem; }
    .reading-quote { font-size:1.08rem; }
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
  :global(html.dark) .reading-quote { color:#f7e2b0;border-left-color:#e6a527; }
  :global(html.dark) .reading-questions li { border-color:rgba(255,253,247,.14);background:rgba(255,253,247,.05); }
  :global(html.dark) .reading-words li { border-color:rgba(255,253,247,.2);background:#2b4a73;color:#fffdf7; }
</style>
