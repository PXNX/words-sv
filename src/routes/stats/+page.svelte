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

<section class="flex-1 min-h-0 m-0 p-[clamp(1rem,5vw,2rem)] overflow-x-hidden overflow-y-auto bg-[rgba(255,253,247,.98)] dark:bg-[rgba(23,42,69,.99)]" dir={interfaceDirection} lang={settings.interfaceLocale} aria-label={labels.title}>
  <header class="grid gap-[.2rem]"><p class="m-0 text-accent text-[.62rem] font-black tracking-[.12em] uppercase">{labels.kicker}</p><h1 class="m-0 text-base-content font-['DM_Serif_Display',serif] text-[clamp(1.6rem,7vw,2.2rem)] font-normal tracking-[-.03em] leading-none">{labels.title}</h1></header>

  <section class={`mt-[1.2rem] px-4 py-[.9rem] border border-base-content/[.28] dark:border-base-content/[.36] border-l-4 [border-left-style:double] dark:border-l-[rgba(255,253,247,.36)] shadow-[4px_4px_0_rgba(230,165,39,.15)] bg-[rgba(255,253,247,.72)] dark:bg-[#213a5d] ${settings.streak.qualified ? 'border-l-[#34824d]' : 'border-l-[#e6a527]'}`} aria-label={labels.streak}>
    <div class="flex items-center gap-[.4rem] text-accent"><IconFlame aria-hidden="true" class={`w-[1.15rem] h-[1.15rem] ${settings.streak.qualified ? 'text-[#34824d] dark:text-[#8ed8a2]' : 'text-primary'}`} /><strong class={`font-['DM_Serif_Display',serif] text-[1.9rem] font-normal leading-none ${settings.streak.qualified ? 'text-[#34824d] dark:text-[#8ed8a2]' : 'text-base-content'}`}>{settings.streak.streakCount}</strong><span class="text-accent text-[.6rem] font-black tracking-[.09em] uppercase">{labels.streak}</span></div>
    <div class="mt-[.5rem] grid gap-[.15rem]">
      {#if settings.streak.qualified}<b class="text-base-content text-[.68rem] font-extrabold">{labels.streakDone}</b>{:else}<b class="text-base-content text-[.68rem] font-extrabold">{labels.streakProgress}: {settings.streak.vocabCorrect}/{settings.streak.vocabularyGoal}</b><small class="text-[#596477] dark:text-[rgba(255,253,247,.72)] text-[.6rem] font-extrabold">{labels.streakTimeLeft}: {formatMinutes(settings.streak.minutesRemaining)}</small>{/if}
    </div>
  </section>

  <section class="mt-4 px-[.8rem] pt-[.7rem] pb-[.85rem] border border-base-content/[.17] dark:border-base-content/[.22] bg-[rgba(255,253,247,.55)] dark:bg-[rgba(255,253,247,.06)]" aria-labelledby="stats-today-heading">
    <h2 id="stats-today-heading" class="m-0 mb-[.1rem] text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.today}</h2>
    <div class="flex items-center justify-between gap-4 pt-[.6rem] mt-[.6rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.68rem] font-extrabold"><span>{labels.modeCrossword}</span>{#if settings.streak.circleCompleted}<IconCheck class="w-[1.15rem] h-[1.15rem] text-success" aria-label={labels.streakDone} />{:else}<IconPending class="w-[1.15rem] h-[1.15rem] text-[rgba(23,42,69,.3)]" aria-hidden="true" />{/if}</div>
    <div class="flex items-center justify-between gap-4 pt-[.6rem] mt-[.6rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.68rem] font-extrabold"><span>{labels.modeWordle}</span>{#if settings.streak.wordleCompleted}<IconCheck class="w-[1.15rem] h-[1.15rem] text-success" aria-label={labels.streakDone} />{:else}<IconPending class="w-[1.15rem] h-[1.15rem] text-[rgba(23,42,69,.3)]" aria-hidden="true" />{/if}</div>
  </section>

  <section class="mt-4 px-[.8rem] pt-[.7rem] pb-[.85rem] border border-base-content/[.17] dark:border-base-content/[.22] bg-[rgba(255,253,247,.55)] dark:bg-[rgba(255,253,247,.06)]" aria-labelledby="stats-alltime-heading">
    <h2 id="stats-alltime-heading" class="m-0 mb-[.1rem] text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.allTime}</h2>
    <div class="flex items-center justify-between gap-4 pt-[.6rem] mt-[.6rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.68rem] font-extrabold"><span>{labels.streakBest}</span><strong class="text-success font-['DM_Serif_Display',serif] text-[1.35rem] leading-none">{settings.streak.bestStreak}</strong></div>
    <div class="flex items-center justify-between gap-4 pt-[.6rem] mt-[.6rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.68rem] font-extrabold"><span>{labels.completed}</span><strong class="text-success font-['DM_Serif_Display',serif] text-[1.35rem] leading-none">{settings.completedRounds}</strong></div>
  </section>
</section>
