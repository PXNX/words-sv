<!--
  OpenRouter with the learner's own key (conversation/cloudModel.svelte.ts): off by default, then
  only where WebGPU does not work, or always. The model is set per learning language.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { checkLocalModel, localModel } from '#lib/conversation/localModel.svelte.js';
  import { cloud, cloudModelFor, clearCloud, setCloudKey, setCloudMode, setCloudModel, type CloudMode } from '#lib/conversation/cloudModel.svelte.js';
  import { DEFAULT_CLOUD_MODEL, OPENROUTER_KEYS_URL, OPENROUTER_MODELS_URL } from '#lib/conversation/openRouter.js';
  import { network } from '#lib/offline/network.svelte.js';
  import Segmented from './ui/Segmented.svelte';

  const locale = $derived({ locale: settings.interfaceLocale });
  const languageName = $derived.by(() => {
    try { return new Intl.DisplayNames([settings.interfaceLocale], { type: 'language' }).of(settings.lang) ?? settings.lang; } catch { return settings.lang; }
  });
  let keyDraft = $state(cloud.apiKey);
  // Follows the learning language when it changes in another part of the settings; typing overrides it until saved.
  let modelDraft = $derived(cloud.models[settings.lang] ?? '');

  const modes = $derived<ReadonlyArray<{ value: CloudMode; label: string }>>([
    { value: 'off', label: m.cloud_mode_off({}, locale) },
    { value: 'fallback', label: m.cloud_mode_fallback({}, locale) },
    { value: 'always', label: m.cloud_mode_always({}, locale) }
  ]);
  // Every change re-runs the router, so the conversation and the writing grader pick it up at once.
  function changed() { void checkLocalModel(true); }
  function chooseMode(mode: CloudMode) { setCloudMode(mode); changed(); }
  function saveKey() { setCloudKey(keyDraft); changed(); }
  function saveModel() { setCloudModel(settings.lang, modelDraft); changed(); }
  function forget() { clearCloud(); keyDraft = ''; changed(); }
</script>

<section class="cloud" aria-labelledby="cloud-heading">
  <h4 id="cloud-heading">{m.cloud_title({}, locale)}</h4>
  <p class="cloud-note">{m.cloud_intro({}, locale)}</p>
  <Segmented value={cloud.mode} options={modes} label={m.cloud_title({}, locale)} onchange={chooseMode} />
  <!-- The fields stay in place (only dimmed) while OpenRouter is off, so nothing jumps. -->
  <div class="cloud-fields" class:off={cloud.mode === 'off'} aria-hidden={cloud.mode === 'off'} inert={cloud.mode === 'off'}>
    <label>
      <span>{m.cloud_key({}, locale)} · <a href={OPENROUTER_KEYS_URL} target="_blank" rel="noreferrer">{m.cloud_key_get({}, locale)}</a></span>
      <span class="cloud-row">
        <input class="input input-bordered" type="password" autocomplete="off" spellcheck="false" placeholder="sk-or-…" bind:value={keyDraft} onchange={saveKey} />
        {#if cloud.apiKey}<button type="button" class="btn-play btn-play-sm btn-play-soft" onclick={forget}>{m.cloud_forget({}, locale)}</button>{/if}
      </span>
    </label>
    <label>
      <span>{m.cloud_model({ language: languageName }, locale)} · <a href={OPENROUTER_MODELS_URL} target="_blank" rel="noreferrer">{m.cloud_models_link({}, locale)}</a></span>
      <input class="input input-bordered" type="text" autocomplete="off" spellcheck="false" placeholder={cloud.models['*'] || DEFAULT_CLOUD_MODEL} bind:value={modelDraft} onchange={saveModel} />
    </label>
    <p class="cloud-status" aria-live="polite">
      {#if !cloud.apiKey}{m.cloud_status_no_key({}, locale)}
      {:else if localModel.provider === 'cloud'}{m.cloud_status_active({ model: cloudModelFor(settings.lang) }, locale)}{#if !network.online} · {m.offline_needs_network({}, locale)}{/if}
      {:else}{m.cloud_status_standby({}, locale)}{/if}
    </p>
    <p class="cloud-note">{m.cloud_privacy({}, locale)}</p>
  </div>
</section>

<style>
  .cloud { display:grid;gap:.55rem;margin-top:.9rem; }
  h4 { margin:0; }
  .cloud-note { margin:0;color:#596477;font-size:.7rem;font-weight:700;line-height:1.45; }
  .cloud-fields { display:grid;gap:.55rem;transition:opacity .2s ease; }
  .cloud-fields.off { opacity:.45; }
  label { display:grid;gap:.25rem;font-size:.7rem;font-weight:800;color:#243449; }
  label a { color:#a45e38; }
  .cloud-row { display:flex;gap:.4rem; }
  .cloud-row input { flex:1;min-width:0; }
  input { font-size:.82rem; }
  .cloud-status { margin:0;min-height:1.2em;color:#34824d;font-size:.7rem;font-weight:800; }
  :global(html.dark) .cloud-note { color:rgba(255,253,247,.68); }
  :global(html.dark) label { color:rgba(255,253,247,.9); }
  :global(html.dark) label a { color:#f0c46a; }
</style>
