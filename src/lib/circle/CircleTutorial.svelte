<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import TutorialSteps from '#lib/app/TutorialSteps.svelte';

  // Shown as an overlay inside the game (app/GameToolbar.svelte); the game decides what "start" does.
  let { definitions = false, onstart, onskip }: { definitions?: boolean; onstart: () => void; onskip: () => void } = $props();
  const isDefinitionsMode = $derived(definitions);

  const circleTutorialHints: Record<'de' | 'en', string> = {
    de: 'G••••• · G•• · T••',
    en: 'P••••• · P•• · T••'
  };

  const tutorialLanguage = $derived<'de' | 'en'>(settings.lang === 'de' || settings.lang === 'en' ? settings.lang : 'de');

  const labels = $derived({
    kicker: m.tutorial_kicker({}, { locale: settings.interfaceLocale }),
    title: m.tutorial_title({}, { locale: settings.interfaceLocale }),
    trace: isDefinitionsMode ? m.tutorial_type({}, { locale: settings.interfaceLocale }) : m.tutorial_trace({}, { locale: settings.interfaceLocale }),
    grid: m.tutorial_grid({}, { locale: settings.interfaceLocale }),
    help: m.tutorial_help({}, { locale: settings.interfaceLocale }),
    start: m.tutorial_start({}, { locale: settings.interfaceLocale }),
    hint: isDefinitionsMode ? m.type_hint({}, { locale: settings.interfaceLocale }) : m.hint({}, { locale: settings.interfaceLocale })
  });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  const tutorialHint = $derived(circleTutorialHints[tutorialLanguage]);
  const steps = $derived([
    { text: labels.trace, demo: isDefinitionsMode ? typeDemo : traceDemo },
    { text: labels.grid, demo: gridDemo },
    { text: labels.help, demo: helpDemo }
  ]);
  // The example word: RAT reads as a word in German and English.
  const wheel = [{ letter: 'R', x: 50, y: 14 }, { letter: 'A', x: 86, y: 50 }, { letter: 'T', x: 50, y: 86 }, { letter: 'E', x: 14, y: 50 }];
</script>

