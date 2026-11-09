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

<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/settings';
  import { grade, type GradeResult } from '#lib/sentence/grading';
  import { sentencePrompts, promptIndex } from '#lib/sentence/prompt';

  let answer = $state('');
  let result = $state<GradeResult | null>(null);

  const currentPrompt = sentencePrompts[promptIndex];
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

<div class="mx-auto max-w-2xl px-4 py-12">
  <h1 class="font-bold text-3xl">{m.mode_sentence()}</h1>
  <p class="mt-2 text-base-content/70">{m.home_sentence()}</p>

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
    placeholder={m.sentencePlaceholder ?? ''}
    bind:value={answer}
    rows={6}
  />

  <div class="mt-4 flex gap-2">
    <button class="btn btn-primary" onclick={submit} disabled={!canSubmit}>{m.sentenceSubmit()}</button>
    {#if result}
      <button class="btn btn-ghost" onclick={reset}>{m.sentenceReset()}</button>
    {/if}
  </div>

  {#if result}
    <div class="card mt-6">
      <div class="card-body">
        <div class="text-2xl font-bold">{m.sentenceScore({ score: Math.round(result.score * 100) })}</div>
        <div class="text-sm font-semibold mt-1">{m.sentenceVerdict(result.verdict)}</div>
        <ul class="mt-2 list-disc list-inside text-sm">
          {#each result.factors as factor}
            <li>{factor}</li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
</div>
