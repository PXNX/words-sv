<!--
  The memory map on the progress page (progress/memoryMap.ts): the whole level as small tiles that
  fill with colour as words settle in memory and fade again when a review is overdue. Tapping a
  tile names the word, shows its picture and stage, reads it aloud and offers to practise what is
  due. Each stage also has its own shape, so the map does not depend on telling colours apart.
-->
<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { wordPools, wordDefinitions } from '#lib/data/vocabulary.js';
  import { readReviewLedger, type ReviewLedger } from '#lib/review/ledger.js';
  import type { ItemStage } from '#lib/review/scheduler.js';
  import { formatDate } from '#lib/format/format.js';
  import GenderedWord from '#lib/learn/GenderedWord.svelte';
  import { pictureFor } from '#lib/learn/pictures.js';
  import { MEMORY_STAGES, buildMemoryMap, tileOpacity, type MemoryTile } from './memoryMap.js';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';

  let { ledger = readReviewLedger() }: { ledger?: ReviewLedger } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);
  const map = $derived(buildMemoryMap(settings.lang, words, ledger));
  const stageNames = $derived<Record<ItemStage, string>>({
    mature: m.memory_stage_mature({}, locale), young: m.memory_stage_young({}, locale), learning: m.memory_stage_learning({}, locale),
    leech: m.memory_stage_leech({}, locale), new: m.memory_stage_new({}, locale)
  });
  let selected = $state<MemoryTile | null>(null);
  // A changed level or language closes the detail card of a word that is no longer on the map.
  $effect(() => {
    void words;
    selected = null;
  });

  function speak(word: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = settings.lang;
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }
  function dueText(tile: MemoryTile): string {
    if (tile.dueAt === null) return m.memory_never({}, locale);
    if (tile.due) return m.memory_due_now({}, locale);
    return m.memory_due_on({ date: formatDate(settings.formatContext, new Date(tile.dueAt), 'short') }, locale);
  }
</script>

