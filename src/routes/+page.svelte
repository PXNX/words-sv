<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { m } from '$lib/paraglide/messages';
  import { getTextDirection } from '$lib/paraglide/runtime';
  import { settings } from '$lib/state/settings.svelte';
  import { playableLanguages, type Language } from '$lib/data/vocabulary';
  import IconSettings from '~icons/material-symbols/settings-rounded';
  import IconHelp from '~icons/material-symbols/help-rounded';
  import IconFlame from '~icons/material-symbols/local-fire-department-rounded';
  import IconChevronRight from '~icons/material-symbols/chevron-right-rounded';

  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));

  const ROOT_ONBOARDING_KEY = 'wordcircle-root-onboarding-v1';

  let rootOnboarding = $state(false);
  let streakTimer: number | null = null;

  const labels = $derived({
    settings: m.settings({}, { locale: settings.interfaceLocale }),
    homeKicker: m.home_kicker({}, { locale: settings.interfaceLocale }),
    homeTitle: m.home_title({}, { locale: settings.interfaceLocale }),
    homeCircle: m.home_circle({}, { locale: settings.interfaceLocale }),
    homeWordle: m.home_wordle({}, { locale: settings.interfaceLocale }),
    homeVocab: m.home_vocab({}, { locale: settings.interfaceLocale }),
    homePlay: m.home_play({}, { locale: settings.interfaceLocale }),
    modeCrossword: m.mode_crossword({}, { locale: settings.interfaceLocale }),
    modeWordle: m.mode_wordle({}, { locale: settings.interfaceLocale }),
    modeLearning: m.mode_learning({}, { locale: settings.interfaceLocale }),
    tutorial: m.tutorial({}, { locale: settings.interfaceLocale }),
    onboardingTitle: m.onboarding_title({}, { locale: settings.interfaceLocale }),
    onboardingSubtitle: m.onboarding_subtitle({}, { locale: settings.interfaceLocale }),
    onboardingLearningLanguage: m.onboarding_learning_language({}, { locale: settings.interfaceLocale }),
    streak: m.streak({}, { locale: settings.interfaceLocale }),
    streakDone: m.streak_done({}, { locale: settings.interfaceLocale }),
    streakProgress: m.streak_progress({}, { locale: settings.interfaceLocale }),
    streakTimeLeft: m.streak_time_left({}, { locale: settings.interfaceLocale })
  });

  function formatMinutes(minutes: number) {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${String(minutes % 60).padStart(2, '0')}m` : `${minutes}m`;
  }
  function finishRootOnboarding(language: Language) {
    settings.setLang(language);
    if (language === 'de' || language === 'en' || language === 'pt' || language === 'uk') settings.setInterfaceLocale(language);
    localStorage.setItem(ROOT_ONBOARDING_KEY, 'complete');
    rootOnboarding = false;
  }
  function selectMode(mode: 'circle' | 'wordle' | 'vocab') {
    void goto(`/${mode}`);
  }
  function openTutorial(mode: 'circle' | 'wordle') {
    void goto(`/${mode}/tutorial`);
  }

  onMount(() => {
    if (!settings.hasStoredInterfaceLocale()) settings.applyPreferredInterfaceLocale();
    if (localStorage.getItem(ROOT_ONBOARDING_KEY) !== 'complete') rootOnboarding = true;
    void settings.refreshStreak();
    streakTimer = window.setInterval(() => void settings.refreshStreak(), 30_000);
    return () => {
      if (streakTimer !== null) window.clearInterval(streakTimer);
    };
  });
</script>

<section class="home-view" dir={interfaceDirection} lang={settings.interfaceLocale} aria-label={labels.homeTitle}>
  {#if rootOnboarding}
    <div class="home-onboarding">
      <p>{labels.onboardingLearningLanguage}</p>
      <h1>{labels.onboardingTitle}</h1>
      <span>{labels.onboardingSubtitle}</span>
      <div class="home-language-choice">{#each playableLanguages as language}<button type="button" onclick={() => finishRootOnboarding(language.code)}>{language.label}</button>{/each}</div>
    </div>
  {:else}
    <header class="home-header"><p>{labels.homeKicker}</p><h1>{labels.homeTitle}</h1></header>
    <button type="button" class:qualified={settings.streak.qualified} class="home-streak" onclick={() => void goto('/stats')} aria-label={`${labels.streak}: ${settings.streak.streakCount}`}>
      <span class="home-streak-flame" aria-hidden="true"><IconFlame /></span>
      <span class="home-streak-count"><strong>{settings.streak.streakCount}</strong><small>{labels.streak}</small></span>
      <span class="home-streak-detail">
        {#if settings.streak.qualified}<b>{labels.streakDone}</b>{:else}<b>{labels.streakProgress}: {settings.streak.vocabCorrect}/{settings.streak.vocabularyGoal}</b><small>{labels.streakTimeLeft}: {formatMinutes(settings.streak.minutesRemaining)}</small>{/if}
      </span>
      <IconChevronRight class="home-streak-arrow" aria-hidden="true" />
    </button>
    <div class="home-games">
      <article><span class="home-index">01</span><div class="home-title-row"><h2>{labels.modeCrossword}</h2><button type="button" class="home-tutorial-link" onclick={() => openTutorial('circle')} aria-label={labels.tutorial}><IconHelp aria-hidden="true" /></button></div><p>{labels.homeCircle}</p><button type="button" onclick={() => selectMode('circle')}>{labels.homePlay}</button></article>
      <article><span class="home-index">02</span><div class="home-title-row"><h2>{labels.modeWordle}</h2><button type="button" class="home-tutorial-link" onclick={() => openTutorial('wordle')} aria-label={labels.tutorial}><IconHelp aria-hidden="true" /></button></div><p>{labels.homeWordle}</p><button type="button" onclick={() => selectMode('wordle')}>{labels.homePlay}</button></article>
      <article><span class="home-index">03</span><h2>{labels.modeLearning}</h2><p>{labels.homeVocab}</p><button type="button" onclick={() => selectMode('vocab')}>{labels.homePlay}</button></article>
    </div>
    <button class="home-settings-link" onclick={() => void goto('/settings')}><IconSettings aria-hidden="true" /><span>{labels.settings}</span></button>
  {/if}
</section>

<style>
  .home-view { flex:1 1 auto;min-height:0;display:grid;align-content:center;gap:clamp(1rem,4vw,1.8rem);padding:clamp(1rem,5vw,2.2rem);overflow-x:hidden;overflow-y:auto;background:radial-gradient(circle at 86% 10%,rgba(230,165,39,.2),transparent 26%),linear-gradient(180deg,rgba(237,228,213,.85),rgba(255,253,247,.75)); }
  .home-header { display:grid;gap:.35rem;text-align:center; }.home-header p,.home-onboarding>p { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }.home-header h1,.home-onboarding h1 { margin:0;color:#172a45 !important;text-shadow:0 1px 0 rgba(255,253,247,.72);font-family:'DM Serif Display',serif;font-size:clamp(2.1rem,10vw,3.35rem);font-weight:400;letter-spacing:-.05em;line-height:.9; }.home-onboarding>span { color:#596477;font-family:'DM Sans',sans-serif;font-size:.73rem;font-weight:700;line-height:1.4; }
  .home-settings-link { justify-self:center;display:inline-flex;align-items:center;gap:.42rem;min-height:2rem;padding:0 .72rem;border:1px solid rgba(23,42,69,.28);background:transparent;color:#596477;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase; }.home-settings-link :global(svg) { width:.92rem;height:.92rem; }.home-settings-link:active { transform:scale(.97); }
  .home-streak { display:grid;grid-template-columns:auto auto 1fr auto;gap:.7rem;align-items:center;justify-self:center;width:min(100%,27rem);padding:.75rem .9rem;border:1px solid rgba(23,42,69,.28);border-left:4px double #e6a527;background:rgba(255,253,247,.78);box-shadow:4px 4px 0 rgba(230,165,39,.16);text-align:left;transition:transform .16s cubic-bezier(.23,1,.32,1); }.home-streak:active { transform:scale(.98); }
  .home-streak-flame { display:grid;place-items:center;width:2.15rem;height:2.15rem;flex:none;border:1px solid rgba(230,165,39,.5);border-radius:50%;background:rgba(230,165,39,.14);color:#e6a527; }.home-streak-flame :global(svg) { width:1.2rem;height:1.2rem; }
  .home-streak-count { display:grid;gap:0;justify-items:start;min-width:2.6rem; }.home-streak-count strong { color:#172a45;font-family:'DM Serif Display',serif;font-size:1.65rem;font-weight:400;line-height:.85; }.home-streak-count small { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.5rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }
  .home-streak-detail { display:grid;gap:.15rem;justify-items:start; }.home-streak-detail b { color:#172a45;font-family:'DM Sans',sans-serif;font-size:.63rem;font-weight:800;line-height:1.3; }.home-streak-detail small { color:#596477;font-family:'DM Sans',sans-serif;font-size:.56rem;font-weight:800; }
  .home-streak :global(.home-streak-arrow) { width:1.2rem;height:1.2rem;flex:none;color:rgba(23,42,69,.4); }
  .home-streak.qualified { border-left-color:#34824d; }.home-streak.qualified .home-streak-flame { border-color:rgba(52,130,77,.5);background:rgba(52,130,77,.14);color:#34824d; }.home-streak.qualified .home-streak-count strong,.home-streak.qualified .home-streak-detail b { color:#34824d; }
  .home-games { display:grid;gap:.65rem; }.home-games article { position:relative;display:grid;grid-template-columns:2.25rem 1fr auto;gap:.6rem;align-items:center;padding:.8rem .75rem;border:1px solid rgba(23,42,69,.34);border-left:4px double #172a45;background:#fffdf7;box-shadow:4px 4px 0 rgba(230,165,39,.15); }.home-games article:nth-child(2) { border-left-color:#e6a527; }.home-games article:nth-child(3) { border-left-color:#34824d; }.home-index { align-self:start;color:#a45e38;font-family:'DM Serif Display',serif;font-size:1.15rem;line-height:1; }.home-title-row { grid-column:2;display:flex;align-items:center;gap:.4rem; }.home-games h2 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:1.08rem;font-weight:400;line-height:1; }.home-games p { grid-column:2;margin:0;color:#596477;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:700;line-height:1.35; }.home-games button:not(.home-tutorial-link) { grid-column:3;grid-row:1 / span 2;min-height:2.15rem;padding:0 .62rem;border:1px solid #172a45;background:#172a45;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.56rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }.home-games button:active,.home-language-choice button:active { transform:scale(.97); }.home-tutorial-link { display:grid;place-items:center;width:1.35rem;height:1.35rem;flex:none;padding:0;border:1px solid rgba(23,42,69,.3);border-radius:50%;background:transparent;color:#a45e38; }.home-tutorial-link :global(svg) { width:.78rem;height:.78rem; }.home-tutorial-link:active { transform:scale(.94); }
  .home-onboarding { width:min(100%,27rem);display:grid;justify-self:center;gap:.9rem;padding:clamp(1.15rem,6vw,1.8rem);border:1px solid rgba(23,42,69,.32);border-top:4px double #172a45;background:#fffdf7;box-shadow:8px 8px 0 rgba(230,165,39,.18);text-align:center; }.home-language-choice { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;margin-top:.45rem; }.home-language-choice button { min-width:0;min-height:2.7rem;border:1px solid #172a45;background:#172a45;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:900;letter-spacing:.04em; }.home-language-choice button+button { background:#fffdf7;color:#172a45; }
  :global(html.dark) .home-view { background:radial-gradient(circle at 86% 10%,rgba(230,165,39,.2),transparent 26%),#172a45; }
  :global(html.dark) .home-header h1,:global(html.dark) .home-onboarding h1,:global(html.dark) .home-games h2 { color:#fffdf7 !important;text-shadow:none; }
  :global(html.dark) .home-onboarding>span,:global(html.dark) .home-games p { color:rgba(255,253,247,.72); }
  :global(html.dark) .home-games article,:global(html.dark) .home-onboarding { border-color:rgba(255,253,247,.42);background:#213a5d; }
  :global(html.dark) .home-games button:not(.home-tutorial-link) { border-color:#e6a527;background:#e6a527;color:#172a45; }
  :global(html.dark) .home-tutorial-link { border-color:rgba(255,253,247,.4);color:#e6a527; }
  :global(html.dark) .home-language-choice button+button { border-color:#fffdf7;background:#213a5d;color:#fffdf7; }
  :global(html.dark) .home-settings-link { border-color:rgba(255,253,247,.32);color:rgba(255,253,247,.78); }
  :global(html.dark) .home-streak { border-color:rgba(255,253,247,.36);background:#213a5d; }:global(html.dark) .home-streak-count strong,:global(html.dark) .home-streak-detail b { color:#fffdf7; }:global(html.dark) .home-streak-detail small { color:rgba(255,253,247,.72); }:global(html.dark) .home-streak :global(.home-streak-arrow) { color:rgba(255,253,247,.42); }:global(html.dark) .home-streak.qualified .home-streak-count strong,:global(html.dark) .home-streak.qualified .home-streak-detail b { color:#8ed8a2; }
</style>
