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
  import { onMount } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings, interfaceLocales, FIRST_NAME_MAX_LENGTH } from '#lib/state/settings.svelte.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import InstallAppHint from '#lib/InstallAppHint.svelte';
  import UpdateAppHint from '#lib/UpdateAppHint.svelte';
  import SelectMenu from '#lib/settings/SelectMenu.svelte';
  import { playSoundEffect } from '#lib/sounds.js';
  import { playableLanguages, type Language } from '#lib/data/vocabulary.js';
  import { VOCABULARY_GOALS, modeDone, type StreakMode } from '#lib/clientStreak.js';
  import TodayBadge from '#lib/streak/TodayBadge.svelte';
  import IconSettings from '~icons/material-symbols/settings-rounded';
  import IconHelp from '~icons/material-symbols/question-mark-rounded';
  import IconFlame from '~icons/material-symbols/local-fire-department-rounded';
  import IconChevronRight from '~icons/material-symbols/chevron-right-rounded';
  import IconCrossword from '~icons/material-symbols/crossword-rounded';
  import IconSpellcheck from '~icons/material-symbols/spellcheck-rounded';
  import IconQuiz from '~icons/material-symbols/quiz-rounded';
  import IconHangman from '~icons/material-symbols/extension-rounded';
  import IconMic from '~icons/material-symbols/mic-rounded';
  import IconEmoji from '~icons/material-symbols/sentiment-satisfied-rounded';
  import IconEditNote from '~icons/material-symbols/edit-note-rounded';
  import IconFactCheck from '~icons/material-symbols/fact-check-rounded';
  import IconSort from '~icons/material-symbols/sort-rounded';
  import IconSwapHoriz from '~icons/material-symbols/swap-horiz-rounded';
  import IconStory from '~icons/material-symbols/auto-stories-rounded';
  import IconMenuBook from '~icons/material-symbols/menu-book-rounded';
  import IconHeadphones from '~icons/material-symbols/headphones-rounded';

  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));

  const ROOT_ONBOARDING_KEY = 'wordcircle-root-onboarding-v1';

  let rootOnboarding = $state(false);
  let streakTimer: number | null = null;
  let nameDraft = $state('');
  // Existing users who finished the language step before names existed still get asked once.
  const needsName = $derived(!rootOnboarding && !settings.firstName);

  const labels = $derived({
    settings: m.settings({}, { locale: settings.interfaceLocale }),
    homeTitle: m.home_title({}, { locale: settings.interfaceLocale }),
    homeCircle: m.home_circle({}, { locale: settings.interfaceLocale }),
    homeWordle: m.home_wordle({}, { locale: settings.interfaceLocale }),
    homeVocab: m.home_vocab({}, { locale: settings.interfaceLocale }),
    homeGrammar: m.home_grammar({}, { locale: settings.interfaceLocale }),
    homePlay: m.home_play({}, { locale: settings.interfaceLocale }),
    modeCrossword: m.mode_crossword({}, { locale: settings.interfaceLocale }),
    modeWordle: m.mode_wordle({}, { locale: settings.interfaceLocale }),
    modeGrammar: m.mode_grammar({}, { locale: settings.interfaceLocale }),
    modeHangman: m.mode_hangman({}, { locale: settings.interfaceLocale }),
    pronunciation: m.mode_pronunciation({}, { locale: settings.interfaceLocale }),
    alltag: m.mode_alltag({}, { locale: settings.interfaceLocale }),
    wordQuiz: m.mode_word_quiz({}, { locale: settings.interfaceLocale }),
    gamesGroup: m.group_games({}, { locale: settings.interfaceLocale }),
    vocabularyGroup: m.group_vocabulary({}, { locale: settings.interfaceLocale }),
    grammarGroup: m.group_grammar({}, { locale: settings.interfaceLocale }),
    grammarFill: m.grammar_fill({}, { locale: settings.interfaceLocale }),
    grammarDetermine: m.grammar_determine({}, { locale: settings.interfaceLocale }),
    grammarOrder: m.grammar_order({}, { locale: settings.interfaceLocale }),
    grammarFalseFriends: m.grammar_false_friends({}, { locale: settings.interfaceLocale }),
    tutorial: m.tutorial({}, { locale: settings.interfaceLocale }),
    onboardingIntro: m.onboarding_intro({}, { locale: settings.interfaceLocale }),
    onboardingTitle: m.onboarding_title({}, { locale: settings.interfaceLocale }),
    onboardingSubtitle: m.onboarding_subtitle({}, { locale: settings.interfaceLocale }),
    onboardingLearningLanguage: m.onboarding_learning_language({}, { locale: settings.interfaceLocale }),
    interfaceLanguage: m.interface_language({}, { locale: settings.interfaceLocale }),
    streak: m.streak({}, { locale: settings.interfaceLocale }),
    streakDone: m.streak_done({}, { locale: settings.interfaceLocale }),
    streakProgress: m.streak_progress({}, { locale: settings.interfaceLocale }),
    streakTimeLeft: m.streak_time_left({}, { locale: settings.interfaceLocale }),
    streakGoalHint: m.streak_goal_hint({}, { locale: settings.interfaceLocale }),
    streakGoalChoose: m.streak_goal_choose({}, { locale: settings.interfaceLocale }),
    streakGoalWords: (count: number) => m.streak_goal_words({ count }, { locale: settings.interfaceLocale }),
    streakCountsToday: m.streak_counts_today({}, { locale: settings.interfaceLocale }),
    streakModeDone: m.streak_mode_done({}, { locale: settings.interfaceLocale }),
    story: m.story_title({}, { locale: settings.interfaceLocale }),
    homeStory: m.story_home({}, { locale: settings.interfaceLocale }),
    reading: m.reading_title({}, { locale: settings.interfaceLocale }),
    homeReading: m.reading_home({}, { locale: settings.interfaceLocale }),
    listen: m.story_listen({}, { locale: settings.interfaceLocale }),
    homeListen: m.story_listen_home({}, { locale: settings.interfaceLocale }),
    nameTitle: m.onboarding_name_title({}, { locale: settings.interfaceLocale }),
    nameLabel: m.onboarding_name_label({}, { locale: settings.interfaceLocale }),
    namePlaceholder: m.onboarding_name_placeholder({}, { locale: settings.interfaceLocale }),
    nameHint: m.onboarding_name_hint({}, { locale: settings.interfaceLocale }),
    continue: m.continue({}, { locale: settings.interfaceLocale }),
    homeCast: m.home_cast({}, { locale: settings.interfaceLocale }),
    petLilith: m.pet_lilith({}, { locale: settings.interfaceLocale })
  });

  function formatMinutes(minutes: number) {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${String(minutes % 60).padStart(2, '0')}m` : `${minutes}m`;
  }
  function finishRootOnboarding(language: Language) {
    settings.setLang(language);
    localStorage.setItem(ROOT_ONBOARDING_KEY, 'complete');
    rootOnboarding = false;
  }
  function submitName(event: SubmitEvent) {
    event.preventDefault();
    settings.setFirstName(nameDraft);
  }
  const interfaceOptions = interfaceLocales.map((locale) => ({ value: locale.code as string, label: locale.label }));
  function selectOnboardingInterfaceLocale(value: string) {
    if (interfaceLocales.some((locale) => locale.code === value)) settings.setInterfaceLocale(value as typeof settings.interfaceLocale);
  }
  let petting = $state(false);
  function petLilith() {
    playSoundEffect(settings.sound, 'purr');
    petting = false;
    requestAnimationFrame(() => (petting = true));
  }
  // Every mode that can qualify the day gets the same green/amber marker; the rest stay neutral.
  function streakClass(kind: StreakMode | null): string {
    if (!kind) return 'streak-none';
    return modeDone(settings.streak, kind) ? 'streak-done' : 'streak-pending';
  }
  const dailyGoal = $derived(settings.dailyGoal());
  // The ring shows how far today's vocabulary goal is met, or a full ring once any mode qualified.
  const goalProgress = $derived(settings.streak.qualified ? 1 : Math.min(1, settings.streak.vocabCorrect / Math.max(1, settings.streak.vocabularyGoal)));

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
      <span>{labels.onboardingIntro}</span>
      <label class="home-onboarding-field">
        <span>{labels.interfaceLanguage}</span>
        <SelectMenu class="w-full" value={settings.interfaceLocale} options={interfaceOptions} label={labels.interfaceLanguage} onchange={selectOnboardingInterfaceLocale} />
      </label>
      <p>{labels.onboardingLearningLanguage}</p>
      <h1>{labels.onboardingTitle}</h1>
      <div class="home-language-choice">{#each playableLanguages as language}<button type="button" class="btn-play" onclick={() => finishRootOnboarding(language.code)}>{language.label}</button>{/each}</div>
      <span>{labels.onboardingSubtitle}</span>
    </div>
  {:else if needsName}
    <form class="home-onboarding" onsubmit={submitName}>
      <div class="home-onboarding-cast" aria-hidden="true"><StoryCharacter id="mia" /><StoryCharacter id="tom" /><span class="home-lilith"><StoryCharacter id="lilith" /></span></div>
      <h1>{labels.nameTitle}</h1>
      <label class="home-onboarding-field">
        <span>{labels.nameLabel}</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input bind:value={nameDraft} type="text" name="given-name" autocomplete="given-name" autocapitalize="words" maxlength={FIRST_NAME_MAX_LENGTH} placeholder={labels.namePlaceholder} required autofocus />
      </label>
      <span>{labels.nameHint}</span>
      <button type="submit" class="btn-play btn-play-ink home-name-submit" disabled={!nameDraft.trim()}>{labels.continue}</button>
    </form>
  {:else}
    <UpdateAppHint />
    <InstallAppHint />
    <header class="home-header">
      <div class="home-family"><span class="home-family-people" aria-hidden="true"><StoryCharacter id="mia" /><StoryCharacter id="tom" /></span><button type="button" class="home-lilith-pet" class:petting onclick={petLilith} onanimationend={() => (petting = false)} aria-label={labels.petLilith}><span class="home-lilith"><StoryCharacter id="lilith" mood={petting ? 'happy' : 'neutral'} /></span></button></div>
      <h1>{labels.homeTitle}</h1><span class="home-cast-note">{labels.homeCast}</span>
    </header>
    <div class="home-streak-block">
      <a class:qualified={settings.streak.qualified} class="card-play home-streak" href="/progress" aria-label={`${labels.streak}: ${settings.streak.streakCount}`}>
        <span class="home-streak-flame" aria-hidden="true">
          <svg class="home-streak-ring" viewBox="0 0 36 36">
            <circle class="home-streak-ring-track" cx="18" cy="18" r="16" pathLength="100" />
            <circle class="home-streak-ring-value" cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="100" stroke-dashoffset={100 - goalProgress * 100} />
          </svg>
          <IconFlame />
        </span>
        <span class="home-streak-count"><strong>{settings.streak.streakCount}</strong><small>{labels.streak}</small></span>
        <span class="home-streak-detail">
          {#if settings.streak.qualified}<b>{labels.streakDone}</b>{:else}<b>{labels.streakProgress}: {settings.streak.vocabCorrect}/{settings.streak.vocabularyGoal}</b><small>{labels.streakTimeLeft}: {formatMinutes(settings.streak.minutesRemaining)}</small>{/if}
        </span>
        <IconChevronRight class="home-streak-arrow" aria-hidden="true" />
      </a>
      <div class="home-goal" role="group" aria-label={labels.streakGoalChoose}>
        <span class="home-goal-hint">{labels.streakGoalHint}</span>
        <div class="home-goal-options">
          {#each VOCABULARY_GOALS as goal (goal)}
            <button type="button" class="home-goal-option" class:active={goal === dailyGoal} aria-pressed={goal === dailyGoal} onclick={() => void settings.setDailyGoal(goal)}>{labels.streakGoalWords(goal)}</button>
          {/each}
        </div>
      </div>
    </div>
    <h2 class="home-group-heading">{labels.gamesGroup}</h2>
    <div class="home-games home-games--games">
      <div class="home-card-slot"><a class="card-play {streakClass('circle')}" href="/circle"><span class="home-icon" aria-hidden="true"><IconCrossword /></span><h2>{labels.modeCrossword}</h2><p>{labels.homeCircle}</p><TodayBadge done={modeDone(settings.streak, 'circle')} pendingLabel={labels.streakCountsToday} doneLabel={labels.streakModeDone} /></a><a class="btn-play btn-play-round btn-play-sm home-tutorial-link" href="/circle/tutorial" aria-label={labels.tutorial}><IconHelp aria-hidden="true" /></a></div>
      <a class="card-play {streakClass(null)}" href="/circle/definitions"><span class="home-icon" aria-hidden="true"><IconFactCheck /></span><h2>Kreuzwort</h2><p>Same crossword, but tap any square for that word's definition.</p></a>
      <div class="home-card-slot"><a class="card-play {streakClass('wordle')}" href="/wordle"><span class="home-icon" aria-hidden="true"><IconSpellcheck /></span><h2>{labels.modeWordle}</h2><p>{labels.homeWordle}</p><TodayBadge done={modeDone(settings.streak, 'wordle')} pendingLabel={labels.streakCountsToday} doneLabel={labels.streakModeDone} /></a><a class="btn-play btn-play-round btn-play-sm home-tutorial-link" href="/wordle/tutorial" aria-label={labels.tutorial}><IconHelp aria-hidden="true" /></a></div>
      <div class="home-card-slot"><a class="card-play {streakClass(null)}" href="/hangman"><span class="home-icon" aria-hidden="true"><IconHangman /></span><h2>{labels.modeHangman}</h2><p>Guess the hidden word one letter at a time.</p></a><a class="btn-play btn-play-round btn-play-sm home-tutorial-link" href="/hangman/tutorial" aria-label={labels.tutorial}><IconHelp aria-hidden="true" /></a></div>
    </div>
    <h2 class="home-group-heading">{labels.story}</h2>
    <div class="home-games">
      <a class="card-play {streakClass('story')}" href="/stories"><span class="home-icon" aria-hidden="true"><IconStory /></span><h2>{labels.story}</h2><p>{labels.homeStory}</p><TodayBadge done={modeDone(settings.streak, 'story')} pendingLabel={labels.streakCountsToday} doneLabel={labels.streakModeDone} /></a>
      <a class="card-play {streakClass('reading')}" href="/reading"><span class="home-icon" aria-hidden="true"><IconMenuBook /></span><h2>{labels.reading}</h2><p>{labels.homeReading}</p><TodayBadge done={modeDone(settings.streak, 'reading')} pendingLabel={labels.streakCountsToday} doneLabel={labels.streakModeDone} /></a>
      <a class="card-play {streakClass('listen')}" href="/listen"><span class="home-icon" aria-hidden="true"><IconHeadphones /></span><h2>{labels.listen}</h2><p>{labels.homeListen}</p><TodayBadge done={modeDone(settings.streak, 'listen')} pendingLabel={labels.streakCountsToday} doneLabel={labels.streakModeDone} /></a>
    </div>
    <h2 class="home-group-heading">{labels.vocabularyGroup}</h2>
    <div class="home-games">
      <a class="card-play {streakClass('vocab')}" href="/vocab"><span class="home-icon" aria-hidden="true"><IconQuiz /></span><h2>{labels.wordQuiz}</h2><p>{labels.homeVocab}</p><TodayBadge done={modeDone(settings.streak, 'vocab')} pendingLabel={labels.streakCountsToday} doneLabel={labels.streakModeDone} /></a>
      <a class="card-play {streakClass('pronunciation')}" href="/pronunciation"><span class="home-icon" aria-hidden="true"><IconMic /></span><h2>{labels.pronunciation}</h2><p>Listen to audio samples and practise speaking.</p><TodayBadge done={modeDone(settings.streak, 'pronunciation')} pendingLabel={labels.streakCountsToday} doneLabel={labels.streakModeDone} /></a>
      <a class="card-play {streakClass(null)}" href="/alltag"><span class="home-icon" aria-hidden="true"><IconEmoji /></span><h2>{labels.alltag}</h2><p>Präpositionen, Zahlen und Farben für den Alltag.</p></a>
      <a class="card-play {streakClass('grammar')}" href="/grammar?mode=falsefriends"><span class="home-icon" aria-hidden="true"><IconSwapHoriz /></span><h2>{labels.grammarFalseFriends}</h2><p>Wörter, die täuschend ähnlich aussehen, aber etwas anderes bedeuten.</p><TodayBadge done={modeDone(settings.streak, 'grammar')} pendingLabel={labels.streakCountsToday} doneLabel={labels.streakModeDone} /></a>
    </div>
    <h2 class="home-group-heading">{labels.grammarGroup}</h2>
    <div class="home-games">
      <a class="card-play {streakClass('grammar')}" href="/grammar?mode=fill"><span class="home-icon" aria-hidden="true"><IconEditNote /></span><h2>{labels.grammarFill}</h2><p>{labels.homeGrammar}</p><TodayBadge done={modeDone(settings.streak, 'grammar')} pendingLabel={labels.streakCountsToday} doneLabel={labels.streakModeDone} /></a>
      <a class="card-play {streakClass('grammar')}" href="/grammar?mode=determine"><span class="home-icon" aria-hidden="true"><IconFactCheck /></span><h2>{labels.grammarDetermine}</h2><p>Kasus, Genus, Numerus, Person und Tempus bestimmen.</p><TodayBadge done={modeDone(settings.streak, 'grammar')} pendingLabel={labels.streakCountsToday} doneLabel={labels.streakModeDone} /></a>
      <a class="card-play {streakClass('grammar')}" href="/grammar?mode=order"><span class="home-icon" aria-hidden="true"><IconSort /></span><h2>{labels.grammarOrder}</h2><p>Ordne Wörter und bilde einen korrekten Satz.</p><TodayBadge done={modeDone(settings.streak, 'grammar')} pendingLabel={labels.streakCountsToday} doneLabel={labels.streakModeDone} /></a>
    </div>
    <a class="btn-play btn-play-soft btn-play-sm home-settings-link" href="/settings"><IconSettings aria-hidden="true" /><span>{labels.settings}</span></a>
  {/if}
</section>

<style>
  .home-view { flex:1 1 auto;min-height:0;display:grid;align-content:safe center;gap:clamp(1rem,4vw,1.8rem);padding:clamp(.6rem,3vw,1.1rem) clamp(.7rem,3.4vw,1.25rem);overflow-x:hidden;overflow-y:auto; }
  .home-header { display:grid;gap:.35rem;text-align:center; }.home-group-heading { margin:0 -.1rem -.35rem;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase; }.home-header p,.home-onboarding>p { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }.home-header h1,.home-onboarding h1 { margin:0;color:#172a45 !important;text-shadow:0 1px 0 rgba(255,253,247,.72);font-family:'DM Serif Display',serif;font-size:clamp(2.1rem,10vw,3.35rem);font-weight:400;letter-spacing:-.05em;line-height:.9; }.home-onboarding>span { color:#596477;font-family:'DM Sans',sans-serif;font-size:.73rem;font-weight:700;line-height:1.4; }
  .home-settings-link { justify-self:center; }
  .home-streak-block { display:grid;justify-items:center;gap:.35rem;justify-self:center;width:min(100%,27rem); }
  .home-streak { display:grid;grid-template-columns:auto auto 1fr auto;gap:.7rem;align-items:center;width:100%;padding:.75rem .9rem;--tilt:-.4deg;text-align:left;cursor:pointer; }
  .home-streak-flame { position:relative;display:grid;place-items:center;width:2.15rem;height:2.15rem;flex:none;border:2px solid #172a45;border-radius:48% 52% 50% 50% / 52% 48% 52% 48%;background:#f7e2b0;color:#c9832f; }
  .home-streak-flame :global(svg:not(.home-streak-ring)) { width:1.2rem;height:1.2rem; }
  .home-streak-ring { position:absolute;inset:-.32rem;width:calc(100% + .64rem);height:calc(100% + .64rem);rotate:-90deg;overflow:visible; }
  .home-streak-ring-track { fill:none;stroke:rgba(23,42,69,.16);stroke-width:2.4; }
  .home-streak-ring-value { fill:none;stroke:#e6a527;stroke-width:2.4;stroke-linecap:round;transition:stroke-dashoffset .45s var(--play-ease); }
  .home-streak.qualified .home-streak-ring-value { stroke:#34824d; }
  .home-goal { display:flex;align-items:center;justify-content:center;gap:.45rem;flex-wrap:wrap; }
  .home-goal-hint { color:#596477;font-family:'DM Sans',sans-serif;font-size:.53rem;font-weight:800; }
  .home-goal-options { display:flex;gap:.25rem; }
  .home-goal-option { min-height:1.5rem;padding:.1rem .5rem;border:1.5px solid rgba(23,42,69,.3);border-radius:999px;background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.53rem;font-weight:900;cursor:pointer; }
  .home-goal-option.active { border-color:#172a45;background:#172a45;color:#fffdf7; }
  .home-goal-option:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }
  .home-streak-count { display:grid;gap:0;justify-items:start;min-width:2.6rem; }.home-streak-count strong { color:#172a45;font-family:'DM Serif Display',serif;font-size:1.65rem;font-weight:400;line-height:.85; }.home-streak-count small { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.5rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }
  .home-streak-detail { display:grid;gap:.15rem;justify-items:start; }.home-streak-detail b { color:#172a45;font-family:'DM Sans',sans-serif;font-size:.63rem;font-weight:800;line-height:1.3; }.home-streak-detail small { color:#596477;font-family:'DM Sans',sans-serif;font-size:.56rem;font-weight:800; }
  .home-streak :global(.home-streak-arrow) { width:1.2rem;height:1.2rem;flex:none;color:rgba(23,42,69,.4); }
  .home-streak.qualified .home-streak-flame { background:#cfe6d4;color:#34824d; }.home-streak.qualified .home-streak-count strong,.home-streak.qualified .home-streak-detail b { color:#34824d; }
  .home-family { position:relative;justify-self:center;display:flex;align-items:flex-end;height:6.2rem;margin-top:clamp(1rem,5vh,2.25rem);margin-bottom:.6rem; }
  .home-family-people { display:flex;align-items:flex-end;height:100%;padding:.55rem .9rem 0 .55rem;border:2px solid #172a45;border-bottom-width:0;border-radius:3.2rem 3.2rem .4rem .4rem;background:radial-gradient(circle at 50% 85%,#f7e2b0,#fbf1da 70%);overflow:hidden; }
  .home-family-people :global(.story-character) { width:4rem;height:5.4rem; }.home-family-people :global(.story-character + .story-character) { margin-inline-start:-.9rem; }
  .home-family::after { content:'';position:absolute;inset:auto -.6rem 0;height:2px;border-radius:2px;background:#172a45; }
  .home-lilith { display:block;width:4.4rem;height:5.5rem;margin-inline-start:-1.35rem;transform-origin:50% 100%;animation:lilith-breathe 4.5s ease-in-out infinite; }.home-lilith :global(.story-character) { width:100%;height:100%; }
  .home-lilith-pet { display:block;margin-inline-start:-1.35rem;padding:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;transform-origin:50% 100%; }.home-lilith-pet .home-lilith { margin:0; }
  .home-lilith-pet:focus-visible { outline:3px dashed #e6a527;outline-offset:2px;border-radius:1rem; }
  .home-lilith-pet.petting { animation:lilith-wiggle .9s var(--play-ease); }
  @keyframes lilith-wiggle { 0%,100% { rotate:0deg; } 20% { rotate:-4deg; } 45% { rotate:3deg; } 70% { rotate:-1.5deg; } }
  @media (prefers-reduced-motion:reduce) { .home-lilith-pet.petting { animation:none; } }
  .home-cast-note { justify-self:center;color:#596477;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:700; }
  @keyframes lilith-breathe { 0%,100% { scale:1; } 50% { scale:1.018 1.012; } }
  @media (prefers-reduced-motion:reduce) { .home-lilith { animation:none; } }
  .home-games { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem; }.home-games a.card-play,.home-streak { color:inherit;text-decoration:none; }.home-card-slot { position:relative;display:grid; }.home-games .card-play { position:relative;display:grid;grid-template-rows:auto auto 1fr;justify-items:center;gap:.3rem;padding:1rem .6rem .9rem;border-top-width:5px;text-align:center;cursor:pointer; }.home-games > :nth-child(4n+1) { --tilt:-.7deg; }.home-games > :nth-child(4n+2) { --tilt:.5deg; }.home-games > :nth-child(4n+3) { --tilt:-.3deg; }.home-games > :nth-child(4n) { --tilt:.6deg; }.home-games .card-play.streak-done { border-top-color:#34824d; }.home-games .card-play.streak-pending { border-top-color:#e6a527; }.home-games .card-play.streak-none { border-top-color:#172a45; }.home-icon { display:grid;place-items:center;width:2.6rem;height:2.6rem;border:2px solid #172a45;border-radius:48% 52% 46% 54% / 54% 46% 52% 48%;background:#f7e2b0;color:#a45e38;transition:rotate .25s var(--play-ease); }.home-icon :global(svg) { width:1.3rem;height:1.3rem; }.home-games h2 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:.98rem;font-weight:400;line-height:1.15; }.home-games p { margin:0;color:#596477;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:700;line-height:1.35; }.home-tutorial-link { position:absolute;top:.45rem;right:.45rem;box-shadow:2px 2px 0 #172a45;color:#a45e38; }
  .home-onboarding { width:min(100%,27rem);display:grid;justify-self:center;gap:.9rem;padding:clamp(1.15rem,6vw,1.8rem);border-radius:22px 14px 20px 15px / 15px 20px 14px 22px;border:2px solid #172a45;background:#fffdf7;box-shadow:4px 4px 0 #172a45;text-align:center; }.home-language-choice { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;margin-top:.45rem; }.home-language-choice button { min-width:0;min-height:2.8rem;font-size:.72rem;letter-spacing:.04em;text-transform:none; }.home-language-choice button:first-child { background:#172a45;color:#fffdf7; }
  .home-onboarding-field { display:grid;gap:.3rem;text-align:left; }.home-onboarding-field>span { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }
  .home-onboarding-cast { display:flex;justify-content:center;align-items:flex-end;gap:.4rem;height:5.2rem; }.home-onboarding-cast .home-lilith { width:3.7rem;height:4.6rem;margin-inline-start:-.6rem; }.home-onboarding-cast :global(.story-character) { width:4.4rem;height:100%; }
  .home-onboarding-field input { min-height:2.6rem;padding:0 .75rem;border-radius:.7rem;border:1px solid rgba(23,42,69,.28);background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:800; }.home-onboarding-field input:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }
  .home-name-submit { min-height:2.8rem;font-size:.72rem; }
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
    .home-streak-detail b { font-size:.74rem; }.home-streak-detail small { font-size:.66rem; }.home-streak-count small { font-size:.58rem; }
    .home-settings-link { font-size:.66rem; }
    .home-onboarding>span { font-size:.82rem; }.home-onboarding>p,.home-onboarding-field>span { font-size:.68rem; }.home-language-choice button,.home-name-submit { font-size:.8rem; }
  }
  @media (min-width:760px) { .home-games { grid-template-columns:repeat(4,minmax(0,1fr)); } }
  @media (min-width:700px) and (min-height:560px) { .home-view { padding:clamp(1.5rem,3.5vw,2.75rem) clamp(1.5rem,4vw,3rem); } }
  :global(html.dark) .home-onboarding-field input { border-color:rgba(255,253,247,.4);background:#213a5d;color:#fffdf7; }
  :global(html.dark) .home-header h1,:global(html.dark) .home-onboarding h1,:global(html.dark) .home-games h2 { color:#fffdf7 !important;text-shadow:none; }
  :global(html.dark) .home-family-people { border-color:#0b1626;background:radial-gradient(circle at 50% 85%,#2b4a73,#213a5d 70%); }:global(html.dark) .home-family::after { background:#0b1626; }
  :global(html.dark) .home-onboarding>span,:global(html.dark) .home-cast-note,:global(html.dark) .home-games p { color:rgba(255,253,247,.72); }
  :global(html.dark) .home-onboarding { border-color:#0b1626;background:#213a5d;box-shadow:4px 4px 0 #0b1626; }:global(html.dark) .home-games .card-play.streak-none { border-top-color:#0b1626; }
  :global(html.dark) .home-tutorial-link { box-shadow:2px 2px 0 #0b1626;color:#e6a527; }
  :global(html.dark) .home-icon,:global(html.dark) .home-streak-flame { border-color:#0b1626;background:#172a45;color:#e6a527; }
  :global(html.dark) .home-language-choice button:first-child { background:#e6a527;color:#172a45; }
  :global(html.dark) .home-streak-count strong,:global(html.dark) .home-streak-detail b { color:#fffdf7; }:global(html.dark) .home-streak-detail small { color:rgba(255,253,247,.72); }:global(html.dark) .home-streak :global(.home-streak-arrow) { color:rgba(255,253,247,.42); }:global(html.dark) .home-streak.qualified .home-streak-count strong,:global(html.dark) .home-streak.qualified .home-streak-detail b { color:#8ed8a2; }
  :global(html.dark) .home-streak-ring-track { stroke:rgba(255,253,247,.2); }
  :global(html.dark) .home-goal-hint { color:rgba(255,253,247,.72); }
  :global(html.dark) .home-goal-option { border-color:rgba(255,253,247,.32);background:#213a5d;color:#fffdf7; }
  :global(html.dark) .home-goal-option.active { border-color:#e6a527;background:#e6a527;color:#172a45; }
</style>
