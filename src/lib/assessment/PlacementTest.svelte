<!--
  The placement test (assessment/placement.ts): Lilith shows real and invented words level by
  level, the learner taps "known" or "not known", and the result can be taken over as their level.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { warmLanguage, wordMetadata, wordPools } from '#lib/data/vocabulary.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { logAnswer } from '#lib/progress/eventLog.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import type { Level } from '#lib/domain/types.js';
  import type { Mood } from '#lib/story/stories.js';
  import { placementResult, placementRound, PLACEMENT_LEVELS, scoreLevel, seededRandom, testableLevels, type LevelScore, type PlacementAnswer, type PlacementItem } from './placement.js';

  type Phase = 'loading' | 'intro' | 'test' | 'result' | 'unavailable';
  let phase = $state<Phase>('loading');
  let testable = $state<Level[]>([]);
  let levelIndex = $state(0);
  let items = $state<PlacementItem[]>([]);
  let itemIndex = $state(0);
  let answers = $state<PlacementAnswer[]>([]);
  let scores = $state<Array<{ level: Level; score: LevelScore }>>([]);
  let result = $state<Level>('a1');
  let applied = $state(false);
  let mood = $state<Mood>('curious');
  let corpus: string[] = [];
  let exclude = new Set<string>();
  let random = seededRandom(Date.now());

  const language = settings.lang;
  const locale = $derived({ locale: settings.interfaceLocale });
  const ms = (duration: number) => (prefersReducedMotion.current ? 0 : duration);
  const item = $derived(items[itemIndex]);
  const level = $derived(testable[levelIndex] ?? 'a1');
  const progress = $derived(testable.length ? (levelIndex + itemIndex / Math.max(1, items.length)) / testable.length : 0);

  const spelling = (key: string) => wordMetadata[language]?.[key]?.spelling ?? key.toLocaleLowerCase();
  const wordsOf = (target: Level) => (wordPools[language]?.[target] ?? []).map(spelling);

  onMount(async () => {
    await warmLanguage(language);
    testable = testableLevels(Object.fromEntries(PLACEMENT_LEVELS.map((entry) => [entry, wordPools[language]?.[entry]?.length ?? 0])));
    corpus = PLACEMENT_LEVELS.flatMap(wordsOf);
    exclude = new Set(corpus);
    phase = testable.length ? 'intro' : 'unavailable';
  });

  function startLevel(index: number) {
    levelIndex = index;
    // German nouns are capitalised, so some invented words are too; otherwise the case gives them away.
    items = placementRound(wordsOf(testable[index]!), corpus, random, exclude).map((entry) => entry.real || language !== 'de' || random() < 0.5 ? entry : { ...entry, text: entry.text.charAt(0).toLocaleUpperCase('de') + entry.text.slice(1) });
    itemIndex = 0;
    answers = [];
  }
  function start() {
    random = seededRandom(Date.now());
    scores = [];
    phase = 'test';
    startLevel(0);
  }
  function answer(known: boolean) {
    if (!item) return;
    const entry = { ...item, known };
    answers = [...answers, entry];
    logAnswer(language, 'placement', `PLACEMENT:${item.text}`, known === item.real, { level });
    haptic('tap');
    mood = known ? 'happy' : 'neutral';
    if (itemIndex < items.length - 1) {
      itemIndex += 1;
      return;
    }
    scores = [...scores, { level, score: scoreLevel(answers) }];
    const outcome = placementResult(scores, testable);
    if (outcome.done) {
      result = outcome.level;
      mood = 'happy';
      phase = 'result';
      haptic('win');
    } else startLevel(levelIndex + 1);
  }
  function apply() {
    settings.setVocabularyLevel(result);
    applied = true;
    haptic('success');
  }
</script>

<svelte:window onkeydown={(event) => { if (phase !== 'test') return; if (event.key === 'ArrowRight') answer(true); else if (event.key === 'ArrowLeft') answer(false); }} />

