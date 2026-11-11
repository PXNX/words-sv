<!--
  The voice and language-model choice for one mode, shown in its settings sheet (GameToolbar) so a
  learner can switch without leaving the mode. `voice` shows the speech engines that can speak the
  learning language here; `llm` names the mode whose "with or without AI" choice it sets
  (conversation/aiChoice.svelte.ts) and lists the chat models. The full lists with downloads and
  sizes stay in the settings page, linked below.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import GameSetting from './GameSetting.svelte';
  import { deviceAbilities, speaksLanguage, voiceEngineIds, voiceEngines, type VoiceEngineId } from '#lib/voice/engines.js';
  import { prefersWithoutAi, setWithoutAi, type AiMode } from '#lib/conversation/aiChoice.svelte.js';
  import { activeModelLabel, checkLocalModel, chooseModel, localModel } from '#lib/conversation/localModel.svelte.js';
  import { chatModels, type ChatModelId } from '#lib/conversation/models.js';

  let { voice = false, llm = null }: { voice?: boolean; llm?: AiMode | null } = $props();

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
  const voiceLabel = (id: VoiceEngineId) => `${engineNames[id]()}${id === 'standard' ? ` (${m.models_default({}, locale)})` : ''}`;

  // Which model answers in this mode: none (the default) or the chosen one, once it can run.
  const usable = $derived(localModel.status === 'ready' || localModel.cached);
  const llmValue = $derived(llm && (prefersWithoutAi(llm) || !usable) ? NO_LLM : localModel.provider === 'cloud' ? 'cloud' : settings.chatModel);
  const modelLabel = (id: ChatModelId) => {
    const model = chatModels.find((entry) => entry.id === id)!;
    return localModel.downloaded.includes(id) || (localModel.loaded === id) ? model.label : `${model.label} – ${m.mode_ai_not_downloaded({}, locale)}`;
  };

  $effect(() => { if (llm) void checkLocalModel(); });

  function chooseLlm(value: string) {
    if (!llm) return;
    if (value === NO_LLM) return setWithoutAi(llm, true);
    setWithoutAi(llm, false);
    if (value !== 'cloud') chooseModel(value as ChatModelId);
  }
</script>

{#if voice}
  <GameSetting label={m.mode_ai_voice({}, locale)} hint={m.mode_ai_voice_hint({}, locale)}>
    <select class="select select-sm" aria-label={m.mode_ai_voice({}, locale)} value={settings.voiceQuality} onchange={(event) => settings.setVoiceQuality((event.currentTarget as HTMLSelectElement).value as VoiceEngineId)}>
      {#each voiceChoices as id (id)}<option value={id}>{voiceLabel(id)}</option>{/each}
    </select>
  </GameSetting>
{/if}
{#if llm}
  <GameSetting label={m.mode_ai_llm({}, locale)} hint={localModel.status === 'unsupported' ? m.models_unsupported({}, locale) : llmValue === NO_LLM ? m.models_no_llm_hint({}, locale) : m.mode_ai_llm_active({ model: activeModelLabel() }, locale)}>
    <select class="select select-sm" aria-label={m.mode_ai_llm({}, locale)} value={llmValue} onchange={(event) => chooseLlm((event.currentTarget as HTMLSelectElement).value)}>
      <option value={NO_LLM}>{m.models_no_llm({}, locale)} ({m.models_default({}, locale)})</option>
      {#if localModel.provider === 'cloud'}
        <option value="cloud">{activeModelLabel()}</option>
      {:else if localModel.status !== 'unsupported'}
        {#each chatModels as model (model.id)}<option value={model.id}>{modelLabel(model.id)}</option>{/each}
      {/if}
    </select>
  </GameSetting>
{/if}
<a class="mode-ai-more" href="/settings">{m.mode_ai_more({}, locale)}</a>

<style>
  select { max-width:13rem;font-size:.72rem;font-weight:700;text-transform:none;letter-spacing:0; }
  .mode-ai-more { justify-self:start;color:#a45e38;font-size:.66rem;font-weight:800; }
  :global(html.dark) .mode-ai-more { color:#f0c46a; }
</style>
