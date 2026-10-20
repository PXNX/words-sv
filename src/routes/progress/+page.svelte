<script lang="ts">
  import { onMount } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { playableLanguages, wordMetadata, type Language } from '#lib/data/vocabulary.js';
  import { readVocabularyProgressByLanguage } from '#lib/vocab/spacedRepetition.js';
  import { readGrammarProgressByLanguage } from '#lib/grammar/learning.js';
  import { readMissedWords } from '#lib/story/missedWords.js';
  import IconExpand from '~icons/material-symbols/expand-more-rounded';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconPending from '~icons/material-symbols/radio-button-unchecked-rounded';
  import IconFlame from '~icons/material-symbols/local-fire-department-rounded';
  import Companion from '#lib/story/Companion.svelte';
  import type { Mood } from '#lib/story/stories.js';

  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  // Lilith is happy once today keeps the streak going and sad until it does.
  const streakMood = $derived<Mood>(settings.streak.qualified ? 'happy' : 'sad');

  const labels = $derived({
    title: m.stats_title({}, { locale: settings.interfaceLocale }),
    streak: m.streak({}, { locale: settings.interfaceLocale }),
    streakDone: m.streak_done({}, { locale: settings.interfaceLocale }),
    streakTimeLeft: m.streak_time_left({}, { locale: settings.interfaceLocale }),
    streakBest: m.streak_best({}, { locale: settings.interfaceLocale }),
    dailyGoal: m.stats_daily_goal({}, { locale: settings.interfaceLocale }),
    today: m.stats_today({}, { locale: settings.interfaceLocale }),
    modeCrossword: m.mode_crossword({}, { locale: settings.interfaceLocale }),
    modeWordle: m.mode_wordle({}, { locale: settings.interfaceLocale }),
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
    noneYet: m.stats_none_yet({}, { locale: settings.interfaceLocale })
  });

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
  onMount(() => {
    void settings.refreshStreak();
    streakTimer = window.setInterval(() => void settings.refreshStreak(), 30_000);
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
        <div class="mt-[.3rem] flex items-center gap-[.35rem]">
          <IconFlame aria-hidden="true" class={`w-[2.4rem] h-[2.4rem] ${settings.streak.qualified ? 'text-[#e8622c]' : 'text-base-content/30'}`} />
          <strong class="font-['DM_Serif_Display',serif] text-[2.8rem] font-normal leading-none text-base-content">{settings.streak.streakCount}</strong>
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
          <li class={`pip flex-1 h-[.6rem] ${index < settings.streak.vocabCorrect ? (settings.streak.qualified ? 'bg-[#34824d]' : 'bg-[#e6a527]') : 'bg-base-content/10'}`}></li>
        {/each}
      </ol>
      <p class="m-0 mt-[.45rem] text-[.62rem] font-extrabold text-base-content/70">
        {#if settings.streak.qualified}{labels.streakDone}{:else}{labels.streakTimeLeft}: {formatMinutes(settings.streak.minutesRemaining)}{/if}
      </p>
    </div>

    <div class="mt-[.7rem] flex flex-wrap items-center gap-x-4 gap-y-1 text-base-content text-[.64rem] font-extrabold" aria-label={labels.today}>
      {#each [{ label: labels.modeCrossword, done: settings.streak.circleCompleted }, { label: labels.modeWordle, done: settings.streak.wordleCompleted }] as mode (mode.label)}
        <span class="inline-flex items-center gap-[.25rem]">{#if mode.done}<IconCheck class="w-[1rem] h-[1rem] text-success" aria-label={labels.streakDone} />{:else}<IconPending class="w-[1rem] h-[1rem] text-base-content/35" aria-hidden="true" />{/if}{mode.label}</span>
      {/each}
    </div>

    <dl class="m-0 mt-[.8rem] pt-[.7rem] grid grid-cols-2 border-t border-base-content/[.14] dark:border-base-content/[.22]">
      <div class="grid gap-[.1rem] text-center"><dd class="m-0 order-1 font-['DM_Serif_Display',serif] text-[1.4rem] leading-none text-base-content">{settings.streak.bestStreak}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.streakBest}</dt></div>
      <div class="grid gap-[.1rem] text-center border-s border-base-content/[.14] dark:border-base-content/[.22]"><dd class="m-0 order-1 font-['DM_Serif_Display',serif] text-[1.4rem] leading-none text-base-content">{settings.completedRounds}</dd><dt class="order-2 text-base-content/60 text-[.54rem] font-extrabold tracking-[.06em] uppercase">{labels.completed}</dt></div>
    </dl>
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
</style>
