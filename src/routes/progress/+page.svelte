<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { onMount } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings, FIRST_NAME_MAX_LENGTH } from '#lib/state/settings.svelte.js';
  import { playableLanguages, wordMetadata, type Language } from '#lib/data/vocabulary.js';
  import { readVocabularyProgressByLanguage } from '#lib/vocab/spacedRepetition.js';
  import { readGrammarProgressByLanguage } from '#lib/grammar/learning.js';
  import { readMissedWords } from '#lib/story/missedWords.js';
  import { REPAIR_WORDS, VOCABULARY_GOALS, lilithFace, lilithMood, type StreakRepair } from '#lib/streak/clientStreak.js';
  import { readReviewLedger, type ReviewLedger } from '#lib/review/ledger.js';
  import { activityFor, readActivity, type ActivityEvent } from '#lib/progress/activity.js';
  import { buildWeeklyRecap, weekStartTimestamp } from '#lib/progress/weeklyRecap.js';
  import { buildAchievements, unlockedCount, type AchievementId } from '#lib/progress/achievements.js';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconFlame from '~icons/material-symbols/local-fire-department-rounded';
  import IconEdit from '~icons/material-symbols/edit-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';
  import Companion from '#lib/story/Companion.svelte';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import AvatarEditor from '#lib/profile/AvatarEditor.svelte';
  import ProCard from '#lib/store/ProCard.svelte';
  import { cloudSync } from '#lib/sync/cloudSync.svelte.js';
  import { checkAchievementRewards, cosmetics } from '#lib/profile/cosmetics.svelte.js';
  import { dailyActivity, modeShares } from '#lib/progress/statsView.js';
  import type { ActivityKind } from '#lib/progress/activity.js';
  import SyncHint from '#lib/sync/SyncHint.svelte';
  import { defaultAvatar } from '#lib/profile/avatar.js';
  import type { Mood } from '#lib/story/stories.js';
  import { formatNumber, formatWeekday } from '#lib/format/format.js';
  import ExamCoach from '#lib/progress/ExamCoach.svelte';

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
    vocab: m.stats_vocab({}, { locale: settings.interfaceLocale }),
    grammar: m.mode_grammar({}, { locale: settings.interfaceLocale }),
    wordsPracticed: m.stats_words_practiced({}, { locale: settings.interfaceLocale }),
    grammarPracticed: m.stats_grammar_practiced({}, { locale: settings.interfaceLocale }),
    repetitions: m.stats_repetitions({}, { locale: settings.interfaceLocale }),
    masteredWords: m.stats_mastered_words({}, { locale: settings.interfaceLocale }),
    nothingYet: m.stats_nothing_yet({}, { locale: settings.interfaceLocale }),
    topWords: m.stats_top_words({}, { locale: settings.interfaceLocale }),
    trickyWords: m.stats_tricky_words({}, { locale: settings.interfaceLocale }),
    noneYet: m.stats_none_yet({}, { locale: settings.interfaceLocale }),
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
    streakRestart: (count: number) => m.streak_restart({ count }, { locale: settings.interfaceLocale }),
    profileTitle: m.profile_title({}, { locale: settings.interfaceLocale }),
    profileHint: m.profile_hint({}, { locale: settings.interfaceLocale }),
    profileNameEdit: m.profile_name_edit({}, { locale: settings.interfaceLocale }),
    profileNameSave: m.profile_name_save({}, { locale: settings.interfaceLocale }),
    profileNameCancel: m.profile_name_cancel({}, { locale: settings.interfaceLocale }),
    profileNameEmpty: m.profile_name_empty({}, { locale: settings.interfaceLocale }),
    achievementsTitle: m.achievements_title({}, { locale: settings.interfaceLocale }),
    achievementsUnlocked: (done: number, total: number) => m.achievements_unlocked({ done: num(done), total: num(total) }, { locale: settings.interfaceLocale }),
    achievementsNone: m.achievements_none({}, { locale: settings.interfaceLocale })
  });

  // Achievement names live here, so the pure model only deals with ids and numbers.
  const achievementLabels = $derived<Record<AchievementId, string>>({
    first_step: m.achievement_first_step({}, { locale: settings.interfaceLocale }),
    vocab_100: m.achievement_vocab_100({}, { locale: settings.interfaceLocale }),
    story_5: m.achievement_story_5({}, { locale: settings.interfaceLocale }),
    reading_5: m.achievement_reading_5({}, { locale: settings.interfaceLocale }),
    grammar_50: m.achievement_grammar_50({}, { locale: settings.interfaceLocale }),
    perfect_10: m.achievement_perfect_10({}, { locale: settings.interfaceLocale }),
    streak_3: m.achievement_streak_3({}, { locale: settings.interfaceLocale }),
    streak_7: m.achievement_streak_7({}, { locale: settings.interfaceLocale }),
    mastered_50: m.achievement_mastered_50({}, { locale: settings.interfaceLocale }),
    all_rounder: m.achievement_all_rounder({}, { locale: settings.interfaceLocale }),
    streak_14: m.achievement_streak_14({}, { locale: settings.interfaceLocale }),
    vocab_500: m.achievement_vocab_500({}, { locale: settings.interfaceLocale }),
    perfect_30: m.achievement_perfect_30({}, { locale: settings.interfaceLocale }),
    reading_15: m.achievement_reading_15({}, { locale: settings.interfaceLocale }),
    story_15: m.achievement_story_15({}, { locale: settings.interfaceLocale }),
    grammar_200: m.achievement_grammar_200({}, { locale: settings.interfaceLocale }),
    mastered_200: m.achievement_mastered_200({}, { locale: settings.interfaceLocale }),
    streak_30: m.achievement_streak_30({}, { locale: settings.interfaceLocale })
  });




  // The whole page is about the language being learned right now; switching it in Settings
  // switches every number here. Tricky words are the ones most often answered wrong (missedWords.ts).
  const vocabProgress = $derived(readVocabularyProgressByLanguage([settings.lang]));
  const grammarProgress = $derived(readGrammarProgressByLanguage([settings.lang]));
  const learningLanguage = $derived(playableLanguages.find((language) => language.code === settings.lang) ?? playableLanguages[0]!);
  const practicedLanguages = $derived([{
    ...learningLanguage,
    vocab: vocabProgress[settings.lang],
    grammar: grammarProgress[settings.lang],
    trickyWords: readMissedWords(settings.lang).sort((left, right) => right.count - left.count).slice(0, 5)
  }]);

  // Milestones and the weekly recap read the activity log and the shared review ledger. Both are
  // loaded on the client so server rendering never sees a half-empty history.
  let allActivity = $state<ActivityEvent[]>([]);
  let allLedger = $state<ReviewLedger>({});
  const activity = $derived(activityFor(allActivity, settings.lang));
  const ledger = $derived(Object.fromEntries(Object.entries(allLedger).filter(([key]) => key.startsWith(`${settings.lang}:`))) as ReviewLedger);
  let shareNote = $state('');
  // The name and the character are edited right here, not in the settings panel.
  let editingName = $state(false);
  let nameDraft = $state('');

  const masteredWords = $derived(vocabProgress[settings.lang]?.masteredWords ?? 0);
  const achievements = $derived(buildAchievements({
    activity,
    bestStreak: settings.streak.bestStreak,
    masteredWords
  }));
  const unlocked = $derived(unlockedCount(achievements));
  // The week as bars (minutes per day) and the modes played most this week.
  const week = $derived(dailyActivity(activity));
  const weekMax = $derived(Math.max(1, ...week.map((day) => day.minutes)));
  const topModes = $derived(modeShares(activity, weekStartTimestamp()).slice(0, 4));
  const dayName = $derived.by(() => {
    const context = settings.formatContext;
    return (start: number) => formatWeekday(context, start, 'short');
  });
  const minutesLabel = (count: number) => m.stats_minutes_short({ count: num(count) }, { locale: settings.interfaceLocale });
  const kindNames = $derived<Record<ActivityKind, string>>({
    vocab: m.stats_vocab({}, { locale: settings.interfaceLocale }),
    grammar: m.mode_grammar({}, { locale: settings.interfaceLocale }),
    reading: m.reading_title({}, { locale: settings.interfaceLocale }),
    story: m.story_title({}, { locale: settings.interfaceLocale }),
    listen: m.story_listen({}, { locale: settings.interfaceLocale }),
    pronunciation: m.mode_pronunciation({}, { locale: settings.interfaceLocale }),
    circle: m.mode_crossword({}, { locale: settings.interfaceLocale }),
    wordle: m.mode_wordle({}, { locale: settings.interfaceLocale }),
    hangman: m.mode_hangman({}, { locale: settings.interfaceLocale }),
    taboo: m.mode_taboo({}, { locale: settings.interfaceLocale }),
    alltag: m.mode_alltag({}, { locale: settings.interfaceLocale }),
    tricky_cleared: ''
  });
  // Each badge shows the learner's own character wearing the piece it brings.
  function rewardLook(id: AchievementId) {
    const item = cosmetics[`achievement_${id}`];
    return { ...(settings.avatar ?? defaultAvatar), [item.part]: item.choice };
  }
  // Finished badges hand out their character items.
  $effect(() => checkAchievementRewards({ bestStreak: settings.streak.bestStreak, masteredWords }));
  const weekly = $derived(buildWeeklyRecap({
    ledger,
    activity,
    bestStreak: settings.streak.bestStreak,
    since: weekStartTimestamp()
  }));

  async function shareWeek() {
    const text = `${labels.weekTitle}: ${labels.weekWords} ${num(weekly.wordsMastered)} · ${labels.weekMinutes} ${num(weekly.minutes)} · ${labels.weekBestStreak} ${num(weekly.bestStreak)}`;
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

  function spellingOf(language: Language, word: string) {
    return wordMetadata[language]?.[word.toLocaleUpperCase()]?.spelling ?? word.toLocaleLowerCase();
  }

  function formatMinutes(minutes: number) {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${num(hours)}h ${formatNumber(settings.formatContext, minutes % 60, { minimumIntegerDigits: 2 })}m` : `${num(minutes)}m`;
  }

  function startNameEdit() {
    nameDraft = settings.firstName;
    editingName = true;
  }
  function submitName(event: SubmitEvent) {
    event.preventDefault();
    const name = nameDraft.trim();
    if (!name) return;
    settings.setFirstName(name);
    nameDraft = settings.firstName;
    editingName = false;
  }
  function cancelNameEdit() {
    editingName = false;
    nameDraft = settings.firstName;
  }

  let streakTimer: number | null = null;
  let repairOffer = $state<StreakRepair | null>(null);
  function refreshStreak() {
    return settings.refreshStreak().then(() => {
      repairOffer = settings.repairCandidate();
    });
  }
  onMount(() => {
    allActivity = readActivity();
    allLedger = readReviewLedger();
    nameDraft = settings.firstName;
    void refreshStreak();
    streakTimer = window.setInterval(() => void refreshStreak(), 30_000);
    return () => {
      if (streakTimer !== null) window.clearInterval(streakTimer);
    };
  });
</script>

<section class="flex-1 min-h-0 m-0 px-[clamp(1rem,5vw,2rem)] pb-[clamp(1rem,5vw,2rem)] pt-[clamp(2.9rem,10vw,3.6rem)] overflow-x-hidden overflow-y-auto bg-transparent" dir={interfaceDirection} lang={settings.interfaceLocale} aria-label={labels.title}>
  <h1 class="m-0 text-center text-base-content font-['DM_Serif_Display',serif] text-[clamp(1.6rem,7vw,2.2rem)] font-normal tracking-[-.03em] leading-none">{labels.title}</h1>

  <!-- Customising: the learner's name and own story character, edited right here; colours and sets
       for Telegram Stars are tried on and bought inside the editor. -->
  <section class="panel-play mt-[1.2rem] px-4 pt-[.9rem] pb-4" aria-labelledby="progress-profile-heading">
    <h2 id="progress-profile-heading" class="m-0 text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.profileTitle}</h2>
    {#if editingName}
      <form class="mt-[.35rem] flex items-center gap-[.3rem]" onsubmit={submitName}>
        <!-- svelte-ignore a11y_autofocus -->
        <input class="progress-name-input" bind:value={nameDraft} type="text" autocomplete="given-name" autocapitalize="words" maxlength={FIRST_NAME_MAX_LENGTH} aria-label={labels.profileNameEdit} autofocus />
        <button type="submit" class="progress-edit" aria-label={labels.profileNameSave} title={labels.profileNameSave}><IconCheck aria-hidden="true" /></button>
        <button type="button" class="progress-edit" aria-label={labels.profileNameCancel} title={labels.profileNameCancel} onclick={cancelNameEdit}><IconClose aria-hidden="true" /></button>
      </form>
    {:else}
      <div class="mt-[.2rem] flex items-center gap-[.35rem]">
        <p class="progress-name">{settings.firstName || labels.profileNameEmpty}</p>
        <button type="button" class="progress-edit" aria-label={labels.profileNameEdit} title={labels.profileNameEdit} onclick={startNameEdit}><IconEdit aria-hidden="true" /></button>
      </div>
    {/if}
    <p class="m-0 mt-[.35rem] mb-[.7rem] text-base-content/65 text-[.6rem] font-bold leading-[1.4]">{labels.profileHint}</p>
    <AvatarEditor value={settings.avatar ?? defaultAvatar} onchange={(next) => settings.setAvatar(next)} shop />
  </section>

  <!-- Not signed in with Telegram yet: the offer to save progress there (and to buy bundles and Pro). -->
  {#if cloudSync.linked === false}
    <div class="mt-4"><SyncHint /></div>
  {/if}

  <ExamCoach />

  <h2 class="progress-group">{m.coach_keep_going({}, { locale: settings.interfaceLocale })}</h2>
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
        <span class="tabular-nums">{num(Math.min(settings.streak.vocabCorrect, settings.streak.vocabularyGoal))}/{num(settings.streak.vocabularyGoal)}</span>
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
    <!-- Signed in with Telegram: WordCircle Pro, which keeps the streak through one missed day a week. -->
    {#if cloudSync.linked === true}<div class="mt-[.7rem]"><ProCard /></div>{/if}


    <dl class="m-0 mt-[.8rem] pt-[.7rem] grid grid-cols-2 border-t border-base-content/[.14] dark:border-base-content/[.22]">
      <div class="grid gap-[.1rem] text-center"><dd class="m-0 order-1 font-['DM_Serif_Display',serif] text-[1.4rem] leading-none text-base-content">{settings.streak.bestStreak}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.streakBest}</dt></div>
      <div class="grid gap-[.1rem] text-center border-s border-base-content/[.14] dark:border-base-content/[.22]"><dd class="m-0 order-1 font-['DM_Serif_Display',serif] text-[1.4rem] leading-none text-base-content">{settings.completedRounds}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.completed}</dt></div>
    </dl>
  </section>

  <!-- Weekly recap: what actually happened this week, not a guessed average. -->
  <section class="panel-play mt-4 px-4 pt-[.9rem] pb-4" aria-labelledby="progress-week-heading">
    <h2 id="progress-week-heading" class="m-0 text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.weekTitle}</h2>
    <figure class="week-chart">
      <figcaption>{m.stats_week_chart({}, { locale: settings.interfaceLocale })}</figcaption>
      <!-- Bars carry minutes; only today and the busiest day get a number, the rest show it on hover. -->
      <div class="week-bars" aria-hidden="true">
        {#each week as day (day.start)}
          <div class="week-bar" class:today={day.today} title={`${dayName(day.start)}: ${minutesLabel(day.minutes)}`}>
            <span class="week-value tabular-nums">{#if day.minutes > 0 && (day.today || day.minutes === weekMax)}{num(day.minutes)}{/if}</span>
            <span class="week-fill" class:empty={day.minutes === 0} style:height={`${day.minutes > 0 ? Math.max(6, (day.minutes / weekMax) * 100) : 0}%`}></span>
            <span class="week-day">{dayName(day.start)}</span>
          </div>
        {/each}
      </div>
      <table class="sr-only">
        <caption>{m.stats_week_chart({}, { locale: settings.interfaceLocale })}</caption>
        <tbody>{#each week as day (day.start)}<tr><th scope="row">{dayName(day.start)}</th><td>{minutesLabel(day.minutes)}</td></tr>{/each}</tbody>
      </table>
    </figure>
    <dl class="m-0 mt-[.6rem] grid grid-cols-2 gap-x-4 gap-y-[.55rem]">
      <div class="grid gap-[.1rem]"><dd class="m-0 order-1 font-['DM_Serif_Display',serif] text-[1.5rem] leading-none text-base-content">{num(weekly.wordsMastered)}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.weekWords}</dt></div>
      <div class="grid gap-[.1rem]"><dd class="m-0 order-1 font-['DM_Serif_Display',serif] text-[1.5rem] leading-none text-base-content">{num(weekly.minutes)}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.weekMinutes}</dt></div>
      <div class="grid gap-[.1rem]"><dd class="m-0 order-1 font-['DM_Serif_Display',serif] text-[1.5rem] leading-none text-base-content">{num(weekly.bestStreak)}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.weekBestStreak}</dt></div>
      <div class="grid gap-[.1rem] min-w-0"><dd class="m-0 order-1 truncate text-base-content text-[.8rem] font-extrabold leading-[1.9]">{weekly.hardestWord ?? '—'}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.weekHardest}</dt></div>
    </dl>
    {#if topModes.length > 0}
      <p class="m-0 mt-[.7rem] text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{m.stats_most_played({}, { locale: settings.interfaceLocale })}</p>
      <ul class="mode-shares">
        {#each topModes as mode (mode.kind)}
          <li><span class="mode-share-name">{kindNames[mode.kind]}</span><span class="mode-share-bar" aria-hidden="true"><span style:width={`${Math.round(mode.share * 100)}%`}></span></span><b class="tabular-nums">{num(mode.count)}</b></li>
        {/each}
      </ul>
    {/if}
    {#if weekly.wordsMastered === 0 && weekly.minutes === 0}
      <p class="m-0 mt-[.5rem] text-base-content/55 text-[.62rem] font-bold">{labels.weekEmpty}</p>
    {/if}
    <button type="button" class="btn-play btn-play-soft btn-play-sm mt-[.7rem]" onclick={shareWeek}>{labels.weekShare}</button>
    <p class="m-0 mt-[.35rem] text-success text-[.58rem] font-bold" aria-live="polite">{shareNote}</p>
  </section>

  <!-- Your words in the learning language: the tricky ones to repeat and the most practised -->
  <section class="panel-play mt-4 px-4 pt-[.9rem] pb-4" aria-labelledby="progress-words-heading">
    <div class="flex items-baseline justify-between gap-3">
      <h2 id="progress-words-heading" class="m-0 text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{m.coach_words({ language: learningLanguage.label }, { locale: settings.interfaceLocale })}</h2>
      {#if vocabProgress[settings.lang]}<span class="text-base-content/55 text-[.58rem] font-extrabold tabular-nums">{labels.wordsPracticed}: {num(vocabProgress[settings.lang]!.wordsPracticed)}</span>{/if}
    </div>
    <div class="grid grid-cols-2 gap-4 mt-[.6rem]">
      {#each [{ heading: labels.trickyWords, words: practicedLanguages[0]!.trickyWords.map((entry) => ({ word: entry.word, count: entry.count })) }, { heading: labels.topWords, words: vocabProgress[settings.lang]?.mostRepeated.map((entry) => ({ word: entry.word, count: entry.repetitions })) ?? [] }] as list (list.heading)}
        <div class="min-w-0">
          <h3 class="m-0 text-base-content/60 text-[.54rem] font-extrabold tracking-[.08em] uppercase">{list.heading}</h3>
          {#if list.words.length > 0}
            <ol class="m-0 mt-[.3rem] p-0 list-none grid gap-[.2rem]">
              {#each list.words as entry (entry.word)}
                <li class="flex items-center justify-between gap-2 text-base-content text-[.68rem] font-bold"><span class="truncate" lang={settings.lang}>{spellingOf(settings.lang, entry.word)}</span><span class="text-base-content/50 tabular-nums">{num(entry.count)}×</span></li>
              {/each}
            </ol>
          {:else}
            <p class="m-0 mt-[.3rem] text-base-content/50 text-[.64rem] font-bold">{labels.noneYet}</p>
          {/if}
        </div>
      {/each}
    </div>
    {#if practicedLanguages[0]!.trickyWords.length}<a class="btn-play btn-play-soft btn-play-sm mt-[.7rem]" href="/repeat">{m.coach_repeat({}, { locale: settings.interfaceLocale })}</a>{/if}
  </section>

  <!-- Achievements: badges earned from real practice. -->
  <section class="panel-play mt-4 px-4 pt-[.9rem] pb-4" aria-labelledby="progress-achievements-heading">
    <div class="flex items-baseline justify-between gap-3">
      <h2 id="progress-achievements-heading" class="m-0 text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.achievementsTitle}</h2>
      <span class="text-base-content/55 text-[.58rem] font-extrabold tabular-nums">{labels.achievementsUnlocked(unlocked, achievements.length)}</span>
    </div>
    <ul class="achievement-grid">
      {#each achievements as achievement (achievement.id)}
        <li class="achievement" class:done={achievement.done} title={m.stats_reward_item({}, { locale: settings.interfaceLocale })}>
          <span class="achievement-look" aria-hidden="true"><StoryCharacter id="kumar" avatar={rewardLook(achievement.id)} mood={achievement.done ? 'happy' : 'curious'} /></span>
          <span class="achievement-label">{#if achievement.done}<IconCheck class="achievement-check" aria-hidden="true" />{/if}{achievementLabels[achievement.id]}</span>
          <span class="achievement-meter" aria-hidden="true"><span style:width={`${Math.round((achievement.value / achievement.target) * 100)}%`}></span></span>
          <span class="achievement-progress tabular-nums">{num(achievement.value)}/{num(achievement.target)}</span>
        </li>
      {/each}
    </ul>
    {#if unlocked === 0}<p class="m-0 mt-[.5rem] text-base-content/55 text-[.6rem] font-bold leading-[1.4]">{labels.achievementsNone}</p>{/if}
  </section>

</section>

<style>
  .pip { border: 2px solid var(--play-line); border-radius: 5px; }
  .progress-group { margin: 1.6rem 0 0; color: var(--color-accent); font-size: .62rem; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; text-align: center; }
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
  .progress-name { margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--play-ink,#172a45);font-family:'DM Serif Display',serif;font-size:1.35rem;line-height:1.1; }
  .progress-name-input { min-width:0;flex:1;min-height:2rem;padding:.15rem .5rem;border:2px solid var(--play-line);border-radius:.55rem;background:#fffdf7;color:#172a45;font-size:.78rem;font-weight:800;outline:0; }
  .progress-edit { display:grid;place-items:center;flex:none;width:1.7rem;height:1.7rem;padding:0;border:1.5px solid var(--play-line);border-radius:999px;background:transparent;color:var(--play-ink,#172a45);cursor:pointer; }
  .progress-edit :global(svg) { width:1rem;height:1rem; }
  .progress-edit:focus-visible,.progress-name-input:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }
  .week-chart { margin:.7rem 0 .2rem; }
  .week-chart figcaption { color:rgba(23,42,69,.6);font-size:.54rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase; }
  .week-bars { display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.35rem;height:7rem;margin-top:.45rem;padding-bottom:1.1rem;position:relative;background:linear-gradient(rgba(23,42,69,.1),rgba(23,42,69,.1)) left bottom 1.1rem / 100% 1px no-repeat; }
  .week-bar { position:relative;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;min-width:0;cursor:default; }
  .week-fill { width:min(100%,1.6rem);border-radius:4px 4px 0 0;background:#e6a527;transition:height .45s cubic-bezier(.23,1,.32,1); }
  .week-bar.today .week-fill { background:#c9832f; }
  .week-value { margin-bottom:.15rem;color:var(--play-ink,#172a45);font-size:.56rem;font-weight:900;line-height:1; }
  .week-day { position:absolute;bottom:-1.1rem;color:rgba(23,42,69,.55);font-size:.52rem;font-weight:800;white-space:nowrap; }
  .week-bar.today .week-day { color:var(--play-ink,#172a45);font-weight:900; }
  .mode-shares { margin:.35rem 0 0;padding:0;list-style:none;display:grid;gap:.3rem; }
  .mode-shares li { display:grid;grid-template-columns:minmax(5rem,7.5rem) 1fr auto;align-items:center;gap:.5rem;font-size:.6rem;font-weight:800;color:var(--play-ink,#172a45); }
  .mode-share-name { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
  .mode-share-bar { height:.4rem;border-radius:999px;background:rgba(23,42,69,.08);overflow:hidden; }
  .mode-share-bar span { display:block;height:100%;border-radius:inherit;background:#e6a527; }
  .achievement-look { grid-row:1 / span 3;display:block;width:2.6rem;height:3.25rem; }
  .achievement-look :global(.story-character) { width:100%;height:100%; }
  .achievement-meter { display:block;height:.3rem;border-radius:999px;background:rgba(23,42,69,.1);overflow:hidden; }
  .achievement-meter span { display:block;height:100%;border-radius:inherit;background:#e6a527; }
  .achievement.done .achievement-meter span { background:#34824d; }
  .achievement-label :global(.achievement-check) { width:.8rem;height:.8rem;margin-inline-end:.2rem;vertical-align:-.12rem;color:#34824d; }
  @media (prefers-reduced-motion:reduce) { .week-fill { transition:none; } }
  :global(html.dark) .week-bars { background-image:linear-gradient(rgba(255,253,247,.16),rgba(255,253,247,.16)); }
  :global(html.dark) .mode-share-bar,:global(html.dark) .achievement-meter { background:rgba(255,253,247,.14); }
  :global(html.dark) .week-bar.today .week-fill { background:#f0c06a; }
  .achievement-grid { margin:.6rem 0 0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(10.5rem,1fr));gap:.35rem; }
  .achievement { display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto auto;column-gap:.45rem;row-gap:.2rem;align-items:center;padding:.4rem .5rem;border:1.5px solid var(--play-line);border-radius:.6rem;opacity:.7; }
  .achievement.done { opacity:1;background:rgba(230,165,39,.12);border-color:#e6a527; }
  .achievement-label { color:var(--play-ink,#172a45);font-size:.62rem;font-weight:800;line-height:1.25; }
  .achievement-progress { color:var(--play-ink,#172a45);opacity:.55;font-size:.55rem;font-weight:800; }
  :global(html.dark) .progress-name-input { border-color:#0b1626;background:#2b4a70;color:#fffdf7; }
  :global(html.dark) .achievement { border-color:rgba(255,253,247,.2); }
  :global(html.dark) .achievement.done { border-color:#e6a527;background:rgba(230,165,39,.16); }
</style>
