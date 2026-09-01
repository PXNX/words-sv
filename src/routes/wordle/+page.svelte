<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import WordleMode from '$lib/wordle/WordleMode.svelte';
  import { playSuccessSound } from '$lib/sounds';
  import { settings } from '$lib/state/settings.svelte';
  import { wordPools } from '$lib/data/vocabulary';
  import { m } from '$lib/paraglide/messages';
  import { consumeWordlePracticeRequest } from '$lib/wordle/practice';

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

<WordleMode {words} level={settings.vocabularyLevel} language={settings.lang} wordLength={settings.wordleLength} {labels} {practice} onGreen={() => playSuccessSound(settings.sound, 'wordle')} onWin={() => void settings.recordStreak('wordle_completed')} />
