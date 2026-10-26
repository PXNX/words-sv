<script lang="ts">
  import { onMount } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { playableLanguages, wordMetadata, type Language } from '#lib/data/vocabulary.js';
  import { readVocabularyProgressByLanguage } from '#lib/vocab/spacedRepetition.js';
  import { readGrammarProgressByLanguage } from '#lib/grammar/learning.js';
  import { readMissedWords } from '#lib/story/missedWords.js';
  import { GRAMMAR_GOAL, PRONUNCIATION_GOAL, REPAIR_WORDS, VOCABULARY_GOALS, lilithFace, lilithMood, modeDone, type StreakRepair } from '#lib/clientStreak.js';
  import { readingTextsFor } from '#lib/story/readingTexts.js';
  import { readReviewLedger, type ReviewLedger } from '#lib/review/ledger.js';
  import { completedIds, countActivity, readActivity, type ActivityEvent } from '#lib/progress/activity.js';
  import { buildMilestones, buildWeeklyRecap, milestonePercent, nextMilestone, weekStartTimestamp, type MilestoneId } from '#lib/progress/milestones.js';
  import IconExpand from '~icons/material-symbols/expand-more-rounded';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconPending from '~icons/material-symbols/radio-button-unchecked-rounded';
  import IconFlame from '~icons/material-symbols/local-fire-department-rounded';
  import Companion from '#lib/story/Companion.svelte';
  import type { Mood } from '#lib/story/stories.js';

  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  // Lilith turns loving at five days, happy once today is qualified, sad about a broken streak and
  // playfully shocked while the current one still waits for its session.
  const lilith = $derived(lilithMood(settings.streak));
  const streakMood = $derived<Mood>(lilithFace(lilith));
  const goalProgress = $derived(settings.streak.qualified ? 1 : Math.min(1, settings.streak.vocabCorrect / Math.max(1, settings.streak.vocabularyGoal)));

  const labels = $derived({
    title: m.stats_title({}, { locale: settings.interfaceLocale }),
    streak: m.streak({}, { locale: settings.interfaceLocale }),
    streakDone: m.streak_done({}, { locale: settings.interfaceLocale }),
    streakTimeLeft: m.streak_time_left({}, { locale: settings.interfaceLocale }),
    streakBest: m.streak_best({}, { locale: settings.interfaceLocale }),
    streakGoalHint: m.streak_goal_hint({}, { locale: settings.interfaceLocale }),
    streakGoalChoose: m.streak_goal_choose({}, { locale: settings.interfaceLocale }),
    streakGoalWords: (count: number) => m.streak_goal_words({ count }, { locale: settings.interfaceLocale }),
    streakCountsToday: m.streak_counts_today({}, { locale: settings.interfaceLocale }),
    streakModeDone: m.streak_mode_done({}, { locale: settings.interfaceLocale }),
    story: m.story_title({}, { locale: settings.interfaceLocale }),
    reading: m.reading_title({}, { locale: settings.interfaceLocale }),
    listen: m.story_listen({}, { locale: settings.interfaceLocale }),
    pronunciation: m.mode_pronunciation({}, { locale: settings.interfaceLocale }),
    dailyGoal: m.stats_daily_goal({}, { locale: settings.interfaceLocale }),
    today: m.stats_today({}, { locale: settings.interfaceLocale }),
    modeCrossword: m.mode_crossword({}, { locale: settings.interfaceLocale }),
    modeDefinitions: m.mode_definitions({}, { locale: settings.interfaceLocale }),
    modeWordle: m.mode_wordle({}, { locale: settings.interfaceLocale }),
    modeHangman: m.mode_hangman({}, { locale: settings.interfaceLocale }),
    alltag: m.mode_alltag({}, { locale: settings.interfaceLocale }),
    completed: m.completed({}, { locale: settings.interfaceLocale }),
    languagesHeading: m.stats_languages_heading({}, { locale: settings.interfaceLocale }),
    vocab: m.stats_vocab({}, { locale: settings.interfaceLocale }),
    grammar: m.mode_grammar({}, { locale: settings.interfaceLocale }),
    wordsPracticed: m.stats_words_practiced({}, { locale: settings.interfaceLocale }),
    grammarPracticed: m.stats_grammar_practiced({}, { locale: settings.interfaceLocale }),
    repetitions: m.stats_repetitions({}, { locale: settings.interfaceLocale }),
    masteredWords: m.stats_mastered_words({}, { locale: settings.interfaceLocale }),
    nothingYet: m.stats_nothing_yet({}, { locale: settings.interfaceLocale }),
    noProgress: m.stats_no_progress({}, { locale: settings.interfaceLocale }),
    topWords: m.stats_top_words({}, { locale: settings.interfaceLocale }),
    trickyWords: m.stats_tricky_words({}, { locale: settings.interfaceLocale }),
    noneYet: m.stats_none_yet({}, { locale: settings.interfaceLocale }),
    milestonesTitle: m.milestones_title({}, { locale: settings.interfaceLocale }),
    milestonesNext: m.milestones_next({}, { locale: settings.interfaceLocale }),
    milestonesDone: m.milestones_done({}, { locale: settings.interfaceLocale }),
    milestonesProgress: (value: number, target: number) => m.milestones_progress({ value, target }, { locale: settings.interfaceLocale }),
    weekTitle: m.week_title({}, { locale: settings.interfaceLocale }),
    weekWords: m.week_words({}, { locale: settings.interfaceLocale }),
    weekMinutes: m.week_minutes({}, { locale: settings.interfaceLocale }),
    weekBestStreak: m.week_best_streak({}, { locale: settings.interfaceLocale }),
    weekHardest: m.week_hardest({}, { locale: settings.interfaceLocale }),
    weekShare: m.week_share({}, { locale: settings.interfaceLocale }),
    weekShared: m.week_shared({}, { locale: settings.interfaceLocale }),
    weekEmpty: m.week_empty({}, { locale: settings.interfaceLocale }),
    streakFreezes: (count: number) => m.streak_freezes({ count }, { locale: settings.interfaceLocale }),
    streakFreezeHint: m.streak_freeze_hint({}, { locale: settings.interfaceLocale }),
    streakRepairTitle: m.streak_repair_title({}, { locale: settings.interfaceLocale }),
    streakRepairHint: (count: number, need: number) => m.streak_repair_hint({ count, need }, { locale: settings.interfaceLocale }),
    streakRepairCta: m.streak_repair_cta({}, { locale: settings.interfaceLocale }),
    streakRepairNone: m.streak_repair_none({}, { locale: settings.interfaceLocale }),
    streakRestart: (count: number) => m.streak_restart({ count }, { locale: settings.interfaceLocale })
  });

  // Milestone names live here, so the pure milestone model only deals with ids and numbers.
  const milestoneLabels = $derived<Record<MilestoneId, string>>({
    first_text: m.milestone_first_text({}, { locale: settings.interfaceLocale }),
    first_story: m.milestone_first_story({}, { locale: settings.interfaceLocale }),
    perfect_pronunciation: m.milestone_perfect_pronunciation({}, { locale: settings.interfaceLocale }),
    streak_7: m.milestone_streak_7({}, { locale: settings.interfaceLocale }),
    tricky_10: m.milestone_tricky_10({}, { locale: settings.interfaceLocale }),
    all_a1_texts: m.milestone_all_a1_texts({}, { locale: settings.interfaceLocale }),
    mastered_100: m.milestone_mastered_100({}, { locale: settings.interfaceLocale })
  });

  // Every mode that can qualify the day, so the daily progress is visible in one place.
  const todayModes = $derived([
    { label: labels.modeCrossword, done: modeDone(settings.streak, 'circle') },
    { label: labels.modeDefinitions, done: modeDone(settings.streak, 'definitions') },
    { label: labels.modeWordle, done: modeDone(settings.streak, 'wordle') },
    { label: labels.modeHangman, done: modeDone(settings.streak, 'hangman') },
    { label: labels.vocab, done: modeDone(settings.streak, 'vocab') },
    { label: labels.story, done: modeDone(settings.streak, 'story') },
    { label: labels.reading, done: modeDone(settings.streak, 'reading') },
    { label: labels.listen, done: modeDone(settings.streak, 'listen') },
    { label: labels.alltag, done: modeDone(settings.streak, 'alltag') },
    { label: labels.grammar, done: modeDone(settings.streak, 'grammar') },
    { label: labels.pronunciation, done: modeDone(settings.streak, 'pronunciation') }
  ]);

  // One accent colour per language keeps the cards apart without extra decoration.
  const languageColors: Record<Language, string> = {
    de: '#e6a527',
    en: '#3b6fb6',
    fr: '#d0564b',
    it: '#34824d',
    es: '#c8742e',
    pt: '#2f8f87',
    uk: '#5b7fd6'
  };

  const languageCodes = playableLanguages.map((language) => language.code);
  const vocabProgress = $derived(readVocabularyProgressByLanguage(languageCodes));
  const grammarProgress = $derived(readGrammarProgressByLanguage(languageCodes));
  // Languages with any vocabulary or grammar practice, the most practised first. Tricky words
  // are the ones most often answered wrong anywhere in the app (see `missedWords.ts`).
  const practicedLanguages = $derived(
    playableLanguages
      .map((language) => ({
        ...language,
        vocab: vocabProgress[language.code],
        grammar: grammarProgress[language.code],
        trickyWords: readMissedWords(language.code).sort((left, right) => right.count - left.count).slice(0, 5)
      }))
      .filter((language) => language.vocab || language.grammar || language.trickyWords.length > 0)
      .sort((left, right) => (right.vocab?.totalRepetitions ?? 0) + (right.grammar?.totalRepetitions ?? 0) - (left.vocab?.totalRepetitions ?? 0) - (left.grammar?.totalRepetitions ?? 0))
  );

  // Milestones and the weekly recap read the activity log and the shared review ledger. Both are
  // loaded on the client so server rendering never sees a half-empty history.
  let activity = $state<ActivityEvent[]>([]);
  let ledger = $state<ReviewLedger>({});
  let progressReady = $state(false);
  let shareNote = $state('');

  const textsRead = $derived(completedIds(activity, 'reading'));
  const a1TextIds = $derived(readingTextsFor(settings.lang, 'a1', false).map((text) => text.id));
  const masteredWords = $derived(Object.values(vocabProgress).reduce((sum, progress) => sum + progress.masteredWords, 0));
  const milestones = $derived(buildMilestones({
    textsRead: textsRead.length,
    storiesCompleted: completedIds(activity, 'story').length,
    perfectPronunciations: countActivity(activity, 'pronunciation', 0, Number.MAX_SAFE_INTEGER, (event) => event.perfect === true),
    masteredWords,
    bestStreak: settings.streak.bestStreak,
    a1TextsRead: textsRead.filter((id) => a1TextIds.includes(id)).length,
    a1TextsTotal: a1TextIds.length,
    trickyCleared: countActivity(activity, 'tricky_cleared')
  }));
  const next = $derived(nextMilestone(milestones));
  const weekly = $derived(buildWeeklyRecap({
    ledger,
    activity,
    bestStreak: settings.streak.bestStreak,
    since: weekStartTimestamp()
  }));

  async function shareWeek() {
    const text = `${labels.weekTitle}: ${labels.weekWords} ${weekly.wordsMastered} · ${labels.weekMinutes} ${weekly.minutes} · ${labels.weekBestStreak} ${weekly.bestStreak}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: labels.weekTitle, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      shareNote = labels.weekShared;
    } catch {
      shareNote = '';
    }
  }

  // Clicking a language card reveals its top and tricky words.
  let expandedLanguages = $state<Language[]>([]);
  function toggleLanguage(code: Language) {
    expandedLanguages = expandedLanguages.includes(code) ? expandedLanguages.filter((entry) => entry !== code) : [...expandedLanguages, code];
  }
  function spellingOf(language: Language, word: string) {
    return wordMetadata[language]?.[word.toLocaleUpperCase()]?.spelling ?? word.toLocaleLowerCase();
  }

  function formatMinutes(minutes: number) {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${String(minutes % 60).padStart(2, '0')}m` : `${minutes}m`;
  }

  let streakTimer: number | null = null;
  let repairOffer = $state<StreakRepair | null>(null);
  function refreshStreak() {
    return settings.refreshStreak().then(() => {
      repairOffer = settings.repairCandidate();
    });
  }
  onMount(() => {
    activity = readActivity();
    ledger = readReviewLedger();
    progressReady = true;
    void refreshStreak();
    streakTimer = window.setInterval(() => void refreshStreak(), 30_000);
    return () => {
      if (streakTimer !== null) window.clearInterval(streakTimer);
    };
  });
