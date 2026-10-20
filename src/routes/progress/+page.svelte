<script lang="ts">
  import { onMount } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { playableLanguages, wordMetadata, type Language } from '#lib/data/vocabulary.js';
  import { readVocabularyProgressByLanguage } from '#lib/vocab/spacedRepetition.js';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconPending from '~icons/material-symbols/radio-button-unchecked-rounded';
  import IconFlame from '~icons/material-symbols/local-fire-department-rounded';
  import IconTrophy from '~icons/material-symbols/trophy-rounded';
  import IconPuzzle from '~icons/material-symbols/extension-rounded';
  import IconSchedule from '~icons/material-symbols/schedule-rounded';
  import IconBook from '~icons/material-symbols/menu-book-rounded';
  import IconRepeat from '~icons/material-symbols/repeat-rounded';
  import IconStar from '~icons/material-symbols/star-rounded';
  import Companion from '#lib/story/Companion.svelte';
  import type { Mood } from '#lib/story/stories.js';

  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  // Lilith purrs once the daily goal is met and gets restless when the streak is about to run out.
  const streakMood = $derived<Mood>(settings.streak.qualified ? 'happy' : settings.streak.minutesRemaining < 120 ? 'surprised' : 'curious');
  const isRecord = $derived(settings.streak.streakCount > 0 && settings.streak.streakCount >= settings.streak.bestStreak);
  // Mia cheers along with the daily goal; Tom brightens up once there is vocabulary progress to show.
  const miaMood = $derived<Mood>(settings.streak.qualified ? 'happy' : 'neutral');
  const tomMood = $derived<Mood>(practicedLanguages.length > 0 ? 'happy' : 'curious');

  const labels = $derived({
    title: m.stats_title({}, { locale: settings.interfaceLocale }),
    streak: m.streak({}, { locale: settings.interfaceLocale }),
    streakDone: m.streak_done({}, { locale: settings.interfaceLocale }),
    streakTimeLeft: m.streak_time_left({}, { locale: settings.interfaceLocale }),
    streakBest: m.streak_best({}, { locale: settings.interfaceLocale }),
    dailyGoal: m.stats_daily_goal({}, { locale: settings.interfaceLocale }),
    newRecord: m.stats_new_record({}, { locale: settings.interfaceLocale }),
    today: m.stats_today({}, { locale: settings.interfaceLocale }),
    modeCrossword: m.mode_crossword({}, { locale: settings.interfaceLocale }),
    modeWordle: m.mode_wordle({}, { locale: settings.interfaceLocale }),
    completed: m.completed({}, { locale: settings.interfaceLocale }),
    vocabHeading: m.stats_vocab_heading({}, { locale: settings.interfaceLocale }),
    wordsPracticed: m.stats_words_practiced({}, { locale: settings.interfaceLocale }),
    repetitions: m.stats_repetitions({}, { locale: settings.interfaceLocale }),
    mostRepeated: m.stats_most_repeated({}, { locale: settings.interfaceLocale }),
    noVocabProgress: m.stats_no_vocab_progress({}, { locale: settings.interfaceLocale }),
    masteredWords: m.stats_mastered_words({}, { locale: settings.interfaceLocale }),
    masteredShort: m.stats_mastered_short({}, { locale: settings.interfaceLocale }),
    byLevel: m.stats_by_level({}, { locale: settings.interfaceLocale }),
    notStarted: m.stats_not_started({}, { locale: settings.interfaceLocale })
  });

  // Each language gets its own sticker colour so the sections are easy to tell apart at a glance.
  const languageColors: Record<Language, string> = {
    de: '#e6a527',
    en: '#3b6fb6',
    fr: '#d0564b',
    it: '#34824d',
    es: '#c8742e',
    pt: '#2f8f87',
    uk: '#5b7fd6'
  };

  const vocabProgress = $derived(readVocabularyProgressByLanguage(playableLanguages.map((language) => language.code)));
  const practicedLanguages = $derived(
    playableLanguages
      .filter((language) => vocabProgress[language.code])
      .map((language) => ({ ...language, progress: vocabProgress[language.code] }))
      .sort((left, right) => right.progress.totalRepetitions - left.progress.totalRepetitions)
  );
  const unstartedLanguages = $derived(playableLanguages.filter((language) => !vocabProgress[language.code]));

  function spellingOf(language: string, word: string) {
    return wordMetadata[language as keyof typeof wordMetadata]?.[word]?.spelling ?? word;
  }

  function formatMinutes(minutes: number) {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${String(minutes % 60).padStart(2, '0')}m` : `${minutes}m`;
  }

  const RING_RADIUS = 16;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  function ringOffset(percentage: number) {
    return RING_CIRCUMFERENCE * (1 - Math.min(Math.max(percentage, 0), 100) / 100);
  }

  // Tiny tilts make the tiles look like stickers slapped onto the page.
  const tilts = ['-1.5deg', '1deg', '-.5deg', '1.5deg'];

  let streakTimer: number | null = null;
  onMount(() => {
    void settings.refreshStreak();
    streakTimer = window.setInterval(() => void settings.refreshStreak(), 30_000);
    return () => {
      if (streakTimer !== null) window.clearInterval(streakTimer);
    };
  });
</script>

<section class="flex-1 min-h-0 m-0 px-[clamp(1rem,5vw,2rem)] pb-[clamp(1rem,5vw,2rem)] pt-[clamp(2.9rem,10vw,3.6rem)] overflow-x-hidden overflow-y-auto bg-transparent" dir={interfaceDirection} lang={settings.interfaceLocale} aria-label={labels.title}>
  <header class="flex items-end justify-center gap-2"><Companion id="mia" mood={miaMood} size="sm" /><h1 class="m-0 pb-[.6rem] text-center text-base-content font-['DM_Serif_Display',serif] text-[clamp(1.6rem,7vw,2.2rem)] font-normal tracking-[-.03em] leading-none">{labels.title}</h1><Companion id="tom" mood={tomMood} size="sm" /></header>

  <!-- Streak -->
  <section class={`streak-card panel-play relative mt-[1.2rem] px-4 pt-[.9rem] pb-4 ${settings.streak.qualified ? 'is-qualified' : ''}`} aria-labelledby="stats-streak-heading">
    {#if isRecord}<span class="sticker absolute -top-[.7rem] end-3 px-[.55rem] py-[.2rem] bg-[#e6a527] text-[#172a45] text-[.56rem] font-black tracking-[.08em] uppercase">{labels.newRecord}</span>{/if}
    <div class="flex items-end justify-between gap-3">
      <div class="min-w-0">
        <h2 id="stats-streak-heading" class="m-0 text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.streak}</h2>
        <div class="mt-[.3rem] flex items-center gap-[.35rem]">
          <span class="flame grid place-items-center w-[3rem] h-[3rem]" aria-hidden="true"><IconFlame class={`w-full h-full ${settings.streak.qualified ? 'text-[#e8622c]' : 'text-base-content/30'}`} /></span>
          <strong class="font-['DM_Serif_Display',serif] text-[3.2rem] font-normal leading-none text-base-content">{settings.streak.streakCount}</strong>
        </div>
      </div>
      <Companion id="lilith" mood={streakMood} />
    </div>

    <div class="mt-[.8rem]">
      <div class="flex items-center justify-between gap-3 text-base-content text-[.64rem] font-extrabold">
        <span>{labels.dailyGoal}</span>
        <span class="tabular-nums">{Math.min(settings.streak.vocabCorrect, settings.streak.vocabularyGoal)}/{settings.streak.vocabularyGoal}</span>
      </div>
      <ol class="m-0 mt-[.35rem] p-0 list-none flex gap-[.3rem]" role="progressbar" aria-valuenow={settings.streak.vocabCorrect} aria-valuemin="0" aria-valuemax={settings.streak.vocabularyGoal} aria-label={labels.dailyGoal}>
        {#each Array.from({ length: settings.streak.vocabularyGoal }) as _, index (index)}
          <li class={`pip flex-1 h-[.7rem] ${index < settings.streak.vocabCorrect ? 'is-filled' : ''}`} style={`--delay:${index * 60}ms`}></li>
        {/each}
      </ol>
      <p class="m-0 mt-[.45rem] flex items-center gap-[.3rem] text-[.62rem] font-extrabold text-base-content/70">
        {#if settings.streak.qualified}<IconCheck class="w-[1rem] h-[1rem] text-success" aria-hidden="true" />{labels.streakDone}{:else}<IconSchedule class="w-[1rem] h-[1rem]" aria-hidden="true" />{labels.streakTimeLeft}: {formatMinutes(settings.streak.minutesRemaining)}{/if}
      </p>
    </div>

    <div class="mt-[.8rem] flex flex-wrap items-center gap-[.4rem]" aria-label={labels.today}>
      <span class="text-accent text-[.54rem] font-extrabold tracking-[.1em] uppercase me-[.2rem]">{labels.today}</span>
      {#each [{ label: labels.modeCrossword, done: settings.streak.circleCompleted }, { label: labels.modeWordle, done: settings.streak.wordleCompleted }] as mode (mode.label)}
        <span class={`chip inline-flex items-center gap-[.25rem] px-[.55rem] py-[.2rem] text-[.62rem] font-extrabold ${mode.done ? 'is-done' : ''}`}>
          {#if mode.done}<IconCheck class="w-[.95rem] h-[.95rem]" aria-label={labels.streakDone} />{:else}<IconPending class="w-[.95rem] h-[.95rem] opacity-50" aria-hidden="true" />{/if}{mode.label}
        </span>
      {/each}
    </div>

    <div class="mt-4 grid grid-cols-2 gap-3">
      <div class="tile grid justify-items-center gap-[.15rem] px-2 py-[.6rem] bg-[#fff2cc] dark:bg-[#2b4a70]" style={`--tilt:${tilts[0]}`}>
        <IconTrophy class="w-[1.3rem] h-[1.3rem] text-[#c8862a] dark:text-[#e6a527]" aria-hidden="true" />
        <strong class="font-['DM_Serif_Display',serif] text-[1.6rem] font-normal leading-none text-base-content">{settings.streak.bestStreak}</strong>
        <span class="text-center text-base-content/70 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.streakBest}</span>
      </div>
      <div class="tile grid justify-items-center gap-[.15rem] px-2 py-[.6rem] bg-[#dff1e4] dark:bg-[#24524a]" style={`--tilt:${tilts[1]}`}>
        <IconPuzzle class="w-[1.3rem] h-[1.3rem] text-[#34824d] dark:text-[#8ed8a2]" aria-hidden="true" />
        <strong class="font-['DM_Serif_Display',serif] text-[1.6rem] font-normal leading-none text-base-content">{settings.completedRounds}</strong>
        <span class="text-center text-base-content/70 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.completed}</span>
      </div>
    </div>
  </section>

  <!-- One section per language -->
  <h2 class="m-0 mt-6 text-center text-accent text-[.62rem] font-black tracking-[.12em] uppercase">{labels.vocabHeading}</h2>

  {#if practicedLanguages.length === 0}
    <div class="panel-play mt-3 px-[.8rem] py-[.7rem]"><p class="m-0 text-base-content/60 text-[.68rem] font-bold leading-[1.4]">{labels.noVocabProgress}</p></div>
  {/if}

  {#each practicedLanguages as language (language.code)}
    <section class="language-card panel-play mt-4 overflow-hidden" style={`--lang:${languageColors[language.code]}`} aria-labelledby={`stats-lang-${language.code}`}>
      <header class="language-band flex items-center gap-3 px-[.8rem] py-[.6rem]">
        <span class="lang-badge grid place-items-center shrink-0 w-[2.3rem] h-[2.3rem] text-[.72rem] font-black uppercase" aria-hidden="true">{language.code}</span>
        <h3 id={`stats-lang-${language.code}`} class="m-0 flex-1 min-w-0 truncate text-base-content font-['DM_Serif_Display',serif] text-[1.3rem] font-normal leading-none">{language.label}</h3>
        <div class="relative shrink-0 w-[3.4rem] h-[3.4rem]" role="img" aria-label={`${labels.masteredWords}: ${language.progress.percentage}%`}>
          <svg viewBox="0 0 40 40" class="w-full h-full -rotate-90">
            <circle cx="20" cy="20" r={RING_RADIUS} fill="none" stroke-width="5" class="stroke-base-content/15" />
            <circle cx="20" cy="20" r={RING_RADIUS} fill="none" stroke-width="5" stroke-linecap="round" stroke="var(--lang)" class="transition-[stroke-dashoffset] duration-700" stroke-dasharray={RING_CIRCUMFERENCE} stroke-dashoffset={ringOffset(language.progress.percentage)} />
          </svg>
          <span class="absolute inset-0 flex items-center justify-center text-base-content text-[.66rem] font-black" aria-hidden="true">{language.progress.percentage}%</span>
        </div>
      </header>

      <div class="px-[.8rem] pt-[.75rem] pb-[.9rem]">
        <div class="grid grid-cols-3 gap-2">
          {#each [{ icon: IconBook, value: language.progress.wordsPracticed, label: labels.wordsPracticed }, { icon: IconRepeat, value: language.progress.totalRepetitions, label: labels.repetitions }, { icon: IconStar, value: `${language.progress.masteredWords}`, label: labels.masteredShort }] as stat, index (stat.label)}
            <div class="tile grid justify-items-center gap-[.1rem] px-1 py-[.45rem]" style={`--tilt:${tilts[index + 1]}`}>
              <stat.icon class="w-[1rem] h-[1rem] lang-ink" aria-hidden="true" />
              <strong class="font-['DM_Serif_Display',serif] text-[1.25rem] font-normal leading-none text-base-content tabular-nums">{stat.value}</strong>
              <span class="text-center text-base-content/60 text-[.5rem] font-extrabold tracking-[.05em] uppercase leading-tight">{stat.label}</span>
            </div>
          {/each}
        </div>

        {#if language.progress.levelBreakdown.length > 0}
          <p class="m-0 mt-[.85rem] text-accent text-[.54rem] font-extrabold tracking-[.08em] uppercase">{labels.byLevel}</p>
          <ul class="m-0 mt-[.35rem] p-0 list-none flex items-end gap-[.35rem] h-[4.6rem]">
            {#each language.progress.levelBreakdown as level, index (level.level)}
              <li class="flex-1 h-full flex flex-col items-center justify-end gap-[.2rem]" title={`${level.masteredWords}/${level.totalWords}`}>
                <span class="text-base-content/60 text-[.5rem] font-extrabold tabular-nums">{level.percentage}%</span>
                <div class="level-column relative w-full flex-1 overflow-hidden" role="progressbar" aria-valuenow={level.percentage} aria-valuemin="0" aria-valuemax="100" aria-label={`${level.level.toUpperCase()}: ${level.masteredWords}/${level.totalWords}`}>
                  <div class="level-fill absolute inset-x-0 bottom-0" style={`height:${Math.max(level.percentage, level.masteredWords > 0 ? 4 : 0)}%;--delay:${index * 80}ms`}></div>
                </div>
                <span class="text-base-content text-[.56rem] font-black">{level.level.toUpperCase()}</span>
              </li>
            {/each}
          </ul>
        {/if}

        {#if language.progress.mostRepeated.length > 0}
          <p class="m-0 mt-[.85rem] text-accent text-[.54rem] font-extrabold tracking-[.08em] uppercase">{labels.mostRepeated}</p>
          <ul class="m-0 mt-[.35rem] p-0 list-none flex flex-wrap gap-[.35rem]">
            {#each language.progress.mostRepeated as entry, index (entry.word)}
              <li class="word-chip inline-flex items-center gap-[.3rem] ps-[.55rem] pe-[.3rem] py-[.18rem] text-base-content text-[.64rem] font-bold" style={`--tilt:${tilts[index % tilts.length]}`}><span>{spellingOf(language.code, entry.word)}</span><span class="lang-count px-[.3rem] rounded-full text-[.54rem] font-black">×{entry.repetitions}</span></li>
            {/each}
          </ul>
        {/if}
      </div>
    </section>
  {/each}

  {#if unstartedLanguages.length > 0 && practicedLanguages.length > 0}
    <section class="mt-5" aria-labelledby="stats-unstarted-heading">
      <h3 id="stats-unstarted-heading" class="m-0 text-center text-base-content/50 text-[.54rem] font-extrabold tracking-[.1em] uppercase">{labels.notStarted}</h3>
      <ul class="m-0 mt-[.45rem] p-0 list-none flex flex-wrap justify-center gap-[.4rem]">
        {#each unstartedLanguages as language (language.code)}
          <li class="chip inline-flex items-center gap-[.3rem] px-[.55rem] py-[.2rem] opacity-60 text-base-content text-[.62rem] font-extrabold" style={`--lang:${languageColors[language.code]}`}><span class="lang-dot w-[.5rem] h-[.5rem] rounded-full" aria-hidden="true"></span>{language.label}</li>
        {/each}
      </ul>
    </section>
  {/if}
</section>

<style>
  .streak-card { background: linear-gradient(160deg, #fff4d6 0%, #fffdf7 55%); }
  .streak-card.is-qualified { background: linear-gradient(160deg, #e4f4e8 0%, #fffdf7 55%); }
  :global(html.dark) .streak-card { background: linear-gradient(160deg, #3a3f4f 0%, #213a5d 60%); }
  :global(html.dark) .streak-card.is-qualified { background: linear-gradient(160deg, #24524a 0%, #213a5d 60%); }

  .flame { transform-origin: 50% 90%; }
  .is-qualified .flame { animation: flicker 1.6s ease-in-out infinite; }
  @keyframes flicker { 0%, 100% { rotate: -3deg; scale: 1; } 50% { rotate: 3deg; scale: 1.06 1.1; } }

  .sticker { rotate: 4deg; border: var(--play-outline); border-radius: 999px; box-shadow: 2px 2px 0 var(--play-line); animation: pop .5s var(--play-ease) both; }
  @keyframes pop { from { scale: .4; opacity: 0; } }

  .pip { border: 2px solid var(--play-line); border-radius: 6px 4px 6px 4px; background: rgba(23, 42, 69, .08); }
  .pip.is-filled { background: #e6a527; animation: pop .4s var(--play-ease) both; animation-delay: var(--delay); }
  .is-qualified .pip.is-filled { background: #34824d; }
  :global(html.dark) .pip { background: rgba(255, 253, 247, .1); }

  .chip { border: 2px solid rgba(23, 42, 69, .35); border-radius: 999px; background: #fffdf7; color: #3d4b60; }
  .chip.is-done { border-color: #34824d; background: #dff1e4; color: #23603a; }
  :global(html.dark) .chip { border-color: rgba(255, 253, 247, .3); background: #213a5d; color: #fffdf7; }
  :global(html.dark) .chip.is-done { border-color: #8ed8a2; background: #24524a; }

  .tile { rotate: var(--tilt, 0deg); border: var(--play-outline); border-radius: 14px 10px 13px 11px / 11px 13px 10px 14px; box-shadow: 2px 2px 0 var(--play-line); transition: rotate .25s var(--play-ease), translate .25s var(--play-ease); }
  .language-card .tile { background: color-mix(in srgb, var(--lang) 12%, #fffdf7); }
  :global(html.dark) .language-card .tile { background: color-mix(in srgb, var(--lang) 22%, #213a5d); }
  @media (hover: hover) { .tile:hover { rotate: 0deg; translate: 0 -2px; } }

  .language-band { border-bottom: var(--play-outline); background: color-mix(in srgb, var(--lang) 26%, #fffdf7); }
  :global(html.dark) .language-band { background: color-mix(in srgb, var(--lang) 35%, #213a5d); }
  .lang-badge { rotate: -6deg; border: var(--play-outline); border-radius: 48% 52% 45% 55% / 55% 45% 52% 48%; background: var(--lang); color: #fffdf7; box-shadow: 2px 2px 0 var(--play-line); }
  :global(.lang-ink) { color: var(--lang); }
  .lang-dot { background: var(--lang); }

  .level-column { border: 2px solid var(--play-line); border-radius: 8px 6px 4px 4px; background: rgba(23, 42, 69, .06); }
  :global(html.dark) .level-column { background: rgba(255, 253, 247, .08); }
  .level-fill { background: var(--lang); transform-origin: bottom; animation: grow .7s var(--play-ease) both; animation-delay: var(--delay); }
  @keyframes grow { from { scale: 1 0; } }

  .word-chip { rotate: var(--tilt, 0deg); border: 2px solid var(--play-line); border-radius: 999px; background: #fffdf7; box-shadow: 2px 2px 0 var(--play-line); }
  :global(html.dark) .word-chip { background: #2b4a70; }
  .lang-count { background: var(--lang); color: #fffdf7; }

  @media (prefers-reduced-motion: reduce) {
    .flame, .sticker, .pip.is-filled, .level-fill { animation: none !important; }
    .tile, .word-chip { rotate: 0deg; }
  }
</style>
