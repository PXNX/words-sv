<svelte:head>
  <title>Words-SV - Learn German</title>
  <meta name="description" content="Practice German vocabulary, grammar and stories with interactive exercises." />
  <meta property="og:title" content="Words-SV - Learn German" />
  <meta property="og:description" content="Practice German vocabulary, grammar and stories with interactive exercises." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://words-sv.vercel.app/" />
  <meta property="og:image" content="https://words-sv.vercel.app/pwa-512x512.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Words-SV - Learn German" />
  <meta name="twitter:description" content="Practice German vocabulary, grammar and stories with interactive exercises." />
  <meta name="twitter:image" content="https://words-sv.vercel.app/pwa-512x512.png" />
</svelte:head>
<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { onMount } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import WelcomeFlow from '#lib/app/WelcomeFlow.svelte';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import InstallAppHint from '#lib/pwa/InstallAppHint.svelte';
  import UpdateAppHint from '#lib/pwa/UpdateAppHint.svelte';
  import { playSoundEffect } from '#lib/feedback/sounds.js';
  import { playableLanguages, type Language } from '#lib/data/vocabulary.js';
  import { REPAIR_WORDS, lilithFace, lilithMood, modeDone, type StreakMode, type StreakRepair } from '#lib/streak/clientStreak.js';
  import TodayBadge from '#lib/streak/TodayBadge.svelte';
  import StreakStrip from '#lib/streak/StreakStrip.svelte';
  import { readEvents } from '#lib/progress/eventLog.js';
  import { featureStats } from '#lib/progress/events.js';
  import { labelKeys, type FeatureKey } from '#lib/grammar/taxonomy.js';
  import { buildTodayPlan, estimatedMinutes, type TodayPlan, type TodayReading } from '#lib/today/todayPlan.js';
  import { readingCatalog } from '#lib/story/readingCatalog.js';
  import { readDueVocabulary } from '#lib/vocab/spacedRepetition.js';
  import { readMissedWords } from '#lib/story/missedWords.js';
  import { dueReviewEntries } from '#lib/review/ledger.js';
  import IconSettings from '~icons/material-symbols/settings-rounded';
  import IconChevronRight from '~icons/material-symbols/chevron-right-rounded';
  import IconDictionary from '~icons/material-symbols/menu-book-rounded';
  import IconCrossword from '~icons/material-symbols/crossword-rounded';
  import IconSpellcheck from '~icons/material-symbols/spellcheck-rounded';
  import IconQuiz from '~icons/material-symbols/quiz-rounded';
  import IconHangman from '~icons/material-symbols/extension-rounded';
  import IconMic from '~icons/material-symbols/mic-rounded';
  import IconEmoji from '~icons/material-symbols/sentiment-satisfied-rounded';
  import IconEditNote from '~icons/material-symbols/edit-note-rounded';
  import IconFactCheck from '~icons/material-symbols/fact-check-rounded';
  import IconSort from '~icons/material-symbols/sort-rounded';
  import IconForms from '~icons/material-symbols/text-fields-rounded';
  import IconPen from '~icons/material-symbols/ink-pen-rounded';
  import IconArticle from '~icons/material-symbols/article-rounded';
  import IconSwapHoriz from '~icons/material-symbols/swap-horiz-rounded';
  import IconStory from '~icons/material-symbols/auto-stories-rounded';
  import IconMenuBook from '~icons/material-symbols/menu-book-rounded';
  import IconHeadphones from '~icons/material-symbols/headphones-rounded';
  import IconExplore from '~icons/material-symbols/explore-rounded';
  import IconForum from '~icons/material-symbols/forum-rounded';

  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));

  const ROOT_ONBOARDING_KEY = 'wordcircle-root-onboarding-v1';

  let rootOnboarding = $state(false);
  let streakTimer: number | null = null;
  // Existing users who finished the language step before names existed still get asked once.
  const needsName = $derived(!rootOnboarding && !settings.firstName);
  // Keeps the welcome flow open through its name, character and finale steps after the language.
  let pickingLook = $state(false);

  // Letter tiles drifting around the cast: decoration only, like loose tiles on a game table.
  const FLOATING_TILES = [
    { letter: 'W', x: 4, y: 18, r: -12 }, { letter: 'O', x: 88, y: 8, r: 9 }, { letter: 'R', x: 12, y: 62, r: 6 },
    { letter: 'T', x: 82, y: 58, r: -8 }, { letter: 'A', x: 46, y: 2, r: 14 }, { letter: 'Ö', x: 94, y: 36, r: -4 }
  ];
  const labels = $derived({
    settings: m.settings({}, { locale: settings.interfaceLocale }),
    homeTitle: m.home_title({}, { locale: settings.interfaceLocale }),
    homeCircle: m.home_circle({}, { locale: settings.interfaceLocale }),
    homeWordle: m.home_wordle({}, { locale: settings.interfaceLocale }),
    homeVocab: m.home_vocab({}, { locale: settings.interfaceLocale }),
    homeGrammar: m.home_grammar({}, { locale: settings.interfaceLocale }),
    modeDefinitions: m.mode_definitions({}, { locale: settings.interfaceLocale }),
    homeDefinitions: m.home_definitions({}, { locale: settings.interfaceLocale }),
    homeHangman: m.home_hangman({}, { locale: settings.interfaceLocale }),
    homePronunciation: m.home_pronunciation({}, { locale: settings.interfaceLocale }),
    conversation: m.mode_conversation({}, { locale: settings.interfaceLocale }),
    homeConversation: m.home_conversation({}, { locale: settings.interfaceLocale }),
    homeAlltag: m.home_alltag({}, { locale: settings.interfaceLocale }),
    homeFalseFriends: m.home_false_friends({}, { locale: settings.interfaceLocale }),
    homeDetermine: m.home_determine({}, { locale: settings.interfaceLocale }),
    homeOrder: m.home_order({}, { locale: settings.interfaceLocale }),
    homeContinueReading: (title: string) => m.home_continue_reading({ title }, { locale: settings.interfaceLocale }),
    homeContinueStory: (title: string) => m.home_continue_story({ title }, { locale: settings.interfaceLocale }),
    homePlay: m.home_play({}, { locale: settings.interfaceLocale }),
    modeCrossword: m.mode_crossword({}, { locale: settings.interfaceLocale }),
    modeWordle: m.mode_wordle({}, { locale: settings.interfaceLocale }),
    modeGrammar: m.mode_grammar({}, { locale: settings.interfaceLocale }),
    modeHangman: m.mode_hangman({}, { locale: settings.interfaceLocale }),
    pronunciation: m.mode_pronunciation({}, { locale: settings.interfaceLocale }),
    alltag: m.mode_alltag({}, { locale: settings.interfaceLocale }),
    wordQuiz: m.mode_word_quiz({}, { locale: settings.interfaceLocale }),
    modeSentence: m.mode_sentence({}, { locale: settings.interfaceLocale }),
    homeSentence: m.home_sentence({}, { locale: settings.interfaceLocale }),
    modeFullText: m.mode_fullText({}, { locale: settings.interfaceLocale }),
    homeFullText: m.home_fullText({}, { locale: settings.interfaceLocale }),
    gamesGroup: m.group_games({}, { locale: settings.interfaceLocale }),
    sentenceGroup: m.group_sentence({}, { locale: settings.interfaceLocale }),
    vocabularyGroup: m.group_vocabulary({}, { locale: settings.interfaceLocale }),
    grammarGroup: m.group_grammar({}, { locale: settings.interfaceLocale }),
    grammarFill: m.grammar_fill({}, { locale: settings.interfaceLocale }),
    grammarDetermine: m.grammar_determine({}, { locale: settings.interfaceLocale }),
    grammarOrder: m.grammar_order({}, { locale: settings.interfaceLocale }),
    grammarFalseFriends: m.grammar_false_friends({}, { locale: settings.interfaceLocale }),
    streakModeDone: m.streak_mode_done({}, { locale: settings.interfaceLocale }),
    story: m.story_title({}, { locale: settings.interfaceLocale }),
    homeStory: m.story_home({}, { locale: settings.interfaceLocale }),
    reading: m.reading_title({}, { locale: settings.interfaceLocale }),
    homeReading: m.reading_home({}, { locale: settings.interfaceLocale }),
    listen: m.story_listen({}, { locale: settings.interfaceLocale }),
    homeListen: m.story_listen_home({}, { locale: settings.interfaceLocale }),
    homeCast: m.home_cast({}, { locale: settings.interfaceLocale }),
    petLilith: m.pet_lilith({}, { locale: settings.interfaceLocale }),
    todayKicker: m.today_kicker({}, { locale: settings.interfaceLocale }),
    todayDone: m.today_done({}, { locale: settings.interfaceLocale }),
    todayStart: m.today_start({}, { locale: settings.interfaceLocale }),
    todayDue: (count: number, minutes: number) => m.today_due({ count, minutes }, { locale: settings.interfaceLocale }),
    todayReading: (title: string, number: number) => m.today_reading({ title, number }, { locale: settings.interfaceLocale }),
    todayStreak: (count: number) => m.today_streak({ count }, { locale: settings.interfaceLocale }),
    todayMarked: (count: number) => m.today_marked({ count }, { locale: settings.interfaceLocale }),
    repeatDue: (count: number) => m.repeat_due({ count }, { locale: settings.interfaceLocale }),
    streakRepairHint: (count: number, need: number) => m.streak_repair_hint({ count, need }, { locale: settings.interfaceLocale }),
    streakRepairCta: m.streak_repair_cta({}, { locale: settings.interfaceLocale }),
    dailyChallenge: m.daily_challenge({}, { locale: settings.interfaceLocale }),
    imprint: m.legal_imprint({}, { locale: settings.interfaceLocale }),
    privacy: m.legal_privacy({}, { locale: settings.interfaceLocale }),
    terms: m.legal_terms({}, { locale: settings.interfaceLocale }),
    legal: m.legal_nav({}, { locale: settings.interfaceLocale })
  });

  // The welcome flow keeps itself on screen until its finale; the language is stored as soon as
  // it is picked, so a reload mid-way resumes at the name.
  function chooseLearningLanguage(language: Language) {
    settings.setLang(language);
    localStorage.setItem(ROOT_ONBOARDING_KEY, 'complete');
    pickingLook = true;
  }
  function finishWelcome() {
    rootOnboarding = false;
    pickingLook = false;
  }
  let petting = $state(false);
  function petLilith() {
    playSoundEffect(settings.sound, 'purr');
    petting = false;
    requestAnimationFrame(() => (petting = true));
  }
  // Only the modes that already counted today stand out (a green edge and a small check); the rest
  // stay calm instead of every card asking to be done.
  function streakClass(kind: StreakMode | null): string {
    return kind && modeDone(settings.streak, kind) ? 'streak-done' : 'streak-none';
  }
  let todayPlan = $state<TodayPlan | null>(null);
  let repairOffer = $state<StreakRepair | null>(null);
  const lilith = $derived(lilithMood(settings.streak, repairOffer));
  let wordDue = $state(0);
  let grammarDue = $state(0);
  let readingDue = $state(0);
  type HomeContinue = { href: string; label: string; detail: string };
  let homeContinue = $state<HomeContinue[]>([]);

  // The weakest grammar feature of the last 30 days, read once from the event log (IndexedDB).
  let weakFeature = $state<{ feature: FeatureKey; accuracy: number; errors: number } | null>(null);
  function loadWeakFeature() {
    void readEvents(Date.now() - 30 * 24 * 60 * 60 * 1000).then((events) => {
      weakFeature = featureStats(events.filter((event) => event.lang === settings.lang))[0] ?? null;
      refreshToday();
    });
  }
  // The next best action is derived from local progress only: due reviews first, then an unfinished
  // text, the daily streak and finally the words marked while reading.
  function refreshToday() {
    if (typeof localStorage === 'undefined') return;
    repairOffer = settings.repairCandidate();
    wordDue = readDueVocabulary(settings.lang, settings.vocabularyLevel);
    grammarDue = dueReviewEntries(settings.lang).filter(({ entry }) => entry.source === 'grammar').length;
    const reading = readingToday();
    readingDue = reading ? reading.total - reading.answered : 0;
    todayPlan = buildTodayPlan({
      dueWords: wordDue,
      markedWords: readMissedWords(settings.lang).length,
      reading,
      streakQualified: settings.streak.qualified,
      vocabCorrect: settings.streak.vocabCorrect,
      vocabularyGoal: settings.streak.vocabularyGoal,
      weakFeature
    });
    const next: HomeContinue[] = [];
    // When the Today card already points into the text, a second link would only repeat it.
    if (reading && todayPlan.kind !== 'reading') {
      next.push({
        href: `/reading?text=${encodeURIComponent(reading.id)}`,
        label: labels.homeContinueReading(reading.title),
        detail: `${num(reading.answered)}/${num(reading.total)}`
      });
    }
    const story = storyToday();
    if (story) {
      next.push({ href: '/stories', label: labels.homeContinueStory(story.title), detail: `${num(story.revealed)}/${num(story.total)}` });
    }
    homeContinue = next;
  }
  function storyToday(): { title: string; revealed: number; total: number } | null {
    try {
      const fingerprint = `${settings.lang}|${settings.vocabularyLevel}|${settings.includeLowerVocabulary}`;
      const parsed = JSON.parse(localStorage.getItem('wordcircle-story-progress-v2') ?? 'null') as {
        fingerprint?: string;
        story?: { title?: Record<string, string>; beats?: unknown[] };
        revealed?: number;
      } | null;
      if (!parsed || parsed.fingerprint !== fingerprint || !parsed.story || !Array.isArray(parsed.story.beats)) return null;
      const total = parsed.story.beats.length;
      const revealed = Math.max(1, Math.min(total, Number(parsed.revealed) || 1));
      if (revealed >= total) return null;
      const title = parsed.story.title?.[settings.lang];
      if (typeof title !== 'string' || !title) return null;
      return { title, revealed, total };
    } catch {
      return null;
    }
  }
  function readingToday(): TodayReading | null {
    try {
      const fingerprint = `${settings.lang}|${settings.vocabularyLevel}|${settings.includeLowerVocabulary}`;
      const parsed = JSON.parse(localStorage.getItem('wordcircle-reading-progress-v1') ?? 'null') as { fingerprint?: string; id?: string; solved?: Record<string, Record<number, true>> } | null;
      if (!parsed || parsed.fingerprint !== fingerprint || typeof parsed.id !== 'string') return null;
      const item = readingCatalog(settings.lang, settings.vocabularyLevel, settings.includeLowerVocabulary, settings.firstName || 'du').find((entry) => entry.id === parsed.id);
      if (!item || item.questions.length === 0) return null;
      const solved = parsed.solved?.[item.id] ?? {};
      const answered = item.questions.filter((_, index) => solved[index]).length;
      return answered < item.questions.length ? { id: item.id, title: item.title, answered, total: item.questions.length } : null;
    } catch {
      return null;
    }
  }
  function todayTitle(plan: TodayPlan): string {
    if (plan.kind === 'due') return labels.todayDue(plan.count, estimatedMinutes(plan.count));
    if (plan.kind === 'reading') return labels.todayReading(plan.title, plan.answered + 1);
    if (plan.kind === 'streak') return labels.todayStreak(plan.count);
    if (plan.kind === 'marked') return labels.todayMarked(plan.count);
    if (plan.kind === 'feature') {
      const keys = labelKeys(plan.feature);
      const messages = m as unknown as Record<string, ((inputs: object, options: { locale: string }) => string) | undefined>;
      const name = [messages[keys.category], messages[keys.value]].map((message) => message?.({}, { locale: settings.interfaceLocale })).filter(Boolean).join(' · ');
      return m.today_feature({ feature: name || plan.feature }, { locale: settings.interfaceLocale });
    }
    return labels.todayDone;
  }

  onMount(() => {
    if (!settings.hasStoredInterfaceLocale()) settings.applyPreferredInterfaceLocale();
    if (localStorage.getItem(ROOT_ONBOARDING_KEY) !== 'complete') rootOnboarding = true;
    // Learners without a name go through the rest of the welcome flow, finale included.
    pickingLook = rootOnboarding || !settings.firstName;
    void settings.refreshStreak().then(refreshToday);
    loadWeakFeature();
    streakTimer = window.setInterval(() => void settings.refreshStreak().then(refreshToday), 30_000);
    return () => {
      if (streakTimer !== null) window.clearInterval(streakTimer);
    };
  });
