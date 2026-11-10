<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { logAnswer } from '#lib/progress/eventLog.js';
  import { onMount } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import type { GradeResult } from '#lib/sentence/grading.js';
  import { fullPromptForToday } from '#lib/sentence/prompt.js';
  import { canGrade, grader, runGrade } from '#lib/sentence/graderClient.svelte.js';
  import GraderGate from '#lib/sentence/GraderGate.svelte';
  import GradeResultCard from '#lib/sentence/GradeResultCard.svelte';
  import IconLightbulb from '~icons/material-symbols/lightbulb-rounded';
  import IconRestart from '~icons/material-symbols/restart-alt-rounded';

  const labels = $derived({
    title: m.mode_fullText({}, { locale: settings.interfaceLocale }),
    intro: m.home_fullText({}, { locale: settings.interfaceLocale }),
    placeholder: m.fullText_placeholder({}, { locale: settings.interfaceLocale }),
    submit: m.sentence_submit({}, { locale: settings.interfaceLocale }),
    reset: m.sentence_reset({}, { locale: settings.interfaceLocale }),
    showHint: m.fullText_hintButton({}, { locale: settings.interfaceLocale }),
    hideHint: m.fullText_hintHide({}, { locale: settings.interfaceLocale }),
    reference: m.fullText_reference({}, { locale: settings.interfaceLocale }),
    target: (target: number) => m.sentence_target({ target: String(target) }, { locale: settings.interfaceLocale }),
    words: (count: number) => m.sentence_words({ count: num(count) }, { locale: settings.interfaceLocale }),
    paragraphs: (count: number) => m.fullText_paragraphs({ count: num(count) }, { locale: settings.interfaceLocale }),
    aiSubmitting: m.grade_ai_submitting({}, { locale: settings.interfaceLocale }),
  });

  const prompt = fullPromptForToday();
  const DRAFT_KEY = `wordcircle-fulltext-draft-v1:${prompt.id}`;

  let answer = $state('');
  let result = $state<GradeResult | null>(null);
  let showReference = $state(false);

  const wordCount = $derived(answer.trim() ? answer.trim().split(/\s+/u).length : 0);
  const paragraphCount = $derived(answer.trim() ? answer.trim().split(/\n\s*\n/u).filter(Boolean).length : 0);
  const progress = $derived(Math.min(1, wordCount / prompt.targetWords));
  const canSubmit = $derived(wordCount >= 10);

  async function submit() {
    if (!canSubmit || grader.busy || !canGrade()) return;
    result = await runGrade(answer, settings.lang, 'full', prompt.topic);
    // The rubric score feeds the writing readiness on /progress.
    logAnswer(settings.lang, 'write', `WRITE:FULL:${prompt.topic}`, null, { level: settings.vocabularyLevel, score: result.score });
    void settings.recordStreak('sentence_completed');
  }

  function reset() {
    answer = '';
    result = null;
  }

  onMount(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) answer = draft;
    } catch {
      // A blocked storage just means no draft.
    }
  });

  // Keep the draft across visits without a save button.
  $effect(() => {
    const text = answer;
    try {
      if (text.trim()) localStorage.setItem(DRAFT_KEY, text);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore quota or privacy-mode failures.
    }
  });
</script>

<svelte:head>
  <title>{labels.title} · WordCircle</title>
  <meta name="description" content="Write a whole German paragraph on a topic and get it graded." />
  <meta property="og:title" content="WordCircle – Full text" />
  <meta property="og:description" content="Write a whole German paragraph on a topic and get it graded." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://words-sv.vercel.app/sentence/full" />
  <meta property="og:image" content="https://words-sv.vercel.app/pwa-512x512.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="WordCircle – Full text" />
  <meta name="twitter:description" content="Write a whole German paragraph on a topic and get it graded." />
  <meta name="twitter:image" content="https://words-sv.vercel.app/pwa-512x512.png" />
</svelte:head>