<section class="placement" dir={getTextDirection(settings.interfaceLocale)} lang={settings.interfaceLocale}>
  <header>
    <p class="placement-kicker">{m.placement_title({}, locale)}</p>
    {#if phase === 'test'}<span class="placement-bar" aria-hidden="true"><i style={`width:${progress * 100}%`}></i></span>{/if}
  </header>
  <span class="placement-lilith" aria-hidden="true"><StoryCharacter id="lilith" {mood} /></span>

  {#if phase === 'intro'}
    <div class="placement-panel" in:fly={{ y: 16, duration: ms(320) }}>
      <h1>{m.placement_heading({}, locale)}</h1>
      <p>{m.placement_intro({}, locale)}</p>
      <button type="button" class="btn-play btn-play-ink placement-cta" onclick={start}>{m.placement_start({}, locale)}</button>
    </div>
  {:else if phase === 'test' && item}
    <p class="placement-level">{level.toUpperCase()}</p>
    {#key `${levelIndex}-${itemIndex}`}
      <p class="placement-word" lang={language} dir="ltr" in:scale={{ start: 0.8, duration: ms(260), easing: backOut }}>{item.text}</p>
    {/key}
    <div class="placement-answers">
      <button type="button" class="btn-play btn-play-soft" onclick={() => answer(false)}>{m.placement_unknown({}, locale)}</button>
      <button type="button" class="btn-play btn-play-ink" onclick={() => answer(true)}>{m.placement_known({}, locale)}</button>
    </div>
    <p class="placement-note">{m.placement_note({}, locale)}</p>
  {:else if phase === 'result'}
    <div class="placement-panel" in:scale={{ start: 0.85, duration: ms(380), easing: backOut }}>
      <p class="placement-badge">{result.toUpperCase()}</p>
      <h1>{m.placement_result_title({ level: result.toUpperCase() }, locale)}</h1>
      <p>{m.placement_result_body({}, locale)}</p>
      {#if result === settings.vocabularyLevel || applied}
        <p class="placement-applied">{m.placement_applied({}, locale)}</p>
        <a class="btn-play btn-play-ink placement-cta" href="/">{m.placement_done({}, locale)}</a>
      {:else}
        <button type="button" class="btn-play btn-play-ink placement-cta" onclick={apply}>{m.placement_apply({ level: result.toUpperCase() }, locale)}</button>
      {/if}
      <button type="button" class="btn-play btn-play-soft placement-cta" onclick={start}>{m.placement_again({}, locale)}</button>
    </div>
  {:else if phase === 'unavailable'}
    <div class="placement-panel"><p>{m.placement_unavailable({}, locale)}</p></div>
  {/if}
</section>

<style>
  .placement { flex:1;min-height:0;overflow-y:auto;display:grid;align-content:start;justify-items:center;gap:.9rem;width:min(100%,28rem);margin-inline:auto;padding:clamp(2.9rem,10vw,3.6rem) clamp(1rem,5vw,2rem) 1.5rem;text-align:center; }
  header { display:grid;gap:.45rem;width:100%; }
  .placement-kicker { margin:0;color:#a45e38;font-size:.62rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .placement-bar { height:.4rem;border-radius:999px;background:rgba(23,42,69,.12);overflow:hidden; }
  .placement-bar i { display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#e6a527,#34824d);transition:width .35s cubic-bezier(.23,1,.32,1); }
  .placement-lilith { display:block;width:5rem;height:6rem; }
  .placement-panel { display:grid;gap:.75rem;width:100%; }
  .placement h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.7rem,8vw,2.3rem);font-weight:400;line-height:1; }
  .placement-panel p { margin:0;color:#596477;font-size:.82rem;font-weight:700;line-height:1.45; }
  .placement-cta { width:100%;min-height:2.8rem;justify-content:center; }
  .placement-level { margin:0;padding:.15rem .6rem;border-radius:999px;background:rgba(230,165,39,.18);color:#a45e38;font-size:.66rem;font-weight:900;letter-spacing:.08em; }
  .placement-word { margin:.4rem 0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(2.2rem,11vw,3.2rem);line-height:1.05;word-break:break-word; }
  .placement-answers { display:grid;grid-template-columns:1fr 1fr;gap:.6rem;width:100%; }
  .placement-answers button { min-height:3rem;justify-content:center; }
  .placement-note { margin:0;color:#596477;font-size:.64rem;font-weight:700;opacity:.8; }
  .placement-badge { justify-self:center;margin:0;padding:.4rem 1rem;border-radius:1rem;background:#34824d;color:#fffdf7 !important;font-size:1.6rem !important;font-weight:900 !important; }
  .placement-applied { color:#34824d !important;font-weight:900 !important; }
  :global(html.dark) .placement h1,:global(html.dark) .placement-word { color:#fffdf7; }
  :global(html.dark) .placement-panel p,:global(html.dark) .placement-note { color:rgba(255,253,247,.72); }
  :global(html.dark) .placement-bar { background:rgba(255,253,247,.14); }
</style>
