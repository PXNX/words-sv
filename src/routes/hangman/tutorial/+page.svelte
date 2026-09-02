<script lang="ts">
  import { goto } from '$app/navigation';
  import { m } from '$lib/paraglide/messages';
  import { getTextDirection } from '$lib/paraglide/runtime';
  import { settings } from '$lib/state/settings.svelte';
  import TutorialDialog from '$lib/TutorialDialog.svelte';

  const HANGMAN_TUTORIAL_KEY = 'wordcircle-hangman-tutorial-v1';

  const labels = $derived({
    kicker: m.hangman_tutorial_title({}, { locale: settings.interfaceLocale }),
    stepGuess: m.hangman_tutorial_step_guess({}, { locale: settings.interfaceLocale }),
    stepWrong: m.hangman_tutorial_step_wrong({}, { locale: settings.interfaceLocale }),
    stepWin: m.hangman_tutorial_step_win({}, { locale: settings.interfaceLocale }),
    start: m.tutorial_start({}, { locale: settings.interfaceLocale })
  });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));

  function begin() {
    if (typeof localStorage !== 'undefined') localStorage.setItem(HANGMAN_TUTORIAL_KEY, 'complete');
    void goto('/hangman');
  }
</script>

<div class="tutorial-panel" dir={interfaceDirection} lang={settings.interfaceLocale}>
  <TutorialDialog kicker={labels.kicker} title="Hangman" cornerMark="03">
    <ol class="tutorial-steps">
      <li><b>1</b><span>{labels.stepGuess}</span></li>
      <li><b>2</b><span>{labels.stepWrong}</span></li>
      <li><b>3</b><span>{labels.stepWin}</span></li>
    </ol>
    <button class="tutorial-start" onclick={begin}>{labels.start}</button>
  </TutorialDialog>
</div>

<style>
  .tutorial-panel { flex:1 1 auto;min-height:0;isolation:isolate;position:relative;display:grid;place-items:center;padding:clamp(1rem,6vw,2rem);background:linear-gradient(90deg,rgba(23,42,69,.055) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#fffdf7; }
  .tutorial-panel::before { content:'WORDCIRCLE · DAILY LANGUAGE FOLIO'; position:absolute;z-index:-1;top:1.35rem;left:1.55rem;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.48rem;font-weight:800;letter-spacing:.16em;opacity:.68; }
  .tutorial-panel::after { content:'';position:absolute;z-index:-1;right:1.55rem;bottom:1.45rem;width:1.12rem;height:1.12rem;border:1px solid #172a45;border-radius:50%;box-shadow:.42rem .42rem 0 -1px #fffdf7,.42rem .42rem 0 0 #e6a527;opacity:.72; }
  .tutorial-steps { display:grid;gap:.72rem;margin:0;padding:0;list-style:none; }.tutorial-steps li { display:grid;grid-template-columns:1.55rem 1fr;gap:.62rem;align-items:start;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:700;line-height:1.35; }.tutorial-steps b { display:grid;place-items:center;width:1.35rem;height:1.35rem;border:1px solid #172a45;border-radius:50%;background:#fffdf7;color:#a45e38;font-family:'DM Serif Display',serif;font-size:.9rem;font-weight:400; }
  .tutorial-start { width:100%;min-height:2.45rem;margin-top:.75rem;border:1px solid #172a45;border-radius:0;background:#172a45;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.67rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;box-shadow:3px 3px 0 #e6a527;transition:transform .16s cubic-bezier(.23,1,.32,1),box-shadow .16s ease; }.tutorial-start:active { transform:translate(2px,2px);box-shadow:1px 1px 0 #e6a527; }
  :global(html.dark) .tutorial-panel { background:linear-gradient(90deg,rgba(255,253,247,.11) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#172a45; }
  :global(html.dark) .tutorial-panel::before { color:#fffdf7; }:global(html.dark) .tutorial-panel::after { border-color:#fffdf7;box-shadow:.42rem .42rem 0 -1px #172a45,.42rem .42rem 0 0 #e6a527; }
  :global(html.dark) .tutorial-steps b { border-color:#fffdf7;background:#172a45;color:#e6a527; }
  :global(html.dark) .tutorial-start { border-color:#e6a527;background:#e6a527;color:#172a45; }
</style>
