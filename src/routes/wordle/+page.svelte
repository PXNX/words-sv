<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/env';
  import WordleMode from '#lib/wordle/WordleMode.svelte';
  import { playSuccessSound } from '#lib/sounds.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { wordPools } from '#lib/data/vocabulary.js';
  import { m } from '#lib/paraglide/messages.js';
  import { consumeWordlePracticeRequest } from '#lib/wordle/practice.js';

  const WORDLE_TUTORIAL_KEY = 'wordcircle-wordle-tutorial-v1';

  const practice = browser ? consumeWordlePracticeRequest() : false;
  const needsTutorial = browser && !practice && (settings.lang === 'de' || settings.lang === 'en') && localStorage.getItem(WORDLE_TUTORIAL_KEY) !== 'complete';
  if (needsTutorial) void goto('/wordle/tutorial', { replaceState: true });

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
</script>

<WordleMode
  words={words}
  level={settings.vocabularyLevel}
  language={settings.lang}
  wordLength={settings.wordleLength}
  labels={labels}
  practice={practice}
  onGreen={() => playSuccessSound(settings.sound, 'wordle')}
  onWin={() => void settings.recordStreak('wordle_completed')}
/>
