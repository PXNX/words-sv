<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import WordleMode from '$lib/WordleMode.svelte';
  import { playSuccessSound } from '$lib/sounds';
  import { settings } from '$lib/state/settings.svelte';
  import { wordPools } from '$lib/data/vocabulary';
  import { m } from '$lib/paraglide/messages';
  import IconSettings from '~icons/material-symbols/settings-rounded';

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
  const settingsLabel = $derived(m.settings({}, { locale: settings.interfaceLocale }));
  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);

  onMount(() => {
    const tutorialDone = typeof localStorage !== 'undefined' && localStorage.getItem(WORDLE_TUTORIAL_KEY) === 'complete';
    if ((settings.lang === 'de' || settings.lang === 'en') && !tutorialDone) void goto('/wordle/tutorial');
  });
</script>

<button class="settings-trigger mode-settings-trigger" onclick={() => void goto('/settings')} aria-label={settingsLabel}><IconSettings aria-hidden="true" /></button>
<WordleMode {words} level={settings.vocabularyLevel} language={settings.lang} {labels} onGreen={() => playSuccessSound(settings.sound, 'wordle')} onWin={() => void settings.recordStreak('wordle_completed')} />

<style>
  .settings-trigger { display:grid;place-items:center;width:2.15rem;height:2.15rem;border:1px solid rgba(23,42,69,.24);border-radius:50%;background:rgba(255,253,247,.86);color:#172a45;transition:transform .18s cubic-bezier(.23,1,.32,1),background .18s ease; }
  .settings-trigger :global(svg) { width:1.1rem;height:1.1rem; }
  .mode-settings-trigger { position:absolute;z-index:100;top:.62rem;right:.62rem; }
</style>