{#snippet traceDemo()}
  <div class="demo-trace">
    <svg viewBox="0 0 100 100" class="demo-wheel">
      <circle cx="50" cy="50" r="46" class="demo-wheel-back" />
      <path d="M50 14 86 50 50 86" class="demo-path" pathLength="1" />
      {#each wheel as spot (spot.letter)}<g transform={`translate(${spot.x} ${spot.y})`}><circle r="11" class="demo-bubble" /><text dy="4.5">{spot.letter}</text></g>{/each}
    </svg>
    <span class="demo-word">RAT</span>
  </div>
{/snippet}
{#snippet typeDemo()}
  <div class="demo-type">{#each ['R', 'A', 'T'] as letter, index (index)}<span style:--i={index}>{letter}</span>{/each}</div>
{/snippet}
{#snippet gridDemo()}
  <div class="demo-grid">
    {#each ['R', 'A', 'T', '', '', 'E', '', '', 'E'] as letter, index (index)}
      <span class:empty={!letter} class:fill={index < 3} style:--i={index}>{letter}</span>
    {/each}
  </div>
{/snippet}
{#snippet helpDemo()}
  <div class="demo-help"><span class="demo-found">RAT</span><span class="demo-question">?</span><span class="demo-bubble-text"><i></i><i></i></span></div>
{/snippet}
{#snippet practiceHint()}
  <p class="tutorial-practice-hint"><strong>{labels.hint}</strong><span>{tutorialHint}</span></p>
{/snippet}

<div class="tutorial-panel" dir={interfaceDirection} lang={settings.interfaceLocale}>
  <TutorialSteps kicker={labels.kicker} title={labels.title} cornerMark="01" {steps} startLabel={labels.start} {onstart} {onskip} footer={practiceHint} />
</div>

<style>
  .tutorial-panel { flex:1 1 auto;min-height:0;isolation:isolate;position:relative;display:grid;place-items:center;padding:clamp(1rem,6vw,2rem);background:linear-gradient(90deg,rgba(23,42,69,.055) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#fffdf7; }
  .tutorial-panel::before { content:'WORDCIRCLE · DAILY LANGUAGE FOLIO'; position:absolute;z-index:-1;top:1.35rem;left:1.55rem;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.8125rem;font-weight:800;letter-spacing:.16em;opacity:.68; }
  .tutorial-panel::after { content:'';position:absolute;z-index:-1;right:1.55rem;bottom:1.45rem;width:1.12rem;height:1.12rem;border:1px solid #172a45;border-radius:50%;box-shadow:.42rem .42rem 0 -1px #fffdf7,.42rem .42rem 0 0 #e6a527;opacity:.72; }
  .tutorial-practice-hint { display:flex;align-items:center;justify-content:space-between;gap:.65rem;padding:.55rem .65rem;border-radius:.8rem;border:1px solid rgba(230,165,39,.56);background:rgba(230,165,39,.08);color:#172a45;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:800;letter-spacing:.05em; }.tutorial-practice-hint strong { color:#a45e38;font-size:.8125rem;letter-spacing:.08em;text-transform:uppercase; }.tutorial-practice-hint span { white-space:nowrap; }
  :global(html.dark) .tutorial-panel { background:linear-gradient(90deg,rgba(255,253,247,.11) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#172a45; }
  :global(html.dark) .tutorial-panel::before { color:#fffdf7; }:global(html.dark) .tutorial-panel::after { border-color:#fffdf7;box-shadow:.42rem .42rem 0 -1px #172a45,.42rem .42rem 0 0 #e6a527; }
  .demo-trace { display:flex;align-items:center;gap:1rem; }
  .demo-wheel { width:6.2rem;height:6.2rem;overflow:visible; }
  .demo-wheel-back { fill:rgba(230,165,39,.12);stroke:rgba(23,42,69,.2);stroke-width:1.5; }
  .demo-path { fill:none;stroke:#e6a527;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;animation:demo-draw 1.1s .3s ease both; }
  .demo-bubble { fill:#fffdf7;stroke:#172a45;stroke-width:2; }
  .demo-wheel text { fill:#172a45;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:900;text-anchor:middle; }
  .demo-word,.demo-found { color:#172a45;font-family:'DM Serif Display',serif;font-size:1.6rem;letter-spacing:.08em;animation:demo-pop .4s 1.3s cubic-bezier(.34,1.56,.64,1) both; }
  .demo-type { display:flex;gap:.3rem; }
  .demo-type span { display:grid;place-items:center;width:2rem;height:2.2rem;border-radius:.4rem;background:#172a45;color:#fffdf7;font-family:'DM Sans',sans-serif;font-weight:900;animation:demo-pop .35s calc(.2s + var(--i) * .25s) ease both; }
  .demo-grid { display:grid;grid-template-columns:repeat(3,1.9rem);gap:.2rem; }
  .demo-grid span { display:grid;place-items:center;height:1.9rem;border:2px solid rgba(23,42,69,.35);border-radius:.3rem;background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-weight:900; }
  .demo-grid span.empty { visibility:hidden; }
  .demo-grid span.fill { border-color:var(--color-success);background:var(--color-success);color:#fffdf7;animation:demo-pop .35s calc(.3s + var(--i) * .15s) cubic-bezier(.34,1.56,.64,1) both; }
  .demo-help { display:flex;align-items:center;gap:.5rem; }
  .demo-found { animation:none; }
  .demo-question { display:grid;place-items:center;width:1.7rem;height:1.7rem;border:2px solid #172a45;border-radius:50%;background:#f7e2b0;color:#a45e38;font-weight:900;animation:demo-pulse 1.2s .3s ease-in-out 2; }
  .demo-bubble-text { display:grid;gap:.3rem;padding:.5rem .6rem;border:2px solid #172a45;border-radius:.7rem .7rem .7rem .15rem;background:#fffdf7;animation:demo-pop .4s .9s ease both; }
  .demo-bubble-text i { display:block;width:4.5rem;height:.35rem;border-radius:999px;background:rgba(23,42,69,.25); }
  .demo-bubble-text i + i { width:3rem; }
  @keyframes demo-draw { from { stroke-dashoffset:1; } to { stroke-dashoffset:0; } }
  @keyframes demo-pop { from { opacity:0;scale:.5; } }
  @keyframes demo-pulse { 50% { scale:1.15; } }
  @media (prefers-reduced-motion:reduce) { .demo-path,.demo-word,.demo-type span,.demo-grid span.fill,.demo-question,.demo-bubble-text { animation:none; } }
  :global(html.dark) .demo-word,:global(html.dark) .demo-found { color:#fffdf7; }
  :global(html.dark) .demo-bubble,:global(html.dark) .demo-bubble-text,:global(html.dark) .demo-grid span { fill:#172a45;background:#213a5d;border-color:rgba(255,253,247,.5);stroke:rgba(255,253,247,.6); }
  :global(html.dark) .demo-wheel text { fill:#fffdf7; }
</style>