</script>

<section class="home-view" dir={interfaceDirection} lang={settings.interfaceLocale} aria-label={labels.homeTitle}>
  {#if rootOnboarding || needsName || pickingLook}
    <WelcomeFlow start={rootOnboarding ? 'hello' : 'name'} onlanguage={chooseLearningLanguage} onfinish={finishWelcome} />
  {:else}
    <!-- Side, main and foot are invisible wrappers on phones (display: contents); a landscape tablet
         turns them into a sticky left column (cast + daily card) beside the game groups. -->
    <div class="home-side">
    <UpdateAppHint />
    <InstallAppHint />
    <header class="home-header">
      <div class="home-family"><span class="home-family-people" aria-hidden="true"><StoryCharacter id="mia" /><StoryCharacter id="tom" /></span><button type="button" class="home-lilith-pet" class:petting onclick={petLilith} onanimationend={() => (petting = false)} aria-label={labels.petLilith}><span class="home-lilith" class:loving={lilith === 'loving'}><StoryCharacter id="lilith" mood={petting && lilith !== 'loving' ? 'happy' : lilithFace(lilith)} />{#if lilith === 'loving'}<span class="home-lilith-hearts" aria-hidden="true"><span>♥</span><span>♥</span></span>{/if}</span></button></div>
      <span class="home-tiles" aria-hidden="true">{#each FLOATING_TILES as tile, index}<i style={`--x:${tile.x}%;--y:${tile.y}%;--d:${index * 0.7}s;--r:${tile.r}deg`}>{tile.letter}</i>{/each}</span>
      <h1 class="home-title" aria-label={labels.homeTitle}>{#each [...labels.homeTitle] as letter, index}<span aria-hidden="true" style={`--i:${index}`}>{letter === ' ' ? '\u00a0' : letter}</span>{/each}</h1><span class="home-cast-note">{labels.homeCast}</span>
    </header>
    <!-- One daily card: today's challenge, its reward and the next steps, instead of three stacked blocks -->
    <section class="panel-play home-daily" aria-label={labels.dailyChallenge}>
      <StreakStrip />
      {#if repairOffer}
        <div class="home-daily-row home-repair">
          <p>{labels.streakRepairHint(repairOffer.streakCount, REPAIR_WORDS)}</p>
          <a class="btn-play btn-play-ink btn-play-sm" href="/vocab?repair=1">{labels.streakRepairCta}</a>
        </div>
      {/if}
      {#if todayPlan}
        <a class="home-daily-row home-today" href={todayPlan.href}>
          <span class="home-today-icon" aria-hidden="true"><IconExplore /></span>
          <span class="home-today-copy">
            <small>{labels.todayKicker}</small>
            <strong>{todayTitle(todayPlan)}</strong>
          </span>
          <span class="home-today-start">{labels.todayStart}<IconChevronRight aria-hidden="true" class="rtl:rotate-180" /></span>
        </a>
      {/if}
      {#each homeContinue as item (item.href)}
        <a class="home-daily-row home-continue" href={item.href}>
          <span class="home-continue-label">{item.label}</span>
          <span class="home-continue-detail">{item.detail}</span>
          <IconChevronRight class="home-continue-arrow rtl:rotate-180" aria-hidden="true" />
        </a>
      {/each}
    </section>
    </div>
    <div class="home-main">
    <h2 class="home-group-heading">{labels.gamesGroup}</h2>
    <div class="home-games home-games--games">
      <div class="home-card-slot"><a class="card-play {streakClass('circle')}" href="/circle"><span class="home-icon" aria-hidden="true"><IconCrossword /></span><h2>{labels.modeCrossword}</h2><p>{labels.homeCircle}</p><TodayBadge done={modeDone(settings.streak, 'circle')} label={labels.streakModeDone} /></a></div>
      <a class="card-play {streakClass('definitions')}" href="/circle/definitions"><span class="home-icon" aria-hidden="true"><IconFactCheck /></span><h2>{labels.modeDefinitions}</h2><p>{labels.homeDefinitions}</p><TodayBadge done={modeDone(settings.streak, 'definitions')} label={labels.streakModeDone} /></a>
      <div class="home-card-slot"><a class="card-play {streakClass('wordle')}" href="/wordle"><span class="home-icon" aria-hidden="true"><IconSpellcheck /></span><h2>{labels.modeWordle}</h2><p>{labels.homeWordle}</p><TodayBadge done={modeDone(settings.streak, 'wordle')} label={labels.streakModeDone} /></a></div>
      <div class="home-card-slot"><a class="card-play {streakClass('hangman')}" href="/hangman"><span class="home-icon" aria-hidden="true"><IconHangman /></span><h2>{labels.modeHangman}</h2><p>{labels.homeHangman}</p><TodayBadge done={modeDone(settings.streak, 'hangman')} label={labels.streakModeDone} /></a></div>
    </div>
    <h2 class="home-group-heading">{labels.story}</h2>
    <div class="home-games">
      <a class="card-play {streakClass('story')}" href="/stories"><span class="home-icon" aria-hidden="true"><IconStory /></span><h2>{labels.story}</h2><p>{labels.homeStory}</p><TodayBadge done={modeDone(settings.streak, 'story')} label={labels.streakModeDone} /></a>
      <a class="card-play {streakClass('reading')}" href="/reading"><span class="home-icon" aria-hidden="true"><IconMenuBook /></span><h2>{labels.reading}</h2><p>{labels.homeReading}</p>{#if readingDue > 0}<span class="home-due-badge">{labels.repeatDue(readingDue)}</span>{/if}<TodayBadge done={modeDone(settings.streak, 'reading')} label={labels.streakModeDone} /></a>
      <a class="card-play {streakClass('listen')}" href="/listen"><span class="home-icon" aria-hidden="true"><IconHeadphones /></span><h2>{labels.listen}</h2><p>{labels.homeListen}</p><TodayBadge done={modeDone(settings.streak, 'listen')} label={labels.streakModeDone} /></a>
      <a class="card-play {streakClass(null)}" href="/conversation"><span class="home-icon" aria-hidden="true"><IconForum /></span><h2>{labels.conversation}</h2><p>{labels.homeConversation}</p></a>
    </div>
    <h2 class="home-group-heading">{labels.sentenceGroup}</h2>
    <div class="home-games">
      <a class="card-play {streakClass('sentence')}" href="/sentence"><span class="home-icon" aria-hidden="true"><IconPen /></span><h2>{labels.modeSentence}</h2><p>{labels.homeSentence}</p><TodayBadge done={modeDone(settings.streak, 'sentence')} label={labels.streakModeDone} /></a>
      <a class="card-play {streakClass('sentence')}" href="/sentence/full"><span class="home-icon" aria-hidden="true"><IconArticle /></span><h2>{labels.modeFullText}</h2><p>{labels.homeFullText}</p><TodayBadge done={modeDone(settings.streak, 'sentence')} label={labels.streakModeDone} /></a>
    </div>
    <h2 class="home-group-heading">{labels.vocabularyGroup}</h2>
    <div class="home-games">
      <a class="card-play {streakClass('vocab')}" href="/vocab"><span class="home-icon" aria-hidden="true"><IconQuiz /></span><h2>{labels.wordQuiz}</h2><p>{labels.homeVocab}</p>{#if wordDue > 0}<span class="home-due-badge">{labels.repeatDue(wordDue)}</span>{/if}<TodayBadge done={modeDone(settings.streak, 'vocab')} label={labels.streakModeDone} /></a>
      <a class="card-play {streakClass('pronunciation')}" href="/pronunciation"><span class="home-icon" aria-hidden="true"><IconMic /></span><h2>{labels.pronunciation}</h2><p>{labels.homePronunciation}</p><TodayBadge done={modeDone(settings.streak, 'pronunciation')} label={labels.streakModeDone} /></a>
      <a class="card-play {streakClass('alltag')}" href="/alltag"><span class="home-icon" aria-hidden="true"><IconEmoji /></span><h2>{labels.alltag}</h2><p>{labels.homeAlltag}</p><TodayBadge done={modeDone(settings.streak, 'alltag')} label={labels.streakModeDone} /></a>
      <a class="card-play" href="/dictionary"><span class="home-icon" aria-hidden="true"><IconDictionary /></span><h2>{m.dictionary_title({}, { locale: settings.interfaceLocale })}</h2><p>{m.home_dictionary({}, { locale: settings.interfaceLocale })}</p></a>
      <a class="card-play {streakClass('grammar')}" href="/grammar?mode=falsefriends"><span class="home-icon" aria-hidden="true"><IconSwapHoriz /></span><h2>{labels.grammarFalseFriends}</h2><p>{labels.homeFalseFriends}</p><TodayBadge done={modeDone(settings.streak, 'grammar')} label={labels.streakModeDone} /></a>
    </div>
    <h2 class="home-group-heading">{labels.grammarGroup}</h2>
    <div class="home-games">
      <a class="card-play {streakClass('grammar')}" href="/grammar?mode=fill"><span class="home-icon" aria-hidden="true"><IconEditNote /></span><h2>{labels.grammarFill}</h2><p>{labels.homeGrammar}</p>{#if grammarDue > 0}<span class="home-due-badge">{labels.repeatDue(grammarDue)}</span>{/if}<TodayBadge done={modeDone(settings.streak, 'grammar')} label={labels.streakModeDone} /></a>
      <a class="card-play {streakClass('grammar')}" href="/grammar?mode=determine"><span class="home-icon" aria-hidden="true"><IconFactCheck /></span><h2>{labels.grammarDetermine}</h2><p>{labels.homeDetermine}</p><TodayBadge done={modeDone(settings.streak, 'grammar')} label={labels.streakModeDone} /></a>
      <a class="card-play {streakClass('grammar')}" href="/grammar?mode=order"><span class="home-icon" aria-hidden="true"><IconSort /></span><h2>{labels.grammarOrder}</h2><p>{labels.homeOrder}</p><TodayBadge done={modeDone(settings.streak, 'grammar')} label={labels.streakModeDone} /></a>
      {#if settings.lang === 'de'}<a class="card-play {streakClass('grammar')}" href="/grammar?mode=forms"><span class="home-icon" aria-hidden="true"><IconForms /></span><h2>{m.grammar_forms({}, { locale: settings.interfaceLocale })}</h2><p>{m.home_forms({}, { locale: settings.interfaceLocale })}</p><TodayBadge done={modeDone(settings.streak, 'grammar')} label={labels.streakModeDone} /></a>{/if}
    </div>
    </div>
    <div class="home-foot">
    <a class="btn-play btn-play-soft btn-play-sm home-settings-link" href="/settings"><IconSettings aria-hidden="true" /><span>{labels.settings}</span></a>
    <nav class="home-legal" aria-label={labels.legal}><a href="/impressum">{labels.imprint}</a><a href="/datenschutz">{labels.privacy}</a><a href="/bedingungen">{labels.terms}</a></nav>
    </div>
  {/if}
</section>

<style>
  .home-view { flex:1 1 auto;min-height:0;display:grid;grid-auto-rows:max-content;align-content:safe center;gap:clamp(1rem,4vw,1.8rem);padding:clamp(.6rem,3vw,1.1rem) clamp(.7rem,3.4vw,1.25rem);overflow-x:hidden;overflow-y:auto; }
  /* Joy on the start page: tiles drift, the title waves in, the cast hops now and then, cards pop in. */
  .home-header { position:relative; }
  .home-tiles { position:absolute;inset:0 -.5rem;pointer-events:none;z-index:0; }
  .home-header > :not(.home-tiles) { position:relative;z-index:1; }
  .home-tiles i { position:absolute;left:var(--x);top:var(--y);display:grid;place-items:center;width:1.55rem;height:1.55rem;border:2px solid #172a45;border-radius:.4rem;background:#fffdf7;box-shadow:2px 2px 0 #172a45;color:#172a45;font-family:'DM Serif Display',serif;font-size:.85rem;font-style:normal;opacity:.55;rotate:var(--r);animation:home-tile-float 7s ease-in-out var(--d) infinite; }
  :global(html.dark) .home-tiles i { border-color:#fffdf7;background:#213a5d;color:#fffdf7;box-shadow:2px 2px 0 #0a1626; }
  @keyframes home-tile-float { 0%,100% { translate:0 0; } 50% { translate:0 -.55rem;rotate:calc(var(--r) * -1); } }
  .home-title span { display:inline-block;animation:home-letter .7s cubic-bezier(.34,1.56,.64,1) both;animation-delay:calc(var(--i) * 35ms + .1s); }
  @keyframes home-letter { from { opacity:0;translate:0 .7em;rotate:-12deg; } }
  .home-family-people :global(.story-character) { animation:home-hop 9s ease-in-out infinite; transform-origin:50% 100%; }
  .home-family-people :global(.story-character + .story-character) { animation-delay:1.3s; }
  @keyframes home-hop { 0%,88%,100% { translate:0 0;scale:1; } 91% { translate:0 0;scale:1.06 .94; } 94% { translate:0 -.6rem;scale:.97 1.04; } 97% { translate:0 0;scale:1.03 .97; } }
  .home-games > :global(*) { animation:home-card-pop .5s cubic-bezier(.34,1.56,.64,1) both; }
  .home-games > :global(*:nth-child(2)) { animation-delay:.06s; } .home-games > :global(*:nth-child(3)) { animation-delay:.12s; } .home-games > :global(*:nth-child(4)) { animation-delay:.18s; } .home-games > :global(*:nth-child(5)) { animation-delay:.24s; } .home-games > :global(*:nth-child(n+6)) { animation-delay:.3s; }
  @keyframes home-card-pop { from { opacity:0;translate:0 .9rem;scale:.92;rotate:-2deg; } }
  @media (hover:hover) { .home-games :global(.card-play:hover .home-icon) { animation:home-icon-wiggle .55s ease-in-out; } }
  @keyframes home-icon-wiggle { 0%,100% { rotate:0deg;scale:1; } 30% { rotate:-12deg;scale:1.12; } 60% { rotate:9deg;scale:1.08; } }
  .home-today-icon { animation:home-today-glow 2.8s ease-in-out infinite; }
  @keyframes home-today-glow { 0%,100% { box-shadow:0 0 0 0 rgba(230,165,39,0); } 50% { box-shadow:0 0 0 .35rem rgba(230,165,39,.35); } }
  .home-today :global(.home-today-start svg) { animation:home-nudge 1.6s ease-in-out infinite; }
  @keyframes home-nudge { 0%,100% { translate:0 0; } 50% { translate:.2rem 0; } }
  :global([dir='rtl']) .home-today :global(.home-today-start svg) { animation-name:home-nudge-rtl; }
  @keyframes home-nudge-rtl { 0%,100% { translate:0 0; } 50% { translate:-.2rem 0; } }
  @media (prefers-reduced-motion:reduce) {
    .home-tiles i,.home-title span,.home-family-people :global(.story-character),.home-games > :global(*),.home-today-icon,.home-today :global(.home-today-start svg) { animation:none; }
    .home-games :global(.card-play:hover .home-icon) { animation:none; }
  }
  .home-header { display:grid;gap:.35rem;text-align:center; }.home-group-heading { margin:0 -.1rem -.35rem;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase; }.home-header p { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }.home-header h1 { margin:0;color:#172a45 !important;text-shadow:0 1px 0 rgba(255,253,247,.72);font-family:'DM Serif Display',serif;font-size:clamp(2.1rem,10vw,3.35rem);font-weight:400;letter-spacing:-.05em;line-height:.9; }
  .home-settings-link { justify-self:center; }
  /* overflow clips the row backgrounds to the rounded corners; min-height keeps the scrolling home grid from squeezing the card to nothing */
  .home-daily { position:relative;z-index:1;display:grid;justify-self:center;width:min(100%,27rem);min-height:min-content;overflow:hidden;rotate:-.4deg; }
  .home-daily > * + * { border-top:1.5px dashed rgba(23,42,69,.22); }
  .home-legal { display:flex;justify-content:center;gap:.9rem;margin-top:-.6rem; }
  .home-legal a { color:#596477;font-family:'DM Sans',sans-serif;font-size:.55rem;font-weight:800;text-decoration:none; }
  .home-legal a:hover { text-decoration:underline; }
  .home-repair { display:grid;justify-items:center;gap:.35rem;padding:.6rem .9rem;background:#fff4d9;text-align:center; }
  :global(html.dark) .home-legal a { color:rgba(255,253,247,.72); }
  :global(html.dark) .home-daily > * + * { border-top-color:rgba(255,253,247,.18); }
  :global(html.dark) .home-repair { background:#2b4a73; }:global(html.dark) .home-repair p { color:#fffdf7; }
  .home-repair p{ margin:0;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:800;line-height:1.4; }
  .home-daily-row { color:inherit;text-decoration:none; }
  .home-today { display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.7rem;padding:.65rem .9rem;background:#f7e2b0; }
  .home-continue { display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:.55rem;padding:.5rem .9rem; }
  @media (hover:hover) { .home-continue:hover { background:rgba(230,165,39,.12); } .home-today:hover { background:#f3d797; } }
  .home-daily-row:focus-visible { outline:3px dashed #e6a527;outline-offset:-3px; }
  .home-continue-label { overflow:hidden;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900;line-height:1.3;text-overflow:ellipsis;white-space:nowrap; }
  .home-continue-detail { color:#596477;font-family:'DM Sans',sans-serif;font-size:.55rem;font-weight:900;font-variant-numeric:tabular-nums; }
  .home-continue-arrow { width:1rem;height:1rem;color:#a45e38; }
  .home-due-badge { align-self:start;justify-self:start;margin-top:.15rem;padding:.1rem .38rem;border:1.5px solid #a45e38;border-radius:999px;background:#fff2e8;color:#8e4322;font-family:'DM Sans',sans-serif;font-size:.5rem;font-weight:900;line-height:1.2;white-space:nowrap; }
  :global(html.dark) .home-continue-label { color:#fffdf7; }:global(html.dark) .home-continue-detail { color:rgba(255,253,247,.65); }:global(html.dark) .home-continue-arrow { color:#e6a527; }
  :global(html.dark) .home-due-badge { border-color:#e6a527;background:#3a4f30;color:#f7e2b0; }
  .home-today-icon { display:grid;place-items:center;width:2.2rem;height:2.2rem;flex:none;border:2px solid #172a45;border-radius:50% 46% 52% 48% / 48% 52% 46% 50%;background:#fffdf7;color:#a45e38; }
  .home-today-icon :global(svg) { width:1.2rem;height:1.2rem; }
  .home-today-copy { display:grid;gap:.1rem;min-width:0; }
  .home-today-copy small { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.5rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase; }
  .home-today-copy strong { color:#172a45;font-family:'DM Sans',sans-serif;font-size:.68rem;font-weight:800;line-height:1.3; }
  .home-today-start { display:inline-flex;align-items:center;gap:.1rem;flex:none;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.56rem;font-weight:900;white-space:nowrap; }
  .home-today-start :global(svg) { width:.95rem;height:.95rem; }
  .home-family { position:relative;justify-self:center;display:flex;align-items:flex-end;height:6.2rem;margin-top:clamp(1rem,5vh,2.25rem);margin-bottom:.6rem; }
  .home-family-people { display:flex;align-items:flex-end;height:100%;padding:.55rem .9rem 0 .55rem;border:2px solid #172a45;border-bottom-width:0;border-radius:3.2rem 3.2rem .4rem .4rem;background:radial-gradient(circle at 50% 85%,#f7e2b0,#fbf1da 70%);overflow:hidden; }
  .home-family-people :global(.story-character) { width:4rem;height:5.4rem; }.home-family-people :global(.story-character + .story-character) { margin-inline-start:-.9rem; }
  .home-family::after { content:'';position:absolute;inset:auto -.6rem 0;height:2px;border-radius:2px;background:#172a45; }
  .home-lilith { position:relative;display:block;width:4.4rem;height:5.5rem;margin-inline-start:-1.35rem;transform-origin:50% 100%;animation:lilith-breathe 4.5s ease-in-out infinite; }.home-lilith :global(.story-character) { width:100%;height:100%; }
  .home-lilith-hearts { position:absolute;inset:-.4rem 0 auto;display:flex;justify-content:center;gap:.15rem;color:#d9546a;font-size:.8rem;line-height:1;pointer-events:none; }
  .home-lilith-hearts span { display:block;animation:lilith-heart 2s ease-in-out infinite; }
  .home-lilith-hearts span:last-child { margin-top:.35rem;font-size:.6rem;animation-delay:.7s; }
  @keyframes lilith-heart { 0% { opacity:0;translate:0 .3rem;scale:.7; } 35% { opacity:1; } 100% { opacity:0;translate:0 -1rem;scale:1; } }
  .home-lilith-pet { display:block;margin-inline-start:-1.35rem;padding:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;transform-origin:50% 100%; }.home-lilith-pet .home-lilith { margin:0; }
  .home-lilith-pet:focus-visible { outline:3px dashed #e6a527;outline-offset:2px;border-radius:1rem; }
  .home-lilith-pet.petting { animation:lilith-wiggle .9s var(--play-ease); }
  @keyframes lilith-wiggle { 0%,100% { rotate:0deg; } 20% { rotate:-4deg; } 45% { rotate:3deg; } 70% { rotate:-1.5deg; } }
  @media (prefers-reduced-motion:reduce) { .home-lilith-pet.petting { animation:none; } }
  .home-cast-note { justify-self:center;color:#596477;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:700; }
  @keyframes lilith-breathe { 0%,100% { scale:1; } 50% { scale:1.018 1.012; } }
  @media (prefers-reduced-motion:reduce) { .home-lilith { animation:none; } .home-lilith-hearts span { animation:none;opacity:1; } }
  .home-games { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem; } .home-games a.card-play{ color:inherit;text-decoration:none; } .home-card-slot { position:relative;display:grid; } .home-games .card-play { position:relative;display:grid;grid-template-rows:auto auto 1fr;justify-items:center;gap:.3rem;padding:1rem .6rem .9rem;border-top-width:5px;text-align:center;cursor:pointer; } .home-games > :nth-child(4n+1) { --tilt:-.7deg; } .home-games > :nth-child(4n+2) { --tilt:.5deg; } .home-games > :nth-child(4n+3) { --tilt:-.3deg; } .home-games > :nth-child(4n) { --tilt:.6deg; } .home-games .card-play.streak-done { border-top-color:#34824d; } .home-games .card-play.streak-pending { border-top-color:#e6a527; } .home-games .card-play.streak-none { border-top-color:#172a45; } .home-icon { display:grid;place-items:center;width:2.6rem;height:2.6rem;border:2px solid #172a45;border-radius:48% 52% 46% 54% / 54% 46% 52% 48%;background:#f7e2b0;color:#a45e38;transition:rotate .25s var(--play-ease); } .home-icon :global(svg) { width:1.3rem;height:1.3rem; } .home-games h2 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:.98rem;font-weight:400;line-height:1.15; } .home-games p { margin:0;color:#596477;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:700;line-height:1.35; }
  @media (hover:hover) { .home-games .card-play:hover .home-icon { rotate:-8deg; } }
  @media (prefers-reduced-motion:reduce) { .home-icon { transition:none; } .home-games .card-play:hover .home-icon { rotate:none; } }
  @media (min-width:640px) {
    .home-games { gap:.8rem; }
    .home-games .card-play { padding:1.2rem .9rem 1.1rem; }
    .home-games h2 { font-size:1.12rem; }
    .home-games p { font-size:.74rem; }
    .home-group-heading,.home-header p { font-size:.7rem; }
    .home-cast-note { font-size:.72rem; }
    .home-family { height:7.2rem; }.home-family-people :global(.story-character) { width:4.6rem;height:6.3rem; }.home-lilith { width:5rem;height:6.3rem; }
    .home-settings-link { font-size:.66rem; }
  }
  @media (min-width:760px) { .home-games { grid-template-columns:repeat(4,minmax(0,1fr)); } }
  @media (min-width:700px) and (min-height:560px) { .home-view { padding:clamp(1.5rem,3.5vw,2.75rem) clamp(1.5rem,4vw,3rem); } }
  .home-side,.home-main,.home-foot { display:contents; }
  /* Landscape tablets: the cast, title and daily card stay in a sticky column on the left while the
     game groups fill the width on the right, as many cards per row as fit. */
  @media (orientation:landscape) and (min-width:900px) and (min-height:560px) {
    .home-view { grid-template-columns:minmax(17rem,22rem) minmax(0,1fr);grid-template-areas:'side main' 'foot main';grid-template-rows:max-content 1fr;align-content:start;column-gap:clamp(1.5rem,3.5vw,3rem);row-gap:1rem; }
    .home-side { grid-area:side;position:sticky;top:0;display:grid;align-content:start;gap:1.1rem;padding-top:clamp(0rem,4vh,2rem); }
    .home-main { grid-area:main;display:grid;align-content:start;gap:1.25rem;padding-top:.4rem; }
    .home-foot { grid-area:foot;display:grid;align-content:start;justify-items:center;gap:1.1rem; }
    .home-family { margin-top:0; }
    .home-daily { width:100%;rotate:0deg; }
    .home-games,.home-games--games { grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr)); }
    .home-legal { margin-top:0; }
  }
  :global(html.dark) .home-header h1,:global(html.dark) .home-games h2 { color:#fffdf7 !important;text-shadow:none; }
  :global(html.dark) .home-family-people { border-color:#0b1626;background:radial-gradient(circle at 50% 85%,#2b4a73,#213a5d 70%); }:global(html.dark) .home-family::after { background:#0b1626; }
  :global(html.dark) .home-cast-note,:global(html.dark) .home-games p { color:rgba(255,253,247,.72); }
  :global(html.dark) .home-games .card-play.streak-none { border-top-color:#0b1626; }
  :global(html.dark) .home-icon{ border-color:#0b1626;background:#172a45;color:#e6a527; }
  :global(html.dark) .home-today { background:#2b4a73; }
  :global(html.dark) .home-today-icon { border-color:#0b1626;background:#213a5d;color:#e6a527; }
  :global(html.dark) .home-today-copy small { color:#f0c06a; }
  :global(html.dark) .home-today-copy strong,:global(html.dark) .home-today-start { color:#fffdf7; }
</style>
