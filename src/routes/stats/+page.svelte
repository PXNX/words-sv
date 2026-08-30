<script lang="ts">
  import { onMount } from 'svelte';
  import { m } from '$lib/paraglide/messages';
  import { getTextDirection } from '$lib/paraglide/runtime';
  import { settings } from '$lib/state/settings.svelte';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconPending from '~icons/material-symbols/radio-button-unchecked-rounded';
  import IconFlame from '~icons/material-symbols/local-fire-department-rounded';

  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));

  const labels = $derived({
    kicker: m.stats_kicker({}, { locale: settings.interfaceLocale }),
    title: m.stats_title({}, { locale: settings.interfaceLocale }),
    streak: m.streak({}, { locale: settings.interfaceLocale }),
    streakDone: m.streak_done({}, { locale: settings.interfaceLocale }),
    streakProgress: m.streak_progress({}, { locale: settings.interfaceLocale }),
    streakTimeLeft: m.streak_time_left({}, { locale: settings.interfaceLocale }),
    streakBest: m.streak_best({}, { locale: settings.interfaceLocale }),
    today: m.stats_today({}, { locale: settings.interfaceLocale }),
    allTime: m.stats_alltime({}, { locale: settings.interfaceLocale }),
    modeCrossword: m.mode_crossword({}, { locale: settings.interfaceLocale }),
    modeWordle: m.mode_wordle({}, { locale: settings.interfaceLocale }),
    completed: m.completed({}, { locale: settings.interfaceLocale })
  });

  function formatMinutes(minutes: number) {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${String(minutes % 60).padStart(2, '0')}m` : `${minutes}m`;
  }

  let streakTimer: number | null = null;
  onMount(() => {
    void settings.refreshStreak();
    streakTimer = window.setInterval(() => void settings.refreshStreak(), 30_000);
    return () => {
      if (streakTimer !== null) window.clearInterval(streakTimer);
    };
  });
</script>

<section class="stats-page" dir={interfaceDirection} lang={settings.interfaceLocale} aria-label={labels.title}>
  <header class="stats-header"><p>{labels.kicker}</p><h1>{labels.title}</h1></header>

  <section class:qualified={settings.streak.qualified} class="stats-streak" aria-label={labels.streak}>
    <div class="stats-streak-count"><IconFlame aria-hidden="true" /><strong>{settings.streak.streakCount}</strong><span>{labels.streak}</span></div>
    <div class="stats-streak-detail">
      {#if settings.streak.qualified}<b>{labels.streakDone}</b>{:else}<b>{labels.streakProgress}: {settings.streak.vocabCorrect}/{settings.streak.vocabularyGoal}</b><small>{labels.streakTimeLeft}: {formatMinutes(settings.streak.minutesRemaining)}</small>{/if}
    </div>
  </section>

  <section class="stats-group" aria-labelledby="stats-today-heading">
    <h2 id="stats-today-heading">{labels.today}</h2>
    <div class="stats-row"><span>{labels.modeCrossword}</span>{#if settings.streak.circleCompleted}<IconCheck class="stats-icon stats-icon-done" aria-label={labels.streakDone} />{:else}<IconPending class="stats-icon" aria-hidden="true" />{/if}</div>
    <div class="stats-row"><span>{labels.modeWordle}</span>{#if settings.streak.wordleCompleted}<IconCheck class="stats-icon stats-icon-done" aria-label={labels.streakDone} />{:else}<IconPending class="stats-icon" aria-hidden="true" />{/if}</div>
  </section>

  <section class="stats-group" aria-labelledby="stats-alltime-heading">
    <h2 id="stats-alltime-heading">{labels.allTime}</h2>
    <div class="stats-row"><span>{labels.streakBest}</span><strong class="stats-total">{settings.streak.bestStreak}</strong></div>
    <div class="stats-row"><span>{labels.completed}</span><strong class="stats-total">{settings.completedRounds}</strong></div>
  </section>
</section>

<style>
  .stats-page { flex:1 1 auto;min-height:0;margin:0;padding:clamp(1rem,5vw,2rem);overflow-x:hidden;overflow-y:auto;background:rgba(255,253,247,.98); }
  .stats-header { display:grid;gap:.2rem; }.stats-header p { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }.stats-header h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.6rem,7vw,2.2rem);font-weight:400;letter-spacing:-.03em;line-height:1; }
  .stats-streak { margin-top:1.2rem;padding:.9rem 1rem;border:1px solid rgba(23,42,69,.28);border-left:4px double #e6a527;background:rgba(255,253,247,.72);box-shadow:4px 4px 0 rgba(230,165,39,.15); }
  .stats-streak-count { display:flex;align-items:center;gap:.4rem;color:#a45e38; }.stats-streak-count :global(svg) { width:1.15rem;height:1.15rem;color:#e6a527; }.stats-streak-count strong { color:#172a45;font-family:'DM Serif Display',serif;font-size:1.9rem;font-weight:400;line-height:1; }.stats-streak-count span { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase; }
  .stats-streak-detail { margin-top:.5rem;display:grid;gap:.15rem; }.stats-streak-detail b { color:#172a45;font-family:'DM Sans',sans-serif;font-size:.68rem;font-weight:800; }.stats-streak-detail small { color:#596477;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:800; }
  .stats-streak.qualified { border-left-color:#34824d; }.stats-streak.qualified .stats-streak-count strong,.stats-streak.qualified .stats-streak-count :global(svg) { color:#34824d; }
  .stats-group { margin-top:1rem;padding:.7rem .8rem .85rem;border:1px solid rgba(23,42,69,.17);background:rgba(255,253,247,.55); }.stats-group h2 { margin:0 0 .1rem;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.56rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase; }
  .stats-row { display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:.6rem;margin-top:.6rem;border-top:1px solid rgba(23,42,69,.14);color:#172a45;font-family:'DM Sans',sans-serif;font-size:.68rem;font-weight:800; }
  .stats-row :global(.stats-icon) { width:1.15rem;height:1.15rem;color:rgba(23,42,69,.3); }.stats-row :global(.stats-icon-done) { color:#34824d; }
  .stats-total { color:#34824d;font-family:'DM Serif Display',serif;font-size:1.35rem;line-height:1; }
  :global(html.dark) .stats-page { background:rgba(23,42,69,.99); }
  :global(html.dark) .stats-header h1 { color:#fffdf7; }
  :global(html.dark) .stats-streak { border-color:rgba(255,253,247,.36);background:#213a5d; }:global(html.dark) .stats-streak-count strong { color:#fffdf7; }:global(html.dark) .stats-streak-detail b { color:#fffdf7; }:global(html.dark) .stats-streak-detail small { color:rgba(255,253,247,.72); }:global(html.dark) .stats-streak.qualified .stats-streak-count strong,:global(html.dark) .stats-streak.qualified .stats-streak-count :global(svg) { color:#8ed8a2; }
  :global(html.dark) .stats-group { border-color:rgba(255,253,247,.22);background:rgba(255,253,247,.06); }:global(html.dark) .stats-row { color:#fffdf7;border-color:rgba(255,253,247,.22); }
</style>
