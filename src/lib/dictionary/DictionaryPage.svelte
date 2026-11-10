<!--
  The offline dictionary of the learning language: search any word or meaning across all levels
  (an inflected form finds its base word), open a word in a bottom sheet with its article, plural,
  cases, the parts of a German compound, its sound and a button to put it into review.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { num } from '#lib/format/num.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { loadLevel, vocabularyLevels, type Language } from '#lib/data/vocabulary.js';
  import { lookupReadingWord, type ReadingWordInfo } from '#lib/story/readingWords.js';
  import { markWordForRepeat } from '#lib/vocab/spacedRepetition.js';
  import { dueReviewEntries } from '#lib/review/ledger.js';
  import { wiktionaryUrl } from '#lib/vocab/wiktionary.js';
  import { playWordClip } from '#lib/audio/wordBank.svelte.js';
  import { naturalSupported } from '#lib/story/naturalVoices.svelte.js';
  import BottomSheet from '#lib/app/BottomSheet.svelte';
  import { buildIndex, search, splitCompound, type DictionaryEntry, type DictionaryIndex } from './dictionary.js';
  import IconSearch from '~icons/material-symbols/search-rounded';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import IconRepeat from '~icons/material-symbols/repeat-rounded';
  import IconOpen from '~icons/material-symbols/open-in-new-rounded';
  import IconBook from '~icons/material-symbols/menu-book-rounded';

  const RECENT_KEY = 'wordcircle-dictionary-recent-v1';
  const locale = $derived({ locale: settings.interfaceLocale });
  const ms = (duration: number) => (prefersReducedMotion.current ? 0 : duration);

  let index = $state<DictionaryIndex | null>(null);
  let query = $state('');
  let open = $state(false);
  let chosen = $state<DictionaryEntry | null>(null);
  let recent = $state<string[]>([]);
  let reviewing = $state(new Set<string>());
  let speaking = $state(false);

  async function load(language: Language) {
    index = null;
    const levels = await Promise.all(vocabularyLevels.map(async (level) => [level, await loadLevel(language, level)] as const));
    if (settings.lang === language) index = buildIndex(language, levels);
  }
  $effect(() => {
    void load(settings.lang);
  });
  onMount(() => {
    try { recent = JSON.parse(localStorage.getItem(`${RECENT_KEY}:${settings.lang}`) ?? '[]'); } catch { recent = []; }
    reviewing = new Set(dueReviewEntries(settings.lang, Number.MAX_SAFE_INTEGER).map(({ item }) => item));
  });

  const baseOf = (value: string) => lookupReadingWord(settings.lang, value)?.word ?? null;
  const hits = $derived(index && query.trim() ? search(index, query, baseOf) : []);
  const recentEntries = $derived(index ? recent.map((word) => index!.byWord.get(word)).filter((entry): entry is DictionaryEntry => Boolean(entry)) : []);
  const info = $derived<ReadingWordInfo | null>(chosen ? lookupReadingWord(settings.lang, chosen.spelling) : null);
  const parts = $derived.by(() => {
    if (!chosen || !index || settings.lang !== 'de' || !/^\p{Lu}/u.test(chosen.spelling)) return null;
    const known = new Set(index.byWord.keys());
    known.delete(chosen.word);
    return splitCompound(chosen.word, known);
  });
  const caseNames = $derived({ nominative: m.case_nominative({}, locale), genitive: m.case_genitive({}, locale), dative: m.case_dative({}, locale), accusative: m.case_accusative({}, locale) });

  function show(entry: DictionaryEntry) {
    chosen = entry;
    open = true;
    haptic('tap');
    recent = [entry.word, ...recent.filter((word) => word !== entry.word)].slice(0, 12);
    try { localStorage.setItem(`${RECENT_KEY}:${settings.lang}`, JSON.stringify(recent)); } catch {}
  }
  function review(entry: DictionaryEntry) {
    markWordForRepeat(settings.lang, entry.word);
    reviewing = new Set([...reviewing, entry.word]);
    haptic('success');
  }
  async function listen(entry: DictionaryEntry) {
    if (speaking) return;
    speaking = true;
    try {
      if (settings.clipVoices && naturalSupported()) {
        const playback = await playWordClip(settings.lang, entry.word);
        if (playback) {
          await playback.done;
          return;
        }
      }
      if (!('speechSynthesis' in window)) return;
      const utterance = new SpeechSynthesisUtterance(entry.spelling);
      utterance.lang = settings.lang;
      utterance.rate = 0.85;
      await new Promise<void>((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
    } finally {
      speaking = false;
    }
  }
  const headword = (entry: DictionaryEntry) => (entry.article ? `${entry.article} ${entry.spelling}` : entry.spelling);
</script>

<main class="dictionary" dir={getTextDirection(settings.interfaceLocale)} lang={settings.interfaceLocale}>
  <header class="dictionary-header">
    <span class="dictionary-icon" aria-hidden="true"><IconBook /></span>
    <div>
      <p class="dictionary-kicker">{m.dictionary_kicker({}, locale)}</p>
      <h1>{m.dictionary_title({}, locale)}</h1>
      <small>{index ? m.dictionary_count({ count: num(index.entries.length) }, locale) : m.dictionary_loading({}, locale)}</small>
    </div>
  </header>

  <label class="dictionary-search panel-play">
    <IconSearch aria-hidden="true" />
    <!-- svelte-ignore a11y_autofocus -->
    <input type="search" bind:value={query} placeholder={m.dictionary_search({}, locale)} aria-label={m.dictionary_search({}, locale)} lang={settings.lang} autocomplete="off" spellcheck="false" autofocus />
  </label>

  <!-- The results area keeps a minimum height, so typing never makes the page jump. -->
  <section class="dictionary-results" aria-live="polite">
    {#if query.trim()}
      {#if hits.length}
        <ul>
          {#each hits as hit, position (hit.entry.word)}
            <li in:fly={{ y: 6, duration: ms(160), delay: ms(Math.min(position, 8) * 18), easing: cubicOut }}>
              <button type="button" class="dictionary-hit" onclick={() => show(hit.entry)}>
                <span class="dictionary-word" lang={settings.lang}>{headword(hit.entry)}</span>
                <span class="dictionary-level">{hit.entry.level.toUpperCase()}</span>
                <small lang={settings.lang}>{hit.match === 'form' ? m.dictionary_form({ form: query.trim() }, locale) : hit.entry.definition}</small>
              </button>
            </li>
          {/each}
        </ul>
      {:else if index}
        <p class="dictionary-empty">{m.dictionary_none({}, locale)}</p>
      {/if}
    {:else if recentEntries.length}
      <h2>{m.dictionary_recent({}, locale)}</h2>
      <div class="dictionary-recent">
        {#each recentEntries as entry (entry.word)}<button type="button" onclick={() => show(entry)} lang={settings.lang}>{entry.spelling}</button>{/each}
      </div>
    {/if}
  </section>
</main>

<BottomSheet bind:open title={chosen ? headword(chosen) : ''}>
  {#if chosen}
    <div class="dictionary-detail" lang={settings.lang}>
      <p class="dictionary-meta"><span class="dictionary-level">{chosen.level.toUpperCase()}</span>{#if chosen.type}<span>{chosen.type}</span>{/if}</p>
      {#if chosen.definition}<p class="dictionary-definition">{chosen.definition}</p>{/if}
      {#if info?.plural && info.plural !== chosen.spelling}<p class="dictionary-line"><strong lang={settings.interfaceLocale}>{m.dictionary_plural({}, locale)}</strong> die {info.plural}</p>{/if}
      {#if info?.cases.length}
        <table class="dictionary-cases">
          <caption lang={settings.interfaceLocale}>{m.dictionary_cases({}, locale)}</caption>
          <tbody>{#each info.cases as row (row.grammarCase)}<tr><th scope="row" lang={settings.interfaceLocale}>{caseNames[row.grammarCase]}</th><td>{row.article} {row.form}</td></tr>{/each}</tbody>
        </table>
      {/if}
      {#if parts}
        <p class="dictionary-line"><strong lang={settings.interfaceLocale}>{m.dictionary_parts({}, locale)}</strong></p>
        <div class="dictionary-recent">
          {#each parts as part (part)}{@const entry = index?.byWord.get(part)}{#if entry}<button type="button" onclick={() => show(entry)}>{headword(entry)}</button>{/if}{/each}
        </div>
      {/if}
    </div>
    <div class="dictionary-actions">
      <button type="button" class="btn-play btn-play-sm" disabled={speaking} onclick={() => listen(chosen!)}><IconVolume aria-hidden="true" />{m.dictionary_listen({}, locale)}</button>
      <button type="button" class="btn-play btn-play-sm btn-play-ink" disabled={reviewing.has(chosen.word)} onclick={() => review(chosen!)}><IconRepeat aria-hidden="true" />{reviewing.has(chosen.word) ? m.dictionary_reviewing({}, locale) : m.dictionary_review({}, locale)}</button>
      <a class="dictionary-more" href={wiktionaryUrl(settings.lang, chosen.spelling)} target="_blank" rel="noreferrer">{m.dictionary_more({}, locale)}<IconOpen aria-hidden="true" /></a>
    </div>
  {/if}
</BottomSheet>

<style>
  .dictionary { flex:1;min-height:0;overflow-y:auto;width:100%;max-width:40rem;margin-inline:auto;padding:clamp(3.2rem,10vw,3.8rem) clamp(1rem,5vw,2rem) 2rem;display:grid;align-content:start;gap:.9rem;font-family:'DM Sans',sans-serif; }
  .dictionary-header { display:flex;align-items:center;gap:.8rem; }
  .dictionary-icon { display:grid;place-items:center;flex:none;width:3rem;height:3rem;border-radius:1rem;background:#fff4d9;color:#a45e38;animation:dictionary-flip 4s ease-in-out infinite; }
  .dictionary-icon :global(svg) { width:1.6rem;height:1.6rem; }
  :global(html.dark) .dictionary-icon { background:#4a3a1a;color:#e6a527; }
  @keyframes dictionary-flip { 0%,100% { rotate:0deg; } 50% { rotate:-6deg;scale:1.05; } }
  .dictionary-kicker { margin:0;color:#a45e38;font-size:.58rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  :global(html.dark) .dictionary-kicker { color:#e6a527; }
  .dictionary-header h1 { margin:0;font-family:'DM Serif Display',serif;font-size:1.8rem;font-weight:400;line-height:1.05; }
  .dictionary-header small { font-size:.62rem;font-weight:800;opacity:.6; }
  .dictionary-search { position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:.5rem;padding:.55rem .8rem; }
  .dictionary-search :global(svg) { flex:none;width:1.2rem;height:1.2rem;opacity:.6; }
  .dictionary-search input { flex:1;min-width:0;border:0;background:none;color:inherit;font:inherit;font-size:.95rem;font-weight:800;outline:none; }
  .dictionary-results { min-height:16rem; }
  .dictionary-results ul { display:grid;gap:.35rem;margin:0;padding:0;list-style:none; }
  .dictionary-hit { display:grid;grid-template-columns:1fr auto;gap:.15rem .6rem;width:100%;padding:.55rem .7rem;border:0;border-radius:.8rem;background:color-mix(in srgb,currentColor 5%,transparent);color:inherit;font:inherit;text-align:start;cursor:pointer;transition:background-color .15s,translate .15s; }
  .dictionary-hit:hover { background:color-mix(in srgb,#e6a527 16%,transparent);translate:2px 0; }
  .dictionary-word { font-size:.85rem;font-weight:900; }
  .dictionary-hit small { grid-column:1 / -1;overflow:hidden;font-size:.62rem;font-weight:700;opacity:.65;white-space:nowrap;text-overflow:ellipsis; }
  .dictionary-level { align-self:center;padding:.05rem .4rem;border-radius:999px;background:#172a45;color:#fffdf7;font-size:.52rem;font-weight:900;letter-spacing:.06em; }
  :global(html.dark) .dictionary-level { background:#e6a527;color:#172a45; }
  .dictionary-results h2 { margin:0 0 .45rem;font-size:.6rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;opacity:.6; }
  .dictionary-recent { display:flex;flex-wrap:wrap;gap:.35rem; }
  .dictionary-recent button { padding:.3rem .65rem;border:1.5px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:999px;background:none;color:inherit;font:inherit;font-size:.68rem;font-weight:800;cursor:pointer; }
  .dictionary-empty { margin:0;font-size:.7rem;font-weight:800;opacity:.65; }
  .dictionary-detail { display:grid;gap:.55rem; }
  .dictionary-meta { display:flex;align-items:center;gap:.5rem;margin:0;font-size:.62rem;font-weight:800;opacity:.75; }
  .dictionary-definition { margin:0;font-size:.85rem;font-weight:700;line-height:1.45; }
  .dictionary-line { margin:0;font-size:.72rem; }
  .dictionary-line strong { margin-inline-end:.35rem;font-size:.58rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;opacity:.65; }
  .dictionary-cases { border-collapse:collapse;font-size:.72rem; }
  .dictionary-cases caption { text-align:start;font-size:.58rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;opacity:.65;padding-bottom:.2rem; }
  .dictionary-cases th,.dictionary-cases td { padding:.2rem .8rem .2rem 0;text-align:start; }
  .dictionary-cases th { font-weight:700;opacity:.7; }
  .dictionary-cases td { font-weight:800; }
  .dictionary-actions { display:flex;flex-wrap:wrap;align-items:center;gap:.5rem; }
  .dictionary-actions :global(svg) { width:.9rem;height:.9rem; }
  .dictionary-more { display:inline-flex;align-items:center;gap:.25rem;color:#2a6fa8;font-size:.66rem;font-weight:800; }
  :global(html.dark) .dictionary-more { color:#9cc8ec; }
  @media (prefers-reduced-motion:reduce) { .dictionary-icon { animation:none; } .dictionary-hit { transition:none; } }
</style>
