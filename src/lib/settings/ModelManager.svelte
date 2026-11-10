<!--
  "Models & storage" in the settings: the one place to choose and download every model the app runs
  on the device (the story and listening voices, passed in as the `voices` snippet with their
  controls, and the conversation partner's language model), with what each takes (download, disk, memory) and what is in use right now
  (GPU, page memory, writing speed), and to see and free the space everything takes up.
  Downloads run as background jobs, so the learner can leave the settings while they continue.
-->
<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { runJob } from '#lib/audio/backgroundJobs.svelte.js';
  import { forgetWordAudio } from '#lib/audio/wordBank.svelte.js';
  import { activeEngine, naturalReady, naturalState, naturalSupported, piperMegabytes, prepareNatural, unloadNaturalVoices } from '#lib/story/naturalVoices.svelte.js';
  import { cancelModelDownload, checkLocalModel, chooseModel, deleteModel, downloadModelFiles, localModel, modelGpuMB, pageMemoryMB, unloadLocalModel } from '#lib/conversation/localModel.svelte.js';
  import { chatModels, isRecommended, likelyFits, type ChatModel } from '#lib/conversation/models.js';
  import { unloadSupertonic } from '#lib/voice/supertonic.js';
  import { unloadStyleTts } from '#lib/voice/styleTts.js';
  import { deviceAbilities, engineFootprint, speaksLanguage, voiceEngineIds, voiceEngines, type VoiceEngineId } from '#lib/voice/engines.js';
  import DownloadProgress from '#lib/offline/DownloadProgress.svelte';
  import ModelStatus from '#lib/offline/ModelStatus.svelte';
  import { confirmDownload } from '#lib/offline/downloadConsent.svelte.js';
  import { modelProgressPhase } from '#lib/offline/progressPhase.js';
  import { deleteGroup, formatBytes, groupBytes, groupStored, keepStoragePersistent, storageSummary, storedGroupIds, type StoredGroup } from '#lib/offline/storage.js';
  import IconDownload from '~icons/material-symbols/download-rounded';
  import IconDelete from '~icons/material-symbols/delete-rounded';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconShield from '~icons/material-symbols/shield-rounded';
  import IconStar from '~icons/material-symbols/star-rounded';
  import IconWarning from '~icons/material-symbols/warning-rounded';
  import IconMemory from '~icons/material-symbols/memory-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';

  // `voiceOptions`: the settings that belong to the chosen voice (Piper quality, test, dialects),
  // shown under the voice cards; `onvoicechange` lets the panel stop a voice test that is playing.
  // `bare`: inside a settings section that already has the card and the title.
  let { voiceOptions, onvoicechange, bare = false }: { voiceOptions?: Snippet; onvoicechange?: () => void; bare?: boolean } = $props();

  const locale = $derived(settings.interfaceLocale);
  const engineNames: Record<VoiceEngineId, () => string> = {
    standard: () => m.voice_quality_standard({}, { locale }),
    natural: () => m.voice_quality_natural({}, { locale }),
    recorded: () => m.voice_quality_recorded({}, { locale }),
    supertonic: () => m.voice_quality_supertonic({}, { locale }),
    supertonic3: () => voiceEngines.supertonic3.name,
    kokoro: () => voiceEngines.kokoro.name,
    kitten: () => voiceEngines.kitten.name,
    edge: () => 'Edge'
  };
  const groupNames: Record<StoredGroup, () => string> = {
    piper: () => m.models_group_piper({}, { locale }),
    supertonic: () => m.voice_quality_supertonic({}, { locale }),
    supertonic3: () => voiceEngines.supertonic3.name,
    kokoro: () => voiceEngines.kokoro.name,
    kitten: () => voiceEngines.kitten.name,
    conversation: () => m.models_conversation({}, { locale }),
    wordAudio: () => m.models_group_word_audio({}, { locale }),
    listening: () => m.models_group_listening({}, { locale })
  };
  const sizeNames = $derived({ small: m.models_tier_small({}, { locale }), medium: m.models_tier_medium({}, { locale }), large: m.models_tier_large({}, { locale }) });
  const languageName = $derived(new Intl.DisplayNames([locale], { type: 'language' }).of(settings.lang) ?? settings.lang);
  const mb = (value: number) => formatBytes(value * 1_000_000, settings.formatContext);

  // --- story voices ---------------------------------------------------------------------------
  // Every voice engine is a card like the conversation models. Picking one (or its download button)
  // chooses it and downloads its voices for the learning language; only the chosen engine downloads.
  const lang = $derived(settings.lang);
  const engine = $derived(activeEngine(lang));
  const voiceStatus = $derived(naturalReady(lang) ? 'ready' : naturalState.status[lang] ?? 'idle');
  const voicesSupported = $derived(typeof window !== 'undefined' && naturalSupported());
  const voiceGroups: Partial<Record<VoiceEngineId, StoredGroup>> = { natural: 'piper', recorded: 'piper', supertonic: 'supertonic', supertonic3: 'supertonic3', kokoro: 'kokoro', kitten: 'kitten' };
  // Engines that can speak the learning language on this device, plus the chosen one in any case.
  const voiceChoices = $derived(voiceEngineIds.filter((id) => id === settings.voiceQuality || (speaksLanguage(id, lang) && (!voiceEngines[id].webgpu || deviceAbilities().webgpu))));
  // Sizes for this device: an engine that runs on WebAssembly without WebGPU downloads its WASM build.
  const voiceDownloadMB = (id: VoiceEngineId) => engineFootprint(id)?.megabytes ?? (voiceGroups[id] === 'piper' ? piperMegabytes(lang) : 0);
  const voiceMemoryMB = (id: VoiceEngineId) => engineFootprint(id)?.memoryMB ?? Math.round(voiceDownloadMB(id) * 1.3);
  // One line per engine like the chat models': size class, voices, and where it runs.
  function voiceMeta(id: VoiceEngineId): string {
    const engine = voiceEngines[id];
    const parts: string[] = [];
    if (engine.tier) parts.push(sizeNames[engine.tier]);
    if (engine.voices?.length) parts.push(m.models_voices_count({ count: String(engine.voices.length) }, { locale }));
    // Kitten's model only has a WebAssembly build; the others take the GPU when the check passed.
    if (engine.runtime === 'model') parts.push(deviceAbilities().webgpu && id !== 'kitten' ? 'WebGPU' : 'WebAssembly');
    if (engine.languages !== 'all') parts.push(engine.languages.map((code) => code.toUpperCase()).join(' · '));
    return parts.join(' · ');
  }
  function voiceHint(id: VoiceEngineId): string {
    const size = String(voiceDownloadMB(id));
    if (id === 'standard') return m.voice_quality_standard_hint({}, { locale });
    if (id === 'recorded') return m.voice_quality_recorded_hint({}, { locale });
    if (id === 'supertonic') return m.voice_quality_supertonic_hint({ size }, { locale });
    if (id === 'supertonic3') return m.voice_quality_supertonic3_hint({ size }, { locale });
    if (id === 'kokoro') return m.voice_quality_kokoro_hint({ size }, { locale });
    if (id === 'kitten') return m.voice_quality_kitten_hint({ size }, { locale });
    if (id === 'edge') return m.voice_quality_edge_hint({}, { locale });
    return m.voice_quality_natural_hint({ size }, { locale });
  }
  function voiceState(id: VoiceEngineId): 'downloading' | 'failed' | 'downloaded' | 'none' | 'builtin' {
    const group = voiceGroups[id];
    if (!group) return 'builtin';
    const chosen = settings.voiceQuality === id && engine === id;
    if (chosen && voiceStatus === 'loading') return 'downloading';
    if (chosen && voiceStatus === 'failed') return 'failed';
    if ((chosen && voiceStatus === 'ready') || stored[group]) return 'downloaded';
    return 'none';
  }

  async function downloadVoices() {
    const language = lang;
    if (!(await confirmDownload(voiceDownloadMB(settings.voiceQuality), engineNames[activeEngine(language)]()))) return;
    void runJob(`voices|${activeEngine(language)}|${language}`, engineNames[activeEngine(language)](), '/settings', async (control) => {
      const report = window.setInterval(() => control.progress({ done: Math.round((naturalState.progress[language] ?? 0) * 100), total: 100 }), 500);
      try { await prepareNatural(language); } finally { window.clearInterval(report); }
    }).finally(refresh);
  }
  function chooseVoice(id: VoiceEngineId) {
    onvoicechange?.();
    settings.setVoiceQuality(id);
    if (voiceGroups[id]) void downloadVoices();
  }

  // --- conversation model -----------------------------------------------------------------------
  const device = $derived(localModel.device);
  const f16 = $derived(device?.f16 ?? true);
  function fits(model: ChatModel) {
    return likelyFits(model, f16, device?.deviceMemoryGB ?? null, device?.maxBufferMB ?? null);
  }
  function modelState(model: ChatModel): 'downloading' | 'failed' | 'loading' | 'loaded' | 'downloaded' | 'none' {
    const download = localModel.downloads[model.id];
    if (download) return download.failed ? 'failed' : 'downloading';
    if (localModel.status === 'loading' && settings.chatModel === model.id) return 'loading';
    if (localModel.loaded === model.id && localModel.status === 'ready') return 'loaded';
    return localModel.downloaded.includes(model.id) ? 'downloaded' : 'none';
  }
  // Downloads only (no GPU), so several can run side by side; the conversation loads the chosen one.
  async function downloadModel(model: ChatModel) {
    if (!(await confirmDownload(model.downloadMB, model.label))) return;
    void downloadModelFiles(model.id).finally(refresh);
  }
  let confirmingModel = $state<string | null>(null);
  async function removeModel(model: ChatModel) {
    if (confirmingModel !== model.id) { confirmingModel = model.id; return; }
    confirmingModel = null;
    await deleteModel(model.id);
    await refresh();
  }
  let memoryNow = $state<number | null>(null);

  // --- stored data ------------------------------------------------------------------------------
  let sizes = $state<Partial<Record<StoredGroup, number>>>({});
  let stored = $state<Partial<Record<StoredGroup, boolean>>>({});
  let confirming = $state<StoredGroup | null>(null);
  let summary = $state({ usage: 0, quota: 0, persisted: false });

  async function refresh() {
    const entries = await Promise.all(storedGroupIds.map(async (group) => [group, await groupStored(group).catch(() => false), await groupBytes(group).catch(() => 0)] as const));
    stored = Object.fromEntries(entries.map(([group, has]) => [group, has]));
    sizes = Object.fromEntries(entries.map(([group, , bytes]) => [group, bytes]));
    summary = await storageSummary();
    memoryNow = pageMemoryMB();
  }

  async function remove(group: StoredGroup) {
    if (confirming !== group) { confirming = group; return; }
    confirming = null;
    // Stop whatever uses the files before they go, so nothing reads half-deleted data.
    if (group === 'piper' || group === 'supertonic' || group === 'supertonic3' || group === 'kokoro' || group === 'kitten') unloadNaturalVoices();
    if (group === 'kokoro' || group === 'kitten') unloadStyleTts();
    if (group === 'supertonic' || group === 'supertonic3') unloadSupertonic();
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
    void checkLocalModel(true);
    void refresh();
    // The page's memory changes while models load and talk; keep the figure current.
    const timer = window.setInterval(() => (memoryNow = pageMemoryMB()), 5000);
    return () => window.clearInterval(timer);
  });
