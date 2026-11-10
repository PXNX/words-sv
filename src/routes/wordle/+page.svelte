<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { unlockCosmetic, WORDLE_TOP_TRIES } from '#lib/profile/cosmetics.svelte.js';
  import WordleMode from '#lib/wordle/WordleMode.svelte';
  import { playSuccessSound } from '#lib/feedback/sounds.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { wordPools } from '#lib/data/vocabulary.js';
  import { m } from '#lib/paraglide/messages.js';
  import GameToolbar from '#lib/app/GameToolbar.svelte';
  import GameSetting from '#lib/app/GameSetting.svelte';
  import SelectMenu from '#lib/settings/SelectMenu.svelte';
  import WordleTutorial from '#lib/wordle/WordleTutorial.svelte';
  import { hasPracticeRound } from '#lib/app/tutorials.js';
  import type { WordleLength } from '#lib/state/settings.svelte.js';

  // The first-visit tutorial can start a guided practice round; the game restarts for it.
  let practice = $state(false);
  let round = $state(0);
  function startPractice() {
    if (!hasPracticeRound(settings.lang)) return;
    practice = true;
    round += 1;
  }
  const lengthOptions = [3, 4, 5, 6, 7].map((length) => ({ value: String(length), label: String(length) }));

  const labels = $derived({
    title: m.wordle_title({}, { locale: settings.interfaceLocale }),
    // The original texts say "five letters"; other lengths get their own, so translated five-letter texts stay in use.
    empty: settings.wordleLength === 5 ? m.wordle_empty({}, { locale: settings.interfaceLocale }) : m.wordle_empty_length({ length: num(settings.wordleLength) }, { locale: settings.interfaceLocale }),
    input: m.wordle_input({}, { locale: settings.interfaceLocale }),
    win: m.wordle_win({}, { locale: settings.interfaceLocale }),
    invalid: m.wordle_invalid({}, { locale: settings.interfaceLocale }),
    again: m.wordle_again({}, { locale: settings.interfaceLocale })
  });
  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);
</script>

<GameToolbar game="wordle" onfirststart={startPractice}>
  {#snippet tutorial({ start, skip })}<WordleTutorial onstart={start} onskip={skip} />{/snippet}
  {#snippet gameSettings()}
    <GameSetting label={m.wordle_length({}, { locale: settings.interfaceLocale })} hint={m.wordle_length_explain({}, { locale: settings.interfaceLocale })}>
      <SelectMenu class="w-[7rem]" value={String(settings.wordleLength)} options={lengthOptions} label={m.wordle_length({}, { locale: settings.interfaceLocale })} onchange={(value) => settings.setWordleLength(Number(value) as WordleLength)} />
    </GameSetting>
  {/snippet}
</GameToolbar>

{#key round}
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
{/key}
