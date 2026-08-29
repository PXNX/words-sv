<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import WordleMode from '$lib/wordle/WordleMode.svelte';
  import { playSuccessSound } from '$lib/sounds';
  import { settings } from '$lib/state/settings.svelte';
  import { wordPools } from '$lib/data/vocabulary';
  import { m } from '$lib/paraglide/messages';

  const WORDLE_TUTORIAL_KEY = 'wordcircle-wordle-tutorial-v1';

  const labels = $derived({
    title: m.wordle_title({}, { locale: settings.interfaceLocale }),
    subtitle: m.wordle_subtitle({}, { locale: settings.interfaceLocale }),
    empty: m.wordle_empty({}, { locale: settings.interfaceLocale }),
    input: m.wordle_input({}, { locale: settings.interfaceLocale }),
    win: m.wordle_win({}, { locale: settings.interfaceLocale }),
    invalid: m.wordle_invalid({}, { locale: settings.interfaceLocale }),
    again: m.wordle_again({}, { locale: settings.interfaceLocale })
  });
  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);

  onMount(() => {
    const tutorialDone = typeof localStorage !== 'undefined' && localStorage.getItem(WORDLE_TUTORIAL_KEY) === 'complete';
    if ((settings.lang === 'de' || settings.lang === 'en') && !tutorialDone) void goto('/wordle/tutorial');
  });
</script>

<WordleMode {words} level={settings.vocabularyLevel} language={settings.lang} {labels} onGreen={() => playSuccessSound(settings.sound, 'wordle')} onWin={() => void settings.recordStreak('wordle_completed')} />