<section class="panel-play memory" aria-labelledby="memory-heading">
  <header>
    <h2 id="memory-heading">{m.memory_title({}, locale)} · {settings.vocabularyLevel.toUpperCase()}</h2>
    <strong>{num(Math.round(map.covered * 100))} %</strong>
  </header>
  <p class="memory-hint">{m.memory_hint({}, locale)}</p>
  {#if map.tiles.length}
    <div class="memory-grid" role="group" aria-label={m.memory_title({}, locale)}>
      {#each map.tiles as tile (tile.word)}
        <button
          type="button"
          class="tile {tile.stage}"
          class:due={tile.due}
          class:selected={selected?.word === tile.word}
          style={`opacity:${tileOpacity(tile)}`}
          aria-label={`${tile.word}: ${stageNames[tile.stage]}`}
          onclick={() => (selected = selected?.word === tile.word ? null : tile)}
        ></button>
      {/each}
    </div>
    <ul class="memory-legend">
      {#each MEMORY_STAGES as stage (stage)}
        {#if map.counts[stage] > 0 || stage === 'new'}<li><i class="tile {stage}" aria-hidden="true"></i>{stageNames[stage]} <b>{num(map.counts[stage])}</b></li>{/if}
      {/each}
    </ul>
    {#if selected}
      {@const picture = pictureFor(settings.lang, selected.word)}
      <div class="memory-detail pop-in" aria-live="polite">
        {#if picture}<span class="memory-picture" aria-hidden="true">{picture}</span>{/if}
        <div class="memory-detail-text">
          <p class="memory-word"><GenderedWord word={selected.word} language={settings.lang} /></p>
          {#if wordDefinitions[settings.lang][selected.word]}<p class="memory-definition" lang={settings.lang}>{wordDefinitions[settings.lang][selected.word]}</p>{/if}
          <p class="memory-meta"><i class="tile {selected.stage}" aria-hidden="true"></i>{stageNames[selected.stage]} · {dueText(selected)}</p>
        </div>
        <button type="button" class="btn-play btn-play-round btn-play-soft" onclick={() => speak(selected!.word)} aria-label={m.learning_listen({}, locale)}><IconVolume aria-hidden="true" /></button>
      </div>
    {/if}
    {#if map.due > 0}
      <a class="btn-play btn-play-ink memory-cta" href="/vocab?due=1">{m.memory_practise({ count: num(map.due) }, locale)}</a>
    {/if}
  {:else}
    <p class="memory-hint">{m.learning_unavailable({}, locale)}</p>
  {/if}
</section>

<style>
  .memory { margin-top:1.2rem;padding:.9rem 1rem 1rem;display:grid;gap:.6rem;font-family:var(--font-body); }
  .memory header { display:flex;align-items:baseline;justify-content:space-between;gap:.6rem; }
  .memory h2 { margin:0;color:var(--color-accent);font-size:var(--text-xs);font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .memory header strong { color:var(--text);font-family:var(--font-display);font-size:1.35rem;font-weight:400;line-height:1;font-variant-numeric:tabular-nums; }
  .memory-hint { margin:0;color:var(--text-soft);font-size:var(--text-xs);font-weight:600;line-height:1.45; }
  .memory-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(.8rem,1fr));gap:3px; }
  .tile { display:block;aspect-ratio:1;width:100%;min-width:0;padding:0;border:1.5px solid color-mix(in oklch,var(--text) 22%,transparent);border-radius:3px;background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:scale var(--dur-quick) var(--ease-spring); }
  /* Stage by colour and by shape: learning is a dot, young a rounded square, mature a full square, a leech a diamond. */
  .tile.learning { border-color:transparent;border-radius:50%;background:var(--sun);scale:.72; }
  .tile.young { border-color:transparent;border-radius:35%;background:color-mix(in oklch,var(--go) 62%,var(--paper)); }
  .tile.mature { border-color:transparent;border-radius:2px;background:var(--go); }
  .tile.leech { border-color:transparent;border-radius:2px;background:var(--no);rotate:45deg;scale:.72; }
  .tile.due { box-shadow:0 0 0 1.5px var(--sun); }
  .tile.selected { opacity:1 !important;scale:1.5;box-shadow:0 0 0 2px var(--text);z-index:1;position:relative; }
  .tile:focus-visible { outline:2px solid var(--sun);outline-offset:2px; }
  .memory-legend { display:flex;flex-wrap:wrap;gap:.3rem .9rem;margin:0;padding:0;list-style:none;color:var(--text-soft);font-size:var(--text-xs);font-weight:700; }
  .memory-legend li { display:inline-flex;align-items:center;gap:.35rem; }
  .memory-legend b { color:var(--text);font-variant-numeric:tabular-nums; }
  .memory-legend .tile,.memory-meta .tile { flex:none;width:.75rem;cursor:default; }
  .memory-detail { display:flex;align-items:center;gap:.7rem;padding:.65rem .75rem;border:2px solid var(--line-soft);border-radius:14px;background:color-mix(in oklch,var(--sun-soft) 40%,transparent); }
  .memory-picture { flex:none;font-size:2.2rem;line-height:1;font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif; }
  .memory-detail-text { flex:1;min-width:0;display:grid;gap:.15rem; }
  .memory-word { margin:0;color:var(--text);font-family:var(--font-display);font-size:1.35rem;line-height:1.15;overflow-wrap:anywhere; }
  .memory-definition { margin:0;color:var(--text-soft);font-size:var(--text-xs);font-weight:600;line-height:1.4; }
  .memory-meta { display:flex;align-items:center;gap:.35rem;margin:0;color:var(--text);font-size:var(--text-xs);font-weight:800; }
  .memory-cta { justify-self:start; }
  :global(html.dark) .memory-detail { background:color-mix(in oklch,var(--paper) 7%,transparent); }
  :global(html.dark) .tile.young { background:color-mix(in oklch,#6fcf8e 50%,var(--surface)); }
  :global(html.dark) .tile.mature { background:#6fcf8e; }
  @media (prefers-reduced-motion:reduce) { .tile { transition:none; } }
</style>
