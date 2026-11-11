<!--
  The voice and language-model choice for one mode, shown in its settings sheet (GameToolbar) so a
  learner can switch without leaving the mode. Both are lists of cards like in the settings page
  (ModelManager), only without the downloads and storage controls. `voice` shows the speech engines that can speak the
  learning language here; `llm` names the mode whose "with or without AI" choice it sets
  (conversation/aiChoice.svelte.ts) and lists the chat models. The full lists with downloads and
  sizes stay in the settings page, linked below.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { deviceAbilities, engineFootprint, speaksLanguage, voiceEngineIds, voiceEngines, type VoiceEngineId } from '#lib/voice/engines.js';
  import { piperMegabytes } from '#lib/story/naturalVoices.svelte.js';
  import { formatBytes } from '#lib/offline/storage.js';
  import IconCheck from '~icons/material-symbols/check-circle-rounded';
  import IconStar from '~icons/material-symbols/star-rounded';
  import { prefersWithoutAi, setWithoutAi, type AiMode } from '#lib/conversation/aiChoice.svelte.js';
  import { activeModelLabel, checkLocalModel, chooseModel, localModel, modelGpuMB } from '#lib/conversation/localModel.svelte.js';
  import { chatModels, isRecommended, type ChatModelId } from '#lib/conversation/models.js';

  let { voice = false, llm = null }: { voice?: boolean; llm?: AiMode | null } = $props();

  const id = $props.id();
  const locale = $derived({ locale: settings.interfaceLocale });
  const NO_LLM = 'none';

  const engineNames: Record<VoiceEngineId, () => string> = {
    standard: () => m.voice_quality_standard({}, locale),
    natural: () => m.voice_quality_natural({}, locale),
    recorded: () => m.voice_quality_recorded({}, locale),
    supertonic: () => m.voice_quality_supertonic({}, locale),
    supertonic3: () => voiceEngines.supertonic3.name,
    kokoro: () => voiceEngines.kokoro.name,
    kitten: () => voiceEngines.kitten.name,
    edge: () => 'Edge'
  };
  // The same engines the settings page offers for this language and device, plus the current one.
  const voiceChoices = $derived(voiceEngineIds.filter((id) => id === settings.voiceQuality || (speaksLanguage(id, settings.lang) && (!voiceEngines[id].webgpu || deviceAbilities().webgpu))));
  const sizeNames = $derived({ small: m.models_tier_small({}, locale), medium: m.models_tier_medium({}, locale), large: m.models_tier_large({}, locale) });
  const languageName = $derived(new Intl.DisplayNames([settings.interfaceLocale], { type: 'language' }).of(settings.lang) ?? settings.lang);
  const mb = (value: number) => formatBytes(value * 1_000_000, settings.formatContext);
  // One facts line per engine, as in the settings: size class and download, or nothing for built-in voices.
  function voiceFacts(id: VoiceEngineId): string {
    const engine = voiceEngines[id];
    const download = engineFootprint(id)?.megabytes ?? (id === 'natural' || id === 'recorded' ? piperMegabytes(settings.lang) : 0);
    return [engine.tier ? sizeNames[engine.tier] : '', download ? `~${mb(download)}` : ''].filter(Boolean).join(' · ');
  }

  // Which model answers in this mode: none (the default) or the chosen one, once it can run.
  const usable = $derived(localModel.status === 'ready' || localModel.cached);
  const llmValue = $derived(llm && (prefersWithoutAi(llm) || !usable) ? NO_LLM : localModel.provider === 'cloud' ? 'cloud' : settings.chatModel);
  const onDevice = (id: ChatModelId) => localModel.downloaded.includes(id) || localModel.loaded === id;

  $effect(() => { if (llm) void checkLocalModel(); });

  function chooseLlm(value: string) {
    if (value === llmValue) return;
    if (!llm) return;
    if (value === NO_LLM) return setWithoutAi(llm, true);
    setWithoutAi(llm, false);
    if (value !== 'cloud') chooseModel(value as ChatModelId);
  }
</script>

