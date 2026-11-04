<!--
  "Models & storage" in the settings: the one place to download the models the app runs on the
  device (the story voices of the engine picked above, and the conversation partner's language
  model), with progress and live speed, and to see and free the space everything takes up.
  Downloads run as background jobs, so the learner can leave the settings while they continue.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { runJob } from '#lib/audio/backgroundJobs.svelte.js';
  import { forgetWordAudio } from '#lib/audio/wordBank.svelte.js';
  import { activeEngine, naturalMegabytes, naturalReady, naturalState, prepareNatural, unloadNaturalVoices } from '#lib/story/naturalVoices.svelte.js';
  import { checkLocalModel, loadLocalModel, localModel, MODEL_MEGABYTES, unloadLocalModel } from '#lib/conversation/localModel.svelte.js';
  import { unloadSupertonic } from '#lib/voice/supertonic.js';
  import { unloadVoxCPM } from '#lib/voice/voxcpm.js';
  import { voiceEngines, type VoiceEngineId } from '#lib/voice/engines.js';
  import { createSpeedMeter, formatSpeed } from '#lib/offline/downloadSpeed.js';
  import { deleteGroup, formatBytes, groupBytes, groupStored, keepStoragePersistent, storageSummary, storedGroupIds, type StoredGroup } from '#lib/offline/storage.js';
  import IconDownload from '~icons/material-symbols/download-rounded';
  import IconDelete from '~icons/material-symbols/delete-rounded';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconShield from '~icons/material-symbols/shield-rounded';

  const locale = $derived(settings.interfaceLocale);
  const engineNames: Record<VoiceEngineId, () => string> = {
    standard: () => m.voice_quality_standard({}, { locale }),
    natural: () => m.voice_quality_natural({}, { locale }),
    recorded: () => m.voice_quality_natural({}, { locale }),
    supertonic: () => m.voice_quality_supertonic({}, { locale }),
    voxcpm: () => m.voice_quality_voxcpm({}, { locale }),
    edge: () => 'Edge'
  };
  const groupNames: Record<StoredGroup, () => string> = {
    piper: () => m.models_group_piper({}, { locale }),
    supertonic: () => m.voice_quality_supertonic({}, { locale }),
    voxcpm: () => m.voice_quality_voxcpm({}, { locale }),
    conversation: () => m.models_conversation({}, { locale }),
    wordAudio: () => m.models_group_word_audio({}, { locale }),
    listening: () => m.models_group_listening({}, { locale })
  };

  const lang = $derived(settings.lang);
  const engine = $derived(activeEngine(lang));
  // Only engines that run a model on the device have something to download.
  const voiceDownloadable = $derived(voiceEngines[engine].onDevice && voiceEngines[engine].clips);
  const voiceStatus = $derived(naturalReady(lang) ? 'ready' : naturalState.status[lang] ?? 'idle');
  const voicePercent = $derived(Math.round((naturalState.progress[lang] ?? 0) * 100));
  let voiceSpeed = $state(0);
  const voiceMeter = createSpeedMeter();
  $effect(() => {
    const megabytes = naturalState.downloaded[lang] ?? 0;
    if (voiceStatus === 'loading') voiceSpeed = voiceMeter.sample(megabytes * 1_000_000);
    else { voiceSpeed = 0; voiceMeter.reset(); }
  });

  let sizes = $state<Partial<Record<StoredGroup, number>>>({});
  let stored = $state<Partial<Record<StoredGroup, boolean>>>({});
  let confirming = $state<StoredGroup | null>(null);
  let summary = $state({ usage: 0, quota: 0, persisted: false });

  async function refresh() {
    const entries = await Promise.all(storedGroupIds.map(async (group) => [group, await groupStored(group).catch(() => false), await groupBytes(group).catch(() => 0)] as const));
    stored = Object.fromEntries(entries.map(([group, has]) => [group, has]));
    sizes = Object.fromEntries(entries.map(([group, , bytes]) => [group, bytes]));
    summary = await storageSummary();
  }

  function downloadVoices() {
    const language = lang;
    void runJob(`voices|${engine}|${language}`, engineNames[engine](), '/settings', async (control) => {
      const report = window.setInterval(() => control.progress({ done: Math.round((naturalState.progress[language] ?? 0) * 100), total: 100 }), 500);
      try { await prepareNatural(language); } finally { window.clearInterval(report); }
    }).finally(refresh);
  }
  function downloadConversation() {
    void loadLocalModel().finally(refresh);
  }

  async function remove(group: StoredGroup) {
    if (confirming !== group) { confirming = group; return; }
    confirming = null;
    // Stop whatever uses the files before they go, so nothing reads half-deleted data.
    if (group === 'piper' || group === 'supertonic' || group === 'voxcpm') unloadNaturalVoices();
    if (group === 'supertonic') unloadSupertonic();
    if (group === 'voxcpm') unloadVoxCPM();
    if (group === 'conversation') unloadLocalModel();
    if (group === 'wordAudio') forgetWordAudio();
    await deleteGroup(group);
    await refresh();
  }

  async function keep() {
    await keepStoragePersistent();
    summary = await storageSummary();
  }

  onMount(() => {
    void checkLocalModel();
    void refresh();
  });
</script>

