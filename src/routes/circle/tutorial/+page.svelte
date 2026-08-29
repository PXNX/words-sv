<script lang="ts">
  import { goto } from '$app/navigation';
  import { m } from '$lib/paraglide/messages';
  import { getTextDirection } from '$lib/paraglide/runtime';
  import { settings, interfaceLocales } from '$lib/state/settings.svelte';
  import TutorialDialog from '$lib/TutorialDialog.svelte';
  import { requestCirclePractice } from '$lib/circle/practice';
  import IconLanguage from '~icons/material-symbols/language-rounded';

  const circleTutorialHints: Record<'de' | 'en', string> = {
    de: 'G••••• · G•• · T••',
    en: 'P••••• · P•• · T••'
  };

  let tutorialLanguage = $state<'de' | 'en'>(settings.lang === 'de' || settings.lang === 'en' ? settings.lang : 'de');

  const labels = $derived({
    kicker: m.tutorial_kicker({}, { locale: settings.interfaceLocale }),
    title: m.tutorial_title({}, { locale: settings.interfaceLocale }),
    trace: m.tutorial_trace({}, { locale: settings.interfaceLocale }),
    grid: m.tutorial_grid({}, { locale: settings.interfaceLocale }),
    help: m.tutorial_help({}, { locale: settings.interfaceLocale }),
    start: m.tutorial_start({}, { locale: settings.interfaceLocale }),
    hint: m.hint({}, { locale: settings.interfaceLocale }),
    gameLanguage: m.game_language({}, { locale: settings.interfaceLocale }),
    interfaceLanguage: m.interface_language({}, { locale: settings.interfaceLocale })
  });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  const tutorialHint = $derived(circleTutorialHints[tutorialLanguage]);

  function selectInterfaceLocaleFromEvent(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (interfaceLocales.some((locale) => locale.code === value)) settings.setInterfaceLocale(value as typeof settings.interfaceLocale);
  }
  function beginPractice() {
    requestCirclePractice(tutorialLanguage);
    void goto('/circle');
  }
</script>

