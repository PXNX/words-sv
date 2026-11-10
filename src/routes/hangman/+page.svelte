<script lang="ts">
  import HangmanMode from '#lib/hangman/HangmanMode.svelte';
  import HangmanTutorial from '#lib/hangman/HangmanTutorial.svelte';
  import GameToolbar from '#lib/app/GameToolbar.svelte';
  import { settings } from '#lib/state/settings.svelte.js';
  import { wordPools } from '#lib/data/vocabulary.js';

  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);
</script>

<GameToolbar game="hangman">
  {#snippet tutorial({ start, skip })}<HangmanTutorial onstart={start} onskip={skip} />{/snippet}
</GameToolbar>
<HangmanMode words={words} language={settings.lang} level={settings.vocabularyLevel} />
