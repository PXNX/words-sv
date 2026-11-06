<script lang="ts">
  import { goto } from '$app/navigation';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import TutorialSteps from '#lib/app/TutorialSteps.svelte';

  const HANGMAN_TUTORIAL_KEY = 'wordcircle-hangman-tutorial-v1';
  // A word that reads the same in German and English.
  const WORD = 'PIZZA';

  const locale = $derived({ locale: settings.interfaceLocale });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  const steps = $derived([
    { text: m.hangman_tutorial_step_guess({}, locale), demo: guess },
    { text: m.hangman_tutorial_step_wrong({}, locale), demo: wrong },
    { text: m.hangman_tutorial_step_win({}, locale), demo: win }
  ]);

  function begin() {
    if (typeof localStorage !== 'undefined') localStorage.setItem(HANGMAN_TUTORIAL_KEY, 'complete');
    void goto('/hangman');
  }
</script>

{#snippet slots(shown: string, solved = false)}
  <div class="demo-slots" class:solved>
    {#each [...WORD] as letter, index (index)}
      <span class="demo-slot">{#if shown.includes(letter)}<span class="demo-letter" style:--i={index}>{letter}</span>{/if}</span>
    {/each}
  </div>
{/snippet}
{#snippet keys(pressed: string[], miss = '')}
  <div class="demo-keys">
    {#each pressed as key, index (key)}<span class="demo-key" class:miss={key === miss} style:--i={index}>{key}</span>{/each}
  </div>
{/snippet}
{#snippet guess()}
  <div class="demo-stack">{@render slots('ZA')}{@render keys(['Z', 'A'])}</div>
{/snippet}
{#snippet wrong()}
  <div class="demo-wrong">
    <svg viewBox="0 0 120 140" class="demo-figure" fill="none">
      <path d="M8 132h64M28 132V10h58v14" class="demo-gallows" stroke-width="5" stroke-linecap="round" />
      <circle cx="86" cy="38" r="13" class="demo-part" stroke-width="5" pathLength="1" />
      <path d="M86 51v39" class="demo-part late" stroke-width="5" stroke-linecap="round" pathLength="1" />
    </svg>
    <div class="demo-stack">
      {@render keys(['E', 'O'], 'O')}
      <span class="demo-lives">{#each Array(6) as _, index (index)}<i class:spent={index >= 4}></i>{/each}</span>
    </div>
  </div>
{/snippet}
{#snippet win()}
  {@render slots(WORD, true)}
{/snippet}

<div class="tutorial-panel" dir={interfaceDirection} lang={settings.interfaceLocale}>
  <TutorialSteps kicker={m.hangman_tutorial_title({}, locale)} title={m.mode_hangman({}, locale)} cornerMark="03" {steps} startLabel={m.tutorial_start({}, locale)} onstart={begin} />
</div>

<style>
  .tutorial-panel { flex:1 1 auto;min-height:0;isolation:isolate;position:relative;display:grid;place-items:center;padding:clamp(1rem,6vw,2rem);background:linear-gradient(90deg,rgba(23,42,69,.055) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#fffdf7; }
  .tutorial-panel::before { content:'WORDCIRCLE · DAILY LANGUAGE FOLIO'; position:absolute;z-index:-1;top:1.35rem;left:1.55rem;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.48rem;font-weight:800;letter-spacing:.16em;opacity:.68; }
  .tutorial-panel::after { content:'';position:absolute;z-index:-1;right:1.55rem;bottom:1.45rem;width:1.12rem;height:1.12rem;border:1px solid #172a45;border-radius:50%;box-shadow:.42rem .42rem 0 -1px #fffdf7,.42rem .42rem 0 0 #e6a527;opacity:.72; }
  :global(html.dark) .tutorial-panel { background:linear-gradient(90deg,rgba(255,253,247,.11) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#172a45; }
  :global(html.dark) .tutorial-panel::before { color:#fffdf7; }:global(html.dark) .tutorial-panel::after { border-color:#fffdf7;box-shadow:.42rem .42rem 0 -1px #172a45,.42rem .42rem 0 0 #e6a527; }

  .demo-stack { display:grid;justify-items:center;gap:.6rem; }
  .demo-slots { display:flex;gap:.35rem;font-family:'DM Serif Display',serif;font-size:1.6rem; }
  .demo-slot { display:grid;place-items:end center;width:1.6rem;height:2.1rem;border-bottom:3px solid #172a45;color:#172a45; }
  .demo-slots.solved .demo-slot { border-color:var(--color-success);color:var(--color-success); }
  .demo-letter { animation:demo-pop .4s calc(.35s + var(--i) * .12s) cubic-bezier(.34,1.56,.64,1) both; }
  .demo-keys { display:flex;gap:.3rem; }
  .demo-key { display:grid;place-items:center;width:1.8rem;height:2rem;border-radius:.4rem;background:var(--color-success);color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.85rem;font-weight:900;animation:demo-press .35s calc(var(--i) * .15s) ease both; }
  .demo-key.miss { background:#69727a; }
  .demo-wrong { display:flex;align-items:center;gap:1rem; }
  .demo-figure { width:4.6rem;height:5.4rem; }
  .demo-gallows { stroke:rgba(23,42,69,.7); }
  .demo-part { stroke:var(--color-error);stroke-dasharray:1;animation:demo-draw .5s .45s ease both; }
  .demo-part.late { animation-delay:.85s; }
  .demo-lives { display:flex;gap:.22rem; }
  .demo-lives i { width:.55rem;height:.55rem;border-radius:50%;background:var(--color-error); }
  .demo-lives i.spent { background:rgba(23,42,69,.18); }
  @keyframes demo-pop { from { opacity:0;scale:.4; } }
  @keyframes demo-press { from { opacity:0;translate:0 .3rem; } }
  @keyframes demo-draw { from { stroke-dashoffset:1; } to { stroke-dashoffset:0; } }
  @media (prefers-reduced-motion:reduce) { .demo-letter,.demo-key,.demo-part { animation:none; } }
  :global(html.dark) .demo-slot { border-color:#fffdf7;color:#fffdf7; }
  :global(html.dark) .demo-gallows { stroke:rgba(255,253,247,.7); }
  :global(html.dark) .demo-lives i.spent { background:rgba(255,253,247,.2); }
</style>
