<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { grade, type GradeResult } from '#lib/sentence/grading.js';
  import { sentencePrompts, promptIndex } from '#lib/sentence/prompt.js';

  const labels = $derived({
    title: m.mode_sentence({}, { locale: settings.interfaceLocale }),
    intro: m.home_sentence({}, { locale: settings.interfaceLocale }),
    placeholder: m.sentence_placeholder({}, { locale: settings.interfaceLocale }),
    submit: m.sentence_submit({}, { locale: settings.interfaceLocale }),
    reset: m.sentence_reset({}, { locale: settings.interfaceLocale })
  });

  let answer = $state('');
  let result = $state<GradeResult | null>(null);

  const currentPrompt = $derived(sentencePrompts[promptIndex]);
  const canSubmit = $derived(answer.trim().length >= 3);

  function submit() {
    if (!canSubmit) return;
    result = grade(answer, settings.lang, currentPrompt?.topic ?? '');
  }

  function reset() {
    answer = '';
    result = null;
  }
</script>

<svelte:head>
  <title>Words-SV - Sentence Composition</title>
  <meta name="description" content="Write a German sentence on a topic and get it graded." />
  <meta property="og:title" content="Words-SV - Sentence Composition" />
  <meta property="og:description" content="Write a German sentence on a topic and get it graded." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://words-sv.vercel.app/sentence" />
  <meta property="og:image" content="https://words-sv.vercel.app/pwa-512x512.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Words-SV - Sentence Composition" />
  <meta name="twitter:description" content="Write a German sentence on a topic and get it graded." />
  <meta name="twitter:image" content="https://words-sv.vercel.app/pwa-512x512.png" />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12">
  <h1 class="font-bold text-3xl">{labels.title}</h1>
  <p class="mt-2 text-base-content/70">{labels.intro}</p>

  <div class="card mt-6 bg-base-200">
    <div class="card-body">
      <div class="text-base font-semibold">{currentPrompt?.topic ?? ''}</div>
      {#if currentPrompt?.hint}
        <div class="mt-2 text-sm text-base-content/70">{currentPrompt.hint}</div>
      {/if}
    </div>
  </div>

  <textarea
    class="textarea mt-4 w-full"
    placeholder={labels.placeholder}
    bind:value={answer}
    rows={6}
  ></textarea>

  <div class="mt-4 flex gap-2">
    <button class="btn btn-primary" onclick={submit} disabled={!canSubmit}>{labels.submit}</button>
    {#if result}
      <button class="btn btn-ghost" onclick={reset}>{labels.reset}</button>
    {/if}
  </div>

  {#if result}
    <div class="card mt-6">
      <div class="card-body">
        <div class="text-2xl font-bold">
          {m.sentence_score({ score: Math.round(result.score * 100) }, { locale: settings.interfaceLocale })}
        </div>
        <div class="text-sm font-semibold mt-1">{result.verdict}</div>
        <ul class="mt-2 list-disc list-inside text-sm">
          {#each result.factors as factor}
            <li>{factor}</li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
</div>
