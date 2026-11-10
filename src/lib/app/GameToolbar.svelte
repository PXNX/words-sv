<!--
  The two round buttons in a game's top corner: "?" opens the game's tutorial as an overlay above
  the running round (closing it returns to exactly where the learner was), and the gear opens a
  bottom sheet with the settings that only matter for this game. On the very first visit the
  tutorial opens by itself, and its start button may begin the game's guided practice round.
-->
<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { markTutorialSeen, tutorialSeen, type TutorialGame } from './tutorials.js';
  import IconHelp from '~icons/material-symbols/question-mark-rounded';
  import IconTune from '~icons/material-symbols/tune-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';

  type TutorialControls = { start: () => void; skip: () => void };
  let { game = null, tutorial, gameSettings, onfirststart }: {
    /** Which tutorial this game has, for the "seen on first visit" flag. */
    game?: TutorialGame | null;
    tutorial?: Snippet<[TutorialControls]>;
    gameSettings?: Snippet;
    /** The first-visit tutorial's start button: e.g. begin the guided practice round. */
    onfirststart?: () => void;
  } = $props();

  let tutorialOpen = $state(false);
  let firstVisit = $state(false);
  let settingsOpen = $state(false);
  const locale = $derived({ locale: settings.interfaceLocale });
  const direction = $derived(getTextDirection(settings.interfaceLocale));
  const ms = (duration: number) => (prefersReducedMotion.current ? 0 : duration);

  onMount(() => {
    if (game && tutorial && !tutorialSeen(game)) {
      firstVisit = true;
      tutorialOpen = true;
    }
  });

  function closeTutorial(start: boolean) {
    if (game) markTutorialSeen(game);
    tutorialOpen = false;
    // Only the first visit starts anything; opened from the "?" button the round just carries on.
    if (start && firstVisit) onfirststart?.();
    firstVisit = false;
  }
  function openTutorial() {
    haptic('tap');
    firstVisit = false;
    tutorialOpen = true;
  }
  function openSettings() {
    haptic('tap');
    settingsOpen = true;
  }
</script>

<svelte:window onkeydown={(event) => { if (event.key !== 'Escape') return; if (settingsOpen) settingsOpen = false; else if (tutorialOpen) closeTutorial(false); }} />

<div class="game-toolbar">
  {#if tutorial}<button type="button" class="btn-play btn-play-round" onclick={openTutorial} aria-label={m.tutorial({}, locale)} aria-haspopup="dialog"><IconHelp aria-hidden="true" /></button>{/if}
  {#if gameSettings}<button type="button" class="btn-play btn-play-round" onclick={openSettings} aria-label={m.game_settings({}, locale)} aria-haspopup="dialog"><IconTune aria-hidden="true" /></button>{/if}
</div>

{#if tutorialOpen && tutorial}
  <div class="game-tutorial" role="dialog" aria-modal="true" aria-label={m.tutorial({}, locale)} transition:fade={{ duration: ms(180) }}>
    {#if !firstVisit}<button type="button" class="btn-play btn-play-round game-tutorial-close" onclick={() => closeTutorial(false)} aria-label={m.cosmetic_close({}, locale)}><IconClose aria-hidden="true" /></button>{/if}
    {@render tutorial({ start: () => closeTutorial(true), skip: () => closeTutorial(false) })}
  </div>
{/if}

{#if settingsOpen && gameSettings}
  <div class="game-sheet-layer" dir={direction} lang={settings.interfaceLocale}>
    <button type="button" class="game-sheet-backdrop" aria-label={m.cosmetic_close({}, locale)} onclick={() => (settingsOpen = false)} transition:fade={{ duration: ms(160) }}></button>
    <div class="game-sheet" role="dialog" aria-modal="true" aria-labelledby="game-sheet-title" transition:fly={{ y: 240, duration: ms(260), easing: cubicOut }}>
      <span class="game-sheet-grip" aria-hidden="true"></span>
      <header>
        <h2 id="game-sheet-title">{m.game_settings({}, locale)}</h2>
        <button type="button" class="game-sheet-close" onclick={() => (settingsOpen = false)} aria-label={m.cosmetic_close({}, locale)}><IconClose aria-hidden="true" /></button>
      </header>
      <div class="game-sheet-body">{@render gameSettings()}</div>
    </div>
  </div>
{/if}

<style>
  /* A small rail on the edge, a third of the way down: within thumb reach and clear of Telegram's
     header buttons (and the status bar), which cover the top corners of a Mini App. */
  .game-toolbar { position:absolute;z-index:105;top:max(32%, 4.5rem);inset-inline-end:.35rem;display:flex;flex-direction:column;gap:.4rem;padding:.3rem;border-radius:999px;background:rgba(255,253,247,.72);box-shadow:0 2px 10px rgba(23,42,69,.12);backdrop-filter:blur(6px); }
  :global(html.dark) .game-toolbar { background:rgba(23,42,69,.6); }
  .game-toolbar :global(svg) { width:1rem;height:1rem; }
  .game-tutorial { position:absolute;inset:0;z-index:110;display:flex;flex-direction:column;overflow:auto; }
  .game-tutorial-close { position:absolute;z-index:2;top:max(32%, 4.5rem);inset-inline-end:.65rem; }
  .game-tutorial-close :global(svg) { width:1rem;height:1rem; }

  .game-sheet-layer { position:fixed;inset:0;z-index:120;display:flex;align-items:flex-end;justify-content:center; }
  .game-sheet-backdrop { position:absolute;inset:0;border:0;background:rgba(12,24,40,.5);cursor:pointer; }
  .game-sheet { position:relative;display:grid;gap:.6rem;width:min(100%,32rem);max-height:calc(100dvh - 3rem);overflow-y:auto;padding:.55rem 1rem calc(1.1rem + env(safe-area-inset-bottom));border:1px solid rgba(23,42,69,.2);border-bottom:0;border-radius:1.2rem 1.2rem 0 0;background:#fffdf7;color:#172a45;box-shadow:0 -12px 34px rgba(23,42,69,.22); }
  .game-sheet-grip { justify-self:center;width:2.4rem;height:.25rem;border-radius:999px;background:rgba(23,42,69,.2); }
  .game-sheet header { display:flex;align-items:center;justify-content:space-between;gap:.6rem; }
  .game-sheet h2 { margin:0;color:#a45e38;font-size:.62rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .game-sheet-close { display:grid;place-items:center;width:2rem;height:2rem;padding:0;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer; }
  .game-sheet-close :global(svg) { width:1.1rem;height:1.1rem; }
  .game-sheet-body { display:grid;gap:.8rem; }
  :global(html.dark) .game-sheet { border-color:rgba(255,253,247,.24);background:#152b47;color:#fffdf7; }
  :global(html.dark) .game-sheet h2 { color:#e6a527; }
  :global(html.dark) .game-sheet-grip { background:rgba(255,253,247,.3); }
</style>
