<!--
  A game tutorial told one step at a time: each step has a short line and a small animated example
  of what it means, with Back/Next, progress dots and a way to skip straight into the game. The last
  step's button starts playing (the game's own guided first round, where it has one).
-->
<script lang="ts" module>
  import { num } from '#lib/format/num.svelte.js';
  import type { Snippet } from 'svelte';
  export type TutorialStep = { text: string; demo: Snippet };
</script>

<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import TutorialDialog from './TutorialDialog.svelte';


  let { kicker, title, cornerMark, steps, startLabel, onstart, onskip, footer }: {
    kicker: string;
    title: string;
    cornerMark?: string;
    steps: TutorialStep[];
    startLabel: string;
    onstart: () => void;
    /** "Skip" on the first step; defaults to starting. */
    onskip?: () => void;
    /** Extra content under the last step (e.g. the practice round's hint). */
    footer?: Snippet;
  } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  let index = $state(0);
  const last = $derived(index === steps.length - 1);

  function go(next: number) {
    index = Math.max(0, Math.min(steps.length - 1, next));
  }
  function onkeydown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    const forward = document.documentElement.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const back = forward === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) go(index + 1);
    else if (event.key === back) go(index - 1);
  }
</script>

<svelte:window {onkeydown} />

<TutorialDialog {kicker} {title} {cornerMark}>
  <!-- Every step lies in the same cell and only the current one shows, so the card is as tall as
       its tallest step from the start and the buttons below never move. -->
  <div class="tutorial-stage">
    {#each steps as item, position (position)}
      <div class="tutorial-step" class:current={position === index} aria-hidden={position !== index} inert={position !== index}>
        {#if position === index}
          <div class="tutorial-demo" aria-hidden="true">{@render item.demo()}</div>
        {:else}
          <div class="tutorial-demo" aria-hidden="true">{@render item.demo()}</div>
        {/if}
        <p class="tutorial-text" aria-live={position === index ? 'polite' : 'off'}><b>{num(position + 1)}</b><span>{item.text}</span></p>
      </div>
    {/each}
  </div>
  <!-- The last step's extra line keeps its room on every step. -->
  {#if footer}<div class:invisible={!last} aria-hidden={!last}>{@render footer()}</div>{/if}
  <div class="tutorial-dots" role="tablist" aria-label={m.tutorial_step_of({ current: num(index + 1), total: num(steps.length) }, locale)}>
    {#each steps as _, dot (dot)}
      <button type="button" role="tab" class="tutorial-dot" class:active={dot === index} aria-selected={dot === index} aria-label={m.tutorial_step_of({ current: num(dot + 1), total: num(steps.length) }, locale)} onclick={() => go(dot)}></button>
    {/each}
  </div>
  <div class="tutorial-nav">
    {#if index > 0}
      <button type="button" class="btn-play btn-play-soft" onclick={() => go(index - 1)}>{m.tutorial_back({}, locale)}</button>
    {:else}
      <button type="button" class="tutorial-skip" onclick={onskip ?? onstart}>{m.tutorial_skip({}, locale)}</button>
    {/if}
    {#if last}
      <button type="button" class="btn-play btn-play-ink tutorial-go" onclick={onstart}>{startLabel}</button>
    {:else}
      <button type="button" class="btn-play btn-play-ink tutorial-go" onclick={() => go(index + 1)}>{m.tutorial_next({}, locale)}</button>
    {/if}
  </div>
</TutorialDialog>

<style>
  .tutorial-stage { display:grid; }
  .tutorial-step { grid-area:1 / 1;display:grid;grid-template-rows:1fr auto;gap:.75rem;visibility:hidden; }
  .tutorial-step.current { visibility:visible; }
  .tutorial-step:not(.current) :global(*) { animation-play-state:paused !important; }
  .tutorial-demo { display:grid;place-items:center;min-height:7.5rem;padding:.8rem;border:1.5px dashed rgba(23,42,69,.22);border-radius:1rem;background:rgba(230,165,39,.06);animation:tutorial-in .35s cubic-bezier(.23,1,.32,1) both; }
  .tutorial-text { display:grid;grid-template-columns:1.55rem 1fr;gap:.62rem;align-items:start;min-height:2.6rem;margin:0;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.95rem;font-weight:700;line-height:1.4;animation:tutorial-in .35s .06s cubic-bezier(.23,1,.32,1) both; }
  .tutorial-text b { display:grid;place-items:center;width:1.45rem;height:1.45rem;border:2px solid #172a45;border-radius:48% 52% 46% 54% / 54% 46% 52% 48%;background:#f7e2b0;box-shadow:2px 2px 0 #172a45;color:#172a45;font-family:'DM Serif Display',serif;font-size:1rem;font-weight:400; }
  .tutorial-dots { display:flex;justify-content:center;gap:.4rem; }
  .tutorial-dot { width:.5rem;height:.5rem;padding:0;border:0;border-radius:999px;background:rgba(23,42,69,.2);cursor:pointer;transition:width .25s ease,background .25s ease; }
  .tutorial-dot.active { width:1.3rem;background:#e6a527; }
  .tutorial-nav { display:flex;align-items:center;justify-content:space-between;gap:.6rem; }
  .tutorial-go { flex:1;max-width:12rem;margin-inline-start:auto; }
  .tutorial-skip { padding:.4rem .2rem;border:0;background:none;color:#596477;font:inherit;font-size:.875rem;font-weight:800;text-decoration:underline;text-underline-offset:2px;cursor:pointer; }
  @keyframes tutorial-in { from { opacity:0;translate:0 .4rem; } }
  @media (prefers-reduced-motion:reduce) { .tutorial-demo,.tutorial-text { animation:none; } .tutorial-dot { transition:none; } }
  :global(html.dark) .tutorial-demo { border-color:rgba(255,253,247,.22);background:rgba(230,165,39,.08); }
  :global(html.dark) .tutorial-text { color:#fffdf7; }
  :global(html.dark) .tutorial-text b { border-color:#fffdf7;background:#172a45;color:#e6a527;box-shadow:2px 2px 0 #fffdf7; }
  :global(html.dark) .tutorial-dot { background:rgba(255,253,247,.25); }
  :global(html.dark) .tutorial-skip { color:rgba(255,253,247,.7); }
</style>
