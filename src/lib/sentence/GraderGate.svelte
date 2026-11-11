<!--
  Writing is graded by fixed rules until the on-device language model is downloaded; then by the
  model, unless the learner switches it off. Shows the download button, its progress, why grading
  uses rules on a device without WebGPU, or the "without AI / with AI" switch, plus any fallback
  notice of the last grade.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { chosenModel, loadLocalModel, localModel, modelGpuMB } from '#lib/conversation/localModel.svelte.js';
  import ModelStatus from '#lib/offline/ModelStatus.svelte';
  import { confirmDownload } from '#lib/offline/downloadConsent.svelte.js';
  import DownloadProgress from '#lib/offline/DownloadProgress.svelte';
  import { modelProgressPhase } from '#lib/offline/progressPhase.js';
  import { formatBytes } from '#lib/offline/storage.js';
  import AiSwitch from '#lib/conversation/AiSwitch.svelte';
  import { prefersWithoutAi } from '#lib/conversation/aiChoice.svelte.js';
  import { grader, graderAvailability, prepareGrader } from './graderClient.svelte.js';
  import IconDownload from '~icons/material-symbols/download-rounded';

  const locale = $derived({ locale: settings.interfaceLocale });
  const availability = $derived(graderAvailability());
  const model = $derived(chosenModel());

  onMount(() => void prepareGrader());
  async function download() {
    if (await confirmDownload(model.downloadMB, model.label)) await loadLocalModel();
  }
</script>

<div class="grader-gate" aria-live="polite">
  {#if availability === 'missing'}
    <p>{m.grade_model_needed({ model: model.label, size: formatBytes(model.downloadMB * 1_000_000, settings.formatContext) }, locale)}</p>
    <button type="button" class="btn-play btn-play-ink" onclick={() => void download()}><IconDownload aria-hidden="true" />{m.grade_model_download({}, locale)}</button>
    {#if localModel.status === 'failed'}<p class="grader-warn">{m.grade_model_failed({}, locale)}</p>{/if}
  {:else if availability === 'loading'}
    <DownloadProgress progress={localModel.progress} phase={modelProgressPhase(localModel.text)} bytesPerSecond={localModel.bytesPerSecond} detail={model.label} />
    <p>{m.grade_model_loading_rules({}, locale)}</p>
  {:else if availability === 'unsupported'}
    <p class="grader-warn">{m.grade_model_unsupported({}, locale)}</p>
  {:else if availability === 'ready'}
    <AiSwitch mode="writing" />
    {#if prefersWithoutAi('writing')}
      <p>{m.grade_rules_chosen({}, locale)}</p>
    {:else}
      <ModelStatus downloaded inMemory={localModel.status === 'ready'} downloadMB={model.downloadMB} memoryMB={modelGpuMB(model)} hint={false} />
      <p>{localModel.status === 'ready' ? m.grade_model_in_memory({ model: model.label }, locale) : m.grade_model_on_device({ model: model.label }, locale)}</p>
    {/if}
  {/if}
  {#if grader.notice === 'failed'}<p class="grader-warn">{m.grade_ai_failed({}, locale)}</p>{/if}
</div>

<style>
  .grader-gate { display:grid;gap:.5rem;padding:.7rem .85rem;border:1px dashed rgba(23,42,69,.25);border-radius:.8rem;color:#596477; }
  .grader-gate p { margin:0;font-family:'DM Sans',sans-serif;font-size:.875rem;font-weight:700;line-height:1.45; }
  .grader-gate button { justify-self:start; }
  .grader-gate button :global(svg) { width:1rem;height:1rem; }
  .grader-warn { color:var(--color-accent); }
  :global(html.dark) .grader-gate { border-color:rgba(255,253,247,.28);color:rgba(255,253,247,.72); }
</style>
