<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { num } from '#lib/format/num.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { playErrorSound, playSuccessSound } from '#lib/feedback/sounds.js';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { spokenWord, wordDefinitions, type Language } from '#lib/data/vocabulary.js';
  import { logAnswer } from '#lib/progress/eventLog.js';
  import { recordMissedWord } from '#lib/story/missedWords.js';
  import { nextTabooWord, rateDescription, relatedForms, tabooCandidates, type TabooRating } from './taboo';

  let { words, language, level }: { words: string[]; language: string; level: string } = $props();

  // Definitions are indexed by the uppercased word, just like the pool.
  const definitions = $derived(wordDefinitions[language as Language] ?? {});
  const candidates = $derived(tabooCandidates(words, definitions));

  let target = $state('');
  let draft = $state('');
  let rating = $state<TabooRating | null>(null);
  let revealed = $state(false);
  let recent = $state<string[]>([]);
  let recorded = '';
  let input = $state<HTMLTextAreaElement>();

  const locale = $derived({ locale: settings.interfaceLocale });
  const related = $derived(target ? relatedForms(target, words) : []);
  const forbiddenForms = $derived(target ? [target, ...related] : []);
  const definition = $derived(target ? definitions[target] ?? '' : '');
  const spelling = $derived(target ? spokenWord(language as Language, target) : '');
  const done = $derived(rating !== null || revealed);

  const verdictText = $derived(
    !rating
      ? ''
      : rating.verdict === 'pass'
        ? m.taboo_result_pass({ score: num(rating.score) }, locale)
        : rating.verdict === 'close'
          ? m.taboo_result_close({ score: num(rating.score) }, locale)
          : m.taboo_result_fail({ score: num(rating.score) }, locale)
  );

  function start() {
    // `candidates` is only non-empty when the mode is rendered.
    target = nextTabooWord(candidates, recent);
    recent = [...recent, target].slice(-8);
    draft = '';
    rating = null;
    revealed = false;
    recorded = '';
    void tick().then(() => input?.focus());
  }

  function check() {
    if (!target || !draft.trim() || done) return;
    const result = rateDescription(target, definition, draft);
    rating = result;
    if (recorded !== target) {
      recorded = target;
      const passed = result.verdict === 'pass';
      logAnswer(language, 'taboo', `TABOO:${target}`, passed, { level, score: result.score / 100 });
      if (passed) {
        playSuccessSound(settings.sound, 'pronunciation');
        haptic('win');
        void settings.recordStreak('taboo_completed');
      } else {
        playErrorSound(settings.sound, 'vocab');
        haptic('error');
        recordMissedWord(language, target);
      }
    }
  }

  // Skipping reveals the word's own description, then moves on.
  function skip() {
    if (!target || done) return;
    revealed = true;
    recordMissedWord(language, target);
    haptic('tap');
  }

  function onkeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      check();
    }
  }

  // A new language or level starts over with a word from it.
  $effect(() => {
    language;
    level;
    candidates;
    untrack(start);
  });
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape' && done) start(); }} />

<section
  class="flex-1 min-h-0 grid content-start gap-[clamp(.75rem,2.8vw,1.2rem)] pt-[clamp(1.25rem,7svh,4rem)] px-[clamp(.8rem,3vw,1.25rem)] pb-[clamp(1rem,3vw,1.5rem)] overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,rgba(237,228,213,.8),rgba(255,253,247,.65))] dark:bg-[linear-gradient(180deg,#213a5d,#172a45)]"
  aria-label={m.mode_taboo({}, locale)}
