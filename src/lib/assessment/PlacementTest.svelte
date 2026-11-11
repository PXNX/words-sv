<!--
  The placement test and checkpoints. Where the language has definitions (German) it asks real exam
  questions (assessment/examItems.ts): meanings, articles and grammar gaps, with "I don't know" and
  guessing-corrected scoring, adaptively from the learner's level. Other languages fall back to the
  yes/no format with invented words (assessment/placement.ts). The result can become their level.
-->
<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { onMount } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { loadLevel, warmLanguage, wordMetadata, wordPools } from '#lib/data/vocabulary.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { logAnswer } from '#lib/progress/eventLog.js';
  import { playWordClip } from '#lib/audio/wordBank.svelte.js';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import type { Level } from '#lib/domain/types.js';
  import type { Mood } from '#lib/story/stories.js';
  import { saveCheckpoint } from './checkpoints.js';
  import { examResult, examRound, nextExamLevel, scoreExamLevel, supportsExam, type ExamAnswer, type ExamEntry, type ExamItem } from './examItems.js';
  import { placementResult, placementRound, PLACEMENT_LEVELS, scoreLevel, seededRandom, testableLevels, type LevelScore, type PlacementAnswer, type PlacementItem } from './placement.js';

  type Phase = 'loading' | 'intro' | 'test' | 'result' | 'unavailable';
  // 'exam': multiple-choice questions; 'recognition': the yes/no fallback for languages without definitions.
  let format = $state<'exam' | 'recognition'>('recognition');
  let examLevels = $state<Level[]>([]);
  let examEntries: Partial<Record<Level, Record<string, ExamEntry>>> = {};
  let examItems = $state<ExamItem[]>([]);
  let examAnswers = $state<ExamAnswer[]>([]);
  let examResults = new Map<Level, boolean>();
  let examLevel = $state<Level>('a1');
  // The answer just given, shown for a moment (right in green, a wrong pick in red) before moving on.
  let reveal = $state<{ chosen: string | null } | null>(null);
  let phase = $state<Phase>('loading');
  let testable = $state<Level[]>([]);
  let levelIndex = $state(0);
  let items = $state<PlacementItem[]>([]);
  let itemIndex = $state(0);
  let answers = $state<PlacementAnswer[]>([]);
  let scores = $state<Array<{ level: Level; score: LevelScore }>>([]);
  let result = $state<Level>('a1');
  let applied = $state(false);
  let mood = $state<Mood>('curious');
  let corpus: string[] = [];
  let exclude = new Set<string>();
  let random = seededRandom(Date.now());

  const language = settings.lang;
  const locale = $derived({ locale: settings.interfaceLocale });
  const ms = (duration: number) => (prefersReducedMotion.current ? 0 : duration);
  const item = $derived(items[itemIndex]);
  const level = $derived(testable[levelIndex] ?? 'a1');
  const progress = $derived(testable.length ? (levelIndex + itemIndex / Math.max(1, items.length)) / testable.length : 0);

  const spelling = (key: string) => wordMetadata[language]?.[key]?.spelling ?? key.toLocaleLowerCase();
  const wordsOf = (target: Level) => (wordPools[language]?.[target] ?? []).map(spelling);

  onMount(async () => {
    await warmLanguage(language);
    testable = testableLevels(Object.fromEntries(PLACEMENT_LEVELS.map((entry) => [entry, wordPools[language]?.[entry]?.length ?? 0])));
    corpus = PLACEMENT_LEVELS.flatMap(wordsOf);
    exclude = new Set(corpus);
    // Exam questions for every level from A1 up that has enough definitions.
    const levels: Level[] = [];
    for (const entry of testable) {
      const entries = await loadLevel(language, entry);
      if (!supportsExam(entries)) break;
      examEntries[entry] = entries;
      levels.push(entry);
    }
    examLevels = levels;
    format = levels.length ? 'exam' : 'recognition';
    phase = testable.length ? 'intro' : 'unavailable';
  });

  function startLevel(index: number) {
    levelIndex = index;
    // German nouns are capitalised, so some invented words are too; otherwise the case gives them away.
    items = placementRound(wordsOf(testable[index]!), corpus, random, exclude).map((entry) => entry.real || language !== 'de' || random() < 0.5 ? entry : { ...entry, text: entry.text.charAt(0).toLocaleUpperCase('de') + entry.text.slice(1) });
    itemIndex = 0;
    answers = [];
  }
  function startExamLevel(next: Level) {
    examLevel = next;
    examItems = examRound(language, next, examEntries[next] ?? {}, random);
    examAnswers = [];
    itemIndex = 0;
    reveal = null;
  }
  function start() {
    random = seededRandom(Date.now());
    scores = [];
    phase = 'test';
    if (format === 'exam') {
      examResults = new Map();
      startExamLevel(nextExamLevel(examLevels, examResults, settings.vocabularyLevel) ?? examLevels[0]!);
    } else startLevel(0);
  }
  const examItem = $derived(examItems[itemIndex]);
  function choose(chosen: string | null) {
    if (!examItem || reveal) return;
    const correct = chosen === examItem.correct;
    examAnswers = [...examAnswers, { item: examItem, chosen }];
    // A listening question counts for the listening skill, the others for the placement (vocabulary).
    logAnswer(language, examItem.kind === 'listening' ? 'listen' : 'placement', `EXAM:${examItem.id}`, correct, { level: examLevel });
    haptic(correct ? 'success' : 'tap');
    mood = correct ? 'happy' : chosen === null ? 'curious' : 'sad';
    reveal = { chosen };
    window.setTimeout(advance, prefersReducedMotion.current ? 450 : 750);
  }
  function advance() {
    reveal = null;
    if (itemIndex < examItems.length - 1) {
      itemIndex += 1;
      return;
    }
    const score = scoreExamLevel(examAnswers);
    scores = [...scores, { level: examLevel, score: { hits: score.right, real: examAnswers.length, falseAlarms: score.wrong, fake: 0, score: score.score, passed: score.passed } }];
    examResults.set(examLevel, score.passed);
    const next = nextExamLevel(examLevels, examResults, settings.vocabularyLevel);
    if (next) return startExamLevel(next);
    finish(examResult(examLevels, examResults));
  }
  function finish(level: Level) {
    result = level;
    saveCheckpoint({ at: Date.now(), lang: language, level, scores: Object.fromEntries(scores.map((entry) => [entry.level, Math.round(entry.score.score * 100) / 100])) });
    mood = 'happy';
    phase = 'result';
    haptic('win');
  }
  const examPrompt = $derived(!examItem ? '' : examItem.kind === 'meaning' ? m.placement_meaning({ word: examItem.word ?? '' }, locale) : examItem.kind === 'listening' ? m.placement_listening({}, locale) : examItem.kind === 'article' ? m.placement_article({}, locale) : m.placement_grammar({}, locale));
  const optionState = (option: string) => !reveal || !examItem ? '' : option === examItem.correct ? 'right' : option === reveal.chosen ? 'wrong' : 'dim';
  function answer(known: boolean) {
    if (!item) return;
    const entry = { ...item, known };
    answers = [...answers, entry];
    logAnswer(language, 'placement', `PLACEMENT:${item.text}`, known === item.real, { level });
    haptic('tap');
    mood = known ? 'happy' : 'neutral';
    if (itemIndex < items.length - 1) {
      itemIndex += 1;
      return;
    }
    scores = [...scores, { level, score: scoreLevel(answers) }];
    const outcome = placementResult(scores, testable);
    if (outcome.done) finish(outcome.level);
    else startLevel(levelIndex + 1);
  }
  function apply() {
    settings.setVocabularyLevel(result);
    applied = true;
    haptic('success');
  }

  // Listening questions speak their word as they appear (and again on the button): the word bank's
  // clip when there is one, the browser's voice otherwise.
  async function speakExamWord(word: string) {
    if (!word) return;
    // The word bank keys clips by the upper-case word, like the pools.
    const playback = settings.clipVoices ? await playWordClip(language, word.toLocaleUpperCase()).catch(() => null) : null;
    if (playback) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = language;
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }
  $effect(() => {
    if (examItem?.kind === 'listening' && examItem.word) void speakExamWord(examItem.word);
  });
