<!--
  A mock test per language level (assessment/mockTest.ts): reading, listening, language and a
  writing task, without feedback until the end, then a score per section against the pass marks.
  Where the browser transcribes speech, a spoken task follows the writing. Results are kept on the
  device; answers count for the skills on /progress like any practice.
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
  import { loadLevel, warmLanguage, wordPools } from '#lib/data/vocabulary.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { logAnswer } from '#lib/progress/eventLog.js';
  import { playWordClip } from '#lib/audio/wordBank.svelte.js';
  import { scoreRubric, type RubricScore } from '#lib/sentence/levelRubric.js';
  import RubricCard from '#lib/sentence/RubricCard.svelte';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import IconMic from '~icons/material-symbols/mic-rounded';
  import IconStop from '~icons/material-symbols/stop-rounded';
  import { scoreSpokenRubric } from '#lib/sentence/levelRubric.js';
  import type { Level } from '#lib/domain/types.js';
  import type { ReadingBlock } from '#lib/story/readingTexts.js';
  import { supportsExam, type ExamAnswer, type ExamEntry, type ExamItem } from './examItems.js';
  import { PLACEMENT_LEVELS, seededRandom } from './placement.js';
  import { appendMockResult, bestMockResult, buildMockTest, mockSections, type MockText, MOCK_PASS, MOCK_RESULTS_KEY, MOCK_SECTION_MIN, parseMockResults, scoreMockTest, type MockResult, type MockSection, type MockTest } from './mockTest.js';

  type Phase = 'loading' | 'intro' | 'questions' | 'writing' | 'speaking' | 'result' | 'unavailable';
  type Recognition = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; abort: () => void; onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null };
  type RecognitionCtor = new () => Recognition;

  const language = settings.lang;
  const locale = $derived({ locale: settings.interfaceLocale });
  const ms = (duration: number) => (prefersReducedMotion.current ? 0 : duration);

  let phase = $state<Phase>('loading');
  let levels = $state<Level[]>([]);
  let level = $state<Level>(settings.vocabularyLevel);
  let test = $state<MockTest<ReadingBlock> | null>(null);
  let starting = $state(false);
  let sections = $state<MockSection[]>([]);
  let sectionIndex = $state(0);
  let itemIndex = $state(0);
  let answers = $state<Partial<Record<MockSection, ExamAnswer[]>>>({});
  let text = $state('');
  let result = $state<MockResult | null>(null);
  let rubric = $state<RubricScore | null>(null);
  let history = $state<MockResult[]>([]);
  // Speaking: the transcript so far (final parts) and what is being heard right now.
  let speakingSupported = $state(false);
  let spoken = $state('');
  let hearing = $state('');
  let listening = $state(false);
  let spokenRubric = $state<RubricScore | null>(null);
  let recognition: Recognition | null = null;
  const entries: Partial<Record<Level, Record<string, ExamEntry>>> = {};

  const section = $derived(sections[sectionIndex]);
  const questions = $derived(section && section !== 'writing' && section !== 'speaking' && test ? test.items[section] : []);
  const item = $derived<ExamItem | undefined>(questions[itemIndex]);
  const best = $derived(bestMockResult(history, language, level));
  const words = $derived(text.trim() ? text.trim().split(/\s+/u).length : 0);
  const answered = $derived(Object.values(answers).reduce((sum, list) => sum + (list?.length ?? 0), 0));
  const totalQuestions = $derived(test ? test.items.reading.length + test.items.listening.length + test.items.language.length : 0);
  const extraSteps = $derived(sections.includes('speaking') ? 2 : 1);
  const progress = $derived(phase === 'speaking' ? (totalQuestions + 1) / (totalQuestions + extraSteps) : phase === 'writing' ? totalQuestions / (totalQuestions + extraSteps) : answered / Math.max(1, totalQuestions + extraSteps));
  const spokenWords = $derived(`${spoken} ${hearing}`.trim() ? `${spoken} ${hearing}`.trim().split(/\s+/u).length : 0);

  const sectionName = (key: MockSection) => ({ reading: m.mock_section_reading, text: m.mock_section_text, listening: m.mock_section_listening, language: m.mock_section_language, writing: m.mock_section_writing, speaking: m.mock_section_speaking })[key]({}, locale);
  // Leaving the page mid-recording releases the microphone.
  $effect(() => () => { listening = false; recognition?.abort(); });
  const recognitionCtor = (): RecognitionCtor | null => {
    if (typeof window === 'undefined') return null;
    const scope = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
  };
  const speechLocale = () => ({ de: 'de-DE', en: 'en-US', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT', uk: 'uk-UA' } as Record<string, string>)[language] ?? language;

  function readHistory(): MockResult[] {
    try { return parseMockResults(localStorage.getItem(MOCK_RESULTS_KEY)); } catch { return []; }
  }

  onMount(async () => {
    history = readHistory();
    speakingSupported = Boolean(recognitionCtor());
    await warmLanguage(language);
    const found: Level[] = [];
    for (const entry of PLACEMENT_LEVELS) {
      if (!wordPools[language]?.[entry]?.length) continue;
      const loaded = await loadLevel(language, entry);
      if (!supportsExam(loaded)) continue;
      entries[entry] = loaded;
      found.push(entry);
    }
    levels = found;
    if (!found.includes(level)) level = found[0] ?? level;
    phase = found.length ? 'intro' : 'unavailable';
  });

  // The level's reading texts come from the story catalog, which is large, so it loads only here.
  async function levelTexts(): Promise<Array<MockText<ReadingBlock>>> {
    try {
      const { readingCatalog } = await import('#lib/story/readingCatalog.js');
      return readingCatalog(language, level, false, settings.firstName || 'du').filter((item) => item.level === level).map((item) => ({ id: item.id, title: item.title, blocks: item.blocks, questions: item.questions }));
    } catch {
      return [];
    }
  }

  async function start() {
    if (starting) return;
    starting = true;
    const texts = await levelTexts();
    starting = false;
    const built = buildMockTest(language, level, entries[level] ?? {}, seededRandom(Date.now()), texts);
    test = built;
    sections = mockSections(built, { speaking: speakingSupported });
    sectionIndex = 0;
    itemIndex = 0;
    answers = {};
    text = '';
    spoken = '';
    hearing = '';
    result = null;
    rubric = null;
    spokenRubric = null;
    phase = sections[0] === 'writing' ? 'writing' : 'questions';
  }

  function choose(chosen: string | null) {
    if (!item || !section || section === 'writing' || section === 'speaking') return;
    answers = { ...answers, [section]: [...(answers[section] ?? []), { item, chosen }] };
    logAnswer(language, section === 'listening' ? 'listen' : 'mock', `MOCK:${item.id}`, chosen === item.correct, { level });
    haptic('tap');
    if (itemIndex < questions.length - 1) {
      itemIndex += 1;
      return;
    }
    itemIndex = 0;
    sectionIndex += 1;
    if (sections[sectionIndex] === 'writing') phase = 'writing';
  }

  function handIn() {
    if (sections.includes('speaking')) phase = 'speaking';
    else finish();
  }

  function startListening() {
    const Ctor = recognitionCtor();
    if (!Ctor || listening) return;
    const next = new Ctor();
    next.lang = speechLocale();
    next.continuous = true;
    next.interimResults = true;
    next.onresult = (event) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const part = event.results[index]!;
        const said = part[0]?.transcript ?? '';
        if (part.isFinal) spoken = `${spoken} ${said}`.trim();
        else interim += said;
      }
      hearing = interim.trim();
    };
    next.onerror = () => { listening = false; };
    next.onend = () => {
      // Browsers end a continuous session after a pause; keep listening until the learner stops.
      if (listening && recognition === next) { try { next.start(); } catch { listening = false; } }
    };
    recognition = next;
    listening = true;
    try { next.start(); } catch { listening = false; }
  }
  function stopListening() {
    listening = false;
    spoken = `${spoken} ${hearing}`.trim();
    hearing = '';
    recognition?.stop();
    recognition = null;
  }
  // Skipping the spoken part leaves it out of the result instead of counting it as zero.
  function skipSpeaking() {
    stopListening();
    sections = sections.filter((entry) => entry !== 'speaking');
    finish();
  }

  function finish() {
    if (!test) return;
    if (listening) stopListening();
    const speaking = sections.includes('speaking');
    rubric = scoreRubric(text, language, level);
    spokenRubric = speaking ? scoreSpokenRubric(spoken, language, level) : null;
    result = scoreMockTest(test, answers, text, language, Date.now(), speaking ? spoken : undefined);
    logAnswer(language, 'write', `MOCK:WRITE:${test.writing.id}`, null, { level, score: rubric.total });
    if (spokenRubric) logAnswer(language, 'speak', `MOCK:SPEAK:${test.speaking.id}`, null, { level, score: spokenRubric.total });
    history = appendMockResult(history, result);
    try { localStorage.setItem(MOCK_RESULTS_KEY, JSON.stringify(history)); } catch { /* the result is still shown */ }
    haptic(result.passed ? 'win' : 'success');
    phase = 'result';
  }

  async function speak(word: string) {
    if (!word) return;
    const playback = settings.clipVoices ? await playWordClip(language, word.toLocaleUpperCase()).catch(() => null) : null;
    if (playback || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = language;
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }
  $effect(() => {
    if (phase === 'questions' && item?.kind === 'listening' && item.word) void speak(item.word);
  });

  const prompt = $derived(!item ? '' : item.kind === 'comprehension' ? (item.word ?? '') : item.kind === 'meaning' ? m.placement_meaning({ word: item.word ?? '' }, locale) : item.kind === 'listening' ? m.placement_listening({}, locale) : item.kind === 'article' ? m.placement_article({}, locale) : m.placement_grammar({}, locale));
  const percent = (value: number) => `${num(Math.round(value * 100))} %`;
</script>

<section class="mock" dir={getTextDirection(settings.interfaceLocale)} lang={settings.interfaceLocale}>
  <header>
    <p class="mock-kicker">{m.mock_title({ level: level.toUpperCase() }, locale)}</p>
    <!-- Always there, so nothing below moves when the test starts -->
    <span class="mock-bar" aria-hidden="true" class:hidden={phase !== 'questions' && phase !== 'writing'}><i style={`width:${progress * 100}%`}></i></span>
  </header>

  {#if phase === 'loading'}
    <span class="loading loading-dots loading-md mock-loading" aria-label={m.mock_loading({}, locale)}></span>
  {:else if phase === 'intro'}
    <div class="mock-panel" in:fly={{ y: 16, duration: ms(320) }}>
      <span class="mock-lilith" aria-hidden="true"><StoryCharacter id="lilith" mood="curious" /></span>
      <h1>{m.mock_heading({}, locale)}</h1>
      <p>{m.mock_intro({ pass: percent(MOCK_PASS), min: percent(MOCK_SECTION_MIN) }, locale)}</p>
      <div class="mock-levels" role="radiogroup" aria-label={m.mock_level_label({}, locale)}>
        {#each levels as entry (entry)}
          <button type="button" role="radio" aria-checked={entry === level} class:active={entry === level} onclick={() => (level = entry)}>{entry.toUpperCase()}</button>
        {/each}
      </div>
      <p class="mock-best">{best ? m.mock_best({ percent: percent(best.total) }, locale) : ' '}</p>
      <button type="button" class="btn-play btn-play-ink mock-cta" onclick={start} disabled={starting}>{m.mock_start({ level: level.toUpperCase() }, locale)}</button>
    </div>
  {:else if phase === 'questions' && item && section}
    <p class="mock-section">{sectionName(section)} · {m.placement_question({ current: num(itemIndex + 1), total: num(questions.length) }, locale)}</p>
    {#if section === 'text' && test?.text}
      <!-- The text stays above the questions for the whole part, in its own scroll box. -->
      <article class="mock-text-box" lang={language} dir="ltr" aria-label={test.text.title}>
        <h2>{test.text.title}</h2>
        {#each test.text.blocks as block, index (index)}
          {#if block.kind === 'heading'}<h3>{block.text}</h3>{:else if block.kind === 'quote'}<p class="quote">„{block.text}“</p>{:else}<p>{block.text}</p>{/if}
        {/each}
      </article>
    {/if}
    {#key item.id}
      <div class="mock-card" in:fly={{ x: 24, duration: ms(220) }}>
        <p class="mock-prompt">{prompt}</p>
        {#if item.kind === 'listening'}
          <button type="button" class="btn-play btn-play-ink btn-play-round mock-listen" onclick={() => speak(item!.word ?? '')} aria-label={m.dictionary_listen({}, locale)}><IconVolume aria-hidden="true" /></button>
        {:else if item.kind === 'article'}
          <p class="mock-sentence" lang={language} dir="ltr"><span class="mock-gap">___</span> {item.word}</p>
        {:else if item.kind === 'grammar'}
          <p class="mock-sentence" lang={language} dir="ltr">{item.before}<span class="mock-gap">___</span>{item.after ? ` ${item.after}`.replace(/^ ([.,!?])/u, '$1') : ''}</p>
        {/if}
        <div class="mock-options" class:long={item.kind === 'meaning' || item.kind === 'listening' || item.kind === 'comprehension'} lang={language} dir="ltr">
          {#each item.options as option (option)}
            <button type="button" class="btn-play btn-play-choice" onclick={() => choose(option)}>{option}</button>
          {/each}
        </div>
        <button type="button" class="mock-skip" onclick={() => choose(null)}>{m.placement_skip({}, locale)}</button>
      </div>
    {/key}
  {:else if phase === 'writing' && test}
    <div class="mock-card" in:fly={{ x: 24, duration: ms(220) }}>
      <p class="mock-section">{sectionName('writing')}</p>
      <p class="mock-prompt">{settings.interfaceLocale === 'de' ? test.writing.de : test.writing.en}</p>
      <textarea class="mock-text" bind:value={text} rows={10} lang={language} placeholder={m.fullText_placeholder({}, locale)}></textarea>
      <p class="mock-words">{m.sentence_words({ count: num(words) }, locale)}</p>
      <button type="button" class="btn-play btn-play-ink mock-cta" onclick={handIn}>{sections.includes('speaking') ? m.mock_next({}, locale) : m.mock_finish({}, locale)}</button>
    </div>
  {:else if phase === 'speaking' && test}
    <div class="mock-card" in:fly={{ x: 24, duration: ms(220) }}>
      <p class="mock-section">{sectionName('speaking')}</p>
      <p class="mock-prompt">{settings.interfaceLocale === 'de' ? test.speaking.de : test.speaking.en}</p>
      <p class="mock-hint">{m.mock_speaking_hint({}, locale)}</p>
      <button type="button" class="btn-play btn-play-round mock-mic {listening ? 'btn-play-ink listening' : 'btn-play-soft'}" onclick={() => (listening ? stopListening() : startListening())} aria-pressed={listening} aria-label={listening ? m.mock_speaking_stop({}, locale) : m.mock_speaking_start({}, locale)}>
        {#if listening}<IconStop aria-hidden="true" />{:else}<IconMic aria-hidden="true" />{/if}
      </button>
      <p class="mock-transcript" lang={language} aria-live="polite">{spoken}{#if hearing} <span>{hearing}</span>{/if}{#if !spoken && !hearing}<span>{m.mock_speaking_empty({}, locale)}</span>{/if}</p>
      <p class="mock-words">{m.sentence_words({ count: num(spokenWords) }, locale)}</p>
      <button type="button" class="btn-play btn-play-ink mock-cta" onclick={finish} disabled={!spoken && !hearing}>{m.mock_finish({}, locale)}</button>
      <button type="button" class="mock-skip" onclick={skipSpeaking}>{m.mock_speaking_skip({}, locale)}</button>
    </div>
  {:else if phase === 'result' && result}
    <div class="mock-panel" in:scale={{ start: 0.88, duration: ms(380), easing: backOut }}>
      <span class="mock-lilith" aria-hidden="true"><StoryCharacter id="lilith" mood={result.passed ? 'happy' : 'curious'} /></span>
      <p class="mock-badge" class:passed={result.passed}>{percent(result.total)}</p>
      <h1>{result.passed ? m.mock_passed({ level: level.toUpperCase() }, locale) : m.mock_not_passed({ level: level.toUpperCase() }, locale)}</h1>
      <ol class="mock-scores">
        {#each sections as key (key)}
          {@const value = result.sections[key] ?? 0}
          <li class:low={value < MOCK_SECTION_MIN}><span>{sectionName(key)}</span><span class="mock-score-bar"><i style={`width:${value * 100}%`}></i></span><b>{percent(value)}</b></li>
        {/each}
      </ol>
      {#if rubric}<RubricCard {rubric} />{/if}
      {#if spokenRubric}<RubricCard rubric={spokenRubric} />{/if}
      <button type="button" class="btn-play btn-play-ink mock-cta" onclick={start}>{m.mock_again({}, locale)}</button>
      <button type="button" class="btn-play btn-play-soft mock-cta" onclick={() => (phase = 'intro')}>{m.mock_other_level({}, locale)}</button>
    </div>
  {:else}
    <div class="mock-panel"><p>{m.mock_unavailable({}, locale)}</p></div>
  {/if}
</section>

<style>
  .mock { flex:1;min-height:0;overflow-y:auto;display:grid;align-content:start;justify-items:center;gap:.9rem;width:min(100%,30rem);margin-inline:auto;padding:clamp(2.9rem,10vw,3.6rem) clamp(1rem,5vw,2rem) 1.5rem;text-align:center; }
  header { display:grid;gap:.45rem;width:100%; }
  .mock-kicker { margin:0;color:#a45e38;font-size:.84rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .mock-bar { height:.4rem;border-radius:999px;background:rgba(23,42,69,.12);overflow:hidden; }
  .mock-bar.hidden { visibility:hidden; }
  .mock-bar i { display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#e6a527,#34824d);transition:width .35s cubic-bezier(.23,1,.32,1); }
  .mock-loading { margin-top:4rem; }
  .mock-lilith { justify-self:center;display:block;width:5rem;height:6rem; }
  .mock-panel { display:grid;gap:.75rem;width:100%; }
  .mock h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.7rem,8vw,2.3rem);font-weight:400;line-height:1.05; }
  .mock-panel > p { margin:0;color:#596477;font-size:.95rem;font-weight:700;line-height:1.45; }
  .mock-levels { display:flex;flex-wrap:wrap;justify-content:center;gap:.4rem; }
  .mock-levels button { min-width:3rem;padding:.45rem .7rem;border:1.5px solid rgba(23,42,69,.2);border-radius:999px;background:transparent;color:#172a45;font:inherit;font-size:.95rem;font-weight:900;cursor:pointer;transition:background .2s ease,color .2s ease,border-color .2s ease; }
  .mock-levels button.active { border-color:#172a45;background:#172a45;color:#fffdf7; }
  .mock-best { min-height:1.2em;font-size:.9rem !important; }
  .mock-cta { width:100%;min-height:2.8rem;justify-content:center; }
  .mock-section { margin:0;justify-self:center;padding:.15rem .6rem;border-radius:999px;background:rgba(230,165,39,.18);color:#a45e38;font-size:.875rem;font-weight:900;letter-spacing:.08em; }
  .mock-card { display:grid;gap:.7rem;width:100%; }
  .mock-prompt { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.2rem,5.6vw,1.5rem);line-height:1.2; }
  .mock-sentence { margin:0;padding:.7rem .8rem;border-radius:.8rem;background:rgba(230,165,39,.1);color:#172a45;font-size:1rem;font-weight:800;line-height:1.5; }
  .mock-gap { display:inline-block;min-width:2.6rem;padding:0 .3rem;border-bottom:2px solid #a45e38;color:#a45e38; }
  .mock-listen { justify-self:center;width:3.4rem;height:3.4rem; }
  .mock-listen :global(svg) { width:1.5rem;height:1.5rem; }
  .mock-options { display:grid;grid-template-columns:1fr 1fr;gap:.5rem; }
  .mock-options.long { grid-template-columns:1fr; }
  .mock-options button { min-height:2.9rem;justify-content:center;text-align:center;text-transform:none;font-size:.95rem;line-height:1.35;white-space:normal; }
  .mock-options.long button { justify-content:flex-start;text-align:start;padding-block:.55rem; }
  .mock-skip { justify-self:center;padding:.3rem .5rem;border:0;background:none;color:#596477;font:inherit;font-size:.9rem;font-weight:800;text-decoration:underline;text-underline-offset:2px;cursor:pointer; }
  .mock-text { width:100%;min-height:14rem;padding:.8rem .9rem;border:1px solid rgba(23,42,69,.2);border-radius:.9rem;background:#fffdf7;color:#243449;font:inherit;font-size:1rem;font-weight:500;line-height:1.7;text-align:start;resize:vertical; }
  .mock-text:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }
  .mock-text-box { width:100%;max-height:min(42vh,20rem);overflow-y:auto;padding:.8rem .9rem;border:1px solid rgba(23,42,69,.16);border-radius:.9rem;background:#fffdf7;text-align:start; }
  .mock-text-box h2 { margin:0 0 .4rem;color:#172a45;font-family:'DM Serif Display',serif;font-size:1.15rem;font-weight:400; }
  .mock-text-box h3 { margin:.5rem 0 .2rem;color:#a45e38;font-size:.9rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase; }
  .mock-text-box p { margin:0 0 .45rem;color:#243449;font-size:.95rem;font-weight:500;line-height:1.6; }
  .mock-text-box p.quote { padding-inline-start:.6rem;border-inline-start:3px solid rgba(230,165,39,.6); }
  .mock-hint { margin:0;color:#596477;font-size:.9rem;font-weight:700;line-height:1.4; }
  .mock-mic { justify-self:center;width:4rem;height:4rem; }
  .mock-mic :global(svg) { width:1.7rem;height:1.7rem; }
  .mock-mic.listening { animation:mock-pulse 1.4s ease-in-out infinite; }
  @keyframes mock-pulse { 50% { box-shadow:0 0 0 .55rem rgba(230,165,39,.25); } }
  @media (prefers-reduced-motion: reduce) { .mock-mic.listening { animation:none; } }
  .mock-transcript { margin:0;min-height:7rem;padding:.7rem .8rem;border-radius:.8rem;background:rgba(230,165,39,.1);color:#172a45;font-size:1rem;font-weight:700;line-height:1.55;text-align:start; }
  .mock-transcript span { color:#7b8494; }
  .mock-words { margin:0;justify-self:end;color:#7b8494;font-size:.875rem;font-weight:800; }
  .mock-badge { justify-self:center;margin:0;padding:.4rem 1rem;border-radius:1rem;background:#c9604e;color:#fffdf7 !important;font-size:1.5rem !important;font-weight:900 !important; }
  .mock-badge.passed { background:#34824d; }
  .mock-scores { display:grid;gap:.4rem;margin:0;padding:0;list-style:none;text-align:start; }
  .mock-scores li { display:grid;grid-template-columns:6.5rem 1fr 3.2rem;align-items:center;gap:.5rem;font-size:.9rem;font-weight:900;color:#243449; }
  .mock-scores b { text-align:end; }
  .mock-score-bar { height:.45rem;border-radius:999px;background:rgba(23,42,69,.12);overflow:hidden; }
  .mock-score-bar i { display:block;height:100%;border-radius:inherit;background:#34824d; }
  .mock-scores li.low .mock-score-bar i { background:#c0392b; }
  :global(html.dark) .mock h1,:global(html.dark) .mock-prompt,:global(html.dark) .mock-sentence,:global(html.dark) .mock-scores li { color:#fffdf7; }
  :global(html.dark) .mock-panel > p { color:rgba(255,253,247,.72); }
  :global(html.dark) .mock-bar,:global(html.dark) .mock-score-bar { background:rgba(255,253,247,.14); }
  :global(html.dark) .mock-levels button { border-color:rgba(255,253,247,.3);color:#fffdf7; }
  :global(html.dark) .mock-levels button.active { border-color:#fffdf7;background:#fffdf7;color:#172a45; }
  :global(html.dark) .mock-text { border-color:rgba(255,253,247,.24);background:#152b47;color:rgba(255,253,247,.9); }
  :global(html.dark) .mock-skip { color:rgba(255,253,247,.7); }
  :global(html.dark) .mock-transcript { color:#fffdf7; }
  :global(html.dark) .mock-text-box { border-color:rgba(255,253,247,.24);background:#152b47; }
  :global(html.dark) .mock-text-box h2,:global(html.dark) .mock-text-box p { color:rgba(255,253,247,.92); }
  :global(html.dark) .mock-hint { color:rgba(255,253,247,.72); }
</style>