<section class="mt-[1.35rem] px-[.8rem] pt-[.7rem] pb-[.85rem] panel-play models" aria-labelledby="models-heading">
  <h2 id="models-heading">{m.models_title({}, { locale })}</h2>

  <div class="model-row">
    <div class="model-text">
      <strong>{m.models_voices({ engine: engineNames[engine]() }, { locale })}</strong>
      {#if !voiceDownloadable}
        <span>{m.models_voices_none({}, { locale })}</span>
      {:else if voiceStatus === 'loading'}
        <span class="model-progress"><span style:width={`${voicePercent}%`}></span></span>
        <span>{voicePercent}%{#if voiceSpeed} · {formatSpeed(voiceSpeed, locale)}{/if}</span>
      {:else if voiceStatus === 'ready'}
        <span class="model-ok"><IconCheck aria-hidden="true" /> {m.models_downloaded({}, { locale })}</span>
      {:else}
        <span>{m.models_size({ size: `~${naturalMegabytes(lang)} MB` }, { locale })}</span>
      {/if}
    </div>
    {#if voiceDownloadable && voiceStatus !== 'ready' && voiceStatus !== 'loading'}
      <button type="button" class="btn-play btn-play-sm btn-play-go" onclick={downloadVoices}><IconDownload aria-hidden="true" />{m.models_download({}, { locale })}</button>
    {/if}
  </div>

  <div class="model-row">
    <div class="model-text">
      <strong>{m.models_conversation({}, { locale })}</strong>
      {#if localModel.status === 'unsupported'}
        <span>{m.models_unsupported({}, { locale })}</span>
      {:else if localModel.status === 'loading'}
        <span class="model-progress"><span style:width={`${Math.round(localModel.progress * 100)}%`}></span></span>
        <span>{Math.round(localModel.progress * 100)}%{#if localModel.bytesPerSecond} · {formatSpeed(localModel.bytesPerSecond, locale)}{/if}</span>
      {:else if localModel.cached || localModel.status === 'ready'}
        <span class="model-ok"><IconCheck aria-hidden="true" /> {m.models_downloaded({}, { locale })}</span>
      {:else}
        <span>{m.models_size({ size: `~${MODEL_MEGABYTES} MB` }, { locale })}</span>
      {/if}
    </div>
    {#if localModel.status !== 'unsupported' && localModel.status !== 'loading' && localModel.status !== 'checking' && !localModel.cached && localModel.status !== 'ready'}
      <button type="button" class="btn-play btn-play-sm btn-play-go" onclick={downloadConversation}><IconDownload aria-hidden="true" />{m.models_download({}, { locale })}</button>
    {/if}
  </div>

  <h3>{m.models_stored({}, { locale })}</h3>
  {#if storedGroupIds.some((group) => stored[group])}
    <ul class="model-stored">
      {#each storedGroupIds.filter((group) => stored[group]) as group (group)}
        <li>
          <span>{groupNames[group]()}</span>
          <span class="model-size">{sizes[group] ? formatBytes(sizes[group]!, locale) : ''}</span>
          <button type="button" class="btn-play btn-play-sm btn-play-soft" class:confirm={confirming === group} onclick={() => remove(group)} onblur={() => { if (confirming === group) confirming = null; }}>
            <IconDelete aria-hidden="true" />{confirming === group ? m.models_confirm({}, { locale }) : m.models_delete({}, { locale })}
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="model-empty">{m.models_empty({}, { locale })}</p>
  {/if}

  <div class="model-summary">
    {#if summary.quota}<span>{m.models_usage({ used: formatBytes(summary.usage, locale), quota: formatBytes(summary.quota, locale) }, { locale })}</span>{/if}
    {#if summary.persisted}
      <span class="model-ok"><IconShield aria-hidden="true" /> {m.models_persisted({}, { locale })}</span>
    {:else}
      <button type="button" class="btn-play btn-play-sm btn-play-soft" onclick={keep}><IconShield aria-hidden="true" />{m.models_persist({}, { locale })}</button>
    {/if}
  </div>
</section>

<style>
  .models h2 { margin:0 0 .3rem;font-family:'DM Serif Display',serif;font-size:1.15rem;font-weight:400; }
  .models h3 { margin:.9rem 0 .3rem;font-size:.62rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;opacity:.65; }
  .model-row { display:flex;align-items:center;justify-content:space-between;gap:.8rem;padding:.6rem 0;border-top:1px solid color-mix(in srgb,currentColor 14%,transparent); }
  .model-text { flex:1;min-width:0;display:grid;gap:.25rem;font-size:.72rem;font-weight:700; }
  .model-text strong { font-size:.78rem;font-weight:900; }
  .model-text > span { opacity:.75; }
  .model-progress { display:block;height:.45rem;border-radius:999px;background:color-mix(in srgb,currentColor 14%,transparent);overflow:hidden;opacity:1 !important; }
  .model-progress span { display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#34824d,#6fcf8e);transition:width .25s ease; }
  .model-ok { display:inline-flex;align-items:center;gap:.25rem;color:#34824d;opacity:1 !important;font-size:.7rem;font-weight:800; }
  .model-ok :global(svg) { width:.95rem;height:.95rem; }
  .model-stored { display:grid;gap:.35rem;margin:0;padding:0;list-style:none; }
  .model-stored li { display:flex;align-items:center;gap:.6rem;font-size:.74rem;font-weight:800; }
  .model-stored li > span:first-child { flex:1; }
  .model-size { opacity:.6;font-variant-numeric:tabular-nums; }
  .model-stored .confirm { border-color:#b54442;color:#b54442; }
  .model-empty { margin:0;font-size:.72rem;opacity:.65; }
  .model-summary { display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.8rem;font-size:.68rem;font-weight:700;opacity:.85; }
  .models :global(.btn-play svg) { width:.95rem;height:.95rem; }
</style>