</script>

<section class="flex-1 min-h-0 m-0 px-[clamp(1rem,5vw,2rem)] pb-[clamp(1rem,5vw,2rem)] pt-[clamp(2.9rem,10vw,3.6rem)] overflow-x-hidden overflow-y-auto bg-transparent" dir={interfaceDirection} lang={settings.interfaceLocale} aria-label={labels.title}>
  <h1 class="m-0 text-center text-base-content font-['DM_Serif_Display',serif] text-[clamp(1.6rem,7vw,2.2rem)] font-normal tracking-[-.03em] leading-none">{labels.title}</h1>

  <!-- Streak -->
  <section class="panel-play mt-[1.2rem] px-4 pt-[.9rem] pb-4" aria-labelledby="progress-streak-heading">
    <div class="flex items-end justify-between gap-3">
      <div class="min-w-0">
        <h2 id="progress-streak-heading" class="m-0 text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.streak}</h2>
        <div class="mt-[.3rem] flex items-center gap-[.5rem]">
          <span class="relative grid place-items-center" aria-hidden="true">
            <svg class="progress-ring absolute w-[3.2rem] h-[3.2rem]" viewBox="0 0 36 36">
              <circle class="progress-ring-track" cx="18" cy="18" r="16" pathLength="100" />
              <circle class="progress-ring-value" cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="100" stroke-dashoffset={100 - goalProgress * 100} />
            </svg>
            <IconFlame class={`w-[2.4rem] h-[2.4rem] ${settings.streak.qualified ? 'text-[#e8622c]' : 'text-base-content/30'}`} />
          </span>
          <strong class="font-['DM_Serif_Display',serif] text-[2.8rem] font-normal leading-none text-base-content">{settings.streak.streakCount}</strong>
        </div>
      </div>
      <span class="progress-lilith" class:loving={lilith === 'loving'}><Companion id="lilith" mood={streakMood} />{#if lilith === 'loving'}<span class="progress-lilith-hearts" aria-hidden="true"><span>♥</span><span>♥</span></span>{/if}</span>
    </div>

    <div class="mt-[.8rem]">
      <div class="flex items-center justify-between gap-3 text-base-content text-[.64rem] font-extrabold">
        <span>{labels.dailyGoal}</span>
        <span class="tabular-nums">{Math.min(settings.streak.vocabCorrect, settings.streak.vocabularyGoal)}/{settings.streak.vocabularyGoal}</span>
      </div>
      <ol class="m-0 mt-[.35rem] p-0 list-none flex gap-[.3rem]" role="progressbar" aria-valuenow={settings.streak.vocabCorrect} aria-valuemin="0" aria-valuemax={settings.streak.vocabularyGoal} aria-label={labels.dailyGoal}>
        {#each Array.from({ length: settings.streak.vocabularyGoal }) as _, index (index)}
          <li class={`pip flex-1 h-[.6rem] ${index < settings.streak.vocabCorrect ? 'bg-[#34824d]' : 'bg-base-content/10'}`}></li>
        {/each}
      </ol>
      <p class="m-0 mt-[.45rem] text-[.62rem] font-extrabold text-base-content/70">
        {#if settings.streak.qualified}{labels.streakDone}{:else}{labels.streakTimeLeft}: {formatMinutes(settings.streak.minutesRemaining)}{/if}
      </p>
      <div class="mt-[.5rem] flex flex-wrap items-center gap-[.3rem]" role="group" aria-label={labels.streakGoalChoose}>
        {#each VOCABULARY_GOALS as goal (goal)}
          <button type="button" class="progress-goal" class:active={goal === settings.streak.vocabularyGoal} aria-pressed={goal === settings.streak.vocabularyGoal} onclick={() => void settings.setDailyGoal(goal)}>{labels.streakGoalWords(goal)}</button>
        {/each}
      </div>
      <p class="m-0 mt-[.3rem] text-base-content/55 text-[.56rem] font-bold">{labels.streakGoalHint}</p>
      <p class="m-0 mt-[.2rem] text-base-content/55 text-[.56rem] font-bold">{labels.streakFreezes(settings.streak.freezes)} · {labels.streakFreezeHint}</p>
      {#if repairOffer}
        <div class="mt-[.55rem] p-[.6rem] border border-base-content/25 rounded-[.6rem] bg-[#fff4d9] dark:bg-[#294666]">
          <p class="m-0 text-base-content text-[.6rem] font-extrabold leading-[1.4]">{labels.streakRepairHint(repairOffer.streakCount, REPAIR_WORDS)}</p>
          <a class="btn-play btn-play-ink btn-play-sm mt-[.4rem]" href="/vocab?repair=1">{labels.streakRepairCta}</a>
        </div>
      {:else if !settings.streak.qualified && settings.streak.streakCount === 0 && settings.streak.bestStreak > 0}
        <p class="m-0 mt-[.35rem] text-base-content/65 text-[.6rem] font-bold">{labels.streakRestart(settings.streak.bestStreak)}</p>
      {/if}
    </div>

    <div class="mt-[.7rem] flex flex-wrap items-center gap-x-4 gap-y-1 text-base-content text-[.64rem] font-extrabold" aria-label={labels.today}>
      {#each todayModes as mode (mode.label)}
        <span class="inline-flex items-center gap-[.25rem]">{#if mode.done}<IconCheck class="w-[1rem] h-[1rem] text-success" aria-label={labels.streakModeDone} />{:else}<IconPending class="w-[1rem] h-[1rem] text-base-content/35" aria-hidden="true" />{/if}{mode.label}</span>
      {/each}
    </div>

    <dl class="m-0 mt-[.8rem] pt-[.7rem] grid grid-cols-2 border-t border-base-content/[.14] dark:border-base-content/[.22]">
      <div class="grid gap-[.1rem] text-center"><dd class="m-0 order-1 font-['DM_Serif_Display',serif] text-[1.4rem] leading-none text-base-content">{settings.streak.bestStreak}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.streakBest}</dt></div>
      <div class="grid gap-[.1rem] text-center border-s border-base-content/[.14] dark:border-base-content/[.22]"><dd class="m-0 order-1 font-['DM_Serif_Display',serif] text-[1.4rem] leading-none text-base-content">{settings.completedRounds}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.completed}</dt></div>
    </dl>
  </section>

  <!-- Milestones: the nearest unfinished goal first, then the whole path. -->
  <section class="panel-play mt-4 px-4 pt-[.9rem] pb-4" aria-labelledby="progress-milestones-heading">
    <h2 id="progress-milestones-heading" class="m-0 text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.milestonesTitle}</h2>
    {#if next}
      <div class="mt-[.5rem]">
        <div class="flex items-center justify-between gap-3 text-base-content text-[.64rem] font-extrabold">
          <span>{labels.milestonesNext}</span>
          <span class="tabular-nums">{labels.milestonesProgress(next.value, next.target)}</span>
        </div>
        <p class="m-0 mt-[.2rem] text-base-content font-['DM_Serif_Display',serif] text-[1.15rem] leading-[1.15]">{milestoneLabels[next.id]}</p>
        <div class="mt-[.4rem] h-[.5rem] w-full rounded-full bg-base-content/10 overflow-hidden" role="progressbar" aria-valuenow={milestonePercent(next)} aria-valuemin="0" aria-valuemax="100" aria-label={milestoneLabels[next.id]}>
          <div class="h-full rounded-full bg-[#e6a527] transition-[width] duration-500" style={`width:${Math.max(milestonePercent(next), next.value > 0 ? 3 : 0)}%`}></div>
        </div>
      </div>
    {:else if progressReady}
      <p class="m-0 mt-[.45rem] text-success text-[.7rem] font-extrabold">{labels.milestonesDone}</p>
    {/if}
    <ul class="m-0 mt-[.7rem] p-0 list-none grid gap-[.3rem]">
      {#each milestones as milestone (milestone.id)}
        <li class="flex items-center gap-[.4rem] text-[.64rem] font-bold {milestone.done ? 'text-base-content' : 'text-base-content/50'}">
          {#if milestone.done}<IconCheck class="w-[.95rem] h-[.95rem] flex-none text-success" aria-label={labels.milestonesDone} />{:else}<IconPending class="w-[.95rem] h-[.95rem] flex-none text-base-content/30" aria-hidden="true" />{/if}
          <span class="min-w-0 flex-1 truncate">{milestoneLabels[milestone.id]}</span>
          <span class="tabular-nums text-base-content/55">{labels.milestonesProgress(milestone.value, milestone.target)}</span>
        </li>
      {/each}
    </ul>
  </section>

  <!-- Weekly recap: what actually happened this week, not a guessed average. -->
  <section class="panel-play mt-4 px-4 pt-[.9rem] pb-4" aria-labelledby="progress-week-heading">
    <h2 id="progress-week-heading" class="m-0 text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.weekTitle}</h2>
    <dl class="m-0 mt-[.6rem] grid grid-cols-2 gap-x-4 gap-y-[.55rem]">
      <div class="grid gap-[.1rem]"><dd class="m-0 order-1 font-['DM_Serif_Display',serif] text-[1.5rem] leading-none text-base-content">{weekly.wordsMastered}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.weekWords}</dt></div>
      <div class="grid gap-[.1rem]"><dd class="m-0 order-1 font-['DM_Serif_Display',serif] text-[1.5rem] leading-none text-base-content">{weekly.minutes}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.weekMinutes}</dt></div>
      <div class="grid gap-[.1rem]"><dd class="m-0 order-1 font-['DM_Serif_Display',serif] text-[1.5rem] leading-none text-base-content">{weekly.bestStreak}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.weekBestStreak}</dt></div>
      <div class="grid gap-[.1rem] min-w-0"><dd class="m-0 order-1 truncate text-base-content text-[.8rem] font-extrabold leading-[1.9]">{weekly.hardestWord ?? '—'}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.weekHardest}</dt></div>
    </dl>
    {#if weekly.wordsMastered === 0 && weekly.minutes === 0}
      <p class="m-0 mt-[.5rem] text-base-content/55 text-[.62rem] font-bold">{labels.weekEmpty}</p>
    {/if}
    <button type="button" class="btn-play btn-play-soft btn-play-sm mt-[.7rem]" onclick={shareWeek}>{labels.weekShare}</button>
    <p class="m-0 mt-[.35rem] text-success text-[.58rem] font-bold" aria-live="polite">{shareNote}</p>
  </section>

  <!-- One section per language, split into vocabulary (Tom) and grammar (Mia) -->
  <h2 class="m-0 mt-6 text-center text-accent text-[.62rem] font-black tracking-[.12em] uppercase">{labels.languagesHeading}</h2>

  {#if practicedLanguages.length === 0}
    <div class="panel-play mt-3 px-[.8rem] py-[.7rem]"><p class="m-0 text-base-content/60 text-[.68rem] font-bold leading-[1.4]">{labels.noProgress}</p></div>
  {/if}

  {#each practicedLanguages as language (language.code)}
    {@const expanded = expandedLanguages.includes(language.code)}
    <section class="panel-play mt-4 overflow-hidden border-t-[6px]" style={`border-top-color:${languageColors[language.code]};--lang:${languageColors[language.code]}`} aria-labelledby={`progress-lang-${language.code}`}>
      <h3 id={`progress-lang-${language.code}`} class="m-0">
        <button type="button" class="w-full flex items-center justify-between gap-3 px-[.9rem] pt-[.7rem] bg-transparent border-0 cursor-pointer text-start text-base-content font-['DM_Serif_Display',serif] text-[1.3rem] font-normal leading-none" aria-expanded={expanded} aria-controls={`progress-words-${language.code}`} onclick={() => toggleLanguage(language.code)}>
          {language.label}<IconExpand class={`w-[1.4rem] h-[1.4rem] text-base-content/50 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </h3>

      <!-- The header button handles keyboard access; the rest of the card is just a larger click target. -->
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="px-[.9rem] pb-[.8rem] cursor-pointer" onclick={() => toggleLanguage(language.code)}>
        <div class="flex items-end gap-3 pt-[.6rem]">
          <Companion id="tom" mood={language.vocab ? 'happy' : 'curious'} size="sm" />
          <div class="flex-1 min-w-0 pb-[.2rem]">
            <h4 class="m-0 text-accent text-[.56rem] font-extrabold tracking-[.1em] uppercase">{labels.vocab}</h4>
            {#if language.vocab}
              <p class="m-0 mt-[.2rem] text-base-content text-[.66rem] font-extrabold">{labels.wordsPracticed}: {language.vocab.wordsPracticed} · {labels.repetitions}: {language.vocab.totalRepetitions}</p>
              <div class="mt-[.4rem] flex items-center justify-between gap-3 text-base-content/60 text-[.56rem] font-extrabold"><span>{labels.masteredWords}</span><span class="tabular-nums">{language.vocab.masteredWords}/{language.vocab.totalWords}</span></div>
              <div class="mt-[.2rem] h-[.45rem] w-full rounded-full bg-base-content/10 overflow-hidden" role="progressbar" aria-valuenow={language.vocab.percentage} aria-valuemin="0" aria-valuemax="100" aria-label={`${labels.masteredWords}: ${language.vocab.percentage}%`}>
                <div class="h-full rounded-full bg-[var(--lang)] transition-[width] duration-500" style={`width:${Math.max(language.vocab.percentage, language.vocab.masteredWords > 0 ? 2 : 0)}%`}></div>
              </div>
            {:else}
              <p class="m-0 mt-[.2rem] text-base-content/50 text-[.64rem] font-bold">{labels.nothingYet}</p>
            {/if}
          </div>
        </div>

        <div class="flex items-end gap-3 mt-[.7rem] pt-[.6rem] border-t border-base-content/[.14] dark:border-base-content/[.22]">
          <Companion id="mia" mood={language.grammar ? 'happy' : 'curious'} size="sm" />
          <div class="flex-1 min-w-0 pb-[.2rem]">
            <h4 class="m-0 text-accent text-[.56rem] font-extrabold tracking-[.1em] uppercase">{labels.grammar}</h4>
            {#if language.grammar}
              <p class="m-0 mt-[.2rem] text-base-content text-[.66rem] font-extrabold">{labels.grammarPracticed}: {language.grammar.itemsPracticed} · {labels.repetitions}: {language.grammar.totalRepetitions}</p>
            {:else}
              <p class="m-0 mt-[.2rem] text-base-content/50 text-[.64rem] font-bold">{labels.nothingYet}</p>
            {/if}
          </div>
        </div>

        {#if expanded}
          <div id={`progress-words-${language.code}`} class="grid grid-cols-2 gap-4 mt-[.7rem] pt-[.6rem] border-t border-base-content/[.14] dark:border-base-content/[.22]">
            {#each [{ heading: labels.topWords, words: language.vocab?.mostRepeated.map((entry) => ({ word: entry.word, count: entry.repetitions })) ?? [] }, { heading: labels.trickyWords, words: language.trickyWords.map((entry) => ({ word: entry.word, count: entry.count })) }] as list (list.heading)}
              <div class="min-w-0">
                <h4 class="m-0 text-accent text-[.56rem] font-extrabold tracking-[.1em] uppercase">{list.heading}</h4>
                {#if list.words.length > 0}
                  <ol class="m-0 mt-[.3rem] p-0 list-none grid gap-[.2rem]">
                    {#each list.words as entry (entry.word)}
                      <li class="flex items-center justify-between gap-2 text-base-content text-[.66rem] font-bold"><span class="truncate">{spellingOf(language.code, entry.word)}</span><span class="text-base-content/50 tabular-nums">×{entry.count}</span></li>
                    {/each}
                  </ol>
                {:else}
                  <p class="m-0 mt-[.3rem] text-base-content/50 text-[.64rem] font-bold">{labels.noneYet}</p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/each}
</section>

<style>
  .pip { border: 2px solid var(--play-line); border-radius: 5px; }
  .progress-ring { rotate: -90deg; overflow: visible; }
  .progress-ring-track { fill: none; stroke: var(--play-line); stroke-width: 2.4; opacity: .28; }
  .progress-ring-value { fill: none; stroke: #34824d; stroke-width: 2.4; stroke-linecap: round; transition: stroke-dashoffset .45s ease; }
  .progress-lilith { position:relative;display:block;flex:none; }
  .progress-lilith-hearts { position:absolute;inset:-.5rem 0 auto;display:flex;justify-content:center;gap:.12rem;color:#d9546a;font-size:.78rem;line-height:1;pointer-events:none; }
  .progress-lilith-hearts span { display:block;animation:progress-heart 2s ease-in-out infinite; }
  .progress-lilith-hearts span:last-child { margin-top:.35rem;font-size:.58rem;animation-delay:.7s; }
  @keyframes progress-heart { 0% { opacity:0;translate:0 .3rem;scale:.7; } 35% { opacity:1; } 100% { opacity:0;translate:0 -1rem;scale:1; } }
  @media (prefers-reduced-motion:reduce) { .progress-lilith-hearts span { animation:none;opacity:1; } }
  .progress-goal { min-height: 1.7rem; padding: .15rem .55rem; border: 1.5px solid var(--play-line); border-radius: 999px; background: transparent; color: var(--play-ink, #172a45); font-size: .58rem; font-weight: 900; cursor: pointer; }
  .progress-goal.active { border-color: #172a45; background: #172a45; color: #fffdf7; }
  .progress-goal:focus-visible { outline: 2px solid #e6a527; outline-offset: 2px; }
  :global(html.dark) .progress-goal.active { border-color: #e6a527; background: #e6a527; color: #172a45; }
</style>
