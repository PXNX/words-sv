<script lang="ts">
  import PronunciationMode from '#lib/vocab/PronunciationMode.svelte';
  import { settings } from '#lib/state/settings.svelte.js';
  import { wordPools } from '#lib/data/vocabulary.js';

  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);
</script>

<PronunciationMode {words} />
