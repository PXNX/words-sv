<!--
  "How do you learn best?": five cards (a bit of everything, listening, pictures, reading and
  writing, doing). The choice weights the daily mix and how the word quiz asks (today/homeModes.ts,
  learn/modality.ts); it never removes a channel. Used in the settings and in the quiz's own sheet.
-->
<script lang="ts">
  import type { Component } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { LEARNING_STYLES, type LearningStyle } from '#lib/today/homeModes.js';
  import IconMixed from '~icons/material-symbols/auto-awesome-rounded';
  import IconEar from '~icons/material-symbols/hearing';
  import IconEye from '~icons/material-symbols/visibility-rounded';
  import IconPen from '~icons/material-symbols/edit-rounded';
  import IconHand from '~icons/material-symbols/touch-app-rounded';

  let { showHint = true }: { showHint?: boolean } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  const icons: Record<LearningStyle, Component> = { mixed: IconMixed, hear: IconEar, see: IconEye, write: IconPen, do: IconHand };
  const skills: Record<LearningStyle, string> = { mixed: 'words', hear: 'hear', see: 'read', write: 'write', do: 'play' };
  const names = $derived<Record<LearningStyle, string>>({
    mixed: m.style_mixed({}, locale), hear: m.style_hear({}, locale), see: m.style_see({}, locale), write: m.style_write({}, locale), do: m.style_do({}, locale)
  });
</script>

<div class="style-picker">
  <div class="style-options" role="radiogroup" aria-label={m.style_title({}, locale)}>
    {#each LEARNING_STYLES as style (style)}
      {@const Icon = icons[style]}
      <button type="button" role="radio" aria-checked={settings.learningStyle === style} class:selected={settings.learningStyle === style} style={`--skill:var(--skill-${skills[style]})`} onclick={() => settings.setLearningStyle(style)}>
        <span aria-hidden="true"><Icon /></span>{names[style]}
      </button>
    {/each}
  </div>
  {#if showHint}<p>{m.style_hint({}, locale)}</p>{/if}
</div>

<style>
  .style-picker { display:grid;gap:.5rem;font-family:var(--font-body); }
  .style-options { display:grid;grid-template-columns:repeat(auto-fit,minmax(8.6rem,1fr));gap:.45rem; }
  .style-options button { display:flex;align-items:center;gap:.5rem;min-height:2.9rem;padding:.4rem .6rem;border:2px solid var(--line-soft);border-radius:12px;background:transparent;color:inherit;font:inherit;font-size:var(--text-xs);font-weight:800;line-height:1.2;text-align:start;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:border-color var(--dur-quick) ease,background-color var(--dur-quick) ease,scale var(--dur-move) var(--ease-spring); }
  .style-options button:first-child { grid-column:1 / -1; }
  .style-options button:active { scale:.97; }
  .style-options button:focus-visible { outline:3px dashed var(--sun);outline-offset:2px; }
  .style-options span { flex:none;display:grid;place-items:center;width:1.9rem;height:1.9rem;border-radius:50%;background:color-mix(in oklch,var(--skill) 22%,transparent);color:color-mix(in oklch,var(--skill) 70%,var(--text)); }
  .style-options span :global(svg) { width:1.1rem;height:1.1rem; }
  .style-options button.selected { border-color:var(--ink);background:color-mix(in oklch,var(--skill) 16%,transparent);box-shadow:2px 2px 0 var(--ink); }
  .style-options button.selected span { background:var(--skill);color:var(--paper); }
  .style-picker p { margin:0;font-size:var(--text-xs);font-weight:600;line-height:1.45;opacity:.72; }
  :global(html.dark) .style-options button.selected { border-color:var(--sun);box-shadow:2px 2px 0 var(--ink-deep); }
  :global(html.dark) .style-options button.selected span { color:var(--ink); }
</style>