<div class="tutorial-panel" dir={interfaceDirection} lang={settings.interfaceLocale}>
  <TutorialDialog kicker={labels.kicker} title={labels.title} cornerMark="01">
    <label class="tutorial-language"><span>{labels.interfaceLanguage}</span><span class="locale-dropdown"><IconLanguage aria-hidden="true" /><select aria-label={labels.interfaceLanguage} value={settings.interfaceLocale} onchange={selectInterfaceLocaleFromEvent}>{#each interfaceLocales as locale}<option value={locale.code}>{locale.label}</option>{/each}</select></span></label>
    <ol class="tutorial-steps">
      <li><b>1</b><span>{labels.trace}</span></li>
      <li><b>2</b><span>{labels.grid}</span></li>
      <li><b>3</b><span>{labels.help}</span></li>
    </ol>
    <div class="tutorial-solve-language"><span>{labels.gameLanguage}</span><div class="segmented"><button class:chosen={tutorialLanguage === 'de'} onclick={() => (tutorialLanguage = 'de')}>DE</button><button class:chosen={tutorialLanguage === 'en'} onclick={() => (tutorialLanguage = 'en')}>EN</button></div></div>
    <p class="tutorial-practice-hint"><strong>{labels.hint}</strong><span>{tutorialHint}</span></p>
    <button class="tutorial-start" onclick={beginPractice}>{labels.start}</button>
  </TutorialDialog>
</div>

<style>
  .tutorial-panel { flex:1 1 auto;min-height:0;isolation:isolate;position:relative;display:grid;place-items:center;padding:clamp(1rem,6vw,2rem);background:linear-gradient(90deg,rgba(23,42,69,.055) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.15rem),rgba(23,42,69,.055) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#fffdf7; }
  .tutorial-panel::before { content:'WORDCIRCLE · DAILY LANGUAGE FOLIO'; position:absolute;z-index:-1;top:1.35rem;left:1.55rem;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.48rem;font-weight:800;letter-spacing:.16em;opacity:.68; }
  .tutorial-panel::after { content:'';position:absolute;z-index:-1;right:1.55rem;bottom:1.45rem;width:1.12rem;height:1.12rem;border:1px solid #172a45;border-radius:50%;box-shadow:.42rem .42rem 0 -1px #fffdf7,.42rem .42rem 0 0 #e6a527;opacity:.72; }
  .tutorial-language { display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin:0 0 .75rem;padding-bottom:.55rem;border-bottom:1px solid rgba(23,42,69,.18); }.tutorial-language>span { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.56rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase; }.tutorial-language .locale-dropdown { flex:none; }
  .tutorial-steps { display:grid;gap:.72rem;margin:0;padding:0;list-style:none; }.tutorial-steps li { display:grid;grid-template-columns:1.55rem 1fr;gap:.62rem;align-items:start;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:700;line-height:1.35; }.tutorial-steps b { display:grid;place-items:center;width:1.35rem;height:1.35rem;border:1px solid #172a45;border-radius:50%;background:#fffdf7;color:#a45e38;font-family:'DM Serif Display',serif;font-size:.9rem;font-weight:400; }
  .tutorial-solve-language { display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding-top:.7rem;border-top:1px solid rgba(23,42,69,.14);color:#172a45;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase; }
  .segmented { display:flex;padding:2px;border:1px solid rgba(23,42,69,.22);border-radius:99px; }.segmented button { min-height:1.65rem;padding:0 .55rem;display:inline-flex;align-items:center;gap:.25rem;border:0;border-radius:99px;background:transparent;color:rgba(23,42,69,.62);font-size:.62rem;font-weight:800; }.segmented button.chosen { background:#172a45;color:#fffdf7; }
  .tutorial-practice-hint { display:flex;align-items:center;justify-content:space-between;gap:.65rem;padding:.55rem .65rem;border:1px solid rgba(230,165,39,.56);background:rgba(230,165,39,.08);color:#172a45;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:800;letter-spacing:.05em; }.tutorial-practice-hint strong { color:#a45e38;font-size:.56rem;letter-spacing:.08em;text-transform:uppercase; }.tutorial-practice-hint span { white-space:nowrap; }
  .tutorial-start { width:100%;min-height:2.45rem;border:1px solid #172a45;border-radius:0;background:#172a45;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.67rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;box-shadow:3px 3px 0 #e6a527;transition:transform .16s cubic-bezier(.23,1,.32,1),box-shadow .16s ease; }.tutorial-start:active { transform:translate(2px,2px);box-shadow:1px 1px 0 #e6a527; }
  .locale-dropdown { display:inline-flex;align-items:center;gap:.4rem;min-width:0;padding:.1rem .38rem;border:1px solid #172a45;background:rgba(255,253,247,.78);color:#172a45; }.locale-dropdown :global(svg) { width:.98rem;height:.98rem;flex:none; }.locale-dropdown select { min-width:0;max-width:9.4rem;border:0;background:transparent;color:inherit;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:800;letter-spacing:.02em;outline:0; }.locale-dropdown select:focus-visible { outline:2px solid #e6a527;outline-offset:3px; }
  :global(html.dark) .tutorial-panel { background:linear-gradient(90deg,rgba(255,253,247,.11) 1px,transparent 1px) 1.15rem 0/1px 100%,linear-gradient(90deg,transparent calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.15rem),rgba(255,253,247,.11) calc(100% - 1.05rem),transparent calc(100% - 1.05rem)),#172a45; }
  :global(html.dark) .tutorial-panel::before { color:#fffdf7; }:global(html.dark) .tutorial-panel::after { border-color:#fffdf7;box-shadow:.42rem .42rem 0 -1px #172a45,.42rem .42rem 0 0 #e6a527; }
  :global(html.dark) .tutorial-steps b { border-color:#fffdf7;background:#172a45;color:#e6a527; }:global(html.dark) .tutorial-start { border-color:#e6a527;background:#e6a527;color:#172a45; }
  :global(html.dark) .tutorial-language { border-color:rgba(255,253,247,.25); }:global(html.dark) .tutorial-language .locale-dropdown,:global(html.dark) .locale-dropdown { border-color:#fffdf7;background:rgba(23,42,69,.55);color:#fffdf7; }
  :global(html.dark) .segmented { border-color:rgba(255,253,247,.25); }:global(html.dark) .segmented button { color:rgba(255,253,247,.64); }
</style>
