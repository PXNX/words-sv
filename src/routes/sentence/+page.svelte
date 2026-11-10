<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { logAnswer } from '#lib/progress/eventLog.js';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import type { GradeResult } from '#lib/sentence/grading.js';
  import { shortPromptForToday } from '#lib/sentence/prompt.js';
  import { grader, runGrade } from '#lib/sentence/graderClient.svelte.js';
  import GraderGate from '#lib/sentence/GraderGate.svelte';
  import GradeResultCard from '#lib/sentence/GradeResultCard.svelte';

  const labels = $derived({
    title: m.mode_sentence({}, { locale: settings.interfaceLocale }),
    intro: m.home_sentence({}, { locale: settings.interfaceLocale }),
    placeholder: m.sentence_placeholder({}, { locale: settings.interfaceLocale }),
    submit: m.sentence_submit({}, { locale: settings.interfaceLocale }),
    reset: m.sentence_reset({}, { locale: settings.interfaceLocale }),
    aiSubmitting: m.grade_ai_submitting({}, { locale: settings.interfaceLocale }),
  });

  const prompt = shortPromptForToday();

  let answer = $state('');
  let result = $state<GradeResult | null>(null);

  const wordCount = $derived(answer.trim() ? answer.trim().split(/\s+/u).length : 0);
  const canSubmit = $derived(wordCount >= 2);

  async function submit() {
    if (!canSubmit || grader.busy) return;
    result = await runGrade(answer, settings.lang, 'short', prompt.topic);
    // The rubric score feeds the writing readiness on /progress.
    logAnswer(settings.lang, 'write', `WRITE:SHORT:${prompt.topic}`, null, { level: settings.vocabularyLevel, score: result.score });
    void settings.recordStreak('sentence_completed');
  }

  function reset() {
    answer = '';
    result = null;
  }
</script>

<svelte:head>
  <title>{labels.title} · WordCircle</title>
  <meta name="description" content="Write one or two German sentences on a topic and get them graded." />
  <meta property="og:title" content="WordCircle – Short sentence" />
  <meta property="og:description" content="Write one or two German sentences on a topic and get them graded." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://words-sv.vercel.app/sentence" />
  <meta property="og:image" content="https://words-sv.vercel.app/pwa-512x512.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="WordCircle – Short sentence" />
  <meta name="twitter:description" content="Write one or two German sentences on a topic and get them graded." />
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
  </div>

  <textarea
    class="writing-area"
    placeholder={labels.placeholder}
    bind:value={answer}
    rows={4}
    lang={settings.lang}
  ></textarea>

  <div class="writing-meta">
    <span>{m.sentence_words({ count: num(wordCount) }, { locale: settings.interfaceLocale })}</span>
  </div>

  <GraderGate />

  <div class="writing-actions">
    <button class="btn-play btn-play-ink" onclick={submit} disabled={!canSubmit || grader.busy}>
      {grader.busy ? labels.aiSubmitting : labels.submit}
    </button>
    {#if result}
      <button class="btn-play btn-play-soft" onclick={reset}>{labels.reset}</button>
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
  .writing-prompt { display: grid; gap: 0.25rem; padding: 0.8rem 0.9rem; border: 1px solid rgba(23, 42, 69, 0.16); border-radius: 0.9rem; background: #fbf7ee; }
  .writing-prompt-topic { margin: 0; color: #172a45; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 800; line-height: 1.4; }
  .writing-prompt-hint { margin: 0; color: #596477; font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 600; line-height: 1.4; }
  .writing-area { width: 100%; min-height: 7rem; padding: 0.8rem 0.9rem; border: 1px solid rgba(23, 42, 69, 0.2); border-radius: 0.9rem; background: #fffdf7; color: #243449; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; line-height: 1.7; resize: vertical; }
  .writing-area:focus-visible { outline: 2px solid #e6a527; outline-offset: 2px; }
  .writing-meta { display: flex; justify-content: flex-end; color: #7b8494; font-family: 'DM Sans', sans-serif; font-size: 0.64rem; font-weight: 700; }
  .writing-actions { display: flex; flex-wrap: wrap; gap: 0.45rem; }
  :global(html.dark) .writing-header h1 { color: #fffdf7; }
  :global(html.dark) .writing-intro { color: rgba(255, 253, 247, 0.68); }
  :global(html.dark) .writing-prompt { border-color: rgba(255, 253, 247, 0.24); background: rgba(255, 253, 247, 0.06); }
  :global(html.dark) .writing-prompt-topic { color: #fffdf7; }
  :global(html.dark) .writing-prompt-hint { color: rgba(255, 253, 247, 0.7); }
  :global(html.dark) .writing-area { border-color: rgba(255, 253, 247, 0.24); background: #152b47; color: rgba(255, 253, 247, 0.9); }
</style>