{#if voice}
  <section class="ai-group">
    <h3 id={`${id}-voice`}>{m.mode_ai_voice({}, locale)}</h3>
    <p class="ai-hint">{m.mode_ai_voice_hint({}, locale)}</p>
    <ul class="ai-list" role="radiogroup" aria-labelledby={`${id}-voice`}>
      {#each voiceChoices as engine (engine)}
        {@const chosen = settings.voiceQuality === engine}
        <li><button type="button" role="radio" class="ai-card" class:chosen aria-checked={chosen} onclick={() => settings.setVoiceQuality(engine)}>
          <span class="ai-name">{engineNames[engine]()}{#if engine === 'standard'}<span class="ai-default">{m.models_default({}, locale)}</span>{/if}</span>
          {#if voiceFacts(engine)}<span class="ai-facts">{voiceFacts(engine)}</span>{/if}
          {#if chosen}<IconCheck class="ai-check" aria-hidden="true" />{/if}
        </button></li>
      {/each}
    </ul>
  </section>
{/if}
{#if llm}
  <section class="ai-group">
    <h3 id={`${id}-llm`}>{m.mode_ai_llm({}, locale)}</h3>
    <p class="ai-hint">{localModel.status === 'unsupported' ? m.models_unsupported({}, locale) : llmValue === NO_LLM ? m.models_no_llm_hint({}, locale) : m.mode_ai_llm_active({ model: activeModelLabel() }, locale)}</p>
    <ul class="ai-list" role="radiogroup" aria-labelledby={`${id}-llm`}>
      <li><button type="button" role="radio" class="ai-card" class:chosen={llmValue === NO_LLM} aria-checked={llmValue === NO_LLM} onclick={() => chooseLlm(NO_LLM)}>
        <span class="ai-name">{m.models_no_llm({}, locale)}<span class="ai-default">{m.models_default({}, locale)}</span></span>
        {#if llmValue === NO_LLM}<IconCheck class="ai-check" aria-hidden="true" />{/if}
      </button></li>
      {#if localModel.provider === 'cloud'}
        <li><button type="button" role="radio" class="ai-card" class:chosen={llmValue === 'cloud'} aria-checked={llmValue === 'cloud'} onclick={() => chooseLlm('cloud')}>
          <span class="ai-name">{activeModelLabel()}</span>
          {#if llmValue === 'cloud'}<IconCheck class="ai-check" aria-hidden="true" />{/if}
        </button></li>
      {:else if localModel.status !== 'unsupported'}
        {#each chatModels as model (model.id)}
          {@const chosen = llmValue === model.id}
          <li><button type="button" role="radio" class="ai-card" class:chosen aria-checked={chosen} onclick={() => chooseLlm(model.id)}>
            <span class="ai-name">{model.label}{#if isRecommended(model, settings.lang)}<span class="ai-best"><IconStar aria-hidden="true" /> {m.models_best_for({ language: languageName }, locale)}</span>{/if}</span>
            <span class="ai-facts">{sizeNames[model.size]} · {m.models_facts({ download: mb(model.downloadMB), memory: mb(modelGpuMB(model)) }, locale)}</span>
            <span class="ai-state" class:ok={onDevice(model.id)}>{onDevice(model.id) ? m.models_downloaded({}, locale) : m.mode_ai_not_downloaded({}, locale)}</span>
            {#if chosen}<IconCheck class="ai-check" aria-hidden="true" />{/if}
          </button></li>
        {/each}
      {/if}
    </ul>
  </section>
{/if}
<a class="mode-ai-more" href="/settings">{m.mode_ai_more({}, locale)}</a>

<style>
  .ai-group { display:grid;gap:.35rem;padding-top:.7rem;border-top:1px solid rgba(23,42,69,.14); }
  :global(html.dark) .ai-group { border-top-color:rgba(255,253,247,.2); }
  .ai-group h3 { margin:0;font-size:.9rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase; }
  .ai-hint { margin:0;font-size:.84rem;font-weight:700;line-height:1.45;opacity:.65; }
  .ai-list { display:grid;gap:.4rem;margin:.15rem 0 0;padding:0;list-style:none; }
  .ai-card { position:relative;display:grid;gap:.2rem;width:100%;padding:.45rem 2rem .45rem .6rem;border:2px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:14px;background:transparent;color:inherit;font:inherit;text-align:start;cursor:pointer;transition:border-color .2s ease,background .2s ease; }
  .ai-card.chosen { border-color:#34824d;background:color-mix(in srgb,#34824d 8%,transparent); }
  .ai-card:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }
  .ai-name { display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;font-size:.95rem;font-weight:900; }
  .ai-default { padding:.05rem .4rem;border-radius:999px;background:rgba(52,130,77,.15);color:#2f6f45;font-size:.8125rem;font-weight:900; }
  :global(html.dark) .ai-default { background:rgba(52,130,77,.3);color:#b6e3c4; }
  .ai-best { display:inline-flex;align-items:center;gap:.15rem;padding:.05rem .4rem;border-radius:999px;background:#fbe6b5;color:#7a4a12;font-size:.8125rem;font-weight:900; }
  :global(html.dark) .ai-best { background:#e6a527;color:#172a45; }
  .ai-best :global(svg) { width:.8rem;height:.8rem; }
  .ai-facts,.ai-state { font-size:.84rem;font-weight:700;opacity:.7;font-variant-numeric:tabular-nums; }
  .ai-state.ok { color:#34824d;opacity:1;font-weight:800; }
  .ai-card :global(.ai-check) { position:absolute;top:50%;inset-inline-end:.55rem;width:1.1rem;height:1.1rem;translate:0 -50%;color:#34824d; }
  .mode-ai-more { justify-self:start;color:#a45e38;font-size:.875rem;font-weight:800; }
  :global(html.dark) .mode-ai-more { color:#f0c46a; }
</style>
