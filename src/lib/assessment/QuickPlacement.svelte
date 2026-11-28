<!--
  The onboarding placement: nine quick yes/no words across A1–B1, about a minute long. It reuses the
  full test's scoring rules but keeps the learner inside the welcome flow; the chosen level is
  applied when they continue, and the full /placement test stays available for a deeper check.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { playableLanguages, vocabularyLevels, warmLanguage, wordPools, type Language, type VocabularyLevel } from '#lib/data/vocabulary.js';
  import { seededRandom } from './placement.js';
  import { quickPlacementItems, quickPlacementResult, type QuickPlacementItem } from './quickPlacement.js';
  import { playSoundEffect } from '#lib/feedback/sounds.js';
  import { haptic } from '#lib/feedback/haptics.js';

  let { language, ondone, onskip }: {
    language: Language;
    ondone: (level: VocabularyLevel) => void;
    onskip: () => void;
  } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  const languageLabel = $derived(playableLanguages.find((entry) => entry.code === language)?.label ?? language);
  let items = $state<QuickPlacementItem[]>([]);
  let index = $state(0);
  let answers = $state<Array<QuickPlacementItem & { known: boolean }>>([]);
  let level = $state<VocabularyLevel | null>(null);
  let ready = $state(false);

  const item = $derived(items[index] ?? null);

  onMount(() => {
    let alive = true;
    void warmLanguage(language).then(() => {
      if (!alive) return;
      const corpus = vocabularyLevels.flatMap((level) => wordPools[language][level]);
      items = quickPlacementItems(wordPools[language], corpus, seededRandom(Date.now()), new Set(corpus));
      ready = true;
    });
    return () => { alive = false; };
  });

  function answer(known: boolean) {
    if (!item) return;
    haptic('tap');
    playSoundEffect(settings.sound, 'pop');
    answers = [...answers, { ...item, known }];
    const next = index + 1;
    if (next < items.length) {
      index = next;
      return;
    }
    level = quickPlacementResult(answers);
    haptic('win');
    playSoundEffect(settings.sound, 'purr');
  }

  function finish() {
    if (level) settings.setVocabularyLevel(level);
    ondone(level ?? settings.vocabularyLevel);
  }
</script>

<div class="quick-placement">
  <span class="welcome-solo" aria-hidden="true">✦</span>
  <p class="welcome-kicker">{m.quick_level_kicker({}, locale)}</p>
  <h1>{m.quick_level_title({}, locale)}</h1>
  {#if !ready}
    <span class="welcome-body">{languageLabel} …</span>
  {:else if level}
    <div class="quick-result" in:fade>
      <span class="quick-result-level">{level.toUpperCase()}</span>
      <span class="welcome-body">{m.quick_level_result({ level: level.toUpperCase() }, locale)}</span>
      <button type="button" class="btn-play btn-play-ink welcome-cta" onclick={finish}>{m.quick_level_go({}, locale)}</button>
    </div>
  {:else if item}
    <span class="welcome-body">{m.quick_level_hint({}, locale)}</span>
    <span class="quick-progress" aria-label={m.quick_level_progress({ done: index, total: items.length }, locale)}>
      {#each items as _entry, position (position)}<i class:done={position < index} class:current={position === index}></i>{/each}
    </span>
    {#key index}
      <strong class="quick-word" in:fly={{ y: 12, duration: 220 }}>{item.text}</strong>
    {/key}
    <div class="quick-actions">
      <button type="button" class="btn-play btn-play-soft" onclick={() => answer(false)}>{m.quick_level_unknown({}, locale)}</button>
      <button type="button" class="btn-play btn-play-ink" onclick={() => answer(true)}>{m.quick_level_known({}, locale)}</button>
    </div>
    <button type="button" class="quick-skip" onclick={onskip}>{m.quick_level_skip({}, locale)}</button>
  {/if}
</div>

<style>
  .quick-placement { display:grid;justify-items:center;gap:.8rem;min-width:0;width:100%; }
  .quick-placement h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.8rem,8vw,2.5rem);font-weight:400;letter-spacing:-.04em;line-height:1; }
  .quick-placement :global(.welcome-body) { color:#596477;font-family:'DM Sans',sans-serif;font-size:.95rem;font-weight:700;line-height:1.45; }
  .quick-placement :global(.welcome-kicker) { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .welcome-solo { color:#e6a527;font-size:2.4rem;line-height:1; }
  .quick-progress { display:flex;gap:.3rem; }
  .quick-progress i { width:.5rem;height:.5rem;border-radius:999px;background:rgba(23,42,69,.18); }
  .quick-progress i.done { background:#34824d; }
  .quick-progress i.current { background:#e6a527;scale:1.3; }
  .quick-word { color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(2.2rem,11vw,3.2rem);font-weight:400;line-height:1;text-align:center;overflow-wrap:anywhere; }
  .quick-actions { display:grid;grid-template-columns:1fr 1fr;gap:.5rem;width:100%; }
  .quick-actions .btn-play { justify-content:center;min-height:2.9rem; }
  .quick-skip { padding:.2rem;border:0;background:none;color:#596477;font:inherit;font-size:.84rem;font-weight:800;text-decoration:underline;cursor:pointer; }
  .quick-result { display:grid;justify-items:center;gap:.6rem;width:100%; }
  .quick-result-level { color:#172a45;font-family:'DM Serif Display',serif;font-size:3.4rem;line-height:1; }
  :global(html.dark) .quick-placement h1,:global(html.dark) .quick-word,:global(html.dark) .quick-result-level { color:#fffdf7; }
  :global(html.dark) .quick-placement :global(.welcome-body),:global(html.dark) .quick-skip { color:#d6dfeb; }
  @media (prefers-reduced-motion:reduce) { .quick-word { transition:none; } }
</style>