</script>

<section class={bare ? 'models' : 'mt-[1.35rem] px-[.8rem] pt-[.7rem] pb-[.85rem] panel-play models'} aria-labelledby={bare ? undefined : 'models-heading'}>
  {#if !bare}<h2 id="models-heading">{m.models_title({}, { locale })}</h2>{/if}
  <p class="model-hint">{m.models_hint({}, { locale })}</p>

  <h3>{m.models_downloads({}, { locale })}</h3>
  {#if device}
    <p class="model-device"><IconMemory aria-hidden="true" /> {m.models_device({ gpu: device.gpu, f16: device.f16 ? '16-bit' : '32-bit' }, { locale })}{#if device.deviceMemoryGB} · {m.models_ram({ ram: `${device.deviceMemoryGB}${device.deviceMemoryGB >= 8 ? '+' : ''} GB` }, { locale })}{/if}</p>
  {/if}
  <p class="model-hint">{m.models_parallel_hint({}, { locale })}</p>

  {#if voicesSupported}
    <h4 id="models-voices-heading">{m.voice_quality({}, { locale })}</h4>
    <ul class="model-list" role="radiogroup" aria-labelledby="models-voices-heading">
      {#each voiceChoices as id (id)}
        {@const state = voiceState(id)}
        {@const chosen = settings.voiceQuality === id}
        {@const group = voiceGroups[id]}
        <li class="model-card" class:chosen>
          <button type="button" class="model-pick" role="radio" aria-checked={chosen} onclick={() => chooseVoice(id)}>
            <span class="model-name">{engineNames[id]()}</span>
            {#if voiceMeta(id)}<span class="model-facts">{voiceMeta(id)}</span>{/if}
            {#if group}<span class="model-facts">{m.models_facts({ download: `~${mb(voiceDownloadMB(id))}`, memory: `~${mb(voiceMemoryMB(id))}` }, { locale })}</span>{/if}
            <span class="model-about">{voiceHint(id)}</span>
            {#if state === 'downloading'}
              <DownloadProgress progress={naturalState.progress[lang] ?? 0} phase="download" detail={`${mb(naturalState.downloaded[lang] ?? 0)} / ${mb(naturalState.total[lang] ?? voiceDownloadMB(id))}`} />
            {:else if state === 'failed'}
              <span class="model-warn"><IconWarning aria-hidden="true" /> {m.models_download_failed({}, { locale })}</span>
              {#if naturalState.error[lang]}<span class="model-error">{naturalState.error[lang]}</span>{/if}
            {:else if state === 'downloaded'}
              <span class="model-ok"><IconCheck aria-hidden="true" /> {m.models_downloaded({}, { locale })}</span>
            {/if}
          </button>
          <div class="model-actions">
            {#if group && (state === 'none' || state === 'failed')}
              <button type="button" class="btn-play btn-play-sm btn-play-go btn-play-round" onclick={() => chooseVoice(id)} aria-label={m.models_download({}, { locale })} title={m.models_download({}, { locale })}><IconDownload aria-hidden="true" /></button>
            {:else if group && state === 'downloaded'}
              <button type="button" class="btn-play btn-play-sm btn-play-soft btn-play-round" class:confirm={confirming === group} onclick={() => remove(group)} onblur={() => { if (confirming === group) confirming = null; }} aria-label={confirming === group ? m.models_confirm({}, { locale }) : m.models_delete({}, { locale })} title={confirming === group ? m.models_confirm({}, { locale }) : m.models_delete({}, { locale })}><IconDelete aria-hidden="true" /></button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
    {@render voiceOptions?.()}
  {/if}
  <h4 id="models-conversation-heading">{m.models_conversation({}, { locale })}</h4>
  {#if localModel.status === 'unsupported'}
    <p class="model-empty">{m.models_unsupported({}, { locale })}</p>
  {:else}
    <ul class="model-list" role="radiogroup" aria-labelledby="models-conversation-heading">
      {#each chatModels as model (model.id)}
        {@const state = modelState(model)}
        {@const chosen = settings.chatModel === model.id}
        <li class="model-card" class:chosen>
          <button type="button" class="model-pick" role="radio" aria-checked={chosen} onclick={() => chooseModel(model.id)}>
            <span class="model-name">{model.label}{#if isRecommended(model, settings.lang)}<span class="model-best" title={m.models_best_for({ language: languageName }, { locale })}><IconStar aria-hidden="true" /> {m.models_best_for({ language: languageName }, { locale })}</span>{/if}</span>
            <span class="model-facts">{sizeNames[model.size]} · {m.models_facts({ download: mb(model.downloadMB), memory: mb(modelGpuMB(model)) }, { locale })}</span>
            {#if !fits(model)}<span class="model-warn"><IconWarning aria-hidden="true" /> {m.models_may_not_fit({}, { locale })}</span>{/if}
            {#if state === 'downloading'}
              {@const download = localModel.downloads[model.id]!}
              <DownloadProgress progress={download.progress} phase="download" bytesPerSecond={download.bytesPerSecond} />
            {:else if state === 'failed'}
              <span class="model-warn"><IconWarning aria-hidden="true" /> {m.models_download_failed({}, { locale })}</span>
            {:else if state === 'loading'}
              <DownloadProgress progress={localModel.progress} phase={modelProgressPhase(localModel.text)} bytesPerSecond={localModel.bytesPerSecond} />
            {:else if state === 'loaded' || state === 'downloaded'}
              <ModelStatus downloaded inMemory={state === 'loaded'} downloadMB={model.downloadMB} memoryMB={modelGpuMB(model)} />
              {#if state === 'loaded' && localModel.tokensPerSecond}<span class="model-facts">{Math.round(localModel.tokensPerSecond)} tok/s</span>{/if}
            {/if}
          </button>
          <div class="model-actions">
            {#if state === 'downloading'}
              <button type="button" class="btn-play btn-play-sm btn-play-soft btn-play-round" onclick={() => cancelModelDownload(model.id)} aria-label={m.models_cancel({}, { locale })} title={m.models_cancel({}, { locale })}><IconClose aria-hidden="true" /></button>
            {:else if state === 'none' || state === 'failed'}
              <button type="button" class="btn-play btn-play-sm btn-play-go btn-play-round" onclick={() => downloadModel(model)} aria-label={m.models_download({}, { locale })} title={m.models_download({}, { locale })}><IconDownload aria-hidden="true" /></button>
            {:else if state === 'downloaded' || state === 'loaded'}
              <button type="button" class="btn-play btn-play-sm btn-play-soft btn-play-round" class:confirm={confirmingModel === model.id} onclick={() => removeModel(model)} onblur={() => { if (confirmingModel === model.id) confirmingModel = null; }} aria-label={confirmingModel === model.id ? m.models_confirm({}, { locale }) : m.models_delete({}, { locale })} title={confirmingModel === model.id ? m.models_confirm({}, { locale }) : m.models_delete({}, { locale })}><IconDelete aria-hidden="true" /></button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
    {#if localModel.lastStats}
      <p class="model-device">{m.models_last_reply({ decode: String(Math.round(localModel.lastStats.decodeTokensPerSecond)), prefill: String(Math.round(localModel.lastStats.prefillTokensPerSecond)), tokens: String(localModel.lastStats.completionTokens) }, { locale })}</p>
    {/if}
  {/if}

  <h3>{m.models_stored({}, { locale })}</h3>
  {#if storedGroupIds.some((group) => stored[group])}
    <ul class="model-stored">
      {#each storedGroupIds.filter((group) => stored[group]) as group (group)}
        <li>
          <span>{groupNames[group]()}</span>
          <span class="model-size">{sizes[group] ? formatBytes(sizes[group]!, settings.formatContext) : ''}</span>
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
    <span>
      {#if summary.quota}{m.models_usage({ used: formatBytes(summary.usage, settings.formatContext), quota: formatBytes(summary.quota, settings.formatContext) }, { locale })}{/if}
      {#if memoryNow !== null} · {m.models_page_memory({ memory: `${memoryNow} MB` }, { locale })}{/if}
    </span>
    {#if summary.persisted}
      <span class="model-ok"><IconShield aria-hidden="true" /> {m.models_persisted({}, { locale })}</span>
    {:else}
      <button type="button" class="btn-play btn-play-sm btn-play-soft" onclick={keep}><IconShield aria-hidden="true" />{m.models_persist({}, { locale })}</button>
    {/if}
  </div>
</section>

<style>
  .models h2 { margin:0 0 .3rem;font-family:'DM Serif Display',serif;font-size:1.15rem;font-weight:400; }
  .models h3 { margin:.95rem 0 .35rem;font-size:.62rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;opacity:.65; }
  .models h4 { margin:.8rem 0 .35rem;font-size:.7rem;font-weight:900; }
  .model-error { font-size:.58rem;font-weight:700;line-height:1.35;opacity:.75;overflow-wrap:anywhere; }
  .model-about { font-size:.62rem;font-weight:700;line-height:1.4;opacity:.7; }
  .model-hint { margin:0 0 .2rem;font-size:.66rem;font-weight:700;opacity:.65;line-height:1.35; }
  .model-facts { font-size:.66rem;font-weight:700;opacity:.7;font-variant-numeric:tabular-nums; }
  .model-ok { display:inline-flex;align-items:center;gap:.25rem;color:#34824d;opacity:1 !important;font-size:.68rem;font-weight:800; }
  .model-ok :global(svg),.model-warn :global(svg),.model-best :global(svg),.model-device :global(svg) { width:.9rem;height:.9rem;flex:none; }
  .model-warn { display:inline-flex;align-items:center;gap:.25rem;color:#b5762a;font-size:.66rem;font-weight:800; }
  .model-device { display:flex;align-items:center;gap:.3rem;margin:0 0 .45rem;font-size:.66rem;font-weight:700;opacity:.7; }
  .model-list { display:grid;gap:.4rem;margin:0;padding:0;list-style:none; }
  .model-card { display:flex;align-items:center;gap:.5rem;padding:.45rem .55rem;border:2px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:14px;transition:border-color .2s ease,background .2s ease; }
  .model-card.chosen { border-color:#34824d;background:color-mix(in srgb,#34824d 8%,transparent); }
  .model-pick { flex:1;min-width:0;display:grid;gap:.2rem;padding:0;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer; }
  .model-name { display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;font-size:.78rem;font-weight:900; }
  .model-best { display:inline-flex;align-items:center;gap:.15rem;padding:.05rem .4rem;border-radius:999px;background:#fbe6b5;color:#7a4a12;font-size:.58rem;font-weight:900; }
  .model-actions { flex:none; }
  .model-stored { display:grid;gap:.35rem;margin:0;padding:0;list-style:none; }
  .model-stored li { display:flex;align-items:center;gap:.6rem;font-size:.74rem;font-weight:800; }
  .model-stored li > span:first-child { flex:1; }
  .model-size { opacity:.6;font-variant-numeric:tabular-nums; }
  .models .confirm { border-color:#b54442;color:#b54442; }
  .model-empty { margin:0;font-size:.72rem;opacity:.65; }
  .model-summary { display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.9rem;font-size:.68rem;font-weight:700;opacity:.85; }
  .models :global(.btn-play svg) { width:.95rem;height:.95rem; }
  :global(html.dark) .model-best { background:#e6a527;color:#172a45; }
</style>
