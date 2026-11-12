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
  import MissedStreakSheet from '#lib/streak/MissedStreakSheet.svelte';
  import { readEvents } from '#lib/progress/eventLog.js';
  import { featureStats } from '#lib/progress/events.js';
  import { labelKeys, type FeatureKey } from '#lib/grammar/taxonomy.js';
  import { buildTodayPlan, estimatedMinutes, type TodayPlan, type TodayReading } from '#lib/today/todayPlan.js';
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
  import IconTaboo from '~icons/material-symbols/record-voice-over-rounded';
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
  import IconEar from '~icons/material-symbols/hearing';
  import IconEye from '~icons/material-symbols/visibility-rounded';
  import IconHand from '~icons/material-symbols/touch-app-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import PhysicsTiles from '#lib/app/PhysicsTiles.svelte';
  import { defaultAvatar } from '#lib/profile/avatar.js';
  import { CHANNELS, HOME_GROUPS, dailyMix, modesForChannel, type Channel, type HomeGroup, type HomeMode, type HomeModeId, type MixStep } from '#lib/today/homeModes.js';
  import type { Component } from 'svelte';

  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));

  const ROOT_ONBOARDING_KEY = 'wordcircle-root-onboarding-v1';

  let rootOnboarding = $state(false);
  let streakTimer: number | null = null;
  // Existing users who finished the language step before names existed still get asked once.
  const needsName = $derived(!rootOnboarding && !settings.firstName);
  // Keeps the welcome flow open through its name, character and finale steps after the language.
  let pickingLook = $state(false);

  // Loose letter tiles around the cast, like on a game table: they drift, and can be flicked about.
  const FLOATING_TILES = ['W', 'O', 'R', 'T'];
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
    homeTaboo: m.home_taboo({}, { locale: settings.interfaceLocale }),
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
    modeTaboo: m.mode_taboo({}, { locale: settings.interfaceLocale }),
    pronunciation: m.mode_pronunciation({}, { locale: settings.interfaceLocale }),
    alltag: m.mode_alltag({}, { locale: settings.interfaceLocale }),
    wordQuiz: m.mode_word_quiz({}, { locale: settings.interfaceLocale }),
    modeSentence: m.mode_sentence({}, { locale: settings.interfaceLocale }),
    homeSentence: m.home_sentence({}, { locale: settings.interfaceLocale }),
    modeFullText: m.mode_full_text({}, { locale: settings.interfaceLocale }),
    homeFullText: m.home_full_text({}, { locale: settings.interfaceLocale }),
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
  // Every card's icon, title and one-line description; what the mode trains comes from homeModes.ts.
  const modeCards = $derived<Record<HomeModeId, { icon: Component; title: string; text: string }>>({
    circle: { icon: IconCrossword, title: labels.modeCrossword, text: labels.homeCircle },
    definitions: { icon: IconFactCheck, title: labels.modeDefinitions, text: labels.homeDefinitions },
    wordle: { icon: IconSpellcheck, title: labels.modeWordle, text: labels.homeWordle },
    hangman: { icon: IconHangman, title: labels.modeHangman, text: labels.homeHangman },
    taboo: { icon: IconTaboo, title: labels.modeTaboo, text: labels.homeTaboo },
    stories: { icon: IconStory, title: labels.story, text: labels.homeStory },
    reading: { icon: IconMenuBook, title: labels.reading, text: labels.homeReading },
    listen: { icon: IconHeadphones, title: labels.listen, text: labels.homeListen },
    conversation: { icon: IconForum, title: labels.conversation, text: labels.homeConversation },
    sentence: { icon: IconPen, title: labels.modeSentence, text: labels.homeSentence },
    fullText: { icon: IconArticle, title: labels.modeFullText, text: labels.homeFullText },
    vocab: { icon: IconQuiz, title: labels.wordQuiz, text: labels.homeVocab },
    pronunciation: { icon: IconMic, title: labels.pronunciation, text: labels.homePronunciation },
    alltag: { icon: IconEmoji, title: labels.alltag, text: labels.homeAlltag },
    dictionary: { icon: IconDictionary, title: m.dictionary_title({}, { locale: settings.interfaceLocale }), text: m.home_dictionary({}, { locale: settings.interfaceLocale }) },
    falseFriends: { icon: IconSwapHoriz, title: labels.grammarFalseFriends, text: labels.homeFalseFriends },
    grammarFill: { icon: IconEditNote, title: labels.grammarFill, text: labels.homeGrammar },
    grammarDetermine: { icon: IconFactCheck, title: labels.grammarDetermine, text: labels.homeDetermine },
    grammarOrder: { icon: IconSort, title: labels.grammarOrder, text: labels.homeOrder },
    grammarForms: { icon: IconForms, title: m.grammar_forms({}, { locale: settings.interfaceLocale }), text: m.home_forms({}, { locale: settings.interfaceLocale }) }
  });
  const groupLabels = $derived<Record<HomeGroup, string>>({ games: labels.gamesGroup, stories: labels.story, writing: labels.sentenceGroup, vocabulary: labels.vocabularyGroup, grammar: labels.grammarGroup });
  const channelLabels = $derived<Record<Channel | 'all', string>>({
    all: m.channel_all({}, { locale: settings.interfaceLocale }), hear: m.channel_hear({}, { locale: settings.interfaceLocale }),
    read: m.channel_read({}, { locale: settings.interfaceLocale }), speak: m.channel_speak({}, { locale: settings.interfaceLocale }),
    write: m.channel_write({}, { locale: settings.interfaceLocale }), words: m.channel_words({}, { locale: settings.interfaceLocale }),
    grammar: m.channel_grammar({}, { locale: settings.interfaceLocale }), play: m.channel_play({}, { locale: settings.interfaceLocale })
  });
  // The chip the learner last picked comes back on the next visit.
  const CHANNEL_KEY = 'wordcircle-home-channel-v1';
  let channel = $state<Channel | 'all'>('all');
  function chooseChannel(next: Channel | 'all') {
    channel = next;
    localStorage.setItem(CHANNEL_KEY, next);
  }
  const visibleModes = $derived(modesForChannel(channel, settings.lang));
  // With "All" the cards keep their groups; a single channel is one flat list, its main modes first.
  const cardGroups = $derived<{ group: HomeGroup | null; modes: HomeMode[] }[]>(channel === 'all'
    ? HOME_GROUPS.map((group) => ({ group, modes: visibleModes.filter((mode) => mode.group === group) })).filter((entry) => entry.modes.length > 0)
    : [{ group: null, modes: visibleModes }]);
  function dueFor(id: HomeModeId): number {
    return id === 'vocab' ? wordDue : id === 'reading' ? readingDue : id === 'grammarFill' ? grammarDue : 0;
  }
  let petting = $state(false);
  function petLilith() {
    playSoundEffect(settings.sound, 'purr');
    petting = false;
    requestAnimationFrame(() => (petting = true));
  }
  let todayPlan = $state<TodayPlan | null>(null);
  let repairOffer = $state<StreakRepair | null>(null);
  const lilith = $derived(lilithMood(settings.streak, repairOffer));
  let wordDue = $state(0);
  let grammarDue = $state(0);
  let readingDue = $state(0);
  // Today's mix: one step each for ear, eye and hand (today/homeModes.ts).
  const mixIcons: Record<MixStep, Component> = { hear: IconEar, see: IconEye, do: IconHand };
  const mixLabels = $derived<Record<MixStep, string>>({ hear: m.mix_hear({}, { locale: settings.interfaceLocale }), see: m.mix_see({}, { locale: settings.interfaceLocale }), do: m.mix_do({}, { locale: settings.interfaceLocale }) });
  const mix = $derived(dailyMix({ language: settings.lang, dateKey: settings.streak.dateKey, style: settings.learningStyle, dueWords: wordDue, isDone: (mode) => modeDone(settings.streak, mode) }));
  const mixDone = $derived(mix.filter((entry) => entry.done).length);
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
  // The reading catalog pulls in the level's stories, so it loads only when there is a text in
  // progress, and after the page instead of with it.
  let readingCatalog: typeof import('#lib/story/storyPacks.svelte.js').readingCatalog | null = null;
  let catalogLoading = false;
  function readingToday(): TodayReading | null {
    try {
      const fingerprint = `${settings.lang}|${settings.vocabularyLevel}|${settings.includeLowerVocabulary}`;
      const parsed = JSON.parse(localStorage.getItem('wordcircle-reading-progress-v1') ?? 'null') as { fingerprint?: string; id?: string; solved?: Record<string, Record<number, true>> } | null;
      if (!parsed || parsed.fingerprint !== fingerprint || typeof parsed.id !== 'string') return null;
      if (!readingCatalog) {
        if (!catalogLoading) {
          catalogLoading = true;
          void import('#lib/story/storyPacks.svelte.js').then(async (module) => {
            await module.ensureStoryPacks(settings.lang, settings.vocabularyLevel, settings.includeLowerVocabulary);
            readingCatalog = module.readingCatalog;
            refreshToday();
          });
        }
        return null;
      }
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
    const storedChannel = localStorage.getItem(CHANNEL_KEY);
    if (storedChannel === 'all' || (CHANNELS as readonly string[]).includes(storedChannel ?? '')) channel = storedChannel as Channel | 'all';
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
    <!-- Side and main are invisible wrappers on phones (display: contents); a landscape tablet turns
         them into a sticky left column (cast, daily card, mix) beside the exercise cards. -->
    <div class="home-side">
    <UpdateAppHint />
    <InstallAppHint />
    <header class="home-header">
      <PhysicsTiles letters={FLOATING_TILES} />
      <div class="home-hello">
        <a class="home-me" href="/progress" aria-label={m.stats_title({}, { locale: settings.interfaceLocale })}><StoryCharacter id="kumar" avatar={settings.avatar ?? defaultAvatar} mood="happy" /></a>
        <div class="home-hello-text">
          <h1 class="home-title">{m.home_greeting({ name: settings.firstName }, { locale: settings.interfaceLocale })}</h1>
          <span class="home-cast-note">{labels.homeCast}</span>
        </div>
      </div>
      <div class="home-family"><span class="home-family-people" aria-hidden="true"><StoryCharacter id="mia" /><StoryCharacter id="tom" /></span><button type="button" class="home-lilith-pet" class:petting onclick={petLilith} onanimationend={() => (petting = false)} aria-label={labels.petLilith}><span class="home-lilith" class:loving={lilith === 'loving'}><StoryCharacter id="lilith" mood={petting && lilith !== 'loving' ? 'happy' : lilithFace(lilith)} />{#if lilith === 'loving'}<span class="home-lilith-hearts" aria-hidden="true"><span>♥</span><span>♥</span></span>{/if}</span></button></div>
    </header>
    <!-- One daily card: the streak, the next best step and what is waiting to be continued. -->
    <MissedStreakSheet repair={repairOffer} />
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
    <!-- Today's mix: three short steps that reach the ear, the eye and the hand. -->
    <section class="home-mix" aria-labelledby="home-mix-title">
      <header><h2 id="home-mix-title">{m.mix_title({}, { locale: settings.interfaceLocale })}</h2><span class="home-mix-count" class:complete={mixDone === mix.length}>{m.mix_progress({ done: num(mixDone), total: num(mix.length) }, { locale: settings.interfaceLocale })}</span></header>
      <ol>
        {#each mix as entry (entry.step)}
          {@const StepIcon = mixIcons[entry.step]}
          <li>
            <a class="home-mix-step" class:done={entry.done} href={entry.mode.href} style={`--skill:var(--skill-${entry.mode.channels[0]})`}>
              <span class="home-mix-icon" aria-hidden="true">{#if entry.done}<IconCheck />{:else}<StepIcon />{/if}</span>
              <small>{mixLabels[entry.step]}</small>
              <strong>{modeCards[entry.mode.id].title}</strong>
            </a>
          </li>
        {/each}
      </ol>
      {#if mixDone === mix.length}<p>{m.mix_done({}, { locale: settings.interfaceLocale })}</p>{:else if mixDone === 0}<p>{m.mix_hint({}, { locale: settings.interfaceLocale })}</p>{/if}
    </section>
    </div>
    <div class="home-main">
    <div class="home-chips" role="radiogroup" aria-label={m.channel_filter({}, { locale: settings.interfaceLocale })}>
      {#each ['all', ...CHANNELS] as const as option (option)}
        <button type="button" role="radio" aria-checked={channel === option} class:selected={channel === option} style={option === 'all' ? '' : `--skill:var(--skill-${option})`} onclick={() => chooseChannel(option)}>{#if option !== 'all'}<i aria-hidden="true"></i>{/if}{channelLabels[option]}</button>
      {/each}
    </div>
    {#each cardGroups as entry (entry.group ?? channel)}
      {#if entry.group}<h2 class="home-group-heading">{groupLabels[entry.group]}</h2>{/if}
      <div class="home-games">
        {#each entry.modes as mode (mode.id)}
          {@const card = modeCards[mode.id]}
          {@const CardIcon = card.icon}
          {@const done = mode.streak ? modeDone(settings.streak, mode.streak) : false}
          {@const due = dueFor(mode.id)}
          <a class="card-play" class:streak-done={done} href={mode.href} style={`--skill:var(--skill-${mode.channels[0]})`}>
            <span class="home-icon" aria-hidden="true"><CardIcon /></span>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            {#if due > 0}<span class="home-due-badge">{labels.repeatDue(due)}</span>{/if}
            <TodayBadge {done} label={labels.streakModeDone} />
          </a>
        {/each}
      </div>
    {/each}
    <nav class="home-legal" aria-label={labels.legal}><a href="/impressum">{labels.imprint}</a><a href="/datenschutz">{labels.privacy}</a><a href="/bedingungen">{labels.terms}</a><a href="/credits">{m.legal_credits({}, { locale: settings.interfaceLocale })}</a></nav>
    </div>
  {/if}
</section>

<style>
  .home-view { flex:1 1 auto;min-height:0;display:grid;grid-auto-rows:max-content;align-content:start;gap:1.5rem;padding:clamp(2rem,7vh,3.4rem) clamp(1rem,4.4vw,1.4rem) 1.8rem;overflow-x:hidden;overflow-y:auto;font-family:var(--font-body); }
  .home-side,.home-main { display:contents; }

  /* Header: the learner's own face and greeting on one side, the cast under their arch on the other. */
  .home-header { position:relative;display:flex;align-items:flex-end;justify-content:space-between;gap:.6rem;min-height:6.4rem;margin-bottom:.3rem; }
  /* The loose tiles keep to the cast's side, clear of the greeting. */
  .home-header > :global(.physics-tiles) { z-index:0;inset-inline-start:46%;inset-block-start:-1.2rem; }
  .home-hello,.home-family { position:relative;z-index:1; }
  .home-hello { display:grid;gap:.45rem;min-width:0;padding-bottom:.35rem; }
  .home-me { display:block;width:2.9rem;height:2.9rem;overflow:hidden;border:2px solid var(--ink);border-radius:50% 46% 52% 48% / 48% 52% 46% 50%;background:var(--sun-soft);box-shadow:2px 2px 0 var(--ink);transition:translate var(--dur-move) var(--ease-spring),box-shadow var(--dur-move) var(--ease-spring); }
  .home-me :global(.story-character) { width:100%;height:118%;margin-top:6%; }
  .home-me:active { translate:2px 2px;box-shadow:0 0 0 var(--ink); }
  .home-me:focus-visible { outline:3px dashed var(--sun);outline-offset:3px; }
  .home-title { margin:0;color:var(--text);font-family:var(--font-display);font-size:clamp(1.75rem,8vw,2.4rem);font-weight:400;letter-spacing:-.03em;line-height:1;overflow-wrap:anywhere;animation:home-rise var(--dur-show) var(--ease-spring) both; }
  .home-cast-note { color:var(--text-soft);font-size:var(--text-xs);font-weight:700;line-height:1.3; }
  @keyframes home-rise { from { opacity:0;translate:0 .6rem; } }

  .home-family { flex:none;display:flex;align-items:flex-end;height:5.6rem; }
  .home-family-people { display:flex;align-items:flex-end;height:100%;padding:.5rem .8rem 0 .5rem;border:2px solid var(--ink);border-bottom-width:0;border-radius:3rem 3rem .4rem .4rem;background:radial-gradient(circle at 50% 85%,var(--sun-soft),color-mix(in oklch,var(--sun-soft) 45%,var(--paper)) 70%);overflow:hidden; }
  .home-family-people :global(.story-character) { width:3.5rem;height:4.8rem;transform-origin:50% 100%;animation:home-hop 9s ease-in-out infinite; }
  .home-family-people :global(.story-character + .story-character) { margin-inline-start:-.85rem;animation-delay:1.3s; }
  .home-family::after { content:'';position:absolute;inset:auto -.5rem 0;height:2px;border-radius:2px;background:var(--ink); }
  @keyframes home-hop { 0%,88%,100% { translate:0 0;scale:1; } 91% { translate:0 0;scale:1.06 .94; } 94% { translate:0 -.6rem;scale:.97 1.04; } 97% { translate:0 0;scale:1.03 .97; } }
  .home-lilith { position:relative;display:block;width:3.9rem;height:4.9rem;transform-origin:50% 100%;animation:lilith-breathe 4.5s ease-in-out infinite; }.home-lilith :global(.story-character) { width:100%;height:100%; }
  .home-lilith-hearts { position:absolute;inset:-.4rem 0 auto;display:flex;justify-content:center;gap:.15rem;color:#d9546a;font-size:.9rem;line-height:1;pointer-events:none; }
  .home-lilith-hearts span { display:block;animation:lilith-heart 2s ease-in-out infinite; }
  .home-lilith-hearts span:last-child { margin-top:.35rem;font-size:.7rem;animation-delay:.7s; }
  @keyframes lilith-heart { 0% { opacity:0;translate:0 .3rem;scale:.7; } 35% { opacity:1; } 100% { opacity:0;translate:0 -1rem;scale:1; } }
  .home-lilith-pet { display:block;margin-inline-start:-1.25rem;padding:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;transform-origin:50% 100%; }
  .home-lilith-pet:focus-visible { outline:3px dashed var(--sun);outline-offset:2px;border-radius:1rem; }
  .home-lilith-pet.petting { animation:lilith-wiggle .9s var(--ease-spring); }
  @keyframes lilith-wiggle { 0%,100% { rotate:0deg; } 20% { rotate:-4deg; } 45% { rotate:3deg; } 70% { rotate:-1.5deg; } }
  @keyframes lilith-breathe { 0%,100% { scale:1; } 50% { scale:1.018 1.012; } }

  /* overflow clips the row backgrounds to the rounded corners; min-height keeps the scrolling grid from squeezing the card */
  .home-daily { position:relative;z-index:1;display:grid;min-height:min-content;overflow:hidden; }
  .home-daily > :global(* + *) { border-top:1.5px dashed var(--line-soft); }
  .home-daily-row { color:inherit;text-decoration:none; }
  .home-daily-row:focus-visible { outline:3px dashed var(--sun);outline-offset:-3px; }
  .home-repair { display:grid;justify-items:center;gap:.4rem;padding:.7rem .9rem;background:#fff4d9;text-align:center; }
  .home-repair p { margin:0;color:var(--ink);font-size:var(--text-xs);font-weight:800;line-height:1.4; }
  .home-today { display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.7rem;padding:.75rem .9rem;background:var(--sun-soft); }
  .home-today-icon { display:grid;place-items:center;width:2.4rem;height:2.4rem;flex:none;border:2px solid var(--ink);border-radius:50% 46% 52% 48% / 48% 52% 46% 50%;background:var(--paper);color:var(--clay);animation:home-today-glow 2.8s ease-in-out infinite; }
  .home-today-icon :global(svg) { width:1.3rem;height:1.3rem; }
  @keyframes home-today-glow { 0%,100% { box-shadow:0 0 0 0 rgba(230,165,39,0); } 50% { box-shadow:0 0 0 .35rem rgba(230,165,39,.35); } }
  .home-today-copy { display:grid;gap:.1rem;min-width:0; }
  .home-today-copy small { color:var(--clay);font-size:.6875rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase; }
  .home-today-copy strong { color:var(--ink);font-size:var(--text-sm);font-weight:800;line-height:1.3; }
  .home-today-start { display:inline-flex;align-items:center;gap:.1rem;flex:none;padding:.35rem .45rem .35rem .7rem;border:2px solid var(--ink);border-radius:999px;background:var(--ink);color:var(--paper);font-size:var(--text-xs);font-weight:900;white-space:nowrap; }
  .home-today-start :global(svg) { width:1rem;height:1rem;animation:home-nudge 1.6s ease-in-out infinite; }
  @keyframes home-nudge { 0%,100% { translate:0 0; } 50% { translate:.2rem 0; } }
  :global([dir='rtl']) .home-today-start :global(svg) { animation-name:home-nudge-rtl; }
  @keyframes home-nudge-rtl { 0%,100% { translate:0 0; } 50% { translate:-.2rem 0; } }
  .home-continue { display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:.55rem;padding:.65rem .9rem; }
  @media (hover:hover) { .home-continue:hover { background:color-mix(in oklch,var(--sun) 14%,transparent); } .home-today:hover { background:color-mix(in oklch,var(--sun-soft) 80%,var(--sun)); } }
  .home-continue-label { overflow:hidden;color:var(--text);font-size:var(--text-xs);font-weight:800;line-height:1.3;text-overflow:ellipsis;white-space:nowrap; }
  .home-continue-detail { color:var(--text-soft);font-size:var(--text-xs);font-weight:900;font-variant-numeric:tabular-nums; }
  .home-continue :global(.home-continue-arrow) { width:1.1rem;height:1.1rem;color:var(--clay); }

  /* Today's mix */
  .home-mix { display:grid;gap:.5rem; }
  .home-mix header { display:flex;align-items:baseline;justify-content:space-between;gap:.6rem; }
  .home-mix h2,.home-group-heading { margin:0;color:var(--clay);font-size:var(--text-xs);font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .home-mix-count { color:var(--text-soft);font-size:var(--text-xs);font-weight:900;font-variant-numeric:tabular-nums; }
  .home-mix-count.complete { color:var(--go); }
  .home-mix ol { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem;margin:0;padding:0;list-style:none; }
  .home-mix-step { position:relative;display:grid;justify-items:center;gap:.15rem;height:100%;padding:.7rem .35rem .6rem;border:2px solid var(--ink);border-radius:16px 11px 15px 12px / 12px 15px 11px 16px;background:color-mix(in oklch,var(--skill) 14%,var(--surface));box-shadow:3px 3px 0 var(--ink);color:var(--text);text-align:center;text-decoration:none;-webkit-tap-highlight-color:transparent;transition:translate var(--dur-move) var(--ease-spring),box-shadow var(--dur-move) var(--ease-spring); }
  .home-mix-step:active { translate:2px 2px;box-shadow:1px 1px 0 var(--ink); }
  .home-mix-step:focus-visible { outline:3px dashed var(--sun);outline-offset:3px; }
  .home-mix-icon { display:grid;place-items:center;width:2.3rem;height:2.3rem;border:2px solid var(--ink);border-radius:50%;background:var(--skill);color:var(--paper); }
  .home-mix-icon :global(svg) { width:1.25rem;height:1.25rem; }
  .home-mix-step small { color:var(--text-soft);font-size:.6875rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase; }
  .home-mix-step strong { font-size:var(--text-xs);font-weight:800;line-height:1.2;overflow-wrap:anywhere; }
  .home-mix-step.done { background:var(--go-soft); }
  .home-mix-step.done .home-mix-icon { background:var(--go);animation:play-pop .4s var(--ease-spring) both; }
  .home-mix p { margin:0;color:var(--text-soft);font-size:var(--text-xs);font-weight:700;line-height:1.4; }
  /* The steps are joined by a dotted path, so the three read as one small journey. */
  .home-mix li { position:relative; }
  .home-mix li + li::before { content:'';position:absolute;top:1.85rem;inset-inline-start:-.5rem;width:.5rem;border-top:2px dotted var(--ink); }

  /* Filter chips: a row that scrolls sideways and bleeds to the screen's edge */
  .home-chips { display:flex;gap:.45rem;margin:0 calc(clamp(1rem,4.4vw,1.4rem) * -1);padding:.15rem clamp(1rem,4.4vw,1.4rem) .35rem;overflow-x:auto;scrollbar-width:none;scroll-snap-type:x proximity; }
  .home-chips::-webkit-scrollbar { display:none; }
  .home-chips button { flex:none;display:inline-flex;align-items:center;gap:.35rem;min-height:2.4rem;padding:.3rem .85rem;border:2px solid var(--ink);border-radius:999px;background:var(--surface);color:var(--text);font:inherit;font-size:var(--text-sm);font-weight:800;scroll-snap-align:start;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background-color var(--dur-quick) ease,color var(--dur-quick) ease,scale var(--dur-move) var(--ease-spring),box-shadow var(--dur-move) var(--ease-spring); }
  .home-chips button i { width:.6rem;height:.6rem;border-radius:50%;background:var(--skill); }
  .home-chips button:active { scale:.94; }
  .home-chips button.selected { background:var(--ink);color:var(--paper);box-shadow:2px 2px 0 var(--sun); }
  .home-chips button:focus-visible { outline:3px dashed var(--sun);outline-offset:2px; }

  /* Exercise cards: each takes the colour of what it trains */
  .home-group-heading { margin-bottom:-.5rem; }
  .home-games { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem; }
  .home-games .card-play { position:relative;display:grid;grid-template-rows:auto auto 1fr auto;justify-items:start;gap:.3rem;padding:.85rem .8rem .8rem;color:inherit;text-align:start;text-decoration:none;cursor:pointer;animation:home-card-pop .5s var(--ease-spring) both; }
  .home-games .card-play:nth-child(2) { animation-delay:.05s; } .home-games .card-play:nth-child(3) { animation-delay:.1s; } .home-games .card-play:nth-child(4) { animation-delay:.15s; } .home-games .card-play:nth-child(n+5) { animation-delay:.2s; }
  @keyframes home-card-pop { from { opacity:0;translate:0 .9rem;scale:.94; } }
  .home-games > :nth-child(4n+1) { --tilt:-.6deg; } .home-games > :nth-child(4n+2) { --tilt:.5deg; } .home-games > :nth-child(4n+3) { --tilt:.4deg; } .home-games > :nth-child(4n) { --tilt:-.5deg; }
  .home-games .card-play.streak-done { background:color-mix(in oklch,var(--go-soft) 55%,var(--surface)); }
  .home-icon { display:grid;place-items:center;width:2.7rem;height:2.7rem;border:2px solid var(--ink);border-radius:48% 52% 46% 54% / 54% 46% 52% 48%;background:color-mix(in oklch,var(--skill) 26%,var(--paper));color:color-mix(in oklch,var(--skill) 62%,var(--ink));transition:rotate var(--dur-move) var(--ease-spring); }
  .home-icon :global(svg) { width:1.45rem;height:1.45rem; }
  .home-games h3 { margin:.15rem 0 0;color:var(--text);font-family:var(--font-display);font-size:1.15rem;font-weight:400;line-height:1.15;overflow-wrap:anywhere; }
  .home-games p { margin:0;color:var(--text-soft);font-size:var(--text-xs);font-weight:600;line-height:1.35; }
  .home-games .card-play :global(.today-check) { top:.6rem;inset-inline:auto .6rem; }
  .home-due-badge { margin-top:.2rem;padding:.12rem .5rem;border:1.5px solid var(--clay);border-radius:999px;background:#fff2e8;color:#8e4322;font-size:.6875rem;font-weight:900;line-height:1.3;white-space:nowrap; }
  @media (hover:hover) { .home-games .card-play:hover .home-icon { rotate:-8deg;animation:home-icon-wiggle .55s ease-in-out; } }
  @keyframes home-icon-wiggle { 0%,100% { rotate:0deg;scale:1; } 30% { rotate:-12deg;scale:1.12; } 60% { rotate:9deg;scale:1.08; } }

  .home-legal { display:flex;flex-wrap:wrap;justify-content:center;gap:.3rem 1rem;padding-top:.3rem; }
  .home-legal a { color:var(--text-soft);font-size:var(--text-xs);font-weight:700;text-decoration:none; }
  .home-legal a:hover { text-decoration:underline; }

  @media (prefers-reduced-motion:reduce) {
    .home-title,.home-family-people :global(.story-character),.home-lilith,.home-lilith-pet.petting,.home-games .card-play,.home-today-icon,.home-today-start :global(svg),.home-mix-step.done .home-mix-icon { animation:none; }
    .home-lilith-hearts span { animation:none;opacity:1; }
    .home-games .card-play:hover .home-icon { animation:none;rotate:none; }
  }
  @media (min-width:640px) {
    .home-view { gap:1.7rem; }
    .home-games { gap:.9rem; }
    .home-family { height:6.6rem; }.home-family-people :global(.story-character) { width:4.2rem;height:5.7rem; }.home-lilith { width:4.6rem;height:5.8rem; }
    .home-me { width:3.4rem;height:3.4rem; }
  }
  @media (min-width:760px) { .home-games { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  @media (min-width:700px) and (min-height:560px) { .home-view { padding:clamp(1.4rem,3vw,2.2rem) clamp(1.5rem,4vw,3rem) 1.6rem; } .home-chips { margin-inline:0;padding-inline:0;flex-wrap:wrap;overflow:visible; } }
  /* Landscape tablets and desktops: cast, daily card and mix stay in a sticky column on the left
     while the exercise cards fill the width on the right. */
  @media (orientation:landscape) and (min-width:900px) and (min-height:560px) {
    .home-view { grid-template-columns:minmax(19rem,23rem) minmax(0,1fr);align-items:start;column-gap:clamp(1.5rem,3.5vw,3rem); }
    .home-side { position:sticky;top:0;display:grid;align-content:start;gap:1.2rem; }
    .home-main { display:grid;align-content:start;gap:1.2rem; }
    .home-games { grid-template-columns:repeat(auto-fill,minmax(11rem,1fr)); }
  }

  :global(html.dark) .home-family-people { border-color:var(--ink-deep);background:radial-gradient(circle at 50% 85%,#2b4a73,#213a5d 70%); }
  :global(html.dark) .home-family::after { background:var(--ink-deep); }
  :global(html.dark) .home-me { border-color:var(--ink-deep);background:#2b4a73;box-shadow:2px 2px 0 var(--ink-deep); }
  :global(html.dark) .home-repair { background:#2b4a73; }:global(html.dark) .home-repair p { color:var(--paper); }
  :global(html.dark) .home-today { background:#2b4a73; }
  :global(html.dark) .home-today-icon { border-color:var(--ink-deep);background:var(--surface);color:var(--sun); }
  :global(html.dark) .home-today-copy small,:global(html.dark) .home-mix h2,:global(html.dark) .home-group-heading { color:#f0c06a; }
  :global(html.dark) .home-today-copy strong { color:var(--paper); }
  :global(html.dark) .home-today-start { border-color:var(--sun);background:var(--sun);color:var(--ink); }
  :global(html.dark) .home-continue :global(.home-continue-arrow) { color:var(--sun); }
  :global(html.dark) .home-mix-step { border-color:var(--ink-deep);box-shadow:3px 3px 0 var(--ink-deep); }
  :global(html.dark) .home-mix-step.done { background:color-mix(in oklch,var(--go) 35%,var(--surface)); }
  :global(html.dark) .home-mix-icon { border-color:var(--ink-deep);color:var(--ink); }
  :global(html.dark) .home-mix li + li::before { border-top-color:color-mix(in oklch,var(--paper) 45%,transparent); }
  :global(html.dark) .home-chips button { border-color:var(--ink-deep); }
  :global(html.dark) .home-chips button.selected { background:var(--sun);color:var(--ink);box-shadow:2px 2px 0 var(--ink-deep); }
  :global(html.dark) .home-icon { border-color:var(--ink-deep);background:color-mix(in oklch,var(--skill) 30%,var(--surface-2));color:var(--skill); }
  :global(html.dark) .home-games .card-play.streak-done { background:color-mix(in oklch,var(--go) 28%,var(--surface)); }
  :global(html.dark) .home-due-badge { border-color:var(--sun);background:#3a4f30;color:#f7e2b0; }
</style>
