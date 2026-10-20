<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/env';
  import HangmanMode from '#lib/hangman/HangmanMode.svelte';
  import { settings } from '#lib/state/settings.svelte.js';
  import { wordPools } from '#lib/data/vocabulary.js';

  const HANGMAN_TUTORIAL_KEY = 'wordcircle-hangman-tutorial-v1';

  const needsTutorial = browser && (settings.lang === 'de' || settings.lang === 'en') && localStorage.getItem(HANGMAN_TUTORIAL_KEY) !== 'complete';
  if (needsTutorial) void goto('/hangman/tutorial', { replaceState: true });

  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);
</script>

<HangmanMode words={words} language={settings.lang} />
