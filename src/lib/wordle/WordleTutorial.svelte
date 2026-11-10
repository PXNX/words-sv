<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import TutorialSteps from '#lib/app/TutorialSteps.svelte';

  // Shown as an overlay inside the game (app/GameToolbar.svelte); the game decides what "start" does.
  let { onstart, onskip }: { onstart: () => void; onskip: () => void } = $props();

  type Mark = 'correct' | 'present' | 'absent';
  // Words that read the same in German and English, so every learner can follow the examples.
  const rows: { letters: string; marks: Mark[] }[] = [
    { letters: 'RADIO', marks: ['present', 'absent', 'absent', 'absent', 'absent'] },
    { letters: 'ROBOT', marks: ['correct', 'present', 'absent', 'absent', 'correct'] },
    { letters: 'PIZZA', marks: ['absent', 'correct', 'correct', 'correct', 'present'] }
  ];

  const locale = $derived({ locale: settings.interfaceLocale });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  const steps = $derived([
    { text: m.wordle_tutorial_step_orange({}, locale), demo: orange },
    { text: m.wordle_tutorial_step_green({}, locale), demo: green },
    { text: m.wordle_tutorial_step_repeat({}, locale), demo: repeat }
  ]);
</script>

{#snippet row(index: number, focus: Mark)}
  <div class="demo-row">
    {#each [...rows[index]!.letters] as letter, position (position)}
      {@const mark = rows[index]!.marks[position]!}
      <span class="demo-tile" data-mark={mark} class:dim={mark !== focus} style:--i={position}>{letter}</span>
    {/each}
  </div>
{/snippet}
{#snippet orange()}{@render row(0, 'present')}{/snippet}
{#snippet green()}{@render row(1, 'correct')}{/snippet}
{#snippet repeat()}{@render row(2, 'correct')}{/snippet}

<div class="tutorial-panel" dir={interfaceDirection} lang={settings.interfaceLocale}>
  <TutorialSteps kicker={m.wordle_tutorial_title({}, locale)} title={m.wordle_title({}, locale)} cornerMark="02" {steps} startLabel={m.tutorial_start({}, locale)} {onstart} {onskip} />
</div>

<style>
  .tutorial-panel { flex:1 1 auto;min-height:0;isolation:isolate;position:relative;display:grid;place-items:center;padding:clamp(1rem,6vw,2rem);background:linear-gradient(90deg,rgba(23,42,69,.055) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#fffdf7; }
  .tutorial-panel::before { content:'WORDCIRCLE · DAILY LANGUAGE FOLIO'; position:absolute;z-index:-1;top:1.35rem;left:1.55rem;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.48rem;font-weight:800;letter-spacing:.16em;opacity:.68; }
  .tutorial-panel::after { content:'';position:absolute;z-index:-1;right:1.55rem;bottom:1.45rem;width:1.12rem;height:1.12rem;border:1px solid #172a45;border-radius:50%;box-shadow:.42rem .42rem 0 -1px #fffdf7,.42rem .42rem 0 0 #e6a527;opacity:.72; }
  :global(html.dark) .tutorial-panel { background:linear-gradient(90deg,rgba(255,253,247,.11) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#172a45; }
  :global(html.dark) .tutorial-panel::before { color:#fffdf7; }:global(html.dark) .tutorial-panel::after { border-color:#fffdf7;box-shadow:.42rem .42rem 0 -1px #172a45,.42rem .42rem 0 0 #e6a527; }

  /* The example rows turn over tile by tile like the game's; the tiles that make the point stay bright. */
  .demo-row { display:flex;gap:.35rem; }
  .demo-tile { display:grid;place-items:center;width:2.4rem;height:2.4rem;border:2px solid rgba(23,42,69,.4);border-radius:.45rem;background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:1.15rem;font-weight:900;animation:demo-flip .5s calc(.2s + var(--i) * .16s) ease both; }
  .demo-tile[data-mark='correct'] { border-color:var(--color-success);background:var(--color-success);color:#fffdf7; }
  .demo-tile[data-mark='present'] { border-color:#d39723;background:var(--color-primary);color:var(--color-primary-content); }
  .demo-tile[data-mark='absent'] { border-color:#69727a;background:#69727a;color:#fffdf7; }
  .demo-tile.dim { opacity:.45; }
  @keyframes demo-flip { 0% { rotate:x 0deg;background:#fffdf7;color:#172a45;border-color:rgba(23,42,69,.4); } 49% { rotate:x 90deg;background:#fffdf7;color:#172a45;border-color:rgba(23,42,69,.4); } 51% { rotate:x 90deg; } 100% { rotate:x 0deg; } }
  @media (prefers-reduced-motion:reduce) { .demo-tile { animation:none; } }
</style>
