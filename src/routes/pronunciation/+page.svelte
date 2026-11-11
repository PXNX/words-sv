<script lang="ts">
  import PronunciationMode from '#lib/vocab/PronunciationMode.svelte';
  import { settings } from '#lib/state/settings.svelte.js';
  import { wordPools } from '#lib/data/vocabulary.js';

  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);
  import GameToolbar from '#lib/app/GameToolbar.svelte';
  import AiModeSettings from '#lib/app/AiModeSettings.svelte';
</script>

<GameToolbar>
  {#snippet gameSettings()}<AiModeSettings voice />{/snippet}
</GameToolbar>

<PronunciationMode {words} />