</script>

<svelte:window onkeydown={(event) => { if (phase !== 'test' || format !== 'recognition') return; if (event.key === 'ArrowRight') answer(true); else if (event.key === 'ArrowLeft') answer(false); }} />

<section class="placement" dir={getTextDirection(settings.interfaceLocale)} lang={settings.interfaceLocale}>
  <header>
    <p class="placement-kicker">{m.placement_title({}, locale)}</p>
    {#if phase === 'test' && format === 'recognition'}<span class="placement-bar" aria-hidden="true"><i style={`width:${progress * 100}%`}></i></span>{/if}
    {#if phase === 'test' && format === 'exam'}<span class="placement-bar" aria-hidden="true"><i style={`width:${(itemIndex / Math.max(1, examItems.length)) * 100}%`}></i></span>{/if}
  </header>
  <span class="placement-lilith" aria-hidden="true"><StoryCharacter id="lilith" {mood} /></span>

  {#if phase === 'intro'}
    <div class="placement-panel" in:fly={{ y: 16, duration: ms(320) }}>
      <h1>{m.placement_heading({}, locale)}</h1>
      <p>{format === 'exam' ? m.placement_intro_exam({}, locale) : m.placement_intro({}, locale)}</p>
      <button type="button" class="btn-play btn-play-ink placement-cta" onclick={start}>{m.placement_start({}, locale)}</button>
    </div>
  {:else if phase === 'test' && format === 'exam' && examItem}
    <p class="placement-level">{examLevel.toUpperCase()} · {m.placement_question({ current: num(itemIndex + 1), total: num(examItems.length) }, locale)}</p>
    {#key examItem.id}
      <div class="exam-card" in:fly={{ x: 24, duration: ms(240) }}>
        <p class="exam-prompt">{examPrompt}</p>
        {#if examItem.kind === 'listening'}
          <button type="button" class="btn-play btn-play-ink btn-play-round exam-listen" onclick={() => speakExamWord(examItem!.word ?? '')} aria-label={m.dictionary_listen({}, locale)}><IconVolume aria-hidden="true" /></button>
          {#if reveal}<p class="exam-sentence" lang={language} dir="ltr">{examItem.word}</p>{/if}
        {:else if examItem.kind === 'article'}
          <p class="exam-sentence" lang={language} dir="ltr"><span class="exam-gap">{reveal ? examItem.correct : '___'}</span> {examItem.word}</p>
        {:else if examItem.kind === 'grammar'}
          <p class="exam-sentence" lang={language} dir="ltr">{examItem.before}<span class="exam-gap">{reveal ? examItem.correct : '___'}</span>{examItem.after ? ` ${examItem.after}`.replace(/^ ([.,!?])/u, '$1') : ''}</p>
        {/if}
        <div class="exam-options" class:long={examItem.kind === 'meaning' || examItem.kind === 'listening'} lang={language} dir="ltr">
          {#each examItem.options as option (option)}
            <button type="button" class="btn-play btn-play-choice {optionState(option)}" onclick={() => choose(option)} disabled={Boolean(reveal)}>{option}</button>
          {/each}
        </div>
        <button type="button" class="exam-skip" onclick={() => choose(null)} disabled={Boolean(reveal)}>{m.placement_skip({}, locale)}</button>
      </div>
    {/key}
  {:else if phase === 'test' && item}
    <p class="placement-level">{level.toUpperCase()}</p>
    {#key `${levelIndex}-${itemIndex}`}
      <p class="placement-word" lang={language} dir="ltr" in:scale={{ start: 0.8, duration: ms(260), easing: backOut }}>{item.text}</p>
    {/key}
    <div class="placement-answers">
      <button type="button" class="btn-play btn-play-soft" onclick={() => answer(false)}>{m.placement_unknown({}, locale)}</button>
      <button type="button" class="btn-play btn-play-ink" onclick={() => answer(true)}>{m.placement_known({}, locale)}</button>
    </div>
    <p class="placement-note">{m.placement_note({}, locale)}</p>
  {:else if phase === 'result'}
    <div class="placement-panel" in:scale={{ start: 0.85, duration: ms(380), easing: backOut }}>
      <p class="placement-badge">{result.toUpperCase()}</p>
      <h1>{m.placement_result_title({ level: result.toUpperCase() }, locale)}</h1>
      <p>{m.placement_result_body({}, locale)}</p>
      {#if scores.length}
        <ol class="placement-scores">
          {#each [...scores].sort((a, b) => PLACEMENT_LEVELS.indexOf(a.level) - PLACEMENT_LEVELS.indexOf(b.level)) as entry (entry.level)}
            <li class:passed={entry.score.passed}><span>{entry.level.toUpperCase()}</span><span class="placement-score-bar"><i style={`width:${Math.max(0, entry.score.score) * 100}%`}></i></span><b>{Math.round(Math.max(0, entry.score.score) * 100)} %</b></li>
          {/each}
        </ol>
      {/if}
      {#if result === settings.vocabularyLevel || applied}
        <p class="placement-applied">{m.placement_applied({}, locale)}</p>
        <a class="btn-play btn-play-ink placement-cta" href="/">{m.placement_done({}, locale)}</a>
      {:else}
        <button type="button" class="btn-play btn-play-ink placement-cta" onclick={apply}>{m.placement_apply({ level: result.toUpperCase() }, locale)}</button>
      {/if}
      <button type="button" class="btn-play btn-play-soft placement-cta" onclick={start}>{m.placement_again({}, locale)}</button>
    </div>
  {:else if phase === 'unavailable'}
    <div class="placement-panel"><p>{m.placement_unavailable({}, locale)}</p></div>
  {/if}
</section>

<style>
  .exam-listen { justify-self:center;width:3.4rem;height:3.4rem; }
  .exam-listen :global(svg) { width:1.5rem;height:1.5rem; }
  .placement { flex:1;min-height:0;overflow-y:auto;display:grid;align-content:start;justify-items:center;gap:.9rem;width:min(100%,28rem);margin-inline:auto;padding:clamp(2.9rem,10vw,3.6rem) clamp(1rem,5vw,2rem) 1.5rem;text-align:center; }
  header { display:grid;gap:.45rem;width:100%; }
  .placement-kicker { margin:0;color:#a45e38;font-size:.84rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .placement-bar { height:.4rem;border-radius:999px;background:rgba(23,42,69,.12);overflow:hidden; }
  .placement-bar i { display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#e6a527,#34824d);transition:width .35s cubic-bezier(.23,1,.32,1); }
  .placement-lilith { display:block;width:5rem;height:6rem; }
  .placement-panel { display:grid;gap:.75rem;width:100%; }
  .placement h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.7rem,8vw,2.3rem);font-weight:400;line-height:1; }
  .placement-panel p { margin:0;color:#596477;font-size:.95rem;font-weight:700;line-height:1.45; }
  .placement-cta { width:100%;min-height:2.8rem;justify-content:center; }
  .placement-level { margin:0;padding:.15rem .6rem;border-radius:999px;background:rgba(230,165,39,.18);color:#a45e38;font-size:.875rem;font-weight:900;letter-spacing:.08em; }
  .placement-word { margin:.4rem 0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(2.2rem,11vw,3.2rem);line-height:1.05;word-break:break-word; }
  .placement-answers { display:grid;grid-template-columns:1fr 1fr;gap:.6rem;width:100%; }
  .placement-answers button { min-height:3rem;justify-content:center; }
  .placement-note { margin:0;color:#596477;font-size:.84rem;font-weight:700;opacity:.8; }
  .placement-badge { justify-self:center;margin:0;padding:.4rem 1rem;border-radius:1rem;background:#34824d;color:#fffdf7 !important;font-size:1.6rem !important;font-weight:900 !important; }
  .placement-applied { color:#34824d !important;font-weight:900 !important; }
  .exam-card { display:grid;gap:.7rem;width:100%; }
  .exam-prompt { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.25rem,6vw,1.6rem);line-height:1.15; }
  .exam-sentence { margin:0;padding:.7rem .8rem;border-radius:.8rem;background:rgba(230,165,39,.1);color:#172a45;font-size:1rem;font-weight:800;line-height:1.5; }
  .exam-gap { display:inline-block;min-width:2.6rem;padding:0 .3rem;border-bottom:2px solid #a45e38;color:#a45e38; }
  .exam-options { display:grid;grid-template-columns:1fr 1fr;gap:.5rem; }
  .exam-options.long { grid-template-columns:1fr; }
  .exam-options button { min-height:2.9rem;justify-content:center;text-align:center;text-transform:none;font-size:.95rem;line-height:1.35;white-space:normal; }
  .exam-options.long button { justify-content:flex-start;text-align:start;padding-block:.55rem; }
  .exam-options button:disabled { opacity:1; }
  .exam-options button.right { border-color:#34824d;background:#34824d;color:#fffdf7; }
  .exam-options button.wrong { border-color:#c0392b;background:#fdecea;color:#b03224;box-shadow:none; }
  .exam-options button.dim { opacity:.55; }
  .exam-skip { justify-self:center;padding:.3rem .5rem;border:0;background:none;color:#596477;font:inherit;font-size:.9rem;font-weight:800;text-decoration:underline;text-underline-offset:2px;cursor:pointer; }
  .placement-scores { display:grid;gap:.35rem;margin:0;padding:0;list-style:none; }
  .placement-scores li { display:grid;grid-template-columns:2rem 1fr 3rem;align-items:center;gap:.5rem;font-size:.9rem;font-weight:900; }
  .placement-score-bar { height:.45rem;border-radius:999px;background:rgba(23,42,69,.12);overflow:hidden; }
  .placement-score-bar i { display:block;height:100%;border-radius:inherit;background:#c0392b; }
  .placement-scores li.passed .placement-score-bar i { background:#34824d; }
  :global(html.dark) .exam-prompt,:global(html.dark) .exam-sentence { color:#fffdf7; }
  :global(html.dark) .exam-options button.wrong { border-color:#f08a7e;background:rgba(192,57,43,.22);color:#ffc2b8; }
  :global(html.dark) .exam-skip { color:rgba(255,253,247,.7); }
  :global(html.dark) .placement h1,:global(html.dark) .placement-word { color:#fffdf7; }
  :global(html.dark) .placement-panel p,:global(html.dark) .placement-note { color:rgba(255,253,247,.72); }
  :global(html.dark) .placement-bar { background:rgba(255,253,247,.14); }
</style>