<section class="writing-view">
  <header class="writing-header">
    <p class="writing-kicker">{labels.title}</p>
    <h1>{labels.title}</h1>
    <p class="writing-intro">{labels.intro}</p>
  </header>

  <div class="writing-prompt">
    <p class="writing-prompt-topic">{prompt.topic}</p>
    {#if prompt.hint}
      <p class="writing-prompt-hint">{prompt.hint}</p>
    {/if}
    <button type="button" class="hint-toggle" onclick={() => (showReference = !showReference)} aria-expanded={showReference}>
      <IconLightbulb aria-hidden="true" />
      <span>{showReference ? labels.hideHint : labels.showHint}</span>
    </button>
    {#if showReference}
      <div class="reference-text">
        <p class="reference-label">{labels.reference}</p>
        <p class="reference-body" lang={settings.lang}>{prompt.reference}</p>
      </div>
    {/if}
  </div>

  <textarea
    class="writing-area"
    placeholder={labels.placeholder}
    bind:value={answer}
    rows={12}
    lang={settings.lang}
  ></textarea>

  <div class="writing-toolbar">
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax={prompt.targetWords} aria-valuenow={wordCount} aria-label={labels.target(prompt.targetWords)}>
      <div class="progress-fill" style:width={`${Math.round(progress * 100)}%`}></div>
    </div>
    <div class="writing-meta">
      <span class="target-hint">{labels.target(prompt.targetWords)}</span>
      <span>{labels.words(wordCount)}</span>
      <span>{labels.paragraphs(paragraphCount)}</span>
    </div>
  </div>

  <GraderGate />

  <div class="writing-actions">
    <button class="btn-play btn-play-ink" onclick={submit} disabled={!canSubmit || grader.busy || !canGrade()}>
      {grader.busy ? labels.aiSubmitting : labels.submit}
    </button>
    {#if answer}
      <button class="btn-play btn-play-soft" onclick={reset}><IconRestart aria-hidden="true" /><span>{labels.reset}</span></button>
    {/if}
  </div>

  {#if result}
    <GradeResultCard {result} />
  {/if}
</section>

<style>
  .writing-view { display: flex; flex-direction: column; gap: 0.8rem; width: min(100%, 44rem); margin: 0 auto; padding: clamp(0.8rem, 3vw, 1.4rem); }
  .writing-header { display: grid; gap: 0.2rem; text-align: center; }
  .writing-kicker { margin: 0; color: #a45e38; font-family: 'DM Sans', sans-serif; font-size: 0.58rem; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; }
  .writing-header h1 { margin: 0; color: #172a45; font-family: 'DM Serif Display', serif; font-size: clamp(1.6rem, 7vw, 2.3rem); font-weight: 400; letter-spacing: -0.03em; line-height: 1.02; }
  .writing-intro { max-width: 34rem; margin: 0 auto; color: #596477; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; font-weight: 700; line-height: 1.45; }
  .writing-prompt { display: grid; gap: 0.4rem; padding: 0.8rem 0.9rem; border: 1px solid rgba(23, 42, 69, 0.16); border-radius: 0.9rem; background: #fbf7ee; }
  .writing-prompt-topic { margin: 0; color: #172a45; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 800; line-height: 1.4; }
  .writing-prompt-hint { margin: 0; color: #596477; font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 600; line-height: 1.4; }
  .hint-toggle { display: inline-flex; align-items: center; gap: 0.35rem; justify-self: start; padding: 0.32rem 0.6rem; border: 1px solid rgba(164, 94, 56, 0.4); border-radius: 999px; background: transparent; color: #a45e38; font-family: 'DM Sans', sans-serif; font-size: 0.66rem; font-weight: 900; cursor: pointer; }
  .hint-toggle:hover { background: rgba(247, 226, 176, 0.6); }
  .hint-toggle:focus-visible { outline: 2px solid #e6a527; outline-offset: 2px; }
  .hint-toggle :global(svg) { width: 1rem; height: 1rem; }
  .reference-text { display: grid; gap: 0.2rem; padding: 0.6rem 0.7rem; border-radius: 0.7rem; background: rgba(247, 226, 176, 0.45); }
  .reference-label { margin: 0; color: #a45e38; font-family: 'DM Sans', sans-serif; font-size: 0.56rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
  .reference-body { margin: 0; color: #243449; font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 500; line-height: 1.6; }
  .writing-area { width: 100%; min-height: 16rem; padding: 0.9rem 1rem; border: 1px solid rgba(23, 42, 69, 0.2); border-radius: 0.9rem; background: #fffdf7; color: #243449; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; line-height: 1.8; resize: vertical; }
  .writing-area:focus-visible { outline: 2px solid #e6a527; outline-offset: 2px; }
  .writing-toolbar { display: grid; gap: 0.3rem; }
  .progress { height: 0.4rem; border-radius: 999px; background: rgba(23, 42, 69, 0.12); overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #e6a527, #34824d); transition: width 0.2s ease; }
  .writing-meta { display: flex; flex-wrap: wrap; gap: 0.6rem; justify-content: flex-end; color: #7b8494; font-family: 'DM Sans', sans-serif; font-size: 0.64rem; font-weight: 700; }
  .target-hint { margin-right: auto; }
  .writing-actions { display: flex; flex-wrap: wrap; gap: 0.45rem; }
  .writing-actions .btn-play :global(svg) { width: 1rem; height: 1rem; }
  :global(html.dark) .writing-header h1 { color: #fffdf7; }
  :global(html.dark) .writing-intro { color: rgba(255, 253, 247, 0.68); }
  :global(html.dark) .writing-prompt { border-color: rgba(255, 253, 247, 0.24); background: rgba(255, 253, 247, 0.06); }
  :global(html.dark) .writing-prompt-topic { color: #fffdf7; }
  :global(html.dark) .writing-prompt-hint { color: rgba(255, 253, 247, 0.7); }
  :global(html.dark) .reference-text { background: rgba(230, 165, 39, 0.16); }
  :global(html.dark) .reference-body { color: rgba(255, 253, 247, 0.9); }
  :global(html.dark) .writing-area { border-color: rgba(255, 253, 247, 0.24); background: #152b47; color: rgba(255, 253, 247, 0.9); }
  :global(html.dark) .progress { background: rgba(255, 253, 247, 0.14); }
</style>
