<script lang="ts">
  import HangmanMode from '$lib/hangman/HangmanMode.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { wordPools } from '$lib/data/vocabulary';

  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);
</script>

<HangmanMode {words} language={settings.lang} />
