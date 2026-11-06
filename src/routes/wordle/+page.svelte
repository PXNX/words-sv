<script lang="ts">
  import { haptic } from '#lib/feedback/haptics.js';
  import { unlockCosmetic, WORDLE_TOP_TRIES } from '#lib/profile/cosmetics.svelte.js';
  import { goto } from '$app/navigation';
  import { browser } from '$app/env';
  import WordleMode from '#lib/wordle/WordleMode.svelte';
  import { playSuccessSound } from '#lib/feedback/sounds.js';
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
    // The original texts say "five letters"; other lengths get their own, so translated five-letter texts stay in use.
    subtitle: settings.wordleLength === 5 ? m.wordle_subtitle({}, { locale: settings.interfaceLocale }) : m.wordle_subtitle_length({ length: settings.wordleLength }, { locale: settings.interfaceLocale }),
    empty: settings.wordleLength === 5 ? m.wordle_empty({}, { locale: settings.interfaceLocale }) : m.wordle_empty_length({ length: settings.wordleLength }, { locale: settings.interfaceLocale }),
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
  onWin={(attempts) => {
    void settings.recordStreak('wordle_completed');
    haptic('win');
    if (!practice && attempts <= 3) unlockCosmetic('wordle');
    if (!practice && attempts <= WORDLE_TOP_TRIES) unlockCosmetic('score_wordle_two');
  }}
/>
