<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import TutorialSteps from '#lib/app/TutorialSteps.svelte';

  // Shown as an overlay inside the game (app/GameToolbar.svelte).
  let { onstart, onskip }: { onstart: () => void; onskip: () => void } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  // The demo follows the language being learned; other languages keep the German example.
  const example = $derived(
    settings.lang === 'en'
      ? { word: 'UMBRELLA', related: ['UMBRELLA', 'RAIN', 'COVER'], sentence: 'A rain cover for your head.', hits: ['dry', 'cover', 'head'] }
      : { word: 'REGENSCHIRM', related: ['REGENSCHIRM', 'REGEN', 'SCHIRM'], sentence: 'Ein Regen-Schutz für den Kopf.', hits: ['trocken', 'Schutz', 'Kopf'] }
  );
  const steps = $derived([
    { text: m.taboo_tutorial_step_1({}, locale), demo: word },
    { text: m.taboo_tutorial_step_2({}, locale), demo: related },
    { text: m.taboo_tutorial_step_3({}, locale), demo: score }
  ]);
</script>

{#snippet word()}
  <div class="demo-stack">
    <span class="demo-word">{example.word}</span>
    <span class="demo-forbidden">{#each example.related as chip (chip)}<span class="demo-chip banned">{chip}</span>{/each}</span>
  </div>
{/snippet}
{#snippet related()}
  <div class="demo-stack">
    <span class="demo-explain">{example.sentence}</span>
    <span class="demo-chip banned">{example.related[1]}</span>
  </div>
{/snippet}
{#snippet score()}
  <div class="demo-stack">
    <span class="demo-score">80/100</span>
    <span class="demo-forbidden">{#each example.hits as chip, index (chip)}<span class="demo-chip" class:hit={index < 2}>{chip}</span>{/each}</span>
  </div>
{/snippet}

<div class="tutorial-panel" dir={interfaceDirection} lang={settings.interfaceLocale}>
  <TutorialSteps kicker={m.taboo_tutorial_title({}, locale)} title={m.mode_taboo({}, locale)} cornerMark="04" {steps} startLabel={m.tutorial_start({}, locale)} {onstart} {onskip} />
</div>

<style>
  .tutorial-panel { flex:1 1 auto;min-height:0;isolation:isolate;position:relative;display:grid;place-items:center;padding:clamp(1rem,6vw,2rem);background:linear-gradient(90deg,rgba(23,42,69,.055) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#fffdf7; }
  .tutorial-panel::before { content:'WORDCIRCLE · DAILY LANGUAGE FOLIO'; position:absolute;z-index:-1;top:1.35rem;left:1.55rem;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.8125rem;font-weight:800;letter-spacing:.16em;opacity:.68; }
  .tutorial-panel::after { content:'';position:absolute;z-index:-1;right:1.55rem;bottom:1.45rem;width:1.12rem;height:1.12rem;border:1px solid #172a45;border-radius:50%;box-shadow:.42rem .42rem 0 -1px #fffdf7,.42rem .42rem 0 0 #e6a527;opacity:.72; }
  :global(html.dark) .tutorial-panel { background:linear-gradient(90deg,rgba(255,253,247,.11) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#172a45; }
  :global(html.dark) .tutorial-panel::before { color:#fffdf7; }:global(html.dark) .tutorial-panel::after { border-color:#fffdf7;box-shadow:.42rem .42rem 0 -1px #172a45,.42rem .42rem 0 0 #e6a527; }

  .demo-stack { display:grid;justify-items:center;gap:.55rem; }
  .demo-word { color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.5rem,7vw,2.3rem);line-height:1;overflow-wrap:anywhere; }
  .demo-forbidden { display:flex;flex-wrap:wrap;justify-content:center;gap:.3rem; }
  .demo-chip { display:inline-block;padding:.16rem .48rem;border:1px solid rgba(23,42,69,.24);border-radius:999px;background:rgba(23,42,69,.05);color:#172a45;font-size:.8125rem;font-weight:800;line-height:1.3; }
  .demo-chip.banned { border-color:rgba(180,54,44,.45);background:rgba(180,54,44,.09);color:#a33027;text-decoration:line-through; }
  .demo-chip.hit { border-color:rgba(52,130,77,.45);background:rgba(52,130,77,.12);color:#256b3c; }
  .demo-explain { max-width:16rem;color:#172a45;font-size:.95rem;font-weight:700;line-height:1.45;text-align:center; }
  .demo-score { color:#256b3c;font-family:'DM Serif Display',serif;font-size:1.9rem;line-height:1; }

  :global(html.dark) .demo-word,
  :global(html.dark) .demo-explain { color:#fffdf7; }
  :global(html.dark) .demo-chip { border-color:rgba(255,253,247,.28);background:rgba(255,253,247,.06);color:#fffdf7; }
  :global(html.dark) .demo-chip.banned { border-color:rgba(240,138,128,.5);background:rgba(240,138,128,.13);color:#f08a80; }
  :global(html.dark) .demo-chip.hit { border-color:rgba(127,192,143,.5);background:rgba(127,192,143,.13);color:#7fc08f; }
  :global(html.dark) .demo-score { color:#7fc08f; }
</style>