>
  <h1 class="sr-only">{m.mode_taboo({}, locale)}</h1>

  {#if candidates.length === 0}
    <div class="note-play p-[1.25rem] text-accent text-[.75rem] font-extrabold text-center justify-self-center">{m.taboo_empty({}, locale)}</div>
  {:else}
    <div class="panel-play w-[min(100%,28rem)] justify-self-center grid gap-[clamp(.7rem,3vw,1rem)] px-[clamp(1rem,5vw,1.6rem)] py-[clamp(1rem,4vw,1.4rem)]">
      <p class="taboo-kicker">{m.taboo_kicker({}, locale)}</p>

      <div class="taboo-head">
        <p class="taboo-word" lang={language}>{target}</p>
        {#if !done}
          <div class="taboo-forbidden">
            <span class="taboo-forbidden-label">{m.taboo_forbidden_label({}, locale)}</span>
            <span class="flex flex-wrap gap-[.3rem]">{#each forbiddenForms as word (word)}<span class="taboo-chip taboo-chip-forbidden">{word}</span>{/each}</span>
          </div>
        {/if}
      </div>

      {#if rating}
        <div class="taboo-result" role="status" aria-live="polite">
          <p class="taboo-verdict" class:taboo-pass={rating.verdict === 'pass'} class:taboo-close={rating.verdict === 'close'} class:taboo-fail={rating.verdict === 'fail'}>{verdictText}</p>
          {#if rating.forbidden.length > 0}
            <p class="taboo-note taboo-note-error">{m.taboo_forbidden_used({ words: rating.forbidden.join(', ') }, locale)}</p>
          {/if}
          {#if rating.matched.length > 0}
            <p class="taboo-note">{m.taboo_matched({}, locale)}</p>
            <span class="flex flex-wrap gap-[.3rem]">{#each rating.matched as word (word)}<span class="taboo-chip taboo-chip-hit">{word}</span>{/each}</span>
          {/if}
          {#if rating.missed.length > 0}
            <p class="taboo-note">{m.taboo_missed({}, locale)}</p>
            <span class="flex flex-wrap gap-[.3rem]">{#each rating.missed as word (word)}<span class="taboo-chip">{word}</span>{/each}</span>
          {/if}
        </div>
      {:else if revealed}
        <p class="taboo-note taboo-skipped" role="status">{m.taboo_skipped({}, locale)}</p>
      {/if}

      {#if done && definition}
        <div class="taboo-definition">
          <p>{m.taboo_meaning({}, locale)}</p>
          <p class="taboo-spelling">{spelling}</p>
          <p>{definition}</p>
        </div>
      {/if}

      {#if done}
        <button class="btn-play btn-play-go" onclick={start}>{m.taboo_next({}, locale)}</button>
      {:else}
        <label class="taboo-label" for="taboo-input">{m.taboo_input_label({}, locale)}</label>
        <!-- svelte-ignore a11y_autofocus -->
        <textarea
          id="taboo-input"
          bind:this={input}
          bind:value={draft}
          class="taboo-input"
          rows="4"
          maxlength="500"
          lang={language}
          placeholder={m.taboo_placeholder({}, locale)}
          onkeydown={onkeydown}
          autofocus
        ></textarea>
        <div class="taboo-actions">
          <button class="btn-play btn-play-go" onclick={check} disabled={!draft.trim()}>{m.taboo_check({}, locale)}</button>
          <button class="btn-play btn-play-soft" onclick={skip}>{m.taboo_skip({}, locale)}</button>
        </div>
        <p class="taboo-hint">{m.taboo_hint({}, locale)}</p>
      {/if}
    </div>
  {/if}
</section>

<style>
  .taboo-kicker { margin:0;color:#a45e38;font-size:.58rem;font-weight:900;letter-spacing:.14em;text-align:center;text-transform:uppercase; }
  .taboo-head { display:grid;justify-items:center;gap:.55rem; }
  .taboo-word { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(2rem,12vw,3.1rem);line-height:1;text-align:center;overflow-wrap:anywhere; }
  .taboo-forbidden { display:grid;justify-items:center;gap:.28rem;text-align:center; }
  .taboo-forbidden-label { color:rgba(23,42,69,.6);font-size:.55rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase; }
  .taboo-chip { display:inline-block;padding:.18rem .5rem;border:1px solid rgba(23,42,69,.22);border-radius:999px;background:rgba(23,42,69,.04);color:#172a45;font-size:.64rem;font-weight:800;line-height:1.3;overflow-wrap:anywhere; }
  .taboo-chip-forbidden { border-color:rgba(180,54,44,.45);background:rgba(180,54,44,.09);color:#a33027;text-decoration:line-through; }
  .taboo-chip-hit { border-color:rgba(52,130,77,.45);background:rgba(52,130,77,.12);color:#256b3c; }

  .taboo-label { color:#172a45;font-size:.6rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }
  .taboo-input { width:100%;min-height:6.4rem;resize:vertical;padding:.65rem .75rem;border:2px solid rgba(23,42,69,.35);border-radius:.7rem;background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.92rem;font-weight:600;line-height:1.45; }
  .taboo-input:focus-visible { outline:3px dashed #e6a527;outline-offset:2px;border-color:rgba(23,42,69,.6); }
  .taboo-actions { display:flex;flex-wrap:wrap;gap:.55rem; }
  .taboo-actions .btn-play { flex:1 1 8rem;justify-content:center; }
  .taboo-hint { margin:0;color:rgba(23,42,69,.65);font-size:.6rem;font-weight:700;line-height:1.4;text-align:center; }

  .taboo-result { display:grid;justify-items:center;gap:.42rem;text-align:center;animation:taboo-rise .28s ease-out both; }
  .taboo-verdict { margin:0;font-size:.82rem;font-weight:900;line-height:1.35; }
  .taboo-pass { color:#256b3c; }
  .taboo-close { color:#a45e38; }
  .taboo-fail { color:#a33027; }
  .taboo-note { margin:0;color:rgba(23,42,69,.7);font-size:.58rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }
  .taboo-note-error { color:#a33027;text-transform:none;letter-spacing:0;font-size:.66rem; }
  .taboo-skipped { color:#a45e38;font-size:.62rem;letter-spacing:0;text-transform:none; }

  .taboo-definition { display:grid;gap:.28rem;padding:.6rem .7rem;border:1px solid rgba(23,42,69,.16);border-radius:.7rem;background:rgba(23,42,69,.04);text-align:center;animation:taboo-rise .28s ease-out both; }
  .taboo-definition p { margin:0;color:rgba(23,42,69,.82);font-size:.72rem;font-weight:700;line-height:1.45; }
  .taboo-definition p:first-child { color:rgba(23,42,69,.55);font-size:.52rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .taboo-definition .taboo-spelling { color:#a45e38;font-family:'DM Serif Display',serif;font-size:1.05rem;font-weight:400; }

  @keyframes taboo-rise { from { opacity:0;transform:translateY(.35rem); } }

  :global(html.dark) .taboo-kicker,
  :global(html.dark) .taboo-definition .taboo-spelling,
  :global(html.dark) .taboo-skipped { color:#e6a527; }
  :global(html.dark) .taboo-word,
  :global(html.dark) .taboo-label { color:#fffdf7; }
  :global(html.dark) .taboo-forbidden-label,
  :global(html.dark) .taboo-hint,
  :global(html.dark) .taboo-note { color:rgba(255,253,247,.62); }
  :global(html.dark) .taboo-chip { border-color:rgba(255,253,247,.28);background:rgba(255,253,247,.06);color:#fffdf7; }
  :global(html.dark) .taboo-chip-forbidden { border-color:rgba(240,138,128,.5);background:rgba(240,138,128,.13);color:#f08a80; }
  :global(html.dark) .taboo-chip-hit { border-color:rgba(127,192,143,.5);background:rgba(127,192,143,.13);color:#7fc08f; }
  :global(html.dark) .taboo-input { border-color:rgba(255,253,247,.3);background:#172a45;color:#fffdf7; }
  :global(html.dark) .taboo-definition { border-color:rgba(255,253,247,.18);background:rgba(255,253,247,.05); }
  :global(html.dark) .taboo-definition p { color:rgba(255,253,247,.82); }
  :global(html.dark) .taboo-pass { color:#7fc08f; }
  :global(html.dark) .taboo-close { color:#e6a527; }
  :global(html.dark) .taboo-fail,
  :global(html.dark) .taboo-note-error { color:#f08a80; }

  @media (prefers-reduced-motion: reduce) {
    .taboo-result, .taboo-definition { animation:none; }
  }
</style>
